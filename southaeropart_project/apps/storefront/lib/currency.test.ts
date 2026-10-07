import { describe, it, expect } from "vitest";
import {
  sanitizeCurrency,
  convertPrice,
  formatPrice,
  getRateAgainstUSD,
  DEFAULT_RATES,
  type Currency,
} from "./currency";

describe("currency helpers (Storefront Multi-Currency Support)", () => {
  describe("sanitizeCurrency", () => {
    it("accepts supported currency codes", () => {
      expect(sanitizeCurrency("THB")).toBe("THB");
      expect(sanitizeCurrency("USD")).toBe("USD");
      expect(sanitizeCurrency("EUR")).toBe("EUR");
      expect(sanitizeCurrency("JPY")).toBe("JPY");
      expect(sanitizeCurrency("SGD")).toBe("SGD");
    });

    it("falls back to THB for unknown, invalid, or nullish currency codes", () => {
      expect(sanitizeCurrency("GBP")).toBe("THB");
      expect(sanitizeCurrency("INVALID")).toBe("THB");
      expect(sanitizeCurrency("")).toBe("THB");
      expect(sanitizeCurrency(null)).toBe("THB");
      expect(sanitizeCurrency(undefined)).toBe("THB");
    });
  });

  describe("convertPrice", () => {
    it("returns exact same amount for THB target currency", () => {
      expect(convertPrice(1000, "THB")).toBe(1000);
      expect(convertPrice("2500.50", "THB")).toBe(2500.5);
    });

    it("converts THB to USD using exchange rates", () => {
      const customRates: Record<Currency, number> = {
        ...DEFAULT_RATES,
        USD: 0.03, // 1 THB = 0.03 USD
      };
      expect(convertPrice(1000, "USD", customRates)).toBe(30);
    });

    it("handles string input and invalid numeric strings gracefully", () => {
      expect(convertPrice("abc", "THB")).toBe(0);
      expect(convertPrice(0, "THB")).toBe(0);
    });
  });

  describe("formatPrice", () => {
    it("formats THB with symbol ฿ and comma separators without decimals by default", () => {
      const formatted = formatPrice(15000, "THB");
      expect(formatted).toBe("฿15,000");
    });

    it("formats USD with symbol $ and 2 decimals by default", () => {
      const customRates: Record<Currency, number> = {
        ...DEFAULT_RATES,
        USD: 0.03,
      };
      // 1000 THB * 0.03 = 30 USD
      const formatted = formatPrice(1000, "USD", customRates);
      expect(formatted).toBe("$30.00");
    });

    it("appends currency code when showCode option is true", () => {
      const formatted = formatPrice(15000, "THB", DEFAULT_RATES, { showCode: true });
      expect(formatted).toBe("฿15,000 THB");
    });

    it("supports custom decimal precision overriding default", () => {
      const formatted = formatPrice(15000, "THB", DEFAULT_RATES, { decimals: 2 });
      expect(formatted).toBe("฿15,000.00");
    });
  });

  describe("getRateAgainstUSD", () => {
    it("returns 1 for USD as base currency", () => {
      expect(getRateAgainstUSD("USD")).toBe(1);
    });

    it("calculates rate against 1 USD for THB and other currencies", () => {
      const customRates = {
        THB: 1.0,
        USD: 0.03, // 1 USD = ~33.33 THB
        EUR: 0.027, // 1 USD = 0.9 EUR
        JPY: 4.5, // 1 USD = 150 JPY
        SGD: 0.039, // 1 USD = 1.3 SGD
      };
      expect(getRateAgainstUSD("THB", customRates)).toBeCloseTo(33.333, 2);
      expect(getRateAgainstUSD("EUR", customRates)).toBeCloseTo(0.9, 2);
      expect(getRateAgainstUSD("JPY", customRates)).toBeCloseTo(150, 1);
      expect(getRateAgainstUSD("SGD", customRates)).toBeCloseTo(1.3, 2);
    });

    it("handles fallback gracefully when USD rate is zero or missing", () => {
      const brokenRates = {
        THB: 1.0,
        USD: 0,
        EUR: 0,
        JPY: 0,
        SGD: 0,
      };
      expect(getRateAgainstUSD("USD", brokenRates)).toBe(1);
      expect(getRateAgainstUSD("THB", brokenRates)).toBeGreaterThan(0);
    });
  });
});

