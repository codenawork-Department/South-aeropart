import { describe, it, expect } from "vitest";
import { addToCart } from "./cart.actions";

const valid = {
  productId: "10000000-0000-4000-8000-000000000001",
  quantity: 1,
};
const rejected = {
  success: false,
  error: { code: "INVALID_INPUT", message: "Invalid request" },
};
const invoke = (input: unknown) =>
  addToCart(input as Parameters<typeof addToCart>[0]);

describe("Public cart input boundary", () => {
  it("keeps valid lower/upper quantity bounds and optional variant", async () => {
    for (const quantity of [1, 10]) {
      const input = { ...valid, quantity, variant: "Carbon" };
      expect(await invoke(input)).toEqual({ success: true, item: input });
    }
  });
  it.each([
    "isAdmin",
    "role",
    "userId",
    "paymentStatus",
    "total",
    "currency",
    "unexpectedField",
  ])("rejects untrusted extra field %s", async (key) => {
    expect(await invoke({ ...valid, [key]: "injected" })).toEqual(rejected);
  });
  it("handles invalid shapes and quantities without returning validation internals", async () => {
    for (const input of [
      null,
      [],
      {},
      { ...valid, productId: "not-uuid" },
      ...[0, -1, 11, 1.1, NaN, Infinity, "1", null, {}, []].map((quantity) => ({
        ...valid,
        quantity,
      })),
    ]) {
      expect(await invoke(input)).toEqual(rejected);
    }
  });
});
