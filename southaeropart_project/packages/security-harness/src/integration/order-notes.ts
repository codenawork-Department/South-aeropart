import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createClerkActors } from "./clerk-actors";
import { createBusinessObserver } from "./db-observer";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

/** Bind the unchanged abstract note payload to the actual checkout field and rendering surfaces. */
export async function checkOrderNotes(
  runtime: NativeRuntime,
  storefront: NativeApp,
  admin: NativeApp,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
) {
  const session = await runtime.adminCookie("admin");
  await admin.context.addCookies([
    { name: "admin_session", value: session.token, url: admin.baseUrl },
  ]);
  const snapshot = await createBusinessObserver(runtime);
  const observations = [];
  const supplemental: Array<{
    label: string;
    rejectedWithoutMutation: boolean;
  }> = [];
  const output = path.join(
    runtime.root,
    "docs/security/fuzz-matrix-2026-09-24/artifacts/native",
    runtime.runId,
    "order-notes-progress.json",
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const testCase = corpus.cases.find((c) => c.id === "T-16")!;
  const productId = randomUUID();
  await runtime.pool.query(
    "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'Order note fixture','100.00',20,'active')",
    [productId, productId],
  );
  const input = (customerNote: unknown) => ({
    shippingAddress: {
      recipientName: "Note fixture",
      phone: "0800000000",
      email: "order-note@example.invalid",
      line1: "Fixture",
      subDistrict: "Fixture",
      district: "Fixture",
      province: "Bangkok",
      postalCode: "10110",
    },
    shippingMethod: "standard",
    paymentMethod: "promptpay",
    saveAddress: false,
    items: [
      {
        productId,
        productName: "Untrusted hint",
        unitPrice: "0.01",
        quantity: 1,
      },
    ],
    customerNote,
  });
  const clerk = await createClerkActors(runtime);
  try {
    for (const variant of expandCaseVariants(testCase, corpus)) {
      const note = (variant.payload as { note: string }).note;
      const started = performance.now();
      const isGuest = variant.variantKey === "note_2_length";
      const before = await snapshot();
      const stockBefore = (
        await runtime.pool.query(
          "select stock_quantity from products where id=$1",
          [productId],
        )
      ).rows[0].stock_quantity;
      const wire = await invokeNativeAction(
        storefront,
        "checkout",
        [input(note)],
        {
          headers: isGuest ? { cookie: "" } : await clerk.headers(0),
          timeoutMs: 120000,
        },
      );
      const response = wire.value as {
        success?: boolean;
        orderId?: string;
        guestToken?: string;
      };
      assert.equal(
        response.success,
        true,
        "Actual checkout must accept the note",
      );
      assert.equal(wire.wireStatus, 200);
      assert(response.orderId);
      const row = (
        await runtime.pool.query(
          "select customer_note,total,user_id,inventory_state from orders where id=$1",
          [response.orderId],
        )
      ).rows[0];
      assert.equal(row.customer_note, note);
      assert.equal(row.total, "250.00");
      assert.equal(row.inventory_state, "reserved");
      assert(
        isGuest
          ? row.user_id.startsWith("guest_")
          : row.user_id === clerk.actors[0].id,
      );
      assert.equal(
        (
          await runtime.pool.query(
            "select stock_quantity from products where id=$1",
            [productId],
          )
        ).rows[0].stock_quantity,
        stockBefore - 1,
      );
      const after = await snapshot();
      const tablesModified = [...after.keys()].filter(
        (table) => before.get(table) !== after.get(table),
      );
      const allowed = new Set([
        "orders",
        "order_items",
        "order_status_history",
        "order_stock_reservations",
        "products",
        ...(isGuest ? ["users"] : []),
      ]);
      assert(
        tablesModified.every((table) => allowed.has(table)),
        "Only the normal checkout transaction may change business data",
      );
      const read = await invokeNativeAction(
        storefront,
        "guestDetails",
        isGuest ? [response.orderId, response.guestToken] : [response.orderId],
        { headers: isGuest ? { cookie: "" } : await clerk.headers(0) },
      );
      assert.equal(
        (read.value as { data?: { order?: { customerNote?: string } } }).data
          ?.order?.customerNote,
        note,
      );
      const denied = await invokeNativeAction(
        storefront,
        "guestDetails",
        [response.orderId],
        { headers: { ...(await clerk.headers(1)), cookie: "" } },
      );
      assert.equal((denied.value as { success?: boolean }).success, false);
      assert(
        !(denied.value as { data?: unknown }).data,
        "Another customer must not receive the note or order DTO",
      );

      const customerPage = await storefront.context.newPage();
      const adminPage = await admin.context.newPage();
      const surfaces = [];
      const beacons: string[] = [];
      try {
        if (!isGuest)
          await customerPage.setExtraHTTPHeaders(await clerk.headers(0));
        for (const page of [customerPage, adminPage]) {
          await page.addInitScript(() => {
            (globalThis as { __qaXss?: number }).__qaXss = 0;
          });
          await page.route("**/*", async (route) => {
            const url = new URL(route.request().url());
            if (
              url.pathname.endsWith("/x") ||
              url.hostname.endsWith(".invalid")
            ) {
              beacons.push("payload request");
              await route.abort();
            } else await route.continue();
          });
        }
        for (const [surface, page, url] of [
          [
            "storefront",
            customerPage,
            `${storefront.baseUrl}/orders/${response.orderId}${isGuest ? `?token=${response.guestToken}` : ""}`,
          ],
          ["admin", adminPage, `${admin.baseUrl}/orders/${response.orderId}`],
        ] as const) {
          const navigation = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
          });
          assert.equal(navigation?.status(), 200);
          await page
            .locator("[data-customer-order-note]:visible")
            .waitFor({ state: "visible", timeout: 30000 });
          assert.equal(
            await page.locator("[data-customer-order-note]:visible").textContent(),
            note,
          );
          const rendered = await page
            .locator("[data-customer-order-note]:visible")
            .evaluate((node) => ({
              childElements: node.children.length,
              marker: (globalThis as { __qaXss?: number }).__qaXss,
            }));
          assert.deepEqual(rendered, { childElements: 0, marker: 0 });
          // React may temporarily retain a hidden previous tree while streaming.
          // Inspect those nodes too; visibility must not hide unsafe HTML.
          assert(await page.locator("[data-customer-order-note]").evaluateAll((nodes, expected) => nodes.every((node) => node.children.length === 0 && node.textContent === expected), note));
          surfaces.push({ surface, exactText: true, ...rendered });
        }
        assert.equal(beacons.length, 0);
      } finally {
        await customerPage.close();
        await adminPage.close();
      }

      const emailBefore = runtime.emails.length;
      const receipt = await invokeNativeAction(
        storefront,
        "receiptEmailProbe",
        [response.orderId],
      );
      const shipment = await invokeNativeAction(admin, "emailProbe", [
        response.orderId,
      ]);
      assert.equal((receipt.value as { success?: boolean }).success, true);
      assert.equal((shipment.value as { success?: boolean }).success, true);
      const emails = runtime.emails.slice(emailBefore);
      assert.equal(emails.length, 2);
      const emailContext = await runtime.browser.newContext();
      try {
        const emailPage = await emailContext.newPage();
        await emailPage.route("**/*", (route) => route.abort());
        for (const [index, email] of emails.entries()) {
          const body = email.body as { to: string[]; html: string };
          assert.deepEqual(body.to, ["order-note@example.invalid"]);
          await emailPage.setContent(body.html, { waitUntil: "load" });
          const node = emailPage.locator("[data-customer-order-note]");
          assert.equal(await node.textContent(), note);
          assert.equal(await node.locator("*").count(), 0);
          assert.equal(
            await emailPage.locator("script,[onerror],[onload]").count(),
            0,
          );
          surfaces.push({
            surface: index === 0 ? "receipt-email" : "shipment-email",
            exactText: true,
            childElements: 0,
          });
        }
      } finally {
        await emailContext.close();
      }
      assert.deepEqual(
        await snapshot(),
        after,
        "Read/render/email checks must preserve business rows",
      );
      const leaks = detectErrorLeaks(wire.rawText).leaks;
      const observed: NormalizedResult = {
        success: true,
        wireStatus: wire.wireStatus,
        semanticStatus: 200,
        errorCode: null,
        hasErrorCodeField: false,
        rawResponse: { success: true },
        evidenceLayer: "server_action",
        dbDiff: {
          tablesModified,
          rowsChanged: tablesModified.reduce(
            (n, table) =>
              n +
              Math.max(
                0,
                Number(after.get(table)!.split(":")[0]) -
                  Number(before.get(table)!.split(":")[0]),
              ),
            0,
          ),
        },
        invariantsChecked: {
          SAFE_ACCEPT: leaks.length === 0,
          PLAIN_TEXT: true,
          NO_LEAK: leaks.length === 0,
        },
        leaks,
        executionTimeMs: performance.now() - started,
      };
      const entry = evaluateVariant(variant, testCase, observed);
      const index = entries.findIndex(
        (e) =>
          e.caseId === variant.caseId &&
          e.target === variant.target &&
          e.variant === variant.variantKey,
      );
      assert(index >= 0);
      entries[index] = entry;
      observations.push({
        variant: variant.variantKey,
        entry,
        noteBytes: Buffer.byteLength(note),
        storedExactly: true,
        ownerRead: true,
        otherCustomerDenied: true,
        guest: isGuest,
        surfaces,
        beacons: 0,
        localEmailRequests: emails.length,
        request: { bytes: wire.requestBytes, sha256: wire.requestSha256 },
      });
      fs.writeFileSync(
        output,
        JSON.stringify({ observations, supplemental }, null, 2),
      );
      console.log(`${entry.result} T-16 ${variant.variantKey}`);
    }
    for (const [label, note] of [
      ["ascii_over_limit", "A".repeat(2049)],
      ["thai_over_limit", "ก".repeat(683)],
      ["emoji_over_limit", "🚗".repeat(513)],
      ["null", null],
      ["object", {}],
      ["nul", "x\0"],
    ] as const) {
      const before = await snapshot();
      const result = await invokeNativeAction(
        storefront,
        "checkout",
        [input(note)],
        { headers: await clerk.headers(0) },
      );
      assert.equal((result.value as { code?: string }).code, "INVALID_INPUT");
      assert.deepEqual(await snapshot(), before);
      supplemental.push({ label, rejectedWithoutMutation: true });
    }
    return {
      observations,
      supplemental,
      clerkCleaned: true,
      scope:
        "Unchanged T-16 notes mapped to createOrder.customerNote, real owner/admin pages and two actual email helpers via loopback SDK sink; not a new API endpoint",
    };
  } finally {
    await clerk.cleanup();
    fs.writeFileSync(
      output,
      JSON.stringify({ observations, supplemental }, null, 2),
    );
  }
}
