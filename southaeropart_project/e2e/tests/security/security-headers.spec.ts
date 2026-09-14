import { test, expect } from "@playwright/test";

/**
 * Security Headers & Information Leakage Tests (CLAUDE.md §5.5, §5.6)
 *
 * Verifies that:
 * 1. Crucial browser security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
 *    are properly returned in HTTP response headers.
 * 2. Sensitive server secrets (DATABASE_URL, ADMIN_SESSION_SECRET, STRIPE_SECRET_KEY, etc.)
 *    are never leaked into client-rendered HTML, script tags, or Next.js payloads.
 *
 * Safe to run against any environment — purely read-only HTTP inspections.
 */
test.describe("Security Headers (Storefront & Admin)", () => {
  test("Storefront responds with essential security headers", async ({ request, baseURL }) => {
    const response = await request.get(baseURL || "http://localhost:3000/");
    expect(response.status()).toBe(200);

    const headers = response.headers();

    // 1. Content Security Policy
    expect(headers["content-security-policy"]).toBeDefined();
    const csp = headers["content-security-policy"] || "";
    expect(csp).toContain("default-src");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors");

    // 2. Clickjacking Protection
    expect(headers["x-frame-options"]).toBeDefined();
    expect(["SAMEORIGIN", "DENY"]).toContain(headers["x-frame-options"].toUpperCase());

    // 3. MIME-Sniffing Prevention
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // 4. Referrer Policy
    expect(headers["referrer-policy"]).toBeDefined();

    // 5. Permissions Policy
    expect(headers["permissions-policy"]).toBeDefined();
  });

  test("Storefront HTML does not leak server secrets or internal credentials", async ({ page, baseURL }) => {
    await page.goto(baseURL || "http://localhost:3000/", { waitUntil: "domcontentloaded" });
    const content = await page.content();

    // Check against common secret patterns
    const forbiddenStrings = [
      "ADMIN_SESSION_SECRET",
      "STRIPE_SECRET_KEY",
      "CLERK_SECRET_KEY",
      "RESEND_API_KEY",
      "ORDER_TOKEN_SECRET",
      "postgres://",
      "postgresql://",
      "sk_live_",
      "whsec_",
    ];

    for (const forbidden of forbiddenStrings) {
      expect(content).not.toContain(forbidden);
    }
  });
});
