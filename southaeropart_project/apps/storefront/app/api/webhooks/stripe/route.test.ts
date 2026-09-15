import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockState = vi.hoisted(() => ({
  orders: new Map<string, any>(),
  history: [] as any[],
  fulfillOrderPayment: vi.fn(),
  constructStripeWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/order-fulfillment", () => ({
  fulfillOrderPayment: mockState.fulfillOrderPayment,
}));

vi.mock("@repo/lib", () => ({
  constructStripeWebhookEvent: mockState.constructStripeWebhookEvent,
  toSmallestCurrencyUnit: (val: any) => Math.round(Number(val) * 100),
}));

vi.mock("@repo/db", () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: (clause: any) => ({
            limit: () => {
              const orderId = clause._orderId;
              const ord = mockState.orders.get(orderId);
              return ord ? [ord] : [];
            },
          }),
        }),
      }),
      insert: () => ({
        values: (val: any) => {
          mockState.history.push(val);
          return Promise.resolve();
        },
      }),
    },
    orders: { _name: "orders" },
    orderStatusHistory: { _name: "orderStatusHistory" },
    eq: (col: any, val: any) => ({ _orderId: val }),
  };
});

import { POST } from "./route";

describe("Stripe Webhook Route Handler (CLAUDE.md §5.3)", () => {
  beforeEach(() => {
    mockState.orders.clear();
    mockState.history.length = 0;
    vi.clearAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ id: "evt_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Missing stripe-signature");
  });

  it("returns 413 when body size exceeds 1MB", async () => {
    const hugeBody = "a".repeat(1024 * 1024 + 10);
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_test",
      },
      body: hugeBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toContain("Payload too large");
  });

  it("returns 400 when webhook signature verification fails", async () => {
    mockState.constructStripeWebhookEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "invalid_sig",
      },
      body: JSON.stringify({ id: "evt_fake" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("signature verification failed");
  });

  it("returns 404 when payment_intent refers to a non-existent order", async () => {
    mockState.constructStripeWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded", livemode: false,
      data: {
        object: { livemode: false,
          id: "pi_non_existent",
          metadata: { orderId: "order_missing_123" },
        },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_sig",
      },
      body: JSON.stringify({ id: "evt_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toContain("Order not found");
  });

  it("returns 200 idempotent response when order is already fulfilled", async () => {
    const orderId = "order_already_paid_123";
    mockState.orders.set(orderId, {
      id: orderId,
      total: "25000.00",
      currency: "THB",
      status: "paid",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_test_123",
    });

    mockState.constructStripeWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded", livemode: false,
      data: {
        object: { livemode: false,
          id: "pi_test_123", amount_received: 2500000, currency: "thb",
          metadata: { orderId },
        },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_sig",
      },
      body: JSON.stringify({ id: "evt_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.alreadyPaid).toBe(true);
    // fulfillOrderPayment must NOT be called again
    expect(mockState.fulfillOrderPayment).not.toHaveBeenCalled();
  });

  it("detects and rejects amount or currency mismatch with 400 status and logs alert", async () => {
    const orderId = "order_mismatch_123";
    mockState.orders.set(orderId, {
      id: orderId,
      total: "50000.00", // 50,000 THB = 5,000,000 satang
      currency: "THB",
      status: "pending",
      paymentStatus: "pending",
      stripePaymentIntentId: "pi_test_mismatch",
    });

    mockState.constructStripeWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded", livemode: false,
      data: {
        object: { livemode: false,
          id: "pi_test_mismatch",
          amount: 2500000, // Attacker paid only 25,000 THB!
          amount_received: 2500000,
          currency: "thb",
          metadata: { orderId },
        },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_sig",
      },
      body: JSON.stringify({ id: "evt_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Payment amount or currency mismatch");

    // Must log security alert to status history
    expect(mockState.history).toHaveLength(1);
    expect(mockState.history[0].note).toContain("Security Alert");

    // Must NOT fulfill order
    expect(mockState.fulfillOrderPayment).not.toHaveBeenCalled();
  });

  it("fulfills valid payment_intent.succeeded event and returns 200", async () => {
    const orderId = "order_valid_123";
    mockState.orders.set(orderId, {
      id: orderId,
      total: "35000.00", // 3,500,000 satang
      currency: "THB",
      status: "pending",
      paymentStatus: "pending",
      stripePaymentIntentId: "pi_test_valid",
    });

    mockState.constructStripeWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded", livemode: false,
      data: {
        object: { livemode: false,
          id: "pi_test_valid",
          amount: 3500000,
          amount_received: 3500000,
          currency: "thb",
          metadata: { orderId },
        },
      },
    });

    mockState.fulfillOrderPayment.mockResolvedValue({
      success: true,
      message: "Order fulfilled",
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_sig",
      },
      body: JSON.stringify({ id: "evt_test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.received).toBe(true);
    expect(mockState.fulfillOrderPayment).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        method: "stripe",
        chargeId: "pi_test_valid",
      })
    );
  });
});
