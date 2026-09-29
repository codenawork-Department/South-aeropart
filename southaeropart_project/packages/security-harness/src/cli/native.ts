import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createNativeRuntime, root } from "../integration/native-runtime";
import { invokeNativeAction } from "../integration/native-action";
import { checkInventorySessions } from "../integration/inventory-sessions";
import { checkShipmentEmailSink } from "../integration/email-sink";
import { createBusinessObserver } from "../integration/db-observer";
import { checkGuestTracking } from "../integration/guest-tracking";
import { checkAdminProducts } from "../integration/admin-product";
import { checkCheckout } from "../integration/checkout";
import { checkApiJson } from "../integration/api-json";
import { checkOrderNotes } from "../integration/order-notes";
import { checkWebhook } from "../integration/webhook";
import { loadCorpus } from "../schema-validator";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import {
  generateCoverageManifest,
  saveManifestArtifacts,
  securityGatePassed,
  type RunSummary,
} from "../manifest-generator";
import { detectErrorLeaks } from "../leak-detector";
import type { NormalizedResult, ExpandedVariant } from "../types";

async function main() {
  const corpus = loadCorpus();
  const { entries, summary: offline } = await generateCoverageManifest(corpus);
  const targets = process.argv.includes("--webhook")
    ? (["stripe.webhook"] as const)
    : process.argv.includes("--all")
      ? ([
          "inventory.delta",
          "cart.add",
          "guest.track",
          "admin.product",
          "checkout.create",
          "api.json",
          "stripe.webhook",
        ] as const)
      : process.argv.includes("--api") || process.argv.includes("--notes")
        ? (["api.json"] as const)
        : process.argv.includes("--with-api")
          ? ([
              "inventory.delta",
              "cart.add",
              "guest.track",
              "admin.product",
              "checkout.create",
              "api.json",
            ] as const)
          : process.argv.includes("--checkout")
            ? (["checkout.create"] as const)
            : process.argv.includes("--with-checkout")
              ? ([
                  "inventory.delta",
                  "cart.add",
                  "guest.track",
                  "admin.product",
                  "checkout.create",
                ] as const)
              : process.argv.includes("--product")
                ? (["admin.product"] as const)
                : process.argv.includes("--with-product")
                  ? ([
                      "inventory.delta",
                      "cart.add",
                      "guest.track",
                      "admin.product",
                    ] as const)
                  : process.argv.includes("--guest")
                    ? (["guest.track"] as const)
                    : process.argv.includes("--with-guest")
                      ? ([
                          "inventory.delta",
                          "cart.add",
                          "guest.track",
                        ] as const)
                      : process.argv.includes("--cart")
                        ? (["cart.add"] as const)
                        : process.argv.includes("--inventory")
                          ? (["inventory.delta"] as const)
                          : (["inventory.delta", "cart.add"] as const);
  const sourceFiles = [
    "pnpm-lock.yaml",
    "docs/security/fuzz-matrix-2026-09-24/corpus.json",
    "docs/security/fuzz-matrix-2026-09-24/corpus.schema.json",
    "apps/admin/actions/product.actions.ts",
    "apps/admin/components/products/product-form.tsx",
    "apps/admin/lib/product-input.ts",
    "apps/admin/lib/product-errors.ts",
    "apps/admin/middleware.ts",
    "apps/storefront/middleware.ts",
    "packages/lib/src/action-ingress.ts",
    "packages/lib/src/stripe.ts",
    "packages/lib/src/bounded-json.ts",
    "apps/storefront/lib/stripe-webhook-input.ts",
    "apps/storefront/lib/webhook-clock.ts",
    "apps/storefront/app/api/webhooks/stripe/route.ts",
    "apps/storefront/lib/order-fulfillment.ts",
    "packages/db/src/schema/orders.ts",
    "packages/db/drizzle/0004_payment_webhook_evidence.sql",
    "packages/db/drizzle/meta/_journal.json",
    "packages/db/drizzle/meta/0004_snapshot.json",
    "packages/security-harness/src/integration/webhook.ts",
    "packages/security-harness/src/integration/webhook-fixture.ts",
    "packages/security-harness/src/integration/stripe-fixtures.ts",
    "packages/security-harness/src/integration/provider-observer.cjs",
    "apps/admin/next.config.mjs",
    "packages/security-harness/src/integration/admin-product.ts",
    "packages/security-harness/src/integration/checkout.ts",
    "packages/security-harness/src/integration/product-rendering.ts",
    "packages/security-harness/src/integration/email-sink.ts",
    "apps/storefront/actions/checkout.actions.ts",
    "apps/storefront/lib/checkout-input.ts",
    "apps/storefront/lib/checkout-errors.ts",
    "packages/lib/src/money-arithmetic.ts",
    "packages/db/src/rate-limit.ts",
    "packages/db/src/inventory.ts",
    "packages/security-harness/src/integration/guest-tls-cookie.ts",
    "packages/security-harness/src/integration/windows-build-links.cjs",
    "packages/security-harness/src/integration/disabled-media.cjs",
    "packages/security-harness/src/integration/api-json.ts",
    "packages/security-harness/src/integration/api-json-worker.ts",
    "packages/security-harness/src/integration/native-http.ts",
    "apps/storefront/lib/order-read-policy.ts",
    "apps/storefront/lib/order-read-limit.ts",
    "packages/security-harness/src/integration/checkout-race.ts",
    "packages/security-harness/src/integration/db-observer.ts",
    "apps/storefront/lib/guest-order-token.ts",
    "apps/storefront/lib/order-token-clock.ts",
    "apps/storefront/lib/order-read-dto.ts",
    "apps/storefront/lib/order-read-input.ts",
    "apps/storefront/next.config.mjs",
    "packages/security-harness/src/cli/native.ts",
    "packages/security-harness/src/integration/native-runtime.ts",
    "packages/security-harness/src/integration/order-notes.ts",
    "packages/lib/src/order-note.ts",
    "packages/lib/src/order-note-email.ts",
    "packages/lib/package.json",
    "packages/db/drizzle/0005_customer_order_note.sql",
    "packages/db/drizzle/meta/0005_snapshot.json",
    "apps/storefront/components/checkout/CheckoutClient.tsx",
    "apps/storefront/components/checkout/PaidOrderRedirect.tsx",
    "apps/storefront/app/(shop)/checkout/payment/[orderId]/page.tsx",
    "apps/storefront/components/orders/OrderDetailClient.tsx",
    "apps/storefront/i18n/dictionaries/th.ts",
    "apps/storefront/i18n/dictionaries/en.ts",
    "apps/storefront/lib/order-email.ts",
    "apps/admin/actions/order.actions.ts",
    "apps/admin/components/orders/OrderDetailAdminClient.tsx",
    "apps/admin/lib/shipment-email.ts",
    "packages/security-harness/src/integration/native-action.ts",
    "packages/security-harness/src/integration/guest-tracking.ts",
    "packages/security-harness/src/integration/guest-fixture.ts",
    "packages/security-harness/src/integration/clerk-actors.ts",
    "packages/security-harness/src/integration/resource-observer.ts",
    "packages/security-harness/src/integration/resource-watchdog.cjs",
  ];
  const sourceDigests = Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      createHash("sha256")
        .update(fs.readFileSync(path.join(root, file)))
        .digest("hex"),
    ]),
  );
  const runtime = await createNativeRuntime();
  const started = performance.now();
  const outputDir = path.join(
    runtime.root,
    "docs/security/fuzz-matrix-2026-09-24/artifacts/native",
    runtime.runId,
  );
  fs.mkdirSync(outputDir, { recursive: true });
  let cleaned = false;
  const requests: Array<{
    target: string;
    caseId: string;
    variant: string;
    bytes: number;
    sha256: string;
  }> = [];
  let sessionChecks: Awaited<ReturnType<typeof checkInventorySessions>> = [];
  let emailCheck:
    Awaited<ReturnType<typeof checkShipmentEmailSink>> | undefined;
  let guestChecks: Awaited<ReturnType<typeof checkGuestTracking>> | undefined;
  let productChecks: Awaited<ReturnType<typeof checkAdminProducts>> | undefined;
  let checkoutChecks: Awaited<ReturnType<typeof checkCheckout>> | undefined;
  let apiChecks: Awaited<ReturnType<typeof checkApiJson>> | undefined;
  let noteChecks: Awaited<ReturnType<typeof checkOrderNotes>> | undefined;
  let webhookChecks: Awaited<ReturnType<typeof checkWebhook>> | undefined;
  const guestClockMs = Date.now();
  const webhookClockMs = Math.floor(Date.now() / 1000) * 1000;
  const apps = new Map<string, Awaited<ReturnType<typeof runtime.launchApp>>>();
  const completedTargets: string[] = [];
  console.log(`Native run ${runtime.runId}: ${targets.join(", ")}`);
  try {
    const businessSnapshot = await createBusinessObserver(runtime);
    for (const target of targets) {
      if (target === "api.json") {
        if (!process.argv.includes("--notes"))
          apiChecks = await checkApiJson(runtime, corpus, entries);
        // The production storefront avoids development Flight debug records and uses
        // real time; the Guest TTL suite's clock must not age new note orders.
        const noteStorefront = await runtime.launchApp("storefront", {
          productionTls: true,
          instance: "notes",
        });
        const noteAdmin = await runtime.launchApp("admin", { turbopack: true });
        noteChecks = await checkOrderNotes(
          runtime,
          noteStorefront,
          noteAdmin,
          corpus,
          entries,
        );
        completedTargets.push(target);
        continue;
      }
      const appName =
        target === "inventory.delta" || target === "admin.product"
          ? "admin"
          : "storefront";
      let app = apps.get(appName);
      if (!app) {
        app = await runtime.launchApp(
          appName,
          appName === "storefront"
            ? {
                ...(targets.some((target) => target === "guest.track")
                  ? { guestClockMs }
                  : {}),
                ...(targets.some((target) => target === "stripe.webhook")
                  ? { webhookClockMs }
                  : {}),
              }
            : {},
        );
        apps.set(appName, app);
      }
      if (target === "stripe.webhook") {
        webhookChecks = await checkWebhook(
          runtime,
          app,
          corpus,
          entries,
          webhookClockMs,
        );
        completedTargets.push(target);
        continue;
      }
      if (target === "checkout.create") {
        checkoutChecks = await checkCheckout(
          runtime,
          app,
          corpus,
          entries,
          requests,
        );
        completedTargets.push(target);
        continue;
      }
      if (target === "admin.product") {
        let storefront = apps.get("storefront");
        if (!storefront) {
          storefront = await runtime.launchApp("storefront");
          apps.set("storefront", storefront);
        }
        productChecks = await checkAdminProducts(
          runtime,
          app,
          storefront,
          corpus,
          entries,
          requests,
        );
        completedTargets.push(target);
        continue;
      }
      if (target === "guest.track") {
        const clock = await invokeNativeAction(app, "guestClockProbe", [
          guestClockMs,
        ]);
        assert.equal(
          clock.value,
          guestClockMs,
          "Application guest clock must match the fixture clock",
        );
        guestChecks = await checkGuestTracking(
          runtime,
          app,
          corpus,
          entries,
          requests,
          guestClockMs,
        );
        completedTargets.push(target);
        continue;
      }
      const targetApp = app;
      const admin =
        target === "inventory.delta"
          ? await runtime.adminCookie("admin")
          : null;
      if (admin)
        await app.context.addCookies([
          {
            name: "admin_session",
            value: admin.token,
            url: app.baseUrl,
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
      async function invoke(
        variant: ExpandedVariant,
      ): Promise<NormalizedResult> {
        const input = structuredClone(variant.payload ?? {}) as {
          productId?: string;
          delta?: unknown;
          quantity?: unknown;
        };
        let stockBefore = 0,
          productId = "";
        if (target === "inventory.delta") {
          stockBefore = Number(variant.metadata?.stockBefore ?? 100000);
          productId = randomUUID();
          input.productId = productId;
          await runtime.pool.query(
            "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,$3,$4,$5,$6)",
            [
              productId,
              productId,
              "Native fixture",
              "100.00",
              stockBefore,
              "active",
            ],
          );
        }
        const emailBefore = runtime.emails.length;
        const businessBefore =
          target === "cart.add" ? await businessSnapshot() : null;
        const wire = await invokeNativeAction(
          targetApp,
          target === "inventory.delta" ? "inventory" : "cart",
          [input],
          { rawFirstArgument: variant.rawPayload },
        );
        const { value, rawText } = wire;
        requests.push({
          target,
          caseId: variant.caseId,
          variant: variant.variantKey,
          bytes: wire.requestBytes,
          sha256: wire.requestSha256,
        });
        const response = value as {
          success?: boolean;
          error?: { code?: string; message?: string };
          data?: unknown;
          item?: unknown;
          threw?: boolean;
        };
        const codes: Record<string, number> = {
          INVALID_INPUT: 422,
          CONFLICT: 409,
          UNAUTHENTICATED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
        };
        const success = response.success === true;
        const errorCode = response.error?.code ?? null;
        const observed: NormalizedResult = {
          evidenceLayer: "server_action",
          success,
          wireStatus: wire.wireStatus,
          semanticStatus: success
            ? 200
            : errorCode
              ? (codes[errorCode] ?? null)
              : response.threw
                ? 500
                : null,
          errorCode,
          errorMessage: response.error?.message,
          hasErrorCodeField: !!errorCode,
          rawResponse: value,
          rawText,
          invariantsChecked: {},
          leaks: detectErrorLeaks(rawText).leaks.map(
            (message) => message.split(" leaked:")[0],
          ),
          executionTimeMs: wire.executionTimeMs,
        };
        if (target === "inventory.delta") {
          const row = (
            await runtime.pool.query(
              "select stock_quantity from products where id=$1",
              [productId],
            )
          ).rows[0];
          const audits = (
            await runtime.pool.query(
              "select admin_id,action,metadata from admin_audit_logs where entity_id=$1",
              [productId],
            )
          ).rows;
          const exact =
            success &&
            typeof input.delta === "number" &&
            Number.isSafeInteger(input.delta) &&
            BigInt(row.stock_quantity) ===
              BigInt(stockBefore) + BigInt(input.delta);
          const unchanged =
            row.stock_quantity === stockBefore &&
            audits.length === 0 &&
            runtime.emails.length === emailBefore;
          observed.dbDiff = {
            tablesModified: unchanged ? [] : ["products", "admin_audit_logs"],
            rowsChanged: unchanged ? 0 : 1 + audits.length,
          };
          observed.invariantsChecked = {
            SAFE_ACCEPT:
              exact &&
              audits.length === 1 &&
              audits[0].admin_id === admin!.id &&
              audits[0].action === "inventory.adjusted" &&
              audits[0].metadata.delta === input.delta &&
              audits[0].metadata.stockBefore === stockBefore &&
              audits[0].metadata.stockAfter === row.stock_quantity &&
              JSON.stringify(response.data) ===
                JSON.stringify({
                  productId,
                  delta: input.delta,
                  stockBefore,
                  stockAfter: row.stock_quantity,
                }),
            REJECT_NO_EFFECT: !success && unchanged,
            INTEGER_EXACT: success ? exact : unchanged,
          };
        } else {
          const businessAfter = await businessSnapshot();
          const changed = [...businessAfter.keys()].filter(
            (table) => businessBefore!.get(table) !== businessAfter.get(table),
          );
          const unchanged =
            changed.length === 0 && runtime.emails.length === emailBefore;
          // For changed rows the exact count is unknown; only publish a zero diff when proven.
          if (unchanged)
            observed.dbDiff = { tablesModified: [], rowsChanged: 0 };
          observed.invariantsChecked = {
            SAFE_ACCEPT:
              success &&
              unchanged &&
              JSON.stringify(response.item) === JSON.stringify(input),
            REJECT_NO_EFFECT: !success && unchanged,
            INTEGER_EXACT:
              !success ||
              (typeof input.quantity === "number" &&
                Number.isSafeInteger(input.quantity)),
          };
        }
        const allowed = corpus.semantics.errors as Record<
          string,
          [string, string]
        >;
        if (!success && observed.semanticStatus !== null) {
          const rule = allowed[String(observed.semanticStatus)];
          observed.invariantsChecked.NO_LEAK =
            !!rule &&
            JSON.stringify(value) ===
              JSON.stringify({
                success: false,
                error: { code: rule[0], message: rule[1] },
              }) &&
            observed.leaks.length === 0;
        }
        return observed;
      }
      for (const testCase of corpus.cases.filter((c) =>
        c.targets.includes(target),
      )) {
        for (const variant of expandCaseVariants(testCase, corpus).filter(
          (v) => v.target === target,
        )) {
          const observation = await invoke(variant);
          const entry = evaluateVariant(variant, testCase, observation);
          const index = entries.findIndex(
            (e) =>
              e.caseId === entry.caseId &&
              e.target === entry.target &&
              e.variant === entry.variant,
          );
          assert(index >= 0);
          entries[index] = entry;
          console.log(`${entry.result} ${entry.caseId} ${entry.variant}`);
        }
      }
      if (target === "inventory.delta") {
        sessionChecks = await checkInventorySessions(runtime, app);
        emailCheck = await checkShipmentEmailSink(runtime, app);
        console.log("PASS shipment.email.http-sink");
      }
      completedTargets.push(target);
    }
  } finally {
    try {
      const byLayer: RunSummary["byLayer"] = {};
      for (const entry of entries)
        byLayer[entry.layer] = (byLayer[entry.layer] ?? 0) + 1;
      const summary: RunSummary = {
        ...offline,
        passed: entries.filter((e) => e.result === "PASS").length,
        failed: entries.filter((e) => e.result === "FAIL").length,
        blocked: entries.filter((e) => e.result === "BLOCKED").length,
        unimplemented: entries.filter((e) => e.result === "UNIMPLEMENTED")
          .length,
        byLayer,
        generatedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
      };
      saveManifestArtifacts(
        entries,
        summary,
        outputDir,
        `Offline observations plus native Next.js HTTP execution for ${targets.join(", ")}. Inventory, Admin and Checkout use owned PostgreSQL fixtures and real sessions; Cart is stateless. Guest verifies both read actions, object and positional owner controls, expiry, rate limits and a separate production build over loopback HTTPS for actual cookie issuance. Webhook uses real Stripe test payments, exact signed bytes, controlled header clock, DB barriers and local email capture. API JSON remains the explicitly isolated abstract parser contract, not a deployed route. Read each target's evidence and execution metadata; unselected integrations remain unmeasured.`,
      );
      fs.writeFileSync(
        path.join(outputDir, "requests.json"),
        JSON.stringify(requests, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "inventory-sessions.json"),
        JSON.stringify(sessionChecks, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "email-sink.json"),
        JSON.stringify(emailCheck ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "admin-product.json"),
        JSON.stringify(productChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "checkout.json"),
        JSON.stringify(checkoutChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "api-json.json"),
        JSON.stringify(apiChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "order-notes.json"),
        JSON.stringify(noteChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "guest-tracking.json"),
        JSON.stringify(guestChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "webhook.json"),
        JSON.stringify(webhookChecks ?? { measured: false }, null, 2),
      );
      fs.writeFileSync(
        path.join(outputDir, "execution.json"),
        JSON.stringify(
          {
            runId: runtime.runId,
            targets,
            caseFilter: process.argv.filter((arg) => arg.startsWith("--case=")),
            completedTargets,
            allSelectedTargetsCompleted:
              completedTargets.length === targets.length,
            appCopies: true,
            nativeActionClient: true,
            mode:
              guestChecks?.tlsCookie?.passed || noteChecks
                ? "development plus production storefront over isolated HTTPS"
                : "development",
            sourceDigests,
            guestClockMs: guestChecks ? guestClockMs : null,
            webhookClockMs: webhookChecks ? webhookClockMs : null,
            guestClockScope: guestChecks
              ? "Only the disposable storefront order-token-clock module; session clocks unchanged"
              : null,
            emailSinkMessages: runtime.emails.length,
            reportScope:
              "offline observations plus completed native requests; supplemental sessions are separate",
          },
          null,
          2,
        ),
      );
      console.log(JSON.stringify(summary));
      if (
        !securityGatePassed(summary) ||
        sessionChecks.some((check) => !check.passed)
      )
        process.exitCode = 1;
    } finally {
      await runtime.cleanup();
      cleaned = true;
      fs.writeFileSync(
        path.join(outputDir, "cleanup.json"),
        JSON.stringify(
          { schemaDropped: cleaned, serversStopped: true },
          null,
          2,
        ),
      );
      console.log(`Artifacts: ${outputDir}`);
    }
  }
}
main().catch((error) => {
  let message = error instanceof Error ? error.message : "Unknown failure";
  for (const [key, value] of Object.entries(process.env))
    if (value && /SECRET|TOKEN|PASSWORD|DATABASE_URL|API_KEY/.test(key))
      message = message.replaceAll(value, "[redacted]");
  message = message.replace(
    /postgres(?:ql)?:\/\/\S+/g,
    "[redacted database URL]",
  );
  console.error("Native integration failed: " + message.slice(0, 1500));
  process.exitCode = 1;
});
