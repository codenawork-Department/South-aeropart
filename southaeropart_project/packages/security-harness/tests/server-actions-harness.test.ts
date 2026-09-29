import { describe, it, expect } from "vitest";
import {
  CartAddAdapter,
  CheckoutCreateAdapter,
  GuestTrackAdapter,
  AdminProductAdapter,
  StripeWebhookAdapter,
} from "../src/adapters";
import { loadCorpus } from "../src/schema-validator";
import { expandCaseVariants } from "../src/execution-engine";
const corpus = loadCorpus();
const variant = (id: string) =>
  expandCaseVariants(
    corpus.cases.find((c) => c.id === id)!,
    corpus,
  )[0];
describe("Adapter evidence boundaries", () => {
  it("cart function invocation has no observed wire status", async () => {
    const res = await new CartAddAdapter().invoke(variant("N-02"));
    expect(res.success).toBe(true);
    expect(res.wireStatus).toBeNull();
    expect(res.evidenceLayer).toBe("action_unit");
  });
  it("cart returns a generic validation result without inventing HTTP evidence", async () => {
    const res = await new CartAddAdapter().invoke(variant("N-01"));
    expect(res.success).toBe(false);
    expect(res.wireStatus).toBeNull();
    expect(res.semanticStatus).toBe(422);
    expect(res.errorCode).toBe("INVALID_INPUT");
    expect(res.rawResponse).toEqual({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid request" },
    });
    expect(res.invariantsChecked.NO_LEAK).toBe(true);
  });
  it("all external adapters block even when called without the execution engine", async () => {
    for (const adapter of [
      new CheckoutCreateAdapter(),
      new GuestTrackAdapter(),
      new AdminProductAdapter(),
      new StripeWebhookAdapter(),
    ]) {
      const res = await adapter.invoke(variant("N-04"));
      expect(res.availability).toBe("blocked");
      expect(res.wireStatus).toBeNull();
      expect(res.invariantsChecked).toEqual({});
      expect(res.dbDiff).toBeUndefined();
    }
  });
});
