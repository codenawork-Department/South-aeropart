import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createNativeRuntime, root } from "../integration/native-runtime";
import { createClerkActors } from "../integration/clerk-actors";

function pageRoutes(app: "storefront" | "admin") {
  const routes: string[] = [];
  function walk(dir: string, segments: string[]) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isDirectory())
        walk(path.join(dir, item.name), [...segments, item.name]);
      else if (item.name === "page.tsx")
        routes.push(
          "/" +
            segments
              .filter((s) => !s.startsWith("(") && !s.startsWith("[[..."))
              .join("/"),
        );
    }
  }
  walk(path.join(root, "apps", app, "app"), []);
  return [...new Set(routes)].sort();
}

async function main() {
  const runtime = await createNativeRuntime();
  const output = path.join(
    root,
    "docs/security/handoff/2026-09-29/site-checks",
    runtime.runId,
  );
  fs.mkdirSync(output, { recursive: true });
  const checks: Array<Record<string, unknown>> = [];
  const builds: Array<Record<string, unknown>> = [];
  const uiChecks: Array<Record<string, unknown>> = [];
  let clerk: Awaited<ReturnType<typeof createClerkActors>> | undefined;
  const save = () =>
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          runId: runtime.runId,
          generatedAt: new Date().toISOString(),
          checks,
          builds,
          uiChecks,
        },
        null,
        2,
      ),
    );
  console.log(`Site check ${runtime.runId}`);
  try {
    clerk = await createClerkActors(runtime);
    const productId = randomUUID(),
      bundleId = randomUUID(),
      orderId = randomUUID();
    for (const [id, type] of [
      [productId, "single"],
      [bundleId, "bundle"],
    ]) {
      await runtime.pool.query(
        "insert into products(id,sku,slug,name,name_en,price,stock_quantity,status,product_type) values($1,$2,$2,'Website check','Website check','100.00',20,'active',$3)",
        [id, id, type],
      );
    }
    await runtime.pool.query(
      "insert into product_bundle_items(bundle_product_id,child_product_id,quantity) values($1,$2,1)",
      [bundleId, productId],
    );
    const address = {
      recipientName: "Website fixture",
      email: "site-check@example.invalid",
      phone: "0800000000",
      line1: "Fixture",
      subDistrict: "Fixture",
      district: "Fixture",
      province: "Bangkok",
      postalCode: "10110",
    };
    await runtime.pool.query(
      "insert into orders(id,order_number,user_id,status,payment_status,payment_method,subtotal,total,shipping_address,customer_note) values($1,$2,$3,'paid','paid','credit_card','100.00','100.00',$4,'Please call before delivery')",
      [orderId, `QA-${orderId}`, clerk.actors[0].id, JSON.stringify(address)],
    );
    await runtime.pool.query(
      "insert into order_items(order_id,product_id,product_name_snapshot,unit_price,quantity,line_total) values($1,$2,'Website fixture','100.00',1,'100.00')",
      [orderId, productId],
    );
    const session = await runtime.adminCookie("super_admin");
    const modes = process.argv.includes("--turbopack-only")
      ? (["turbopack"] as const)
      : (["turbopack", "production"] as const);
    for (const mode of modes) {
      for (const appName of ["storefront", "admin"] as const) {
        if (process.argv.includes("--focus") && appName === "admin") continue;
        console.log(
          `${mode} ${appName}: starting ${mode === "production" ? "full build" : "development server"}`,
        );
        const app = await runtime.launchApp(
          appName,
          mode === "production" ? { productionTls: true } : { turbopack: true },
        );
        builds.push({ app: appName, mode, passed: true });
        save();
        if (appName === "admin")
          await app.context.addCookies([
            { name: "admin_session", value: session.token, url: app.baseUrl },
          ]);
        const routes = pageRoutes(appName);
        // Production compilation includes every page; repeat key runtime surfaces as well.
        const selected =
          mode === "turbopack"
            ? routes
            : routes.filter((route) =>
                appName === "admin"
                  ? [
                      "/",
                      "/products",
                      "/products/[id]/edit",
                      "/orders/[id]",
                    ].includes(route)
                  : [
                      "/",
                      "/products/[slug]",
                      "/checkout",
                      "/orders/[orderId]",
                      "/checkout/payment/[orderId]",
                      "/pay/mock/[orderId]",
                    ].includes(route),
              );
        for (const route of selected.filter(
          (route) =>
            !process.argv.includes("--focus") ||
            route.includes("/payment/") ||
            route.includes("/pay/mock/"),
        )) {
          const url = route
            .replace("[orderId]", orderId)
            .replace("[slug]", productId)
            .replace(
              "[id]",
              route.startsWith("/bundles")
                ? bundleId
                : route.startsWith("/orders")
                  ? orderId
                  : productId,
            );
          const page = await app.context.newPage();
          const errors: string[] = [];
          const privateErrors: string[] = [];
          page.on("pageerror", (error) => {
            errors.push(error.name);
            privateErrors.push(error.stack ?? error.message);
          });
          const diagnosticPath = path.join(
            runtime.directory,
            `${mode}-${appName}-${checks.length}-diagnostic.json`,
          );
          try {
            if (appName === "storefront") {
              const headers = await clerk.headers(0);
              // Test authentication belongs only to our loopback app, not third-party assets.
              await page.route(app.baseUrl + "/**", (route) =>
                route.continue({
                  headers: { ...route.request().headers(), ...headers },
                }),
              );
            }
            const response = await page.goto(app.baseUrl + url, {
              waitUntil: "domcontentloaded",
              timeout: 120000,
            });
            if (route.startsWith("/checkout/payment/")) {
              await page.waitForURL(`**/orders/${orderId}?paid=true`, {
                timeout: 30000,
              });
              await page
                .locator("[data-customer-order-note]:visible")
                .waitFor();
            }
            const mockDisabled =
              mode === "production" && route.startsWith("/pay/mock/");
            if (mockDisabled)
              await page
                .getByRole("heading", { name: "PAGE NOT FOUND", exact: true })
                .waitFor();
            await page.waitForTimeout(400);
            const body = await page.locator("body").innerText();
            const compileError =
              /Build Error|Ecmascript file had an error|Internal Server Error|Application error:/.test(
                body,
              );
            // Next streams notFound UI with HTTP 200 if headers were already sent.
            // Require the actual not-found UI and absence of the simulator in either case.
            const expectedStatuses = mockDisabled ? [200, 404] : [200];
            const notFoundRendered =
              !mockDisabled ||
              ((await page
                .getByRole("heading", { name: "PAGE NOT FOUND", exact: true })
                .isVisible()) &&
                !body.includes("PROMPTPAY SIMULATOR"));
            const status = response?.status() ?? null;
            const passed =
              expectedStatuses.includes(status ?? 0) &&
              notFoundRendered &&
              !compileError &&
              errors.length === 0;
            if (!passed)
              fs.writeFileSync(
                diagnosticPath,
                JSON.stringify({ errors: privateErrors, body }, null, 2),
              );
            checks.push({
              app: appName,
              mode,
              route,
              status,
              expectedStatuses,
              ...(mockDisabled ? { notFoundRendered } : {}),
              compileError,
              pageErrors: errors,
              passed,
            });
            console.log(
              `${passed ? "PASS" : "FAIL"} ${mode} ${appName} ${route} (${status})`,
            );
          } catch (error) {
            fs.writeFileSync(
              diagnosticPath,
              JSON.stringify(
                {
                  errors: privateErrors,
                  exception:
                    error instanceof Error ? error.message : String(error),
                  body: await page
                    .locator("body")
                    .innerText()
                    .catch(() => ""),
                },
                null,
                2,
              ),
            );
            checks.push({
              app: appName,
              mode,
              route,
              passed: false,
              errorName: error instanceof Error ? error.name : "UnknownError",
            });
            console.log(`FAIL ${mode} ${appName} ${route}`);
          } finally {
            await page.close();
            save();
          }
        }
        if (appName === "storefront") {
          const page = await app.context.newPage();
          await page.addInitScript(
            ({ productId }) => {
              localStorage.setItem(
                "south_aero_cart_items",
                JSON.stringify([
                  {
                    id: "note-ui",
                    product: {
                      id: productId,
                      name: "Website fixture",
                      slug: productId,
                      price: "100.00",
                      images: [],
                    },
                    quantity: 1,
                    variant: "Gloss Black",
                  },
                ]),
              );
            },
            { productId },
          );
          try {
            for (const [locale, width] of [
              ["th", 390],
              ["en", 1440],
            ] as const) {
              await app.context.addCookies([
                { name: "south_aero_lang", value: locale, url: app.baseUrl },
              ]);
              await page.setViewportSize({ width, height: 900 });
              await page.goto(app.baseUrl + "/checkout", {
                waitUntil: "domcontentloaded",
                timeout: 120000,
              });
              await page.evaluate(
                (lang) => localStorage.setItem("south_aero_lang", lang),
                locale,
              );
              await page.reload({ waitUntil: "domcontentloaded" });
              const note = page.locator("#customer-order-note");
              await note.waitFor({ state: "visible" });
              assert.equal(
                await page
                  .locator('label[for="customer-order-note"]')
                  .textContent(),
                locale === "th"
                  ? "หมายเหตุคำสั่งซื้อ (ไม่บังคับ)"
                  : "Order note (optional)",
              );
              await note.fill("ก".repeat(683));
              assert.equal(await note.getAttribute("aria-invalid"), "true");
              assert(
                await page.locator("#customer-order-note-error").isVisible(),
              );
              await note.fill(
                locale === "th"
                  ? "กรุณาโทรก่อนจัดส่ง\nประตูสีน้ำเงิน"
                  : "Please call before delivery\nLook for the blue gate",
              );
              assert.equal(await note.getAttribute("aria-invalid"), "false");
              await note.focus();
              await page.keyboard.press("Tab");
              assert(
                !(await note.evaluate(
                  (node) => node === document.activeElement,
                )),
              );
              await note.locator("..").screenshot({
                path: path.join(output, `${mode}-note-${locale}.png`),
              });
              const noOverflow = await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              );
              uiChecks.push({
                mode,
                locale,
                width,
                overLimitError: true,
                editRecovery: true,
                keyboardTab: true,
                noHorizontalOverflow: noOverflow,
                passed: noOverflow,
              });
            }
          } finally {
            await page.close();
            save();
          }
        }
      }
    }
    assert(
      checks.length > 0 && checks.every((check) => check.passed),
      "One or more page checks failed; inspect results.json",
    );
    assert(
      uiChecks.every((check) => check.passed),
      "Checkout note layout needs review",
    );
  } finally {
    let clerkCleaned = false;
    try {
      if (clerk) {
        await clerk.cleanup();
        clerkCleaned = true;
      }
    } finally {
      await runtime.cleanup();
      fs.writeFileSync(
        path.join(output, "cleanup.json"),
        JSON.stringify(
          { schemaDropped: true, serversStopped: true, clerkCleaned },
          null,
          2,
        ),
      );
      save();
      console.log(`Site artifacts: ${output}`);
    }
  }
}
main().catch((error) => {
  console.error(
    "Site check failed: " +
      (error instanceof assert.AssertionError
        ? error.message
        : error instanceof Error
          ? error.name
          : "UnknownError"),
  );
  process.exitCode = 1;
});
