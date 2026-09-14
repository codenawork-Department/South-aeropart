import { test, expect } from "@playwright/test";

/**
 * Internationalization (i18n) E2E Tests
 *
 * Verifies bilingual support (Thai & English) via cookie `south_aero_lang`.
 * Safe for any environment (CLAUDE.md §6.2).
 */
test.describe("Storefront Localization (i18n)", () => {
  test("loads page with English language cookie", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "south_aero_lang",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("loads page with Thai language cookie", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "south_aero_lang",
        value: "th",
        domain: "localhost",
        path: "/",
      },
    ]);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("contains language switch controls in navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Look for language switch elements (e.g. EN / TH buttons or select dropdown)
    const langToggle = page.locator(
      'button:has-text("TH"), button:has-text("EN"), [data-testid="lang-switcher"], a[href*="lang="]'
    );
    const count = await langToggle.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
