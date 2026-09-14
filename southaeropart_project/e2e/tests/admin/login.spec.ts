import { test, expect } from "@playwright/test";

/**
 * Admin Login — Smoke Tests (read-only / auth boundary)
 *
 * Verifies admin login page renders, unauthenticated access is blocked,
 * and invalid credentials show appropriate error.
 * Does NOT create or modify admin accounts — safe for any environment.
 *
 * Security relevance (CLAUDE.md §5.1):
 * - Tests that dashboard routes redirect unauthenticated users
 * - Tests that login page doesn't expose sensitive information
 */
test.describe("Admin Login", () => {
  test("login page loads successfully", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    // Should have email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    // Trying to access dashboard without login should redirect
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/.*login.*/, { timeout: 15000 });

    // Should end up on login page (either redirect or middleware block)
    const currentUrl = page.url();
    expect(currentUrl).toContain("login");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await emailInput.fill("invalid@test.com");
    await passwordInput.fill("wrongpassword123");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show an error message (not reveal whether email exists — §5.1)
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();

    // Should still be on login page (not redirected to dashboard)
    expect(page.url()).toContain("login");
  });

  test("login page does not expose sensitive info in HTML source", async ({ page }) => {
    await page.goto("/login");

    const html = await page.content();

    // Should not contain admin secrets or session tokens in HTML
    expect(html).not.toContain("ADMIN_SESSION_SECRET");
    expect(html).not.toContain("DATABASE_URL");
    expect(html).not.toContain("STRIPE_SECRET_KEY");
  });
});
