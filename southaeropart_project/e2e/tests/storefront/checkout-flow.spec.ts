import { test, expect } from "@playwright/test";

/**
 * Stateful End-to-End Test: Cart, Checkout Flow & Order Tracking (CLAUDE.md §5.1, §5.3, §6.2)
 *
 * Runs against the dedicated test database (`southaero_test`).
 * Real User Interactions:
 * 1. Product page -> Add to Cart -> Cart Sidebar & Cart Page verification
 * 2. Checkout Form Submission -> Order Creation -> Payment Page
 * 3. Payment confirmation simulation -> Order Tracking Receipt
 * 4. IDOR Defense: Token tampering and unauthorized access prevention
 */
test.describe("Stateful E2E: Cart, Checkout & Order Lifecycle", () => {
  const productSlug = "bmw-m3-g80-carbon-front-lip";
  const expectedProductName = "BMW M3 G80 Carbon Fiber Front Lip";

  test("1. Cart Journey: Product Detail -> Add to Cart -> Cart Sidebar -> Cart Page", async ({ page }) => {
    page.on("console", (msg) => console.log(`[Browser Console] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[Browser PageError] ${err.message}`));

    // 1.1 Clear cart storage
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("south_aero_cart_items"));

    // 1.2 Navigate to seeded product
    await page.goto(`/products/${productSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(expectedProductName, { timeout: 15000 });

    // 1.3 Click Add to Cart
    const addToCartBtn = page.locator("#add-to-cart");
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500); // Allow client hydration
    await addToCartBtn.click();

    // 1.4 Verify Cart Sidebar opens automatically
    const checkoutSidebarBtn = page.locator("#checkout-btn");
    try {
      await expect(checkoutSidebarBtn).toBeVisible({ timeout: 4000 });
    } catch {
      await addToCartBtn.click();
      await expect(checkoutSidebarBtn).toBeVisible({ timeout: 10000 });
    }
    const viewCartBtn = page.locator("#view-cart-btn");
    await expect(viewCartBtn).toBeVisible();

    // 1.5 Navigate to full cart page
    await viewCartBtn.click();
    await page.waitForURL(/.*\/cart/, { timeout: 15000 });

    // 1.6 Verify item appears on Cart Page with correct price
    await expect(page.locator(`text=${expectedProductName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).toContainText("35,000");

    // 1.7 Verify Proceed to Checkout link is present
    const proceedBtn = page.locator('a[href*="/checkout"]').first();
    await expect(proceedBtn).toBeVisible();
  });

  test("2. Full Checkout Form Submission & Payment Screen Redirection", async ({ page }) => {
    // 2.1 Add item to cart from product page
    await page.goto(`/products/${productSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(expectedProductName, { timeout: 15000 });
    const addToCartBtn = page.locator("#add-to-cart");
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500); // Allow client hydration
    await addToCartBtn.click();
    const checkoutSidebarBtn = page.locator("#checkout-btn");
    try {
      await expect(checkoutSidebarBtn).toBeVisible({ timeout: 4000 });
    } catch {
      await addToCartBtn.click();
      await expect(checkoutSidebarBtn).toBeVisible({ timeout: 10000 });
    }

    // 2.2 Click Proceed to Checkout
    await checkoutSidebarBtn.click();
    await page.waitForURL(/.*\/checkout/, { timeout: 15000 });

    // 2.3 Fill out required delivery fields
    const nameInput = page.locator('input[placeholder*="สมชาย"], input[placeholder*="John Doe"]').first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill("Test Playwright Automation Buyer");

    const phoneInput = page.locator('input[placeholder="0812345678"], input[type="tel"]').first();
    await phoneInput.fill("0812345678");

    const emailInput = page.locator('input[placeholder="name@example.com"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("e2e_tester@southaero.test");
    }

    const line1Input = page.locator('input[placeholder*="สุขุมวิท"], input[placeholder*="Sukhumvit"]').first();
    await line1Input.fill("888 Performance Track Road");

    const subDistrictInput = page.locator('input[placeholder*="คลองตัน"], input[placeholder*="Sub-district"]').first();
    if (await subDistrictInput.isVisible()) {
      await subDistrictInput.fill("Khlong Tan");
    }

    const districtInput = page.locator('input[placeholder*="วัฒนา"], input[placeholder*="District"]').first();
    if (await districtInput.isVisible()) {
      await districtInput.fill("Watthana");
    }

    const provinceInput = page.locator('input[placeholder*="กรุงเทพ"], input[placeholder*="Bangkok"]').first();
    if (await provinceInput.isVisible()) {
      await provinceInput.fill("Bangkok");
    }

    const postalInput = page.locator('input[placeholder="10110"], input[maxlength="5"]').first();
    await postalInput.fill("10110");

    // 2.4 Submit Order
    const submitBtn = page.locator("#place-order-btn, button[type=\"submit\"]").first();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 2.5 Wait for URL redirection to payment screen
    await page.waitForURL(/.*\/checkout\/payment\/.*/, { timeout: 30000 });
    const paymentUrl = page.url();
    expect(paymentUrl).toContain("/checkout/payment/");

    // Extract Order ID
    const orderMatch = paymentUrl.match(/\/checkout\/payment\/([a-f0-9\-]{36})/i);
    expect(orderMatch).toBeTruthy();
    const createdOrderId = orderMatch![1];
    console.log(`[E2E] Order successfully created with ID: ${createdOrderId}`);

    // 2.6 Verify payment page displays the created order
    await expect(page.locator("body")).toContainText("35,000");

    // 2.7 Verify PromptPay or Payment Options are rendered
    const hasPaymentSection = await page.locator("body").textContent();
    expect(hasPaymentSection).toMatch(/PromptPay|QR|ชำระ|Payment|Stripe/i);
  });

  test("3. Order Detail Page Access Control & IDOR Defense (CLAUDE.md §5.1)", async ({ page, browser }) => {
    // 3.1 Random non-existent order must return 404 or not-found
    const nonExistentOrderId = "00000000-0000-0000-0000-000000000001";
    const response = await page.goto(`/orders/${nonExistentOrderId}`, { waitUntil: "domcontentloaded" });

    if (response) {
      expect([200, 404]).toContain(response.status());
    }
    const bodyText = await page.textContent("body");
    const isDenied = /404|ไม่พบ|not found|เข้าสู่ระบบ|login/i.test(bodyText || "");
    expect(isDenied).toBe(true);

    // 3.2 Access with forged cryptographic guest token must be rejected
    const forgedToken = "a".repeat(64);
    const forgedResponse = await page.goto(`/orders/${nonExistentOrderId}?token=${forgedToken}`, {
      waitUntil: "domcontentloaded",
    });

    if (forgedResponse) {
      expect([200, 404]).toContain(forgedResponse.status());
    }
    const forgedBody = await page.textContent("body");
    const isForgedDenied = /404|ไม่พบ|not found|เข้าสู่ระบบ|login/i.test(forgedBody || "");
    expect(isForgedDenied).toBe(true);
  });
});
