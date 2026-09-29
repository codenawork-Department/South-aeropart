import { describe, it, expect } from "vitest";
import {
  validateCorpusAgainstSchema,
  validatePayloadContract,
  loadCorpus,
} from "../src/schema-validator";

describe("Corpus Schema Conformance (Requirement 2)", () => {
  const corpus = loadCorpus();

  it("validates corpus.json with strict draft-07 settings (coercion=false, removeAdditional=false, useDefaults=false)", () => {
    const result = validateCorpusAgainstSchema(corpus);
    if (!result.valid) {
      console.error("Schema errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("verifies the 102 active groups after the requested coupon scope removal", () => {
    expect(corpus.cases).toHaveLength(102);
    expect(corpus.cases.some((c) => c.id === "N-26" || c.id === "N-27")).toBe(
      false,
    );
    expect(corpus.targets).not.toHaveProperty("coupon.apply");
    const validCategories = new Set(["N", "S", "T", "G", "W", "A"]);
    for (const testCase of corpus.cases) {
      expect(validCategories.has(testCase.category)).toBe(true);
      expect(testCase.id).toMatch(/^[NSTGWA]-[0-9]{2}$/);
      expect(testCase.targets.length).toBeGreaterThanOrEqual(1);
      expect(testCase.expected.invariants.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("verifies every active recipe has a definition", () => {
    const recipeCases = corpus.cases.filter((c) => c.input.mode === "recipe");
    for (const rc of recipeCases) {
      if (rc.input.mode === "recipe") {
        expect(corpus.recipeDefinitions[rc.input.name]).toBeDefined();
      }
    }
  });

  it("validates payload-contracts projections under strict mode", () => {
    // Positive cart
    const cartValid = validatePayloadContract("cart", {
      productId: "10000000-0000-4000-8000-000000000001",
      quantity: 5,
    });
    expect(cartValid.valid).toBe(true);

    // Negative cart (quantity > 10)
    const cartInvalid = validatePayloadContract("cart", {
      productId: "10000000-0000-4000-8000-000000000001",
      quantity: 11,
    });
    expect(cartInvalid.valid).toBe(false);

    // Strict non-coercion check: string "5" for integer quantity must fail!
    const cartString = validatePayloadContract("cart", {
      productId: "10000000-0000-4000-8000-000000000001",
      quantity: "5",
    });
    expect(cartString.valid).toBe(false);
  });
});
