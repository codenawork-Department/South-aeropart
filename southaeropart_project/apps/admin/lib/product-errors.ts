import { randomUUID } from "node:crypto";

const messages = {
  INVALID_INPUT: "Invalid request",
  UNAUTHENTICATED: "Authentication required",
  FORBIDDEN: "Request not permitted",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Request conflicts with current state",
  INTERNAL_ERROR: "Unable to process request",
} as const;
export function productFailure(code: keyof typeof messages) {
  return { success: false as const, code, message: messages[code] };
}
export function productException(
  error: unknown,
  operation: "create" | "update",
) {
  let cause = error;
  for (
    let depth = 0;
    depth < 5 && cause && typeof cause === "object";
    depth++
  ) {
    if ("code" in cause && cause.code === "23505")
      return productFailure("CONFLICT");
    cause = "cause" in cause ? cause.cause : undefined;
  }
  const requestId = randomUUID();
  // Avoid forwarding raw database/provider errors through development RSC console frames.
  process.stderr.write(
    JSON.stringify({ event: `product.${operation}.failed`, requestId }) + "\n",
  );
  return { ...productFailure("INTERNAL_ERROR"), requestId };
}
