import { describe, it, expect } from "vitest";
import { checkedPayableSatang, formatSatang } from "./money-arithmetic";
describe("Exact payable arithmetic", () => {
  it.each([
    [9_007_199_254_740_991n * 2n],
    [99_999_999n, 1n],
    [100n, -101n],
    [0n],
  ])("rejects overflow or a nonpositive final payable %s", (...parts) => {
    expect(() => checkedPayableSatang(parts)).toThrow("Invalid request");
  });
  it("keeps the accepted cap and fractional baht exact", () => {
    expect(checkedPayableSatang([99_999_998n, 1n])).toBe(99_999_999n);
    expect(formatSatang(1n)).toBe("0.01");
    expect(formatSatang(99999999n)).toBe("999999.99");
    expect(formatSatang(0n)).toBe("0.00");
  });
});
