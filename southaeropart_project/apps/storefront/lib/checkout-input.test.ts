import { describe, it, expect } from "vitest";
import { checkoutSchema } from "./checkout-input";
const fixture = {
  shippingAddress: {
    recipientName: "Test",
    phone: "0800000000",
    line1: "Test",
    subDistrict: "Test",
    district: "Test",
    province: "Bangkok",
    postalCode: "10110",
  },
  items: [
    {
      productId: "10000000-0000-4000-8000-000000000001",
      productName: "Hint",
      quantity: 1,
      unitPrice: "NaN",
    },
  ],
};
describe("Checkout input boundary", () => {
  it("accepts an optional note and rejects invalid note input before writes", () => {
    expect(checkoutSchema.parse(fixture).customerNote).toBeUndefined();
    const customerNote = "Please call before delivery";
    expect(
      checkoutSchema.parse({ ...fixture, customerNote }).customerNote,
    ).toBe(customerNote);
    for (const invalid of [null, {}, 1, "ก".repeat(683), "x\0"]) {
      expect(
        checkoutSchema.safeParse({ ...fixture, customerNote: invalid }).success,
      ).toBe(false);
    }
  });
  it.each([0, -1, 101, 0.3, Infinity, "1", null])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(
        checkoutSchema.safeParse({
          ...fixture,
          items: [{ ...fixture.items[0], quantity }],
        }).success,
      ).toBe(false);
    },
  );
  it("keeps price hints but rejects authority fields at each nesting level", () => {
    expect(checkoutSchema.safeParse(fixture).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...fixture, total: 1 }).success).toBe(
      false,
    );
    expect(
      checkoutSchema.safeParse({
        ...fixture,
        shippingAddress: { ...fixture.shippingAddress, userId: "other" },
      }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        ...fixture,
        items: [{ ...fixture.items[0], status: "paid" }],
      }).success,
    ).toBe(false);
  });
});
