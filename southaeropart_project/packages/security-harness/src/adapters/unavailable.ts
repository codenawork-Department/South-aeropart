import type { NormalizedResult } from "../types";

/** Missing execution evidence is never a synthetic rejection or zero side effects. */
export function unavailable(
  reason: string,
  state: "blocked" | "unimplemented" = "blocked",
): NormalizedResult {
  return {
    availability: state,
    success: false,
    wireStatus: null,
    semanticStatus: null,
    errorCode: null,
    errorMessage: reason,
    hasErrorCodeField: false,
    rawResponse: null,
    leaks: [],
    invariantsChecked: {},
    executionTimeMs: 0,
  };
}
