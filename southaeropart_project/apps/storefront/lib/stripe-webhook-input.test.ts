import { describe, expect, it } from "vitest";
import {
  parseStripeWebhook,
  readWebhookBody,
  validateSignatureTimestamp,
  WebhookBodyTooLarge,
  paymentIntentWebhookSchema,
} from "./stripe-webhook-input";
const now = 1790208000000;
const event = {
  id: "evt_test",
  object: "event",
  type: "payment_intent.succeeded",
  created: now / 1000,
  livemode: false,
  data: {
    object: {
      id: "pi_test",
      object: "payment_intent",
      amount_received: 10000,
      currency: "thb",
      livemode: false,
      metadata: {},
    },
  },
};
describe("Webhook ingress contract", () => {
  it.each([
    "NaN",
    "Infinity",
    "-1",
    "1.5",
    "1e5",
    "1790208000junk",
    "1790208000000",
    "18446744073709551615",
    "1790208031",
    "1790208301",
  ])("rejects timestamp %s before SDK coercion", (timestamp) => {
    expect(() =>
      validateSignatureTimestamp(`t=${timestamp},v1=signature`, now),
    ).toThrow();
  });
  it("accepts the future boundary and legitimate multiple signatures", () => {
    expect(() =>
      validateSignatureTimestamp("t=1790208030,v1=old,v1=new,v0=legacy", now),
    ).not.toThrow();
    expect(() =>
      validateSignatureTimestamp("t=1790208000,t=1790208001,v1=x", now),
    ).toThrow();
  });
  it.each([
    null,
    [],
    { ...event, data: null },
    { ...event, type: [] },
    { ...event, id: {} },
    { ...event, created: "1790208000" },
    { ...event, created: 1790208000000 },
  ])("rejects malformed signed envelopes", (value) => {
    expect(() =>
      parseStripeWebhook(Buffer.from(JSON.stringify(value))),
    ).toThrow();
  });
  it("allows additive fields but forbids prototype and duplicate keys", () => {
    expect(
      parseStripeWebhook(
        Buffer.from(JSON.stringify({ ...event, extension: true })),
      ),
    ).toMatchObject({ extension: true });
    for (const suffix of [',"__proto__":{"isAdmin":true}', ',"id":"evt_other"'])
      expect(() =>
        parseStripeWebhook(
          Buffer.from(JSON.stringify(event).slice(0, -1) + suffix + "}"),
        ),
      ).toThrow();
  });
  it.each([null, [], {}, " thb ", "t\u200bhb"])(
    "rejects invalid currency before string methods",
    (currency) => {
      expect(
        paymentIntentWebhookSchema.safeParse({ ...event.data.object, currency })
          .success,
      ).toBe(false);
    },
  );
  it("counts actual UTF-8 bytes and enforces the streaming limit without Content-Length", async () => {
    const bytes = Buffer.from("ก".repeat(349526));
    expect(bytes.length).toBeGreaterThan(1048576);
    const request = new Request("http://localhost/webhook", {
      method: "POST",
      body: new ReadableStream({
        start(c) {
          c.enqueue(bytes.subarray(0, 500000));
          c.enqueue(bytes.subarray(500000));
          c.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    await expect(readWebhookBody(request)).rejects.toBeInstanceOf(
      WebhookBodyTooLarge,
    );
    await expect(
      readWebhookBody(
        new Request("http://localhost/webhook", {
          method: "POST",
          body: "A".repeat(1048576),
        }),
      ),
    ).resolves.toHaveLength(1048576);
  });
});
