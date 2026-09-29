import { describe, it, expect } from "vitest";
import {
  loadCorpus,
  validateCorpusAgainstSchema,
} from "../src/schema-validator";
import { expandCaseVariants } from "../src/execution-engine";

describe("Approved oversized action contract", () => {
  it("changes only three oversized variants without removing any invariant or case", () => {
    const corpus = loadCorpus();
    expect(validateCorpusAgainstSchema(corpus).valid).toBe(true);
    const all = corpus.cases.flatMap((test) =>
      expandCaseVariants(test, corpus),
    );
    expect(all).toHaveLength(477);
    const keys: string[] = [];
    for (const test of corpus.cases) {
      const original = structuredClone(test);
      delete original.expected.variantOverrides;
      const before = expandCaseVariants(original, corpus);
      const after = expandCaseVariants(test, corpus);
      after.forEach((variant, i) => {
        expect(variant.invariants).toEqual(before[i].invariants);
        expect(variant.payload).toEqual(before[i].payload);
        if (variant.expectedHttpStatus !== before[i].expectedHttpStatus) {
          keys.push(`${variant.caseId}:${variant.variantKey}`);
          expect(variant.expectedSemanticStatus).toBe(413);
          expect(variant.expectedErrorCode).toBe("PAYLOAD_TOO_LARGE");
        }
      });
    }
    expect(keys.sort()).toEqual([
      "G-08:len_1048576_fill_a",
      "T-04:len_1048576_fill_A",
      "T-06:utf8_bytes_1048576",
    ]);
  });
  it("refuses typo overrides instead of silently keeping stale expectations", () => {
    const corpus = loadCorpus();
    const test = structuredClone(corpus.cases[0]);
    test.expected.variantOverrides = {
      missing: {
        semanticStatus: 413,
        wireStatus: 413,
        errorCode: "PAYLOAD_TOO_LARGE",
      },
    };
    expect(() => expandCaseVariants(test, corpus)).toThrow(
      "Unknown expected variant",
    );
  });
});
