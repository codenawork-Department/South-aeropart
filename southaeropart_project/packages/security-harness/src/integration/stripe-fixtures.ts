import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getStripe, type Stripe } from "@repo/lib/stripe";
import type { NativeRuntime } from "./native-runtime";

/** Test charges only; persist cleanup ownership before any provider write. No receipt email. */
export function createStripeFixtures(runtime: NativeRuntime): {
  stripe: Stripe;
  create(orderId: string): Promise<Stripe.PaymentIntent>;
  cleanup(): Promise<{
    ownedIntents: number;
    refunded: number;
    cleaned: boolean;
  }>;
} {
  assert(runtime.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"));
  const stripe = getStripe(runtime.env.STRIPE_SECRET_KEY);
  const owned: Array<{
    orderId: string;
    intentId?: string;
    refunded?: boolean;
    uncertain?: boolean;
  }> = [];
  const record = () =>
    fs.writeFileSync(
      path.join(runtime.directory, "stripe-fixtures.json"),
      JSON.stringify({ runId: runtime.runId, fixtures: owned }, null, 2),
    );
  return {
    stripe,
    async create(orderId: string) {
      const fixture: (typeof owned)[number] = { orderId, uncertain: true };
      owned.push(fixture);
      record();
      const intent = await stripe.paymentIntents.create(
        {
          amount: 10000,
          currency: "thb",
          payment_method_types: ["card"],
          payment_method: "pm_card_visa",
          confirm: true,
          metadata: { securityRunId: runtime.runId, orderId },
        },
        { idempotencyKey: `${runtime.runId}-create-${orderId}` },
      );
      fixture.intentId = intent.id;
      fixture.uncertain = false;
      record();
      assert.equal(intent.livemode, false);
      assert.equal(intent.status, "succeeded");
      assert.equal(intent.amount_received, 10000);
      return intent;
    },
    async cleanup() {
      let failures = 0;
      for (const fixture of owned) {
        if (!fixture.intentId) {
          failures++;
          continue;
        }
        try {
          const intent = await stripe.paymentIntents.retrieve(fixture.intentId);
          assert.equal(intent.livemode, false);
          assert.equal(intent.metadata.securityRunId, runtime.runId);
          assert.equal(intent.metadata.orderId, fixture.orderId);
          const refund = await stripe.refunds.create(
            {
              payment_intent: intent.id,
              metadata: { securityRunId: runtime.runId },
            },
            { idempotencyKey: `${runtime.runId}-refund-${intent.id}` },
          );
          assert.equal(refund.status, "succeeded");
          fixture.refunded = true;
        } catch {
          failures++;
        }
        record();
      }
      if (failures)
        throw new Error(
          "Owned Stripe test fixture cleanup incomplete; inspect the private stripe-fixtures.json record",
        );
      return {
        ownedIntents: owned.length,
        refunded: owned.filter((x) => x.refunded).length,
        cleaned: true,
      };
    },
  };
}
