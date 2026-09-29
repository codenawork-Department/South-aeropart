import { describe, it, expect, vi } from "vitest";
import * as inventoryCommand from "@repo/lib/inventory-adjustment";
import { adjustInventory, MAX_STOCK } from "@repo/lib/inventory-adjustment";
import { createInventoryMemoryFixture } from "../src/fixtures/inventory-memory";
import { InventoryDeltaAdapter } from "../src/adapters/inventory-delta.adapter";
import { loadCorpus } from "../src/schema-validator";
import { expandCaseVariants, evaluateVariant } from "../src/execution-engine";

const productId = "10000000-0000-4000-8000-000000000001";
const input = { productId, delta: -1 };
const corpus = loadCorpus();
const cases = corpus.cases
  .filter((c) => c.targets.includes("inventory.delta"))
  .flatMap((testCase) =>
    expandCaseVariants(testCase, corpus).map((variant) => ({
      name: testCase.id + ":" + variant.variantKey,
      testCase,
      variant,
    })),
  );

describe("Inventory production command with an isolated fixture store", () => {
  it("detects a wrong applied delta even when the response and fixture agree with each other", async () => {
    const original = inventoryCommand.adjustInventory;
    const implementation = vi
      .spyOn(inventoryCommand, "adjustInventory")
      .mockImplementation((payload, deps) =>
        original(
          {
            ...(payload as Record<string, unknown>),
            delta: 2,
          },
          deps,
        ),
      );
    try {
      const { testCase, variant } = cases.find(
        (c) => c.testCase.id === "N-17",
      )!;
      const observed = await new InventoryDeltaAdapter().invoke(variant);
      expect(observed.success).toBe(true);
      expect(observed.invariantsChecked.SAFE_ACCEPT).toBe(false);
      expect(evaluateVariant(variant, testCase, observed).result).toBe("FAIL");
    } finally {
      implementation.mockRestore();
    }
  });
  it.each(cases)(
    "$name satisfies its service contract without claiming HTTP/DB evidence",
    async ({ testCase, variant }) => {
      const observed = await new InventoryDeltaAdapter().invoke(variant);
      expect(observed.semanticStatus).toBe(testCase.expected.semanticStatus);
      expect(observed.success).toBe(testCase.expected.outcome === "accept");
      expect(observed.errorCode).toBe(testCase.expected.errorCode);
      for (const invariant of testCase.expected.invariants)
        expect(observed.invariantsChecked[invariant]).toBe(true);
      expect(observed.evidenceLayer).toBe("service_unit");
      expect(observed.wireStatus).toBeNull();
      expect(observed.dbDiff).toBeUndefined();
      expect(observed.providerCalls).toBeUndefined();
      expect(evaluateVariant(variant, testCase, observed).result).toBe(
        "BLOCKED",
      );
    },
  );
  it("rejects unauthenticated, staff and unknown roles before opening a transaction", async () => {
    for (const actor of [
      null,
      { id: "staff", role: "staff" },
      { id: "customer", role: "customer" },
    ]) {
      const fixture = createInventoryMemoryFixture({
        productId,
        stockBefore: 10,
        actor,
      });
      expect(await adjustInventory(input, fixture.dependencies)).toMatchObject({
        success: false,
        error: { code: actor ? "FORBIDDEN" : "UNAUTHENTICATED" },
      });
      expect(fixture.transactionCount()).toBe(0);
    }
  });
  it("rejects malformed IDs, shapes, nonfinite deltas and injected actor fields before mutation", async () => {
    for (const value of [
      null,
      [],
      {},
      { ...input, productId: "bad" },
      { ...input, adminId: "forged" },
      { ...input, role: "super_admin" },
      ...[NaN, Infinity, -Infinity, {}, [], "1"].map((delta) => ({
        ...input,
        delta,
      })),
    ]) {
      const fixture = createInventoryMemoryFixture({
        productId,
        stockBefore: 10,
      });
      expect(await adjustInventory(value, fixture.dependencies)).toEqual({
        success: false,
        error: { code: "INVALID_INPUT", message: "Invalid request" },
      });
      expect(fixture.transactionCount()).toBe(0);
    }
  });
  it("accepts exact zero/MAX stock boundaries and audits the authenticated actor", async () => {
    for (const [stockBefore, delta, stockAfter] of [
      [0, MAX_STOCK, MAX_STOCK],
      [MAX_STOCK, -MAX_STOCK, 0],
    ]) {
      const fixture = createInventoryMemoryFixture({
        productId,
        stockBefore,
        actor: { id: "verified-admin", role: "super_admin" },
      });
      const original = { productId, delta };
      expect(await adjustInventory(original, fixture.dependencies)).toEqual({
        success: true,
        data: { productId, delta, stockBefore, stockAfter },
      });
      expect(fixture.snapshot()).toMatchObject({
        product: { stockQuantity: stockAfter },
        audits: [
          {
            adminId: "verified-admin",
            entityId: productId,
            metadata: { stockBefore, stockAfter, delta },
          },
        ],
      });
      expect(original).toEqual({ productId, delta });
    }
  });
  it("returns NOT_FOUND for missing products and CONFLICT for bundle capacity", async () => {
    for (const option of [
      { missing: true },
      { productType: "bundle" as const },
    ]) {
      const fixture = createInventoryMemoryFixture({
        productId,
        stockBefore: 10,
        ...option,
      });
      expect(await adjustInventory(input, fixture.dependencies)).toMatchObject({
        success: false,
        error: { code: "missing" in option ? "NOT_FOUND" : "CONFLICT" },
      });
      expect(fixture.snapshot().audits).toEqual([]);
    }
  });
  it("rolls back staged stock when audit persistence fails and returns a generic error", async () => {
    const fixture = createInventoryMemoryFixture({
      productId,
      stockBefore: 10,
      failAudit: true,
    });
    const before = fixture.snapshot();
    expect(await adjustInventory(input, fixture.dependencies)).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Unable to process request" },
    });
    expect(fixture.snapshot()).toEqual(before);
  });
  it("does not audit or report success when the conditional write affects no row", async () => {
    const fixture = createInventoryMemoryFixture({
      productId,
      stockBefore: 10,
      conflictOnUpdate: true,
    });
    const before = fixture.snapshot();
    expect(await adjustInventory(input, fixture.dependencies)).toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    expect(fixture.snapshot()).toEqual(before);
  });
});
