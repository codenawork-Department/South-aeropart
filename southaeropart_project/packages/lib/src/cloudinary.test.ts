import { describe, it, expect, beforeAll } from "vitest";
import { getOptimizedImageUrl } from "./cloudinary";

beforeAll(() => {
  process.env.CLOUDINARY_CLOUD_NAME = "south-aero-test";
});

describe("Cloudinary Helpers", () => {
  describe("getOptimizedImageUrl", () => {
    it("generates optimized delivery URL with default auto format and quality", () => {
      const url = getOptimizedImageUrl("products/spoiler_r35_front");
      expect(url).toContain("https://res.cloudinary.com/south-aero-test/image/upload/");
      expect(url).toContain("f_auto,q_auto");
      expect(url).toContain("/products/spoiler_r35_front");
    });

    it("applies width, height, and crop options", () => {
      const url = getOptimizedImageUrl("products/spoiler_r35_front", {
        width: 800,
        height: 600,
        crop: "thumb",
      });
      expect(url).toContain("w_800");
      expect(url).toContain("h_600");
      expect(url).toContain("c_thumb");
    });

    it("supports custom format and quality settings", () => {
      const url = getOptimizedImageUrl("banners/hero", {
        format: "webp",
        quality: 80,
      });
      expect(url).toContain("f_webp");
      expect(url).toContain("q_80");
    });
  });
});
