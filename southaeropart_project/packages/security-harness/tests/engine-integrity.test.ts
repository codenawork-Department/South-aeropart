import { describe, it, expect, vi, afterEach } from "vitest";
import {
  evaluateVariant,
  expandCaseVariants,
  executeVariant,
} from "../src/execution-engine";
import { checkSecurityTestIsolation } from "../src/isolation-guard";
import { loadCorpus } from "../src/schema-validator";
import type { NormalizedResult } from "../src/types";
const corpus = loadCorpus();
const testCase = corpus.cases.find((c) => c.id === "W-02")!;
const variant = expandCaseVariants(testCase, corpus)[0];
function observed(overrides: Partial<NormalizedResult> = {}): NormalizedResult {
  return {
    success: true,
    wireStatus: 200,
    semanticStatus: 200,
    errorCode: null,
    hasErrorCodeField: false,
    rawResponse: { received: true },
    leaks: [],
    executionTimeMs: 0,
    invariantsChecked: { SAFE_ACCEPT: true, AT_MOST_ONCE: true },
    ...overrides,
  };
}
afterEach(() => vi.unstubAllEnvs());
describe("Result integrity", () => {
  it("requires verified multi-step execution and still enforces every invariant", () => {
    const test = corpus.cases.find((c) => c.id === "A-06")!;
    const race = expandCaseVariants(test, corpus)[0];
    const evidence = observed({
      success: false,
      wireStatus: 200,
      semanticStatus: 409,
      errorCode: "CONFLICT",
      hasErrorCodeField: true,
      invariantsChecked: {
        NO_LEAK: true,
        AUTHORITATIVE: true,
        AT_MOST_ONCE: true,
      },
    });
    expect(evaluateVariant(race, test, evidence).result).toBe("BLOCKED");
    expect(
      evaluateVariant(race, test, { ...evidence, multiStepVerified: true })
        .result,
    ).toBe("PASS");
    expect(
      evaluateVariant(race, test, {
        ...evidence,
        multiStepVerified: true,
        invariantsChecked: {
          ...evidence.invariantsChecked,
          AT_MOST_ONCE: false,
        },
      }).result,
    ).toBe("FAIL");
  });
  it("fails an explicitly failed invariant", () => {
    const result = evaluateVariant(
      variant,
      testCase,
      observed({
        invariantsChecked: { SAFE_ACCEPT: true, AT_MOST_ONCE: false },
      }),
    );
    expect(result.result).toBe("FAIL");
    expect(result.invariantsFailed).toContain("AT_MOST_ONCE");
  });
  it("blocks missing evidence instead of inventing a product failure", () => {
    const result = evaluateVariant(
      variant,
      testCase,
      observed({ invariantsChecked: { SAFE_ACCEPT: true } }),
    );
    expect(result.result).toBe("BLOCKED");
    expect(result.invariantsNotMeasured).toEqual(["AT_MOST_ONCE"]);
    expect(result.dbDiff).toBeNull();
    expect(result.providerCalls.stripe).toBeNull();
  });
  it("requires observed HTTP status", () => {
    expect(
      evaluateVariant(variant, testCase, observed({ wireStatus: null })).result,
    ).toBe("BLOCKED");
    expect(
      evaluateVariant(variant, testCase, observed({ wireStatus: 500 })).result,
    ).toBe("FAIL");
  });
  it("does not invent an error-code failure from an unobserved action envelope", () => {
    const c = corpus.cases.find((c) => c.id === "N-01")!;
    const v = expandCaseVariants(c, corpus)[0];
    const res = evaluateVariant(
      v,
      c,
      observed({
        success: false,
        wireStatus: null,
        semanticStatus: null,
        evidenceLayer: "action_unit",
        invariantsChecked: {},
      }),
    );
    expect(res.result).toBe("BLOCKED");
    expect(res.evidence).toContain("Error envelope not observed");
  });
  it("does not infer duplicate business effects from two successful acknowledgements", () => {
    expect(
      evaluateVariant(
        variant,
        testCase,
        observed({ rawResponse: [{ received: true }, { received: true }] }),
      ).result,
    ).toBe("PASS");
  });
  it("does not require wire200 for an intended transport413", () => {
    const c = corpus.cases.find((c) => c.id === "S-16")!;
    const v = expandCaseVariants(c, corpus)[0];
    const res = observed({
      success: false,
      wireStatus: 413,
      semanticStatus: 413,
      errorCode: "PAYLOAD_TOO_LARGE",
      invariantsChecked: {
        NO_LEAK: true,
        REJECT_NO_EFFECT: true,
        RESOURCE_BOUNDED: true,
      },
    });
    expect(evaluateVariant(v, c, res).result).toBe("PASS");
  });
  it("keeps unimplemented effects and metrics unknown", () => {
    const c = corpus.cases.find((c) => c.id === "N-17")!;
    const v = expandCaseVariants(c, corpus)[0];
    const result = evaluateVariant(
      v,
      c,
      observed({
        availability: "unimplemented",
        wireStatus: null,
        semanticStatus: null,
        invariantsChecked: {},
      }),
    );
    expect(result.result).toBe("UNIMPLEMENTED");
    expect(result.invariantsPassed).toEqual([]);
    expect(result.dbDiff).toBeNull();
  });
  it("cannot invoke a live surface with forged environment authorization", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://qa:qa@localhost/qa");
    vi.stubEnv("TEST_DATABASE_URL", "postgres://qa:qa@localhost/qa");
    vi.stubEnv("TEST_DATABASE_DISPOSABLE", "true");
    vi.stubEnv("RESEND_API_KEY", "re_mock_sink_forged");
    const result = await executeVariant(variant, testCase);
    expect(result.result).toBe("BLOCKED");
    expect(result.actualWireStatus).toBeNull();
  });
});
describe("Isolation preflight", () => {
  it("rejects arbitrary endpoints and fake-looking sink credentials", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("TEST_DATABASE_DISPOSABLE", "true");
    vi.stubEnv("DATABASE_URL", "postgres://qa:qa@anything.internal.test/db");
    vi.stubEnv(
      "TEST_DATABASE_URL",
      "postgres://qa:qa@anything.internal.test/db",
    );
    vi.stubEnv("SECURITY_TEST_DB_ALLOWLIST", "[]");
    vi.stubEnv("RESEND_API_KEY", "re_mock_sink_fake");
    const res = checkSecurityTestIsolation({
      requireDatabase: true,
      requireEmailSink: true,
    });
    expect(res.isIsolated).toBe(false);
    expect(res.emailSinkActive).toBe(false);
  });
  it("requires both application/test URLs even for an allowlisted endpoint", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("TEST_DATABASE_DISPOSABLE", "true");
    vi.stubEnv("TEST_DATABASE_URL", "postgres://qa:qa@localhost/test");
    vi.stubEnv(
      "SECURITY_TEST_DB_ALLOWLIST",
      '["postgres://localhost:5432/test#qa"]',
    );
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    vi.stubEnv("RESEND_API_KEY", undefined);
    expect(
      checkSecurityTestIsolation({
        requireDatabase: true,
        requireEmailSink: false,
      }).isIsolated,
    ).toBe(false);
  });
  it("redacts malformed URL credentials", () => {
    vi.stubEnv("TEST_DATABASE_URL", "password-DO-NOT-LEAK");
    expect(
      JSON.stringify(checkSecurityTestIsolation({ requireDatabase: true })),
    ).not.toContain("DO-NOT-LEAK");
  });
});
