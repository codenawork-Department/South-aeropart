import { describe, expect, it } from "vitest";
import { productInputSchema } from "./product-input";

const baseline = {
  sku: "QA-VALID",
  name: "QA Product",
  price: "100.00",
  stockQuantity: 100,
  description: "Text",
};
describe("Product input security boundaries", () => {
  it.each([-1, 1.1, 2147483648, Number.MAX_SAFE_INTEGER])(
    "rejects out-of-range stock %s",
    (stockQuantity) => {
      expect(
        productInputSchema.safeParse({ ...baseline, stockQuantity }).success,
      ).toBe(false);
    },
  );
  it.each([0, 1, 2147483647])("preserves int32 stock %s", (stockQuantity) => {
    expect(
      productInputSchema.parse({ ...baseline, stockQuantity }).stockQuantity,
    ).toBe(stockQuantity);
  });
  it.each(["-1", "0.001", "10000000000.00", "1e5", " 10 "])(
    "rejects invalid/overflow price %s",
    (price) => {
      expect(productInputSchema.safeParse({ ...baseline, price }).success).toBe(
        false,
      );
    },
  );
  it.each(["0.00", "0.01", "9999999999.99"])(
    "preserves decimal catalog price %s",
    (price) => {
      expect(productInputSchema.parse({ ...baseline, price }).price).toBe(
        price,
      );
    },
  );
  it.each([
    " ",
    "\t",
    "АBC",
    "ＡＢＣ",
    "AB\u200bC",
    "AB\u200dC",
    "ABC\u202eDEF",
    "QA\u0000SKU",
    "ABC\r\nX",
  ])("rejects blank/ambiguous SKU %j", (sku) => {
    expect(productInputSchema.safeParse({ ...baseline, sku }).success).toBe(
      false,
    );
  });
  it.each(["\ud800", "\udfff", "ABC\u202eDEF", "A\u0000B"])(
    "rejects unsafe Unicode name %j",
    (name) => {
      expect(productInputSchema.safeParse({ ...baseline, name }).success).toBe(
        false,
      );
    },
  );
  it.each([
    "ชุดแต่งรถ",
    "قطعة سيارة",
    "é",
    "e\u0301",
    "🚗".repeat(255),
    "<script>test</script>",
  ])("preserves valid prose %j", (name) => {
    expect(productInputSchema.parse({ ...baseline, name }).name).toBe(name);
  });
  it("enforces code points and UTF-8 bytes with exact boundaries", () => {
    expect(
      productInputSchema.safeParse({ ...baseline, name: "🚗".repeat(256) })
        .success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({
        ...baseline,
        description: "ก".repeat(5461) + "A",
      }).success,
    ).toBe(true);
    expect(
      productInputSchema.safeParse({
        ...baseline,
        description: "ก".repeat(5461) + "AB",
      }).success,
    ).toBe(false);
  });
  it("rejects extra privilege fields without mutating the object prototype", () => {
    const input = JSON.parse(
      JSON.stringify(baseline).slice(0, -1) +
        ',"__proto__":{"isAdmin":true},"role":"super_admin"}',
    );
    expect(productInputSchema.safeParse(input).success).toBe(false);
    expect("isAdmin" in {}).toBe(false);
  });
});
