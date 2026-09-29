import { test, expect } from "@playwright/test";

// Reflected search-input sink only. This does not cover stored product/note HTML,
// guest tracking authorization, email clients, or database side effects.
// Run manually against the isolated storefront selected in Playwright config.
test.describe("Reflected search input: inert DOM data", () => {
  const payloads = [
    "<script>window.__qaXssTriggered = true;</script>",
    '<img src="https://invalid-domain.example.invalid/px.png" onerror="window.__qaXssTriggered = true">',
    '\"><svg onload="window.__qaXssTriggered = true">',
    "javascript:window.__qaXssTriggered=true",
  ];
  for (const [index, payload] of payloads.entries()) {
    test(`search payload ${index + 1} reaches its sink without creating executable DOM`, async ({
      page,
      baseURL,
    }) => {
      if (!baseURL)
        throw new Error(
          "BLOCKED: An explicitly configured isolated storefront baseURL is required",
        );
      const beacons: string[] = [];
      // Never actually send the simulated attacker beacon.
      await page.route(
        "https://invalid-domain.example.invalid/**",
        async (route) => {
          beacons.push(route.request().url());
          await route.abort();
        },
      );
      const target = new URL("/products", baseURL);
      target.searchParams.set("q", payload);
      const response = await page.goto(target.toString(), {
        waitUntil: "domcontentloaded",
      });
      expect(
        response?.status(),
        "Missing/unhealthy target is not a passing or skipped security test",
      ).toBe(200);
      const search = page.locator("#product-search");
      await expect(search).toBeVisible();
      // Positive sink assertion prevents a 404, ignored query, or wrong page passing.
      await expect(search).toHaveValue(payload);
      const form = search.locator("xpath=ancestor::form[1]");
      // Check the actual input sink even when CSP would block script execution.
      const violations = await form.evaluate((root) => {
        return Array.from(root.querySelectorAll("*"))
          .filter(
            (el) =>
              el.matches("script, iframe, object, embed") ||
              Array.from(el.attributes).some(
                (attr) =>
                  /^on/i.test(attr.name) ||
                  attr.name === "srcdoc" ||
                  ([
                    "href",
                    "src",
                    "action",
                    "formaction",
                    "xlink:href",
                  ].includes(attr.name.toLowerCase()) &&
                    /^\s*(javascript|vbscript):/i.test(attr.value)),
              ),
          )
          .map((el) => el.tagName);
      });
      expect(violations).toEqual([]);
      // Detect injected event nodes outside the sink too; safe value attributes and
      // Next.js serialized data scripts containing the payload are not violations.
      expect(
        await page
          .locator(
            '[onload*="__qaXssTriggered"], [onerror*="__qaXssTriggered"]',
          )
          .count(),
      ).toBe(0);
      await search.focus();
      await search.blur();
      expect(
        await page.evaluate(
          () => Reflect.get(window, "__qaXssTriggered") === true,
        ),
      ).toBe(false);
      expect(beacons).toEqual([]);
    });
  }
});
