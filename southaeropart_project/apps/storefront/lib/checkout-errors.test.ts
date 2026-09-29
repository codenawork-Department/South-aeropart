import { describe, it, expect, vi } from "vitest";
import { checkoutException } from "./checkout-errors";
import { checkoutSchema } from "./checkout-input";
describe("Checkout error redaction", () => {
  it("does not send database queries or stacks to the browser or log", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      const result = checkoutException(
        new Error("SQL PRIVATE_BINDING_SENTINEL secret"),
      );
      expect(result).toMatchObject({
        success: false,
        code: "INTERNAL_ERROR",
        error: "Unable to process request",
      });
      expect(JSON.stringify(result)).not.toContain("SENTINEL");
      expect(JSON.stringify(write.mock.calls)).not.toContain("SENTINEL");
    } finally {
      write.mockRestore();
    }
  });
  it("maps malformed input and reservation conflicts to generic stable errors", () => {
    const result = checkoutSchema.safeParse({});
    if (result.success) throw Error("unexpected valid fixture");
    expect(checkoutException(result.error).code).toBe("INVALID_INPUT");
    expect(
      checkoutException(new Error("Insufficient or unavailable stock")),
    ).toEqual({
      success: false,
      code: "CONFLICT",
      error: "Request conflicts with current state",
    });
  });
});
