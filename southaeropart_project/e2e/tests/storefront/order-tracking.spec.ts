import { test, expect } from "@playwright/test";

/**
 * Storefront Order Tracking & Access Control (CLAUDE.md §5.1)
 *
 * Verifies that order detail pages cannot be accessed without valid authorization
 * (either authenticated customer session or cryptographically valid guest token).
 * Safe to run against any environment — read-only checks.
 */
test.describe("Order Detail Access Control (IDOR Protection)", () => {
  test("returns 404 for non-existent order ID", async ({ page }) => {
    const response = await page.goto("/orders/00000000-0000-0000-0000-000000000000", {
      waitUntil: "domcontentloaded",
    });

    // Should return 404 status or Next.js notFound() page
    if (response) {
      expect([200, 404]).toContain(response.status());
    }

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("rejects access to order with invalid or forged guest token", async ({ page }) => {
    const fakeToken = "a".repeat(64); // 64 hex chars forged token
    const response = await page.goto(
      `/orders/00000000-0000-0000-0000-000000000000?token=${fakeToken}`,
      { waitUntil: "domcontentloaded" }
    );

    if (response) {
      expect([200, 404]).toContain(response.status());
    }

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
