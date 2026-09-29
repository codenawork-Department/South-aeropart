import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { InventoryAdjustmentDependencies } from "@repo/lib/inventory-adjustment";
import type { CorpusData } from "../../../packages/security-harness/src/types";

/** Invoked only after the integration bootstrap creates and verifies its run-owned schema. */
export async function verifyInventoryDatabase(
  root: string,
  schemaName: string,
  passed: (name: string) => void,
) {
  assert.equal(process.env.APP_ENV, "test");
  assert.match(schemaName, /^security_test_[a-f0-9]{32}$/);
  const { db, products, adminUsers, adminAuditLogs, eq, sql } =
    await import("@repo/db");
  const scope = await db.execute(sql`select current_schema() as name`);
  assert.equal(scope.rows[0].name, schemaName);
  const { adjustInventory, MAX_STOCK } =
    await import("@repo/lib/inventory-adjustment");
  const { runInventoryTransaction } =
    await import("../../admin/lib/inventory-repository");
  const actor = { id: randomUUID(), role: "admin" };
  await db.insert(adminUsers).values({
    id: actor.id,
    email: `${actor.id}@example.invalid`,
    fullName: "Inventory fixture",
    passwordHash: "!disabled-security-fixture",
    role: "admin",
    isActive: false,
  });
  // This exercises the production command/repository, not the HTTP session verifier.
  const deps: InventoryAdjustmentDependencies = {
    authorize: async () => actor,
    transaction: runInventoryTransaction,
  };
  async function seed(
    stockQuantity: number,
    productType: "single" | "bundle" = "single",
  ) {
    const id = randomUUID();
    await db
      .insert(products)
      .values({
        id,
        sku: id,
        slug: id,
        name: "Inventory fixture",
        productType,
        price: "1.00",
        stockQuantity,
        status: "active",
      });
    return id;
  }
  async function snapshot(id: string) {
    const [product] = await db
      .select({ stock: products.stockQuantity })
      .from(products)
      .where(eq(products.id, id));
    const audits = await db
      .select({
        adminId: adminAuditLogs.adminId,
        action: adminAuditLogs.action,
        entityType: adminAuditLogs.entityType,
        entityId: adminAuditLogs.entityId,
        metadata: adminAuditLogs.metadata,
      })
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.entityId, id));
    return { stock: product?.stock, audits };
  }
  const corpus = JSON.parse(
    readFileSync(
      resolve(root, "docs/security/fuzz-matrix-2026-09-24/corpus.json"),
      "utf8",
    ),
  ) as CorpusData;
  const observations: Array<{
    caseId: string;
    variant: number;
    stockBefore: number;
    stockAfter?: number;
    errorCode: string | null;
    auditRows: number;
    layer: "db_service_integration";
  }> = [];
  for (const testCase of corpus.cases.filter((c) =>
    c.targets.includes("inventory.delta"),
  )) {
    const scenarios =
      testCase.input.mode === "values"
        ? testCase.input.values.map((delta) => ({ delta, stockBefore: 100000 }))
        : testCase.input.mode === "recipe" &&
            testCase.input.name === "stockArithmetic"
          ? (testCase.input.args.variants as Array<{
              delta: unknown;
              stockBefore: number;
            }>)
          : [];
    assert(
      scenarios.length,
      "Inventory case requires a supported integration recipe",
    );
    for (const [variant, scenario] of scenarios.entries()) {
      const productId = await seed(scenario.stockBefore);
      const before = await snapshot(productId);
      const result = await adjustInventory(
        { productId, delta: scenario.delta },
        deps,
      );
      const after = await snapshot(productId);
      assert.equal(
        result.success,
        testCase.expected.outcome === "accept",
        testCase.id,
      );
      if (result.success) {
        const stockAfter = Number(
          BigInt(scenario.stockBefore) + BigInt(scenario.delta as number),
        );
        assert.deepEqual(result.data, {
          productId,
          delta: scenario.delta,
          stockBefore: scenario.stockBefore,
          stockAfter,
        });
        assert.deepEqual(after, {
          stock: stockAfter,
          audits: [
            {
              adminId: actor.id,
              action: "inventory.adjusted",
              entityType: "product",
              entityId: productId,
              metadata: {
                delta: scenario.delta,
                stockBefore: scenario.stockBefore,
                stockAfter,
              },
            },
          ],
        });
      } else {
        assert.equal(result.error.code, testCase.expected.errorCode);
        assert.equal(
          result.error.message,
          testCase.expected.errorCode === "CONFLICT"
            ? "Request conflicts with current state"
            : "Invalid request",
        );
        assert.deepEqual(after, before);
      }
      observations.push({
        caseId: testCase.id,
        variant,
        stockBefore: scenario.stockBefore,
        stockAfter: after.stock,
        errorCode: result.success ? null : result.error.code,
        auditRows: after.audits.length,
        layer: "db_service_integration",
      });
      passed(
        `inventory ${testCase.id} variant ${variant}: database stock/audit readback`,
      );
    }
  }

  for (const [stockBefore, delta, expected] of [
    [0, MAX_STOCK, MAX_STOCK],
    [MAX_STOCK, -MAX_STOCK, 0],
  ]) {
    const productId = await seed(stockBefore);
    assert.equal(
      (await adjustInventory({ productId, delta }, deps)).success,
      true,
    );
    assert.equal((await snapshot(productId)).stock, expected);
  }
  passed(
    "inventory accepts exact zero and PostgreSQL int32 maximum stock boundaries",
  );

  const rollbackId = await seed(10);
  const beforeRollback = await snapshot(rollbackId);
  // An actual FK error in the audit insert must undo the already-issued stock UPDATE.
  const auditFailure = await adjustInventory(
    { productId: rollbackId, delta: -1 },
    {
      ...deps,
      authorize: async () => ({ ...actor, id: randomUUID() }),
    },
  );
  assert.deepEqual(auditFailure, {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unable to process request" },
  });
  assert.deepEqual(await snapshot(rollbackId), beforeRollback);
  passed("inventory audit foreign-key failure rolls back stock in PostgreSQL");

  for (const [stockBefore, delta, finalStock, successes] of [
    [1, -1, 0, 1],
    [MAX_STOCK - 1, 1, MAX_STOCK, 1],
    [0, 1, 2, 2],
  ]) {
    const productId = await seed(stockBefore);
    let arrived = 0;
    let release!: () => void;
    let abort!: (error: Error) => void;
    const barrier = new Promise<void>((resolveBarrier, rejectBarrier) => {
      release = resolveBarrier;
      abort = rejectBarrier;
    });
    // Both database transactions must begin before either attempts its row lock.
    const timer = setTimeout(
      () => abort(new Error("Database transaction barrier timed out")),
      15000,
    );
    const racingDeps: InventoryAdjustmentDependencies = {
      ...deps,
      transaction: (work) =>
        runInventoryTransaction(async (tx) => {
          if (++arrived === 2) release();
          await barrier;
          return work(tx);
        }),
    };
    let results;
    try {
      results = await Promise.all(
        [1, 2].map(() => adjustInventory({ productId, delta }, racingDeps)),
      );
    } finally {
      clearTimeout(timer);
    }
    assert.equal(arrived, 2);
    assert.equal(results.filter((result) => result.success).length, successes);
    for (const result of results)
      if (!result.success) assert.equal(result.error.code, "CONFLICT");
    const after = await snapshot(productId);
    assert.equal(after.stock, finalStock);
    assert.equal(after.audits.length, successes);
  }
  passed(
    "inventory concurrent transactions preserve last-item, maximum-stock and additive-update invariants",
  );

  const bundleId = await seed(10, "bundle");
  assert.deepEqual(
    await adjustInventory({ productId: bundleId, delta: 1 }, deps),
    {
      success: false,
      error: {
        code: "CONFLICT",
        message: "Request conflicts with current state",
      },
    },
  );
  assert.deepEqual(await snapshot(bundleId), { stock: 10, audits: [] });
  passed("inventory rejects direct bundle adjustment without database effects");
  return observations;
}
