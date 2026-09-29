import crypto from "crypto";
import { DEFAULT_FROZEN_SECONDS } from "./clock-controller";

export const DEFAULT_ISOLATED_WEBHOOK_SECRET =
  "whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export interface StripeSignatureOptions {
  payload: string | Buffer;
  secret?: string;
  timestamp?: number;
  scheme?:
    | "v1"
    | "v0"
    | "v0_only"
    | "multiple_v1_one_valid"
    | "v1_valid_plus_v0"
    | "missing_v1"
    | "missing_t"
    | "wrong_signature";
}

/**
 * Generates actual Stripe HMAC-SHA256 test signatures over exact raw bytes (Requirement 9).
 */
export function generateStripeTestSignature(
  options: StripeSignatureOptions,
): string {
  const secret = options.secret || DEFAULT_ISOLATED_WEBHOOK_SECRET;
  const timestamp = options.timestamp ?? DEFAULT_FROZEN_SECONDS;
  const payloadBytes = Buffer.isBuffer(options.payload)
    ? options.payload
    : Buffer.from(options.payload, "utf8");

  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, "utf8"),
    payloadBytes,
  ]);

  const validV1Digest = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  switch (options.scheme) {
    case "missing_v1":
      return `t=${timestamp}`;
    case "missing_t":
      return `v1=${validV1Digest}`;
    case "wrong_signature":
      return `t=${timestamp},v1=0000000000000000000000000000000000000000000000000000000000000000`;
    case "v0_only":
    case "v0":
      return `t=${timestamp},v0=${validV1Digest}`;
    case "multiple_v1_one_valid":
      return `t=${timestamp},v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef,v1=${validV1Digest}`;
    case "v1_valid_plus_v0":
      return `t=${timestamp},v0=oldlegacyv0digest,v1=${validV1Digest}`;
    case "v1":
    default:
      return `t=${timestamp},v1=${validV1Digest}`;
  }
}

/**
 * Mutates raw payload bytes AFTER signing without re-signing (Requirement 9, W-03).
 */
export function mutateBytesAfterSignature(
  rawBody: string,
  variant:
    | "space_after_sign"
    | "reorder_after_sign"
    | "newline_after_sign"
    | "unicode_escape_after_sign",
): string {
  switch (variant) {
    case "space_after_sign":
      return rawBody + " ";
    case "newline_after_sign":
      return rawBody + "\n";
    case "reorder_after_sign": {
      try {
        const obj = JSON.parse(rawBody);
        const keys = Object.keys(obj).reverse();
        const reordered: Record<string, unknown> = {};
        for (const k of keys) reordered[k] = obj[k];
        return JSON.stringify(reordered);
      } catch {
        return rawBody + " ";
      }
    }
    case "unicode_escape_after_sign": {
      // Replaces an ASCII character with \u00XX escape
      if (rawBody.includes("event")) {
        return rawBody.replace("event", "\\u0065vent");
      }
      return rawBody.replace("{", "{\\u0020");
    }
    default:
      return rawBody;
  }
}
