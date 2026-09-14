import { describe, it, expect } from "vitest";
import {
  getCodeFromSlug,
  parseSku,
  BRAND_CODE_MAP,
  MODEL_CODE_MAP,
  CATEGORY_CODE_MAP,
} from "./sku-helper";

describe("sku-helper (SKU Generation & Parsing)", () => {
  describe("getCodeFromSlug", () => {
    it("returns correct code for direct map key match", () => {
      expect(getCodeFromSlug("honda", BRAND_CODE_MAP, "UN")).toBe("HD");
      expect(getCodeFromSlug("toyota", BRAND_CODE_MAP, "UN")).toBe("TY");
      expect(getCodeFromSlug("civic", MODEL_CODE_MAP, "UN")).toBe("CV");
      expect(getCodeFromSlug("spoiler", CATEGORY_CODE_MAP, "AP")).toBe("SP");
    });

    it("handles case-insensitivity and whitespace", () => {
      expect(getCodeFromSlug("  HONDA  ", BRAND_CODE_MAP, "UN")).toBe("HD");
      expect(getCodeFromSlug("  CiViC ", MODEL_CODE_MAP, "UN")).toBe("CV");
    });

    it("matches partial keys when exact match is missing", () => {
      // "toyota-motors" contains "toyota"
      expect(getCodeFromSlug("toyota-motors", BRAND_CODE_MAP, "UN")).toBe("TY");
      // "civic-type-r" contains "civic"
      expect(getCodeFromSlug("civic-type-r", MODEL_CODE_MAP, "UN")).toBe("CV");
    });

    it("falls back to first 2 alphanumeric characters if no map match found", () => {
      // "lexus" is LX in map, but let's test a brand not in map: "submodel-xyz"
      expect(getCodeFromSlug("xyz-custom", {}, "UN")).toBe("XY");
    });

    it("returns fallback value when slug is empty or invalid", () => {
      expect(getCodeFromSlug("", BRAND_CODE_MAP, "DEFAULT")).toBe("DEFAULT");
      expect(getCodeFromSlug(null, BRAND_CODE_MAP, "DEFAULT")).toBe("DEFAULT");
      expect(getCodeFromSlug(undefined, BRAND_CODE_MAP, "DEFAULT")).toBe("DEFAULT");
    });
  });

  describe("parseSku", () => {
    it("parses valid SKU string into components correctly", () => {
      // Format: BBMM-PPSS (Brand 2, Model 2, Part 2, Seq >= 2)
      // HD (Honda) + CV (Civic) - SP (Spoiler) + 01
      const result = parseSku("HDCV-SP01");
      expect(result.isValid).toBe(true);
      expect(result.brandCode).toBe("HD");
      expect(result.modelCode).toBe("CV");
      expect(result.partCode).toBe("SP");
      expect(result.sequence).toBe("01");
    });

    it("supports longer numeric sequences", () => {
      const result = parseSku("TYYR-FL12345");
      expect(result.isValid).toBe(true);
      expect(result.brandCode).toBe("TY");
      expect(result.modelCode).toBe("YR");
      expect(result.partCode).toBe("FL");
      expect(result.sequence).toBe("12345");
    });

    it("returns isValid: false for invalid SKU formats", () => {
      expect(parseSku("INVALID").isValid).toBe(false);
      expect(parseSku("12345").isValid).toBe(false);
      expect(parseSku("HDCV-SP").isValid).toBe(false); // missing sequence
      expect(parseSku("H-C-S-01").isValid).toBe(false);
    });

    it("uses selected names when provided and codes match", () => {
      const result = parseSku("HDCV-SP01", "Honda Civic Type R", "Civic", "Rear Spoiler");
      expect(result.isValid).toBe(true);
      expect(result.brandCode).toBe("HD");
      expect(result.modelCode).toBe("CV");
    });
  });
});
