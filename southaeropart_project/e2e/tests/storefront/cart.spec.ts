import { test, expect } from "@playwright/test";

/**
 * Storefront Cart Page — Functional & Smoke Tests (Safe / Read-only)
 *
 * Verifies that the cart page renders, shows empty cart state appropriately,
 * and navigation controls work.
 * Safe to run against any environment (CLAUDE.md §6.2).
 */
test.describe("Storefront Cart Page", () => {
  test("cart page loads successfully", async ({ page }) => {
    const response = await page.goto("/cart", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });

  test("displays cart heading or empty state message when cart is empty", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await page.locator("body").waitFor({ state: "visible" });

    // Should display cart page content
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Look for common cart keywords (Thai or English)
    const hasCartText =
      /ตะกร้า|cart|สินค้าในตะกร้า|shopping cart/i.test(bodyText || "");
    expect(hasCartText).toBe(true);
  });

  test("contains link back to shopping / catalog", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    // Should have links pointing back to products
    const continueShoppingLinks = page.locator('a[href*="products"], a[href*="catalog"], a[href="/"]');
    const count = await continueShoppingLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
