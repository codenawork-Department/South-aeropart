import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({
  orders: new Map<
    string,
    { id: string; total: string; currency: string; orderNumber: string }
  >(),
  fulfill: vi.fn(),
  writes: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@/lib/order-fulfillment", () => ({
  fulfillOrderPayment: state.fulfill,
}));
vi.mock("@repo/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      state.select(...args);
      return {
        from: () => ({
          where: (clause: { value: string }) => ({
            limit: () =>
              state.orders.has(clause.value)
                ? [state.orders.get(clause.value)]
                : [],
          }),
        }),
      };
    },
    insert: () => ({
      values: (value: unknown) => ({
        onConflictDoNothing: () => {
          state.writes(value);
          return Promise.resolve();
        },
      }),
    }),
  },
  orders: {
    id: "id",
    total: "total",
    currency: "currency",
    orderNumber: "orderNumber",
    stripePaymentIntentId: "intent",
  },
  orderStatusHistory: {},
  stripeWebhookEvents: {},
  eq: (_column: unknown, value: string) => ({ value }),
  and: vi.fn(),
  inArray: vi.fn(),
}));
import { POST } from "./route";
const secret = "whsec_unit_signature_not_a_provider_credential";
const id = "550e8400-e29b-41d4-a716-446655440000";
function event() {
  return {
    id: "evt_unit",
    object: "event",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_unit",
        object: "payment_intent",
        amount_received: 10000,
        currency: "thb",
        livemode: false,
        metadata: { orderId: id },
      },
    },
  };
}
function request(raw: string, sign = true) {
  const t = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret)
    .update(`${t}.${raw}`)
    .digest("hex");
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: raw,
    headers: sign ? { "stripe-signature": `t=${t},v1=${digest}` } : {},
  });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit_signature_only");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  vi.clearAllMocks();
  state.orders.clear();
  state.fulfill.mockResolvedValue({ success: true });
});
afterEach(() => vi.unstubAllEnvs());
function order() {
  state.orders.set("pi_unit", {
    id,
    total: "100.00",
    currency: "THB",
    orderNumber: "QA",
  });
}
async function generic(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({
    success: false,
    error: { code },
  });
}
describe("Webhook handler unit checks with real SDK signature verification (native matrix proves DB/provider effects)", () => {
  it("rejects missing and corrupted signatures before business queries", async () => {
    const raw = JSON.stringify(event());
    await generic(await POST(request(raw, false)), 400, "BAD_REQUEST");
    const req = request(raw);
    const sig = req.headers.get("stripe-signature")!;
    await generic(
      await POST(
        new NextRequest(req.url, {
          method: "POST",
          headers: { "stripe-signature": sig },
          body: raw + " ",
        }),
      ),
      400,
      "BAD_REQUEST",
    );
    expect(state.select).not.toHaveBeenCalled();
    expect(state.fulfill).not.toHaveBeenCalled();
  });
  it("rejects actual oversized bytes with a generic 413", async () => {
    await generic(
      await POST(request("ก".repeat(349526))),
      413,
      "PAYLOAD_TOO_LARGE",
    );
    expect(state.select).not.toHaveBeenCalled();
  });
  it("rejects a valid signature over malformed fields without a TypeError/500", async () => {
    const value = event();
    (value.data.object as Record<string, unknown>).currency = {};
    await generic(
      await POST(request(JSON.stringify(value))),
      400,
      "BAD_REQUEST",
    );
    expect(state.fulfill).not.toHaveBeenCalled();
  });
  it("rejects an unbound intent without revealing order existence", async () => {
    await generic(
      await POST(request(JSON.stringify(event()))),
      400,
      "BAD_REQUEST",
    );
    expect(state.fulfill).not.toHaveBeenCalled();
  });
  it.each(["amount", "currency", "metadata"])(
    "rejects %s mismatch before writes",
    async (kind) => {
      order();
      const value = event();
      if (kind === "amount") value.data.object.amount_received = 9999;
      if (kind === "currency") value.data.object.currency = "usd";
      if (kind === "metadata")
        value.data.object.metadata.orderId =
          "550e8400-e29b-41d4-a716-446655440001";
      await generic(
        await POST(request(JSON.stringify(value))),
        400,
        "BAD_REQUEST",
      );
      expect(state.fulfill).not.toHaveBeenCalled();
      expect(state.writes).not.toHaveBeenCalled();
    },
  );
  it("delegates valid delivery to atomic fulfillment with durable event identity", async () => {
    order();
    const response = await POST(request(JSON.stringify(event())));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(state.fulfill).toHaveBeenCalledWith(id, {
      method: "stripe",
      chargeId: "pi_unit",
      webhook: { eventId: "evt_unit", eventType: "payment_intent.succeeded" },
    });
  });
  it("does not ACK failed fulfillment or reveal its error", async () => {
    order();
    state.fulfill.mockResolvedValue({
      success: false,
      error: "PRIVATE_DB_SENTINEL",
    });
    const response = await POST(request(JSON.stringify(event())));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("SENTINEL");
  });
  it("ACKs a valid unknown event after durable recording without fulfillment", async () => {
    const value = event();
    value.type = "customer.subscription.created";
    expect((await POST(request(JSON.stringify(value)))).status).toBe(200);
    expect(state.writes).toHaveBeenCalledWith({
      eventId: "evt_unit",
      eventType: value.type,
    });
    expect(state.fulfill).not.toHaveBeenCalled();
  });
});
