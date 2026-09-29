import assert from "node:assert/strict";
import type { NativeRuntime } from "./native-runtime";
import type { NativeApp } from "./native-action";
import { checkShipmentEmailSink } from "./email-sink";

/** Read the real edit/detail pages after persistence; CSP rejection alone does not prove escaping. */
export async function checkProductRendering(
  runtime: NativeRuntime,
  admin: NativeApp,
  storefront: NativeApp,
  product: { id: string; slug: string; name: string; description: string },
  nameChanged: boolean,
) {
  const adminPage = await admin.context.newPage(),
    storePage = await storefront.context.newPage();
  const beacons: string[] = [];
  let stage = "setup";
  try {
    for (const page of [adminPage, storePage]) {
      await page.addInitScript(() => {
        (globalThis as { __qaXss?: number }).__qaXss = 0;
      });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname.endsWith(".invalid") || url.pathname.endsWith("/x")) {
          beacons.push("payload request");
          await route.abort();
        } else await route.continue();
      });
    }
    stage = "admin navigation";
    const adminResponse = await adminPage.goto(
      `${admin.baseUrl}/products/${product.id}/edit`,
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    assert.equal(adminResponse?.status(), 200);
    stage = "admin language tab";
    await adminPage
      .getByRole("button", { name: /ภาษาไทย \(รอง/ })
      .click({ timeout: 30000 });
    stage = "admin stored fields";
    await adminPage.waitForFunction(
      ({ name, description }) =>
        Array.from(document.querySelectorAll("input")).some(
          (node) => node.value === name,
        ) &&
        Array.from(document.querySelectorAll("textarea")).some(
          (node) => node.value === description,
        ),
      product,
      { timeout: 30000 },
    );
    stage = "storefront navigation";
    const storeResponse = await storePage.goto(
      `${storefront.baseUrl}/products/${product.slug}`,
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    assert.equal(storeResponse?.status(), 200);
    stage = "storefront stored text";
    await storePage.waitForFunction(
      ({ name, description }) =>
        Array.from(document.querySelectorAll("h1")).some(
          (node) => node.textContent === name,
        ) &&
        Array.from(document.querySelectorAll("p")).some(
          (node) => node.textContent === description,
        ),
      product,
      { timeout: 30000 },
    );
    stage = "executable DOM inspection";
    const surfaces = [];
    for (const [surface, page] of [
      ["admin", adminPage],
      ["storefront", storePage],
    ] as const) {
      const observed = await page.evaluate(() => ({
        marker: (globalThis as { __qaXss?: number }).__qaXss ?? null,
        executablePayloadNodes: Array.from(
          document.querySelectorAll("script"),
        ).filter((node) =>
          /^\s*(globalThis|parent)\.__qaXss\s*=/.test(node.textContent ?? ""),
        ).length,
        executableAttributes: Array.from(document.querySelectorAll("*"))
          .flatMap((node) => Array.from(node.attributes))
          .filter(
            (attr) =>
              (/^on/i.test(attr.name) && attr.value.includes("__qaXss")) ||
              (/^(href|src|action)$/i.test(attr.name) &&
                /^\s*javascript:/i.test(attr.value)) ||
              (attr.name === "srcdoc" && attr.value.includes("__qaXss")),
          ).length,
      }));
      surfaces.push({ surface, ...observed });
      assert.deepEqual(observed, {
        marker: 0,
        executablePayloadNodes: 0,
        executableAttributes: 0,
      });
    }
    assert.equal(beacons.length, 0);
    // Descriptions are not used by shipment emails. Names are tested through the actual DB/template/SDK sink.
    stage = "shipment email";
    const email = nameChanged
      ? await checkShipmentEmailSink(runtime, admin, product.name)
      : null;
    return { passed: true, surfaces, beacons: 0, email };
  } catch (error) {
    // Preserve an assertion failure as evidence and continue the other matrix variants.
    // Only boolean diagnostics leave the browser; no cookies, tokens or page markup.
    const fields = await adminPage
      .evaluate(
        ({ name, description }) => ({
          namePresent: Array.from(document.querySelectorAll("input")).some(
            (n) => n.value === name,
          ),
          descriptionPresent: Array.from(
            document.querySelectorAll("textarea"),
          ).some((n) => n.value === description),
        }),
        product,
      )
      .catch(() => null);
    const text = await storePage
      .evaluate(
        ({ name, description }) => ({
          namePresent: Array.from(document.querySelectorAll("h1")).some(
            (n) => n.textContent === name,
          ),
          descriptionPresent: Array.from(document.querySelectorAll("p")).some(
            (n) => n.textContent === description,
          ),
        }),
        product,
      )
      .catch(() => null);
    return {
      passed: false,
      stage,
      errorName: error instanceof Error ? error.name : "Unknown failure",
      fields,
      text,
      beacons: beacons.length,
    };
  } finally {
    await adminPage.close();
    await storePage.close();
  }
}
