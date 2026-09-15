import { test, expect } from "@playwright/test";

const base = process.env.ADMIN_TEST_BASE_URL || "http://localhost:3001";

test("admin login serves a nonce CSP and hydrates without a session", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(`${base}/login`);
  expect(response?.status()).toBe(200);
  const policy = response?.headers()["content-security-policy"] || "";
  expect(policy).toMatch(/script-src[^;]*'nonce-[^']+'/);
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await page.locator("input[type=password]").fill("browser-test-only");
  await page.getByRole("button", { name: /แสดงรหัสผ่าน|show password/i }).click();
  await expect(page.locator('input[value="browser-test-only"]')).toHaveAttribute("type", "text");
  expect(errors).toEqual([]);
});

test("admin CSP blocks a parser-inserted attack script", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", message => {
    if (message.type() === "error" && /violates.*content security policy/i.test(message.text())) violations.push(message.text());
  });
  await page.route(`${base}/login`, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace("<head>", "<head><script>window.__cspAttackProbe = true</script>");
    await route.fulfill({ response, body });
  });
  await page.goto(`${base}/login`);
  expect(await page.evaluate(() => (window as Window & { __cspAttackProbe?: boolean }).__cspAttackProbe)).toBeUndefined();
  expect(violations.length).toBeGreaterThan(0);
});

test("admin protected page redirects without a session", async ({ request }) => {
  const response = await request.get(`${base}/orders`, { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(response.status());
  expect(response.headers().location).toContain("/login");
});
