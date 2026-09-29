import { describe, it, expect, vi, afterEach } from "vitest";
import { constructStripeWebhookEvent } from "@repo/lib/stripe";
import { dispatchRecipe } from "../src/recipe-dispatcher";
import { loadCorpus } from "../src/schema-validator";
import { webhookFixture } from "../src/integration/webhook-fixture";
import { expandCaseVariants } from "../src/execution-engine";
import {
  DEFAULT_ISOLATED_WEBHOOK_SECRET,
  generateStripeTestSignature,
} from "../src/stripe-test-signer";
const corpus = loadCorpus();
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
function setup() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_signature_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", DEFAULT_ISOLATED_WEBHOOK_SECRET);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-24T00:00:00Z"));
}
describe("Offline Stripe signature SDK checks (no HTTP/DB/fulfillment evidence)", () => {
  it("rebinds native fixtures without repairing the intended malformed fields", () => {
    const fixture = {
      orderId: "550e8400-e29b-41d4-a716-446655440000",
      intentId: "pi_owned_fixture",
      eventId: "evt_owned_fixture",
    };
    for (const testCase of corpus.cases.filter((c) =>
      ["W-10", "W-11", "W-14"].includes(c.id),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus)) {
        const prepared = webhookFixture(
          variant,
          corpus,
          fixture,
          DEFAULT_ISOLATED_WEBHOOK_SECRET,
          1790611200,
        );
        if (variant.metadata?.malformedVariant === "invalid_json") {
          expect(() => JSON.parse(prepared.body.toString())).toThrow();
          continue;
        }
        const value = JSON.parse(prepared.body.toString());
        if (testCase.id === "W-11")
          expect(value.created).toEqual(variant.metadata?.createdValue);
        if (variant.metadata?.malformedVariant === "missing_id")
          expect(value).not.toHaveProperty("id");
        if (variant.metadata?.bindingVariant === "other_payment_intent")
          expect(value.data.object.id).toBe("pi_other_unbound_999");
        if (variant.metadata?.bindingVariant === "invalid_order_uuid")
          expect(value.data.object.metadata.orderId).toBe("not-a-uuid");
      }
    }
  });
  it("keeps native B-1/B/B+1 UTF-8 sizes exact after replacing fixture IDs", () => {
    setup();
    const fixture = {
      orderId: "550e8400-e29b-41d4-a716-446655440000",
      intentId: "pi_owned_fixture",
      eventId: "evt_owned_fixture",
    };
    for (const testCase of corpus.cases.filter((c) =>
      ["S-14", "S-15"].includes(c.id),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "stripe.webhook",
      )) {
        const prepared = webhookFixture(
          variant,
          corpus,
          fixture,
          DEFAULT_ISOLATED_WEBHOOK_SECRET,
          1790208000,
        );
        expect(prepared.body.length).toBe(variant.metadata?.targetSize);
        expect(() =>
          constructStripeWebhookEvent(
            prepared.body,
            prepared.headers["stripe-signature"],
          ),
        ).not.toThrow();
      }
    }
  });
  it("verifies multi-v1 and rejects every corrupted signature variant", () => {
    setup();
    const variants = dispatchRecipe(
      "stripeSignature",
      {
        variants: [
          "valid",
          "multiple_v1_one_valid",
          "wrong_secret",
          "wrong_signature",
          "v0_only",
          "empty",
          "missing",
          "space_after_sign",
          "newline_after_sign",
        ],
      },
      corpus.fixtures.stripe,
    );
    for (const v of variants) {
      const invoke = () =>
        constructStripeWebhookEvent(
          v.rawPayload!,
          v.headers?.["stripe-signature"] ?? "",
        );
      if (
        v.variantKey === "sig_valid" ||
        v.variantKey === "sig_multiple_v1_one_valid"
      )
        expect(invoke).not.toThrow();
      else expect(invoke).toThrow();
    }
  });
  it("tests actual SDK clock at the 299/300/301-second boundary", () => {
    setup();
    const body = JSON.stringify({
      id: "evt_local",
      object: "event",
      type: "customer.created",
      data: { object: {} },
    });
    const now = Math.floor(Date.now() / 1000);
    for (const age of [299, 300, 301]) {
      const sig = generateStripeTestSignature({
        payload: body,
        timestamp: now - age,
      });
      if (age <= 300)
        expect(() => constructStripeWebhookEvent(body, sig)).not.toThrow();
      else expect(() => constructStripeWebhookEvent(body, sig)).toThrow();
    }
  });
});
