import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock In-Memory Database Store
const mockDb = vi.hoisted(() => ({
  orders: new Map<string, any>(),
  products: new Map<string, any>(),
  orderItems: new Map<string, any[]>(),
  orderStatusHistory: [] as any[],
  productBundleItems: [] as any[],
}));

vi.mock("@/lib/order-email", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/db", () => {
  const makeTable = (name: string) =>
    new Proxy(
      { _name: name },
      {
        get: (target, prop) => {
          if (prop === "_name") return name;
          return { _table: name, _col: String(prop) };
        },
      }
    );

  const fakeTx = {
    select: () => ({
      from: (table: any) => ({
        where: (clause: any) => {
          let rows: any[] = [];
          if (table._name === "orders") {
            const ord = mockDb.orders.get(clause?._val);
            rows = ord ? [ord] : [];
          } else if (table._name === "orderItems") {
            rows = mockDb.orderItems.get(clause?._val) || [];
          } else if (table._name === "orderItemBundleParts") {
            rows = [];
          } else if (table._name === "products") {
            rows = Array.from(mockDb.products.values());
          }
          return Object.assign(Promise.resolve(rows), {
            limit: (n: number) => Promise.resolve(rows.slice(0, n)),
          });
        },
        innerJoin: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    }),
    update: (table: any) => ({
      set: (updateValues: any) => ({
        where: (clause: any) => ({
          returning: () => {
            if (table._name === "orders") {
              const orderId = clause._val;
              const currentOrder = mockDb.orders.get(orderId);
              // Atomic check: if order is already paid, 0 rows returned!
              if (!currentOrder || currentOrder.paymentStatus === "paid") {
                return [];
              }
              // Successfully updated
              const updated = { ...currentOrder, ...updateValues };
              mockDb.orders.set(orderId, updated);
              return [{ id: orderId }];
            }
            return [];
          },
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (values: any) => {
        if (table._name === "orderStatusHistory") {
          mockDb.orderStatusHistory.push(values);
        }
        return Promise.resolve();
      },
    }),
  };

  return {
    db: {
      transaction: vi.fn(async (cb: any) => cb(fakeTx)),
      select: () => ({
        from: (table: any) => ({
          where: (clause: any) => {
            if (table._name === "productBundleItems") {
              return mockDb.productBundleItems.filter(
                (p) => p.childProductId === clause._val
              );
            }
            return [];
          },
        }),
      }),
      update: (table: any) => ({
        set: (updateValues: any) => ({
          where: (clause: any) => {
            if (table._name === "products") {
              const existing = mockDb.products.get(clause._val);
              if (existing) {
                mockDb.products.set(clause._val, { ...existing, ...updateValues });
              }
            }
            return Promise.resolve();
          },
        }),
      }),
    },
    orders: makeTable("orders"),
    orderItems: makeTable("orderItems"),
    orderStatusHistory: makeTable("orderStatusHistory"),
    orderItemBundleParts: makeTable("orderItemBundleParts"),
    productBundleItems: makeTable("productBundleItems"),
    products: makeTable("products"),
    eq: (col: any, val: any) => ({
      _table: col?._table || col?._name,
      _col: col?._col,
      _val: val,
    }),
    and: (...args: any[]) => Object.assign({}, ...args),
    sql: () => ({ _sql: true }),
    inArray: (col: any, vals: any[]) => ({ _col: col?._col, _vals: vals }),
  };
});

import { fulfillOrderPayment } from "./order-fulfillment";

describe("Concurrency & Atomic Stock Fulfillment (CLAUDE.md §5.3, §6.2)", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockDb.orders.clear();
    mockDb.products.clear();
    mockDb.orderItems.clear();
    mockDb.orderStatusHistory.length = 0;
    mockDb.productBundleItems.length = 0;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  describe("Concurrent Payment Fulfillment (Double-Spend / Webhook Replay Race Condition)", () => {
    it("handles two simultaneous fulfillment requests atomically without duplicate records", async () => {
      const orderId = "550e8400-e29b-41d4-a716-446655440000";
      mockDb.orders.set(orderId, {
        id: orderId,
        paymentStatus: "pending",
        status: "pending",
        stripePaymentIntentId: null,
      });

      // Execute 2 concurrent fulfillment calls
      const [res1, res2] = await Promise.all([
        fulfillOrderPayment(orderId, { method: "stripe", chargeId: "pi_test_concurrent_1" }),
        fulfillOrderPayment(orderId, { method: "stripe", chargeId: "pi_test_concurrent_2" }),
      ]);

      // Both complete cleanly without error
      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // Exactly 1 status history record must be inserted
      expect(mockDb.orderStatusHistory).toHaveLength(1);
      expect(mockDb.orderStatusHistory[0].status).toBe("paid");

      // Final order status in DB must be 'paid'
      const finalOrder = mockDb.orders.get(orderId);
      expect(finalOrder.paymentStatus).toBe("paid");
      expect(finalOrder.status).toBe("paid");
    });

    it("returns idempotent success immediately if order was already marked paid", async () => {
      const orderId = "550e8400-e29b-41d4-a716-446655440001";
      mockDb.orders.set(orderId, {
        id: orderId,
        paymentStatus: "paid",
        status: "paid",
        stripePaymentIntentId: "pi_existing",
      });

      const result = await fulfillOrderPayment(orderId, {
        method: "stripe",
        chargeId: "pi_existing",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("already paid");
      expect(mockDb.orderStatusHistory).toHaveLength(0);
    });

    it("returns error when order is not found", async () => {
      const missingId = "550e8400-e29b-41d4-a716-446655440002";
      const result = await fulfillOrderPayment(missingId, {
        method: "stripe",
        chargeId: "pi_test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order not found");
    });
  });

  describe("Production Mock Payment Guard (CLAUDE.md §6.1)", () => {
    it("fails closed: blocks mock payment method in production environment", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      const orderId = "550e8400-e29b-41d4-a716-446655440003";

      const result = await fulfillOrderPayment(orderId, {
        method: "mock",
        note: "Attempting mock payment in production",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Mock payment simulator is disabled in production");
      expect(mockDb.orders.has(orderId)).toBe(false);
    });
  });

  describe("Input Validation & Invariant Guards", () => {
    it("rejects non-UUID orderId format before initiating database queries", async () => {
      const result = await fulfillOrderPayment("invalid-order-id-123", {
        method: "stripe",
        chargeId: "pi_test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fulfill payment");
    });
  });
});
