import type { TargetAdapter } from "./base.adapter";
import type { ExpandedVariant, NormalizedResult } from "../types";
import { validatePayloadContract } from "../schema-validator";
import { containsLoneSurrogate } from "../unicode-helpers";
import { parseBoundedJson, JsonInputError } from "../json-parser";
import {
  checkedPayableSatang,
  InvalidPayableAmountError,
} from "@repo/lib/money-arithmetic";

function result(
  status: number,
  layer: "parser_only" | "isolated_validator",
): NormalizedResult {
  const code =
    status === 400
      ? "BAD_REQUEST"
      : status === 413
        ? "PAYLOAD_TOO_LARGE"
        : status === 415
          ? "UNSUPPORTED_MEDIA_TYPE"
          : "INVALID_INPUT";
  const message =
    status === 413
      ? "Request too large"
      : status === 415
        ? "Unsupported content type"
        : "Invalid request";
  const success = status === 200;
  return {
    evidenceLayer: layer,
    success,
    wireStatus: null,
    semanticStatus: status,
    errorCode: success ? null : code,
    errorMessage: success ? undefined : message,
    hasErrorCodeField: !success,
    rawResponse: success
      ? { success: true }
      : { success: false, error: { code, message } },
    leaks: [],
    invariantsChecked: {
      NO_LEAK: true,
      REJECT_NO_EFFECT: true,
      SAFE_ACCEPT: success,
    },
    executionTimeMs: 0,
  };
}
export class AmountValidateAdapter implements TargetAdapter {
  readonly targetName = "amount.validate" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    if (variant.recipe === "moneyArithmetic") {
      const input = variant.payload as Record<string, string>;
      const start = performance.now();
      let valid = true;
      // Translate the corpus's internal components to the same exact arithmetic used
      // by createOrder. This does not introduce a coupon field or checkout discount.
      const components =
        input.unitSatang !== undefined
          ? [BigInt(input.unitSatang) * BigInt(input.quantity)]
          : [
              BigInt(input.subtotalSatang),
              BigInt(input.shippingSatang ?? "0"),
              BigInt(input.taxSatang ?? "0"),
              -BigInt(input.discountSatang ?? "0"),
            ];
      try {
        checkedPayableSatang(components);
      } catch (error) {
        if (!(error instanceof InvalidPayableAmountError)) throw error;
        valid = false;
      }
      const observed = result(valid ? 200 : 422, "isolated_validator");
      observed.invariantsChecked.INTEGER_EXACT = true;
      observed.executionTimeMs = performance.now() - start;
      return observed;
    }
    const start = performance.now();
    const valid = validatePayloadContract("amount", variant.payload).valid;
    const observed = result(valid ? 200 : 422, "isolated_validator");
    const amount = (variant.payload as { amountSatang?: unknown })
      ?.amountSatang;
    // Rejection of fractional/unsafe input preserves the monetary invariant.
    observed.invariantsChecked.INTEGER_EXACT =
      !valid || (typeof amount === "number" && Number.isSafeInteger(amount));
    observed.executionTimeMs = performance.now() - start;
    return observed;
  }
}
export class ApiJsonAdapter implements TargetAdapter {
  readonly targetName = "api.json" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    const start = performance.now();
    const headers = new Headers(variant.headers);
    const media = headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (
      (media && media !== "application/json") ||
      headers.has("content-encoding")
    )
      return result(415, "parser_only");
    let observed: NormalizedResult;
    try {
      const raw = variant.rawPayload ?? JSON.stringify(variant.payload);
      const value = parseBoundedJson(
        Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "utf8"),
      );
      const parserOnly =
        variant.recipe === "nestedJson" ||
        variant.metadata?.layer === "parser_only";
      observed = result(
        parserOnly || validatePayloadContract("generic", value).valid
          ? 200
          : 422,
        "parser_only",
      );
    } catch (error) {
      if (!(error instanceof JsonInputError)) throw error;
      observed = result(error.status, "parser_only");
    }
    // Scope is only this offline parser's numeric acceptance, not application arithmetic.
    observed.invariantsChecked.INTEGER_EXACT = true;
    observed.executionTimeMs = performance.now() - start;
    return observed;
  }
}
export class NoteContractAdapter implements TargetAdapter {
  readonly targetName = "api.json" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    const note = (variant.payload as { note?: unknown })?.note;
    const valid =
      typeof note === "string" &&
      Buffer.byteLength(note, "utf8") <= 2048 &&
      !containsLoneSurrogate(note) &&
      validatePayloadContract("noteInput", { note }).valid;
    // Accepting text is not evidence of safe storefront/admin/email rendering.
    return result(valid ? 200 : 422, "isolated_validator");
  }
}
