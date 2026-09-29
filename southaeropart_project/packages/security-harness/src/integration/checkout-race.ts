import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import type { createClerkActors } from "./clerk-actors";
import { detectErrorLeaks } from "../leak-detector";
import type { NormalizedResult } from "../types";

export async function checkCheckoutRace(
  runtime: NativeRuntime,
  app: NativeApp,
  clerk: Awaited<ReturnType<typeof createClerkActors>>,
) {
  const snapshot = await createBusinessObserver(runtime);
  const scenarios = [];
  const requestEvidence: Array<{ bytes: number; sha256: string }> = [];
  for (const kind of ["single", "shared_bundle_part"]) {
    const physical = randomUUID();
    await runtime.pool.query(
      "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'Race physical part','100.00',1,'active')",
      [physical, physical],
    );
    const productIds =
      kind === "single" ? [physical, physical] : [randomUUID(), randomUUID()];
    if (kind !== "single")
      for (const id of productIds) {
        await runtime.pool.query(
          "insert into products(id,sku,slug,name,price,stock_quantity,status,product_type) values($1,$2,$2,'Race bundle','100.00',1,'active','bundle')",
          [id, id],
        );
        await runtime.pool.query(
          "insert into product_bundle_items(bundle_product_id,child_product_id,quantity) values($1,$2,1)",
          [id, physical],
        );
      }
    const children: NativeApp[] = [];
    for (let i = 0; i < 2; i++) {
      const page = await app.context.newPage();
      await page.goto(app.url, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.waitForFunction(() => "securityActions" in window);
      children.push({ ...app, page });
    }
    const requestHeaders = await Promise.all([
      clerk.headers(0),
      clerk.headers(1),
    ]);
    const namespace = 128062,
      intKey = randomInt(1, 2147483647);
    const controller = await runtime.pool.connect();
    let locked = false,
      trigger = false;
    let attempts:
      | Promise<
          PromiseSettledResult<Awaited<ReturnType<typeof invokeNativeAction>>>[]
        >
      | undefined;
    const before = await snapshot(),
      emailBefore = runtime.emails.length;
    const oldOrders = new Set(
      (await runtime.pool.query("select id from orders")).rows.map((r) => r.id),
    );
    let arrivals = 0;
    try {
      await controller.query("select pg_advisory_lock($1,$2)", [
        namespace,
        intKey,
      ]);
      locked = true;
      await runtime.pool.query(
        `create or replace function qa_checkout_barrier() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock_shared(${namespace},${intKey}); return NEW; end $$`,
      );
      await runtime.pool.query(
        "create trigger qa_checkout_barrier before insert on orders for each row execute function qa_checkout_barrier()",
      );
      trigger = true;
      attempts = Promise.allSettled(
        children.map((child, index) =>
          invokeNativeAction(
            child,
            "checkout",
            [
              {
                shippingAddress: {
                  recipientName: "Race fixture",
                  phone: "0800000000",
                  email: "fixture@example.invalid",
                  line1: "Fixture",
                  subDistrict: "Fixture",
                  district: "Fixture",
                  province: "Bangkok",
                  postalCode: "10110",
                },
                shippingMethod: "standard",
                paymentMethod: "promptpay",
                saveAddress: false,
                items: [
                  {
                    productId: productIds[index],
                    productName: "Untrusted title",
                    unitPrice: "0.01",
                    quantity: 1,
                  },
                ],
              },
            ],
            { headers: requestHeaders[index], timeoutMs: 45000 },
          ),
        ),
      );
      const deadline = performance.now() + 10000;
      try {
        while (performance.now() < deadline) {
          arrivals = (
            await runtime.pool.query(
              "select count(*)::int as count from pg_locks where locktype='advisory' and classid=$1::oid and objid=$2::oid and objsubid=2 and not granted",
              [namespace, intKey],
            )
          ).rows[0].count;
          if (arrivals === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(
          arrivals,
          2,
          "Both real HTTP transactions must reach the database barrier before release",
        );
      } finally {
        await controller.query("select pg_advisory_unlock($1,$2)", [
          namespace,
          intKey,
        ]);
        locked = false;
      }
      const settled = await attempts;
      if (settled.some((x) => x.status !== "fulfilled"))
        throw new Error("Native race request did not complete");
      const wires = settled.map(
        (x) =>
          (
            x as PromiseFulfilledResult<
              Awaited<ReturnType<typeof invokeNativeAction>>
            >
          ).value,
      );
      const responses = wires.map(
        (w) =>
          w.value as {
            success?: boolean;
            code?: string;
            error?: string;
            orderId?: string;
            total?: string;
          },
      );
      requestEvidence.push(
        ...wires.map((w) => ({
          bytes: w.requestBytes,
          sha256: w.requestSha256,
        })),
      );
      const winners = responses.filter((r) => r.success),
        losers = responses.filter((r) => !r.success);
      const orders = (
        await runtime.pool.query("select * from orders")
      ).rows.filter((r) => !oldOrders.has(r.id));
      const ids = orders.map((r) => r.id);
      const items = (
        await runtime.pool.query(
          "select * from order_items where order_id=any($1::uuid[])",
          [ids],
        )
      ).rows;
      const reservations = (
        await runtime.pool.query(
          "select * from order_stock_reservations where order_id=any($1::uuid[])",
          [ids],
        )
      ).rows;
      const history = (
        await runtime.pool.query(
          "select * from order_status_history where order_id=any($1::uuid[])",
          [ids],
        )
      ).rows;
      const parts = (
        await runtime.pool.query(
          "select p.* from order_item_bundle_parts p inner join order_items i on p.order_item_id=i.id where i.order_id=any($1::uuid[])",
          [ids],
        )
      ).rows;
      const stock = (
        await runtime.pool.query(
          "select stock_quantity from products where id=$1",
          [physical],
        )
      ).rows[0].stock_quantity;
      const after = await snapshot(),
        changed = [...after.keys()].filter(
          (t) => before.get(t) !== after.get(t),
        );
      const leakFree = wires.every(
        (w) => detectErrorLeaks(w.rawText).leaks.length === 0,
      );
      const statuses =
        wires.every((w) => w.wireStatus === 200) &&
        winners.length === 1 &&
        losers.length === 1 &&
        losers[0].code === "CONFLICT" &&
        losers[0].error === "Request conflicts with current state";
      const state =
        orders.length === 1 &&
        orders[0].id === winners[0]?.orderId &&
        orders[0].total === "250.00" &&
        orders[0].subtotal === "100.00" &&
        orders[0].currency === "THB" &&
        orders[0].payment_status === "pending" &&
        orders[0].inventory_state === "reserved" &&
        clerk.actors.some((actor) => actor.id === orders[0].user_id) &&
        items.length === 1 &&
        items[0].quantity === 1 &&
        items[0].unit_price === "100.00" &&
        reservations.length === 1 &&
        reservations[0].product_id === physical &&
        reservations[0].quantity === 1 &&
        stock === 0 &&
        history.length === 1 &&
        parts.length === (kind === "single" ? 0 : 1) &&
        parts.every(
          (p) => p.child_product_id === physical && p.quantity === 1,
        ) &&
        runtime.emails.length === emailBefore &&
        changed.every((t) =>
          [
            "orders",
            "order_items",
            "order_stock_reservations",
            "order_status_history",
            "order_item_bundle_parts",
            "products",
          ].includes(t),
        );
      scenarios.push({
        kind,
        barrierArrivals: arrivals,
        wireStatuses: wires.map((w) => w.wireStatus),
        semanticStatuses: responses.map((r) =>
          r.success ? 200 : r.code === "CONFLICT" ? 409 : null,
        ),
        passed: statuses && state && leakFree,
        statusContractPassed: statuses,
        businessStatePassed: state,
        responseCodes: responses.map((r) => r.code ?? null),
        leakFree,
        orderRows: orders.length,
        itemRows: items.length,
        reservationRows: reservations.length,
        physicalStock: stock,
        emailRequests: runtime.emails.length - emailBefore,
      });
    } finally {
      if (locked)
        await controller.query("select pg_advisory_unlock($1,$2)", [
          namespace,
          intKey,
        ]);
      if (attempts) await attempts;
      if (trigger)
        await runtime.pool.query("drop trigger qa_checkout_barrier on orders");
      controller.release();
      for (const child of children) await child.page.close();
    }
  }
  const passed = scenarios.length === 2 && scenarios.every((s) => s.passed);
  const observed: NormalizedResult = {
    success: false,
    wireStatus: scenarios.every((s) =>
      s.wireStatuses.every((status) => status === 200),
    )
      ? 200
      : null,
    semanticStatus: scenarios.every((s) => s.semanticStatuses.includes(409))
      ? 409
      : null,
    errorCode: "CONFLICT",
    errorMessage: "Request conflicts with current state",
    hasErrorCodeField: true,
    rawResponse: { scenarios },
    leaks: [],
    executionTimeMs: 0,
    evidenceLayer: "server_action",
    multiStepVerified: passed,
    invariantsChecked: {
      NO_LEAK: scenarios.every((s) => s.leakFree),
      AUTHORITATIVE: passed,
      AT_MOST_ONCE: passed,
    },
  };
  return { observed, scenarios, requests: requestEvidence };
}
