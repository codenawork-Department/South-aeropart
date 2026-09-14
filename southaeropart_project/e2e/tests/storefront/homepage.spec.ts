import { test, expect } from "@playwright/test";

/**
 * Storefront Homepage — Smoke Tests (read-only)
 *
 * These tests only verify that pages load correctly.
 * No data mutations, no orders, no payments.
 * Safe to run against any environment (CLAUDE.md §6.2).
 */
test.describe("Storefront Homepage", () => {
  test("loads successfully with correct title", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    // Page should contain South Aero branding
    await expect(page).toHaveTitle(/South Aero/i);
  });

  test("displays navigation bar", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Navigation should be visible
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("has a link to products page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should have at least one link pointing to products/catalog
    const productLink = page.locator('a[href*="products"], a[href*="catalog"]').first();
    await expect(productLink).toBeVisible();
  });

  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("nav").first().waitFor({ state: "visible" });

    // Filter out known third-party errors (e.g., Clerk, analytics)
    const criticalErrors = errors.filter(
      (msg) =>
        !msg.includes("clerk") &&
        !msg.includes("Clerk") &&
        !msg.includes("analytics")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
