import { describe, it, expect } from "vitest";
import { toSmallestCurrencyUnit, InvalidMonetaryAmountError } from "./stripe";

/**
 * Unit tests for toSmallestCurrencyUnit() — CLAUDE.md §5.3
 *
 * This function converts a monetary amount (e.g. "35000.15" or 35000)
 * to the smallest currency unit (satang for THB) without floating-point
 * precision loss. The project mandates: "ห้าม parseFloat(x) * 100"
 *
 * These are pure function tests — no Stripe API calls, no DB, no secrets.
 */
describe("toSmallestCurrencyUnit", () => {
  // --- Basic conversions ---

  it("converts integer string to satang", () => {
    expect(toSmallestCurrencyUnit("100")).toBe(10000);
  });

  it("converts decimal string to satang", () => {
    expect(toSmallestCurrencyUnit("35000.15")).toBe(3500015);
  });

  it("converts integer number to satang", () => {
    expect(toSmallestCurrencyUnit(100)).toBe(10000);
  });

  it("converts zero to zero", () => {
    expect(toSmallestCurrencyUnit("0")).toBe(0);
    expect(toSmallestCurrencyUnit(0)).toBe(0);
  });

  // --- Edge cases for decimal precision ---

  it("handles one decimal place by padding with zero", () => {
    // "99.5" should become 9950, not 995
    expect(toSmallestCurrencyUnit("99.5")).toBe(9950);
  });

  it("handles no decimal places", () => {
    expect(toSmallestCurrencyUnit("1")).toBe(100);
  });

  it("rejects excess precision instead of silently changing money", () => {
    expect(() => toSmallestCurrencyUnit("99.999")).toThrow(
      InvalidMonetaryAmountError,
    );
  });

  it("handles exact two decimal places", () => {
    expect(toSmallestCurrencyUnit("123.45")).toBe(12345);
  });

  // --- Negative values ---

  it("handles negative integer", () => {
    expect(toSmallestCurrencyUnit("-100")).toBe(-10000);
  });

  it("handles negative decimal", () => {
    expect(toSmallestCurrencyUnit("-35.50")).toBe(-3550);
  });

  // --- Large values ---

  it("handles large amounts without precision loss", () => {
    // 999,999.99 THB → 99999999 satang
    expect(toSmallestCurrencyUnit("999999.99")).toBe(99999999);
  });

  // --- IEEE 754 floating-point gotcha ---

  it("avoids IEEE 754 precision loss (classic 0.1 + 0.2 problem)", () => {
    // parseFloat("19.99") * 100 would give 1998.9999999999998
    // toSmallestCurrencyUnit must return exactly 1999
    expect(toSmallestCurrencyUnit("19.99")).toBe(1999);
  });

  it("avoids IEEE 754 precision loss for 35000.15", () => {
    // parseFloat("35000.15") * 100 gives 3500014.9999999995
    expect(toSmallestCurrencyUnit("35000.15")).toBe(3500015);
  });

  // --- Whitespace handling ---

  it("rejects whitespace rather than coercing it", () => {
    expect(() => toSmallestCurrencyUnit("  250.00  ")).toThrow(
      InvalidMonetaryAmountError,
    );
  });

  it.each([
    "0.001",
    "0.00000001",
    "0.30000000000000004",
    "1e5",
    "1foo",
    "NaN",
    "Infinity",
    "-Infinity",
    "",
    ".50",
    "1.",
    "+1",
    "1\0",
    "1\n",
    "0x10",
    "ก",
    "🚗",
    "1".repeat(1048576),
  ])("rejects malformed monetary input #%#", (input) => {
    expect(() => toSmallestCurrencyUnit(input)).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Invalid request",
      }),
    );
  });

  it.each([NaN, Infinity, -Infinity, 0.1 + 0.2, 0.00000001])(
    "rejects unsafe numeric input %s",
    (input) => {
      expect(() => toSmallestCurrencyUnit(input)).toThrow(
        InvalidMonetaryAmountError,
      );
    },
  );

  it("bounds exact signed satang before converting BigInt to Number", () => {
    expect(toSmallestCurrencyUnit("90071992547409.91")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(toSmallestCurrencyUnit("-90071992547409.91")).toBe(
      Number.MIN_SAFE_INTEGER,
    );
    for (const input of [
      "90071992547409.92",
      "-90071992547409.92",
      "18446744073709551615",
    ])
      expect(() => toSmallestCurrencyUnit(input)).toThrow(
        InvalidMonetaryAmountError,
      );
    expect(toSmallestCurrencyUnit("010")).toBe(1000);
    expect(toSmallestCurrencyUnit(19.99)).toBe(1999);
  });

  it("rejects runtime type confusion without invoking attacker-controlled coercion", () => {
    for (const input of [
      null,
      undefined,
      {},
      [],
      true,
      10n,
      {
        toString() {
          throw new Error("Should not be called");
        },
      },
    ])
      expect(() => toSmallestCurrencyUnit(input as unknown as string)).toThrow(
        InvalidMonetaryAmountError,
      );
  });
});
