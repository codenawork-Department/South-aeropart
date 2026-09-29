import { describe, it, expect } from "vitest";
import { parseOrderReadInput } from "./order-read-input";
const orderId = "10000000-0000-4000-8000-000000000001";
describe("Order read public arguments", () => {
  it.each(["expiresAt", "createdAt", "userId", "__proto__"])(
    "rejects %s without stripping it",
    (key) => {
      const input = JSON.parse(
        JSON.stringify({
          orderId,
          guestToken: "a".repeat(64),
          [key]: "forged",
        }),
      );
      expect(parseOrderReadInput(input)).toBeNull();
      expect(Object.hasOwn(input, key)).toBe(true);
    },
  );
  it("retains positional compatibility and the strict object contract", () => {
    const guestToken = "a".repeat(64);
    expect(parseOrderReadInput({ orderId, guestToken })).toEqual(
      parseOrderReadInput(orderId, guestToken),
    );
    expect(parseOrderReadInput({ orderId, guestToken }, guestToken)).toBeNull();
  });
  it("preserves malformed tokens for generic NOT_FOUND checks", () => {
    expect(parseOrderReadInput({ orderId, guestToken: null })).toEqual({
      orderId,
      guestToken: null,
    });
    expect(parseOrderReadInput({ orderId })).toEqual({ orderId });
    expect(parseOrderReadInput({ orderId: "invalid" })).toBeNull();
  });
});
