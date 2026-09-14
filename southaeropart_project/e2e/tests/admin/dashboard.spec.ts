import { test, expect } from "@playwright/test";

/**
 * Admin Dashboard Protected Routes (CLAUDE.md §5.1 Deny-by-default)
 *
 * Verifies that all sensitive admin back-office routes strictly redirect
 * unauthenticated visitors to /login.
 * Safe to run against any environment — purely read-only HTTP inspections.
 */
test.describe("Admin Protected Routes (Deny by Default)", () => {
  const protectedPaths = [
    "/",
    "/products",
    "/bundles",
    "/orders",
    "/reviews",
    "/catalog",
    "/newsletters",
    "/services",
  ];

  for (const path of protectedPaths) {
    test(`unauthenticated access to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/.*login.*/, { timeout: 15000 });

      expect(page.url()).toContain("login");
    });
  }
});
