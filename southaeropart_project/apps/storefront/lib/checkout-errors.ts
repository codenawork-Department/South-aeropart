import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { InvalidPayableAmountError } from "@repo/lib/money-arithmetic";
const messages = {
  INVALID_INPUT: "Invalid request",
  CONFLICT: "Request conflicts with current state",
  UNAUTHENTICATED: "Authentication required",
  FORBIDDEN: "Request not permitted",
  RATE_LIMITED: "Too many requests",
  INTERNAL_ERROR: "Unable to process request",
} as const;
export function checkoutFailure(code: keyof typeof messages) {
  return { success: false as const, code, error: messages[code] };
}
export function checkoutException(error: unknown) {
  if (error instanceof ZodError || error instanceof InvalidPayableAmountError)
    return checkoutFailure("INVALID_INPUT");
  if (
    error instanceof Error &&
    error.message === "Insufficient or unavailable stock"
  )
    return checkoutFailure("CONFLICT");
  const requestId = randomUUID();
  process.stderr.write(
    JSON.stringify({ event: "checkout.create.failed", requestId }) + "\n",
  );
  return { ...checkoutFailure("INTERNAL_ERROR"), requestId };
}
