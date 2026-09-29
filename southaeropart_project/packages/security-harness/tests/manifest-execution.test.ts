import { describe, it, expect } from "vitest";
import {
  generateCoverageManifest,
  securityGatePassed,
  type RunSummary,
} from "../src/manifest-generator";
import { loadCorpus } from "../src/schema-validator";
import { expandCaseVariants } from "../src/execution-engine";
describe("Manifest structural integrity (not an application release gate)", () => {
  it("refuses malformed corpus before execution", async () => {
    await expect(
      generateCoverageManifest({
        ...loadCorpus(),
        schemaVersion: "invalid",
      } as never),
    ).rejects.toThrow("schema validation");
  });
  it("fails the gate on failures, missing coverage, or an empty run", () => {
    const summary: RunSummary = {
      totalVariants: 1,
      passed: 1,
      failed: 0,
      blocked: 0,
      unimplemented: 0,
      byLayer: { pure_unit: 1 },
      durationMs: 0,
      generatedAt: "test",
    };
    expect(securityGatePassed(summary)).toBe(true);
    for (const result of ["failed", "blocked", "unimplemented"] as const)
      expect(securityGatePassed({ ...summary, passed: 0, [result]: 1 })).toBe(
        false,
      );
    expect(
      securityGatePassed({ ...summary, totalVariants: 0, passed: 0 }),
    ).toBe(false);
  });
  it("retains every expanded variant and never passes missing/failed evidence", async () => {
    const corpus = loadCorpus();
    const expected = corpus.cases.flatMap((c) => expandCaseVariants(c, corpus));
    const { entries, summary } = await generateCoverageManifest(corpus);
    expect(entries).toHaveLength(expected.length);
    expect(
      new Set(entries.map((e) => e.caseId + ":" + e.target + ":" + e.variant))
        .size,
    ).toBe(entries.length);
    expect(summary.totalVariants).toBe(
      summary.passed + summary.failed + summary.blocked + summary.unimplemented,
    );
    for (const e of entries.filter((e) => e.result === "PASS")) {
      expect(e.invariantsFailed).toEqual([]);
      expect(e.invariantsNotMeasured).toEqual([]);
    }
    for (const e of entries.filter(
      (e) => e.result === "BLOCKED" || e.result === "UNIMPLEMENTED",
    )) {
      expect(e.dbDiff).toBeNull();
      expect(e.providerCalls.stripe).toBeNull();
    }
  }, 30000);
});
