import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { ExpandedVariant } from "../types";

export interface GuestFixture {
  orderId: string;
  otherOrderId: string;
  nonexistentOrderId: string;
  userId: string;
  createdAt: string;
  nowMs: number;
  secret: string;
}

/** Re-sign the owned fixture first, then apply the corpus mutation verbatim. */
export function guestArguments(
  variant: ExpandedVariant,
  fixture: GuestFixture,
) {
  const payload = variant.payload as {
    orderId?: unknown;
    guestToken?: unknown;
  };
  let orderId: unknown =
    variant.caseId === "G-01" ? payload.orderId : fixture.orderId;
  const token = createHmac("sha256", fixture.secret)
    .update(
      `guest_order:${fixture.orderId}:${fixture.userId}:${fixture.createdAt}`,
    )
    .digest("hex");
  let guestToken: unknown = token;
  const mutation = variant.metadata?.tokenVariant;
  switch (mutation) {
    case "missing":
    case "valid_cookie_only":
      guestToken = undefined;
      break;
    case "null":
      guestToken = null;
      break;
    case "array":
      guestToken = [token];
      break;
    case "object":
      guestToken = { token };
      break;
    case "empty":
      guestToken = "";
      break;
    case "length_63":
      guestToken = token.slice(0, 63);
      break;
    case "length_65":
      guestToken = token + "a";
      break;
    case "non_hex_64":
      guestToken = token.slice(0, 63) + "z";
      break;
    case "uppercase_valid":
      guestToken = token.toUpperCase();
      break;
    case "one_char_changed":
      guestToken = (token[0] === "a" ? "b" : "a") + token.slice(1);
      break;
    case "leading_space":
      guestToken = " " + token;
      break;
    case "trailing_newline":
      guestToken = token + "\n";
      break;
    case "embedded_nul":
      guestToken = token.slice(0, 32) + "\0" + token.slice(33);
      break;
    case "base64_instead_of_hex":
      guestToken = Buffer.from(token, "hex").toString("base64");
      break;
    case "jwt_instead_of_hmac":
      guestToken = payload.guestToken;
      break;
    case "valid_parameter":
    case undefined:
      break;
    default:
      throw new Error("Unbound guest token mutation");
  }
  const ownership = variant.metadata?.ownershipVariant;
  if (ownership === "token_A_order_B") orderId = fixture.otherOrderId;
  if (ownership === "valid_shape_nonexistent_order")
    orderId = fixture.nonexistentOrderId;
  if (variant.caseId === "G-08") guestToken = payload.guestToken;
  if (ownership === "customer_session_guest_order_wrong_token")
    guestToken = "0".repeat(64);
  if (variant.caseId === "G-09") {
    // Keep the injected fields on the production object's actual boundary.
    return {
      args: [{ ...payload, orderId: fixture.orderId, guestToken: token }],
      token,
      cookieOnly: false,
    };
  }
  // Missing is a truly omitted second argument, not a JSON null substitution.
  return {
    args: guestToken === undefined ? [orderId] : [orderId, guestToken],
    token,
    cookieOnly: mutation === "valid_cookie_only",
  };
}

export function guestCreationTime(variant: ExpandedVariant, nowMs: number) {
  if (typeof variant.metadata?.ageSeconds === "number")
    return new Date(nowMs - variant.metadata.ageSeconds * 1000).toISOString();
  const value = variant.metadata?.creationValue;
  // PostgreSQL accepts these timestamps; Drizzle maps their textual values to Invalid Date.
  // This exercises the real DB-to-action path without a public clock/input bypass.
  if (value === "invalid_date") return "infinity";
  if (value === "out_of_date_range") return "290000-01-01 00:00:00+00";
  if (value === "now_plus_1_second")
    return new Date(nowMs + 1000).toISOString();
  if (value === "unix_seconds_as_milliseconds")
    return new Date(Math.floor(nowMs / 1000)).toISOString();
  assert(!value, "Unknown creation timestamp fixture");
  return new Date(nowMs - 60000).toISOString();
}
