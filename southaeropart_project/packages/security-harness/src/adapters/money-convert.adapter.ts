import type { TargetAdapter } from "./base.adapter";
import type { ExpandedVariant, NormalizedResult } from "../types";

/** Independent decimal oracle. No float multiplication, trimming, or truncation. */
export function exactSatang(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value))
    return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export class MoneyConvertAdapter implements TargetAdapter {
  readonly targetName = "money.convert" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    const { toSmallestCurrencyUnit, InvalidMonetaryAmountError } =
      await import("@repo/lib/stripe");
    const start = performance.now();
    const input = (variant.payload as { amount?: unknown })?.amount;
    let result: number | undefined;
    let threw = false;
    let errorCode: string | null = null;
    let errorMessage: string | undefined;
    let genericError = false;
    try {
      result = toSmallestCurrencyUnit(input as string | number);
    } catch (error) {
      threw = true;
      if (error instanceof InvalidMonetaryAmountError) {
        errorCode = error.code;
        errorMessage = error.message;
        genericError =
          error.code === "INVALID_INPUT" && error.message === "Invalid request";
      }
    }
    const oracle = exactSatang(input);
    const expected =
      typeof variant.metadata?.expectedSatang === "string"
        ? BigInt(variant.metadata.expectedSatang)
        : oracle;
    const exact =
      !threw &&
      typeof result === "number" &&
      Number.isSafeInteger(result) &&
      oracle !== null &&
      BigInt(result) === oracle &&
      BigInt(result) === expected;
    return {
      evidenceLayer: "pure_unit",
      success: !threw,
      wireStatus: null,
      semanticStatus: threw ? 422 : 200,
      errorCode,
      errorMessage,
      hasErrorCodeField: errorCode !== null,
      rawResponse: { satangResult: result, threw },
      leaks: [],
      invariantsChecked: {
        INTEGER_EXACT: threw || exact,
        SAFE_ACCEPT: !threw,
        REJECT_NO_EFFECT: true,
        // This is the pure helper's public error code/message, not an HTTP envelope.
        ...(threw ? { NO_LEAK: genericError } : {}),
      },
      executionTimeMs: performance.now() - start,
    };
  }
}
