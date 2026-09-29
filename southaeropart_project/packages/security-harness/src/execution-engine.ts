import crypto from "crypto";
import type {
  TestCase,
  TargetName,
  ExpandedVariant,
  CoverageManifestEntry,
  TestResultOutcome,
  EvidenceLayer,
  InvariantName,
  NormalizedResult,
} from "./types";
import { loadCorpus } from "./schema-validator";
import { dispatchRecipe } from "./recipe-dispatcher";
import { getAdapterForTarget } from "./adapters";
import { setJsonPointer } from "./json-pointer";

export function expandCaseVariants(
  testCase: TestCase,
  corpus = loadCorpus(),
): ExpandedVariant[] {
  const expanded: ExpandedVariant[] = [];

  for (const target of testCase.targets) {
    const targetMeta = corpus.targets[target];
    const fixtureKey =
      (testCase.fixture === "target_default"
        ? targetMeta?.fixture
        : testCase.fixture) || "generic";
    const baselineFixture: any = corpus.fixtures[fixtureKey] || {};

    let layer: EvidenceLayer = "server_action";
    if (targetMeta?.transport === "unit") layer = "pure_unit";
    else if (targetMeta?.transport === "route_handler") layer = "route_handler";
    else if (target === "api.json") layer = "parser_only";
    else if (target === "amount.validate") layer = "isolated_validator";

    const expectedHttpStatus = testCase.expected.httpStatus[target] ?? null;
    const expectedSemanticStatus = testCase.expected.semanticStatus;

    if (testCase.input.mode === "values") {
      const { path, values } = testCase.input;
      values.forEach((val, idx) => {
        const seed = crypto
          .createHash("sha256")
          .update(`${testCase.id}:${target}:${path}:${idx}`)
          .digest("hex")
          .slice(0, 8);

        const clone = JSON.parse(
          JSON.stringify(baselineFixture.input || baselineFixture),
        );
        setJsonPointer(clone, path, val);

        expanded.push({
          caseId: testCase.id,
          target,
          variantKey: `val_${idx}_${String(val).slice(0, 15)}`,
          seed,
          layer,
          payload: clone,
          expectedSemanticStatus,
          expectedHttpStatus,
          expectedErrorCode: testCase.expected.errorCode,
          invariants: testCase.expected.invariants,
          notes: testCase.summary,
        });
      });
    } else if (testCase.input.mode === "raw") {
      testCase.input.values.forEach((rawVal, idx) => {
        const seed = crypto
          .createHash("sha256")
          .update(`${testCase.id}:${target}:raw:${idx}`)
          .digest("hex")
          .slice(0, 8);

        expanded.push({
          caseId: testCase.id,
          target,
          variantKey: `raw_${idx}`,
          seed,
          layer,
          payload: rawVal,
          rawPayload: rawVal,
          expectedSemanticStatus,
          expectedHttpStatus,
          expectedErrorCode: testCase.expected.errorCode,
          invariants: testCase.expected.invariants,
          notes: testCase.summary,
        });
      });
    } else if (testCase.input.mode === "recipe") {
      const recipeVariants = dispatchRecipe(
        testCase.input.name,
        testCase.input.args,
        baselineFixture,
        target,
      );

      recipeVariants.forEach((rv, idx) => {
        const seed = crypto
          .createHash("sha256")
          .update(`${testCase.id}:${target}:${rv.variantKey}:${idx}`)
          .digest("hex")
          .slice(0, 8);

        expanded.push({
          caseId: testCase.id,
          target,
          variantKey: rv.variantKey,
          seed,
          layer,
          payload: rv.payload,
          rawPayload: rv.rawPayload,
          headers: rv.headers,
          recipe:
            testCase.input.mode === "recipe" ? testCase.input.name : undefined,
          metadata: rv.metadata,
          expectedSemanticStatus,
          expectedHttpStatus,
          expectedErrorCode: testCase.expected.errorCode,
          invariants: testCase.expected.invariants,
          notes: testCase.summary,
        });
      });
    }
  }

  for (const [key, expected] of Object.entries(
    testCase.expected.variantOverrides ?? {},
  )) {
    const matches = expanded.filter((variant) => variant.variantKey === key);
    if (!matches.length)
      throw new Error(`Unknown expected variant ${testCase.id}:${key}`);
    for (const variant of matches) {
      variant.expectedSemanticStatus = expected.semanticStatus;
      variant.expectedHttpStatus = expected.wireStatus;
      variant.expectedErrorCode = expected.errorCode;
    }
  }
  return expanded;
}

export function evaluateVariant(
  variant: ExpandedVariant,
  testCase: TestCase,
  observed: NormalizedResult,
): CoverageManifestEntry {
  const layer = observed.evidenceLayer ?? variant.layer;
  const passed: InvariantName[] = [];
  const failed: InvariantName[] = [];
  const missing: InvariantName[] = [];
  const failures: string[] = [];
  const gaps: string[] = [];

  for (const inv of variant.invariants) {
    const value = observed.invariantsChecked[inv];
    if (value === true) passed.push(inv);
    else if (value === false) failed.push(inv);
    else missing.push(inv);
  }
  if (failed.length)
    failures.push("Measured invariants failed: " + failed.join(", "));
  if (missing.length) gaps.push("Not measured: " + missing.join(", "));
  if (observed.leaks.length)
    failures.push("Response leakage detected: " + observed.leaks.join(", "));

  // Parser/validator projections have HTTP-equivalent semantics, never wire evidence.
  const equivalentOnly =
    layer === "parser_only" || layer === "isolated_validator";
  if (variant.expectedHttpStatus !== null && !equivalentOnly) {
    if (observed.wireStatus === null)
      gaps.push("Native HTTP boundary not exercised");
    else if (observed.wireStatus !== variant.expectedHttpStatus)
      failures.push(
        "Wire status mismatch: expected " +
          variant.expectedHttpStatus +
          ", got " +
          observed.wireStatus,
      );
  }
  if (observed.semanticStatus === null)
    gaps.push("Semantic result not observed");
  else if (observed.semanticStatus !== variant.expectedSemanticStatus)
    failures.push(
      "Semantic status mismatch: expected " +
        variant.expectedSemanticStatus +
        ", got " +
        observed.semanticStatus,
    );

  const outcome = testCase.expected.outcome;
  if (outcome === "reject" && observed.success)
    failures.push("Expected rejection; target accepted input");
  if (
    (outcome === "accept" || outcome === "accept_or_noop_by_variant") &&
    !observed.success
  )
    failures.push("Expected acceptance; target rejected input");
  if (
    (outcome === "retry" || outcome === "one_accept_one_conflict") &&
    observed.multiStepVerified !== true
  )
    gaps.push(
      "Multi-step recovery/race execution and state evidence are not implemented",
    );
  if (variant.expectedErrorCode && !observed.success) {
    if (observed.semanticStatus === null)
      gaps.push("Error envelope not observed");
    else if (observed.errorCode !== variant.expectedErrorCode)
      failures.push(
        "Error-code contract mismatch: expected " +
          variant.expectedErrorCode +
          ", got " +
          (observed.errorCode ?? "none"),
      );
  }

  const unavailableState = observed.availability;
  const result: TestResultOutcome =
    unavailableState === "unimplemented"
      ? "UNIMPLEMENTED"
      : unavailableState === "blocked"
        ? "BLOCKED"
        : failures.length
          ? "FAIL"
          : gaps.length
            ? "BLOCKED"
            : "PASS";
  const evidence =
    unavailableState === "blocked" || unavailableState === "unimplemented"
      ? (observed.errorMessage ?? "Execution unavailable")
      : [...failures, ...gaps].join("; ") ||
        "Assertions satisfied at " + layer + " layer only.";
  return {
    caseId: variant.caseId,
    target: variant.target,
    variant: variant.variantKey,
    seed: variant.seed,
    layer,
    actualWireStatus: observed.wireStatus,
    semanticResult: observed.semanticStatus,
    dbDiff: observed.dbDiff
      ? {
          ...observed.dbDiff,
          leakFree: observed.invariantsChecked.NO_LEAK === true,
        }
      : null,
    providerCalls: observed.providerCalls ?? { stripe: null, resend: null },
    result,
    invariantsPassed:
      unavailableState === "blocked" || unavailableState === "unimplemented"
        ? []
        : passed,
    invariantsFailed:
      unavailableState === "blocked" || unavailableState === "unimplemented"
        ? []
        : failed,
    invariantsNotMeasured:
      unavailableState === "blocked" || unavailableState === "unimplemented"
        ? variant.invariants
        : missing,
    leakDetected: observed.leaks.length > 0,
    evidence,
    gapReason: result === "PASS" ? undefined : evidence,
  };
}

export async function executeVariant(
  variant: ExpandedVariant,
  testCase: TestCase,
): Promise<CoverageManifestEntry> {
  const adapter = getAdapterForTarget(variant.target, testCase);
  try {
    // Stateful adapters fail closed themselves, including direct adapter invocation.
    // Promise.all and HTTP success counts cannot prove business idempotency.
    return evaluateVariant(variant, testCase, await adapter.invoke(variant));
  } catch {
    return evaluateVariant(variant, testCase, {
      availability: "blocked",
      success: false,
      wireStatus: null,
      semanticStatus: null,
      errorCode: null,
      errorMessage:
        "Harness/fixture execution failed before reliable observations. Inspect the isolated runner.",
      hasErrorCodeField: false,
      rawResponse: null,
      invariantsChecked: {},
      leaks: [],
      executionTimeMs: 0,
    });
  }
}
