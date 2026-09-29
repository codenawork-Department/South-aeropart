import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import { createClerkActors } from "./clerk-actors";
import { resourceBudgetPassed } from "./resource-observer";
import { checkProductRendering } from "./product-rendering";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

type Response = {
  success?: boolean;
  code?: string;
  error?: { code?: string; message?: string };
  message?: string;
  data?: { productId?: string };
};
const codes: Record<string, number> = {
  INVALID_INPUT: 422,
  CONFLICT: 409,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  PAYLOAD_TOO_LARGE: 413,
};
const cents = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value))
    return null;
  const [major, fraction = ""] = value.split(".");
  return BigInt(major) * 100n + BigInt(fraction.padEnd(2, "0"));
};

/** Both actual CRUD actions must pass each variant; native results count only once. */
export async function checkAdminProducts(
  runtime: NativeRuntime,
  app: NativeApp,
  storefront: NativeApp,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
  requests: Array<{
    target: string;
    caseId: string;
    variant: string;
    binding?: string;
    bytes: number;
    sha256: string;
  }>,
) {
  const snapshot = await createBusinessObserver(runtime);
  const admin = await runtime.adminCookie("admin"),
    staff = await runtime.adminCookie("staff");
  const expired = await runtime.adminCookie("admin", "expired"),
    revoked = await runtime.adminCookie("admin", "revoked");
  let clerk: Awaited<ReturnType<typeof createClerkActors>> | undefined;
  const renderingChecks: Array<{
    caseId: string;
    variant: string;
    binding: string;
    evidence: unknown;
  }> = [];
  const recoveryChecks: Array<{
    binding: string;
    recovered: boolean;
    rowsChanged: number;
    auditRows: number;
  }> = [];
  const observations: Array<{
    caseId: string;
    variant: string;
    actions: Array<{
      binding: string;
      entry: CoverageManifestEntry;
      resources?: unknown;
    }>;
  }> = [];
  const progressPath = path.join(
    runtime.root,
    "docs/security/fuzz-matrix-2026-09-24/artifacts/native",
    runtime.runId,
    "admin-product-progress.json",
  );
  const saveProgress = () => {
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.writeFileSync(
      progressPath,
      JSON.stringify(
        { variants: observations, renderingChecks, recoveryChecks },
        null,
        2,
      ),
    );
  };
  try {
    for (const testCase of corpus.cases.filter(
      (c) =>
        c.targets.includes("admin.product") &&
        (!process.argv.some((a) => a.startsWith("--case=")) ||
          process.argv.includes(`--case=${c.id}`)),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "admin.product",
      )) {
        const actions: Array<{
          binding: string;
          entry: CoverageManifestEntry;
          resources?: unknown;
        }> = [];
        for (const binding of ["productCreate", "productUpdate"]) {
          const input = structuredClone(variant.payload) as Record<
            string,
            unknown
          >;
          const field =
            testCase.input.mode === "values"
              ? testCase.input.path
              : testCase.input.mode === "recipe"
                ? testCase.input.args.path
                : undefined;
          if (
            field !== "/sku" &&
            variant.recipe !== "duplicateSku" &&
            Object.hasOwn(input, "sku")
          )
            input.sku = `QA-${randomUUID()}`;
          input.slug = `qa-${randomUUID()}`;
          const identity = variant.metadata?.identity;
          if (identity === "staff_without_product_write") {
            for (const override of (variant.metadata?.overrides ?? []) as Array<
              Record<string, unknown>
            >)
              Object.assign(input, override);
          }
          const actor =
            identity === "anonymous" ||
            identity === "clerk_customer_without_admin_session"
              ? undefined
              : identity === "expired_admin"
                ? expired
                : identity === "revoked_admin"
                  ? revoked
                  : identity === "staff_without_product_write"
                    ? staff
                    : admin;
          await app.context.clearCookies({ name: "admin_session" });
          if (actor)
            await app.context.addCookies([
              {
                name: "admin_session",
                value: actor.token,
                url: app.baseUrl,
                httpOnly: true,
                sameSite: "Lax",
              },
            ]);
          let headers = variant.headers;
          if (identity === "clerk_customer_without_admin_session") {
            clerk ??= await createClerkActors(runtime);
            headers = { ...headers, ...(await clerk.headers(0)) };
          }
          const updateId = randomUUID(),
            duplicateId = randomUUID();
          if (binding === "productUpdate")
            await runtime.pool.query(
              "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'Before product','1.00',1,'draft')",
              [updateId, `BEFORE-${updateId}`],
            );
          if (variant.recipe === "duplicateSku")
            await runtime.pool.query(
              "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$3,'Duplicate fixture','1.00',1,'draft')",
              [duplicateId, input.sku, duplicateId],
            );
          let faultArmed = false;
          if (variant.recipe === "fault") {
            await runtime.pool.query(
              "create or replace function qa_product_fault() returns trigger language plpgsql as $$ begin raise exception 'QA_DB_SENTINEL_SQLSTATE_23505_products_unique_stack_secret' using errcode='XX000'; end $$",
            );
            await runtime.pool.query(
              "create trigger qa_product_fault before insert or update on products for each row execute function qa_product_fault()",
            );
            faultArmed = true;
          }
          const before = await snapshot(),
            emailBefore = runtime.emails.length;
          const productsBefore = (
            await runtime.pool.query(
              "select id,md5(to_jsonb(p)::text) as digest from products p order by id",
            )
          ).rows;
          const prototypeBefore = variant.invariants.includes("NO_POLLUTION")
            ? ((await invokeNativeAction(app, "prototypeProbe", [randomUUID()]))
                .value as { pid: number; clean: boolean })
            : undefined;
          let resourcePid: number | undefined;
          if (variant.invariants.includes("RESOURCE_BOUNDED"))
            resourcePid = Number(
              (
                await invokeNativeAction(app, "resourceProcessProbe", [
                  randomUUID(),
                ])
              ).value,
            );
          let wire: Awaited<ReturnType<typeof invokeNativeAction>>;
          try {
            wire = await invokeNativeAction(
              app,
              binding,
              binding === "productCreate" ? [input] : [updateId, input],
              {
                headers,
                resourcePid,
                exactBodyBytes:
                  variant.recipe === "actionBodyBytes"
                    ? {
                        target: Number(variant.metadata?.bytesTarget),
                        argumentIndex: binding === "productCreate" ? 0 : 1,
                        field: "description",
                      }
                    : undefined,
              },
            );
          } finally {
            if (faultArmed)
              await runtime.pool.query(
                "drop trigger qa_product_fault on products",
              );
          }
          const after = await snapshot();
          const changed = [...after.keys()].filter(
            (table) => before.get(table) !== after.get(table),
          );
          const unchanged =
            changed.length === 0 && runtime.emails.length === emailBefore;
          const rows = (
            await runtime.pool.query(
              "select id,sku,slug,name,description,price,stock_quantity,status,md5(to_jsonb(p)::text) as digest from products p order by id",
            )
          ).rows;
          const beforeById = new Map(
            productsBefore.map((row) => [row.id, row.digest]),
          );
          const changedRows = rows.filter(
            (row) => beforeById.get(row.id) !== row.digest,
          );
          let response = wire.value as Response;
          if (wire.wireStatus !== null && wire.wireStatus >= 400) {
            try {
              response = JSON.parse(wire.rawText) as Response;
            } catch {
              /* RSC error frames are not invented JSON envelopes. */
            }
          }
          const success = response.success === true,
            code = response.code ?? response.error?.code ?? null;
          const message = response.error?.message ?? response.message;
          const semantic = success ? 200 : code ? (codes[code] ?? null) : null;
          const errors = corpus.semantics.errors as Record<
            string,
            [string, string]
          >;
          const generic =
            semantic !== null &&
            !!errors[String(semantic)] &&
            code === errors[String(semantic)][0] &&
            message === errors[String(semantic)][1] &&
            Object.keys(response).every((key) =>
              ["success", "code", "message", "error", "requestId"].includes(
                key,
              ),
            );
          const leaks = detectErrorLeaks(wire.rawText, [
            "QA_DB_SENTINEL_SQLSTATE_23505_products_unique_stack_secret",
          ]).leaks.map((message) => message.split(" leaked:")[0]);
          const id =
            binding === "productCreate" ? response.data?.productId : updateId;
          const row = changedRows.find((row) => row.id === id);
          const audits = id
            ? (
                await runtime.pool.query(
                  "select admin_id,action,metadata from admin_audit_logs where entity_id=$1",
                  [id],
                )
              ).rows
            : [];
          const accepted =
            success &&
            changed.length === 1 &&
            changed[0] === "products" &&
            changedRows.length === 1 &&
            !!row &&
            row.sku === input.sku &&
            row.name === input.name &&
            row.description === input.description &&
            row.slug === input.slug &&
            row.stock_quantity === input.stockQuantity &&
            row.status === input.status &&
            cents(row.price) === cents(input.price) &&
            audits.length === 1 &&
            audits[0].admin_id === actor?.id &&
            audits[0].action ===
              (binding === "productCreate"
                ? "product.created"
                : "product.updated") &&
            runtime.emails.length === emailBefore &&
            Object.keys(response).every((key) =>
              ["success", "message", "data"].includes(key),
            ) &&
            (binding !== "productCreate" ||
              Object.keys(response.data ?? {}).join(",") === "productId");
          const observed: NormalizedResult = {
            success,
            wireStatus: wire.wireStatus,
            semanticStatus: semantic,
            errorCode: code,
            errorMessage: message,
            hasErrorCodeField: code !== null,
            rawResponse: response,
            rawText: wire.rawText,
            leaks,
            evidenceLayer: "server_action",
            executionTimeMs: wire.executionTimeMs,
            ...(unchanged
              ? { dbDiff: { tablesModified: [], rowsChanged: 0 } }
              : changed.every((table) => table === "products")
                ? {
                    dbDiff: {
                      tablesModified: changed,
                      rowsChanged: changedRows.length,
                    },
                  }
                : {}),
            invariantsChecked: {
              NO_LEAK: !success && generic && leaks.length === 0,
              REJECT_NO_EFFECT: !success && unchanged,
              SAFE_ACCEPT: accepted,
              INTEGER_EXACT: success ? accepted : unchanged,
            },
          };
          let recoveryId: string | undefined;
          if (
            variant.recipe === "fault" &&
            unchanged &&
            !success &&
            code === "INTERNAL_ERROR"
          ) {
            // Retry only after observing a complete rollback of this deliberate DB fault.
            const retry = await invokeNativeAction(
              app,
              binding,
              binding === "productCreate" ? [input] : [updateId, input],
            );
            const result = retry.value as Response;
            recoveryId =
              binding === "productCreate" ? result.data?.productId : updateId;
            const restored = (
              await runtime.pool.query(
                "select id,sku,slug,name,description,price,stock_quantity,status,md5(to_jsonb(p)::text) as digest from products p order by id",
              )
            ).rows;
            const changed = restored.filter(
              (row) => beforeById.get(row.id) !== row.digest,
            );
            const row = changed.find((row) => row.id === recoveryId);
            const audit = recoveryId
              ? (
                  await runtime.pool.query(
                    "select admin_id,action from admin_audit_logs where entity_id=$1",
                    [recoveryId],
                  )
                ).rows
              : [];
            const recovered =
              retry.wireStatus === 200 &&
              result.success === true &&
              changed.length === 1 &&
              !!row &&
              row.sku === input.sku &&
              row.name === input.name &&
              row.description === input.description &&
              row.slug === input.slug &&
              row.stock_quantity === input.stockQuantity &&
              row.status === input.status &&
              cents(row.price) === cents(input.price) &&
              audit.length === 1 &&
              audit[0].admin_id === actor?.id &&
              audit[0].action ===
                (binding === "productCreate"
                  ? "product.created"
                  : "product.updated") &&
              runtime.emails.length === emailBefore &&
              detectErrorLeaks(retry.rawText).leaks.length === 0;
            observed.multiStepVerified = recovered;
            recoveryChecks.push({
              binding,
              recovered,
              rowsChanged: changed.length,
              auditRows: audit.length,
            });
            requests.push({
              target: variant.target,
              caseId: variant.caseId,
              variant: variant.variantKey,
              binding: `${binding}:recovery`,
              bytes: retry.requestBytes,
              sha256: retry.requestSha256,
            });
          }
          if (prototypeBefore) {
            const probe = (
              await invokeNativeAction(app, "prototypeProbe", [randomUUID()])
            ).value as { pid: number; clean: boolean };
            observed.invariantsChecked.NO_POLLUTION =
              probe.pid === prototypeBefore.pid &&
              probe.clean &&
              prototypeBefore.clean;
          }
          if (wire.resources)
            observed.invariantsChecked.RESOURCE_BOUNDED =
              resourceBudgetPassed(wire.resources) &&
              typeof wire.requestDepth === "number";
          if (variant.invariants.includes("PLAIN_TEXT") && accepted && row) {
            const rendering = await checkProductRendering(
              runtime,
              app,
              storefront,
              {
                id: row.id,
                slug: row.slug,
                name: row.name,
                description: row.description,
              },
              field === "/name",
            );
            observed.invariantsChecked.PLAIN_TEXT = rendering.passed;
            renderingChecks.push({
              caseId: variant.caseId,
              variant: variant.variantKey,
              binding,
              evidence: rendering,
            });
            saveProgress();
            if (!rendering.passed)
              console.log(
                `Rendering diagnostic ${variant.caseId} ${variant.variantKey} ${binding}: ${JSON.stringify(rendering)}`,
              );
          }
          const entry = evaluateVariant(variant, testCase, observed);
          actions.push({ binding, entry, resources: wire.resources });
          requests.push({
            target: "admin.product",
            caseId: variant.caseId,
            variant: variant.variantKey,
            binding,
            bytes: wire.requestBytes,
            sha256: wire.requestSha256,
          });
          // Preserve mutated SKUs verbatim; remove only these isolated fixtures after observations.
          const newIds = rows
            .filter((row) => !beforeById.has(row.id))
            .map((row) => row.id);
          await runtime.pool.query(
            "delete from products where id=any($1::uuid[])",
            [
              [
                ...newIds,
                updateId,
                duplicateId,
                ...(recoveryId ? [recoveryId] : []),
              ],
            ],
          );
        }
        const severity = { FAIL: 0, BLOCKED: 1, UNIMPLEMENTED: 2, PASS: 3 };
        const combined = structuredClone(
          [...actions].sort(
            (a, b) => severity[a.entry.result] - severity[b.entry.result],
          )[0].entry,
        );
        combined.evidence = actions
          .map(({ binding, entry }) => `${binding}: ${entry.evidence}`)
          .join("; ");
        if (combined.result !== "PASS") combined.gapReason = combined.evidence;
        const index = entries.findIndex(
          (entry) =>
            entry.caseId === variant.caseId &&
            entry.target === variant.target &&
            entry.variant === variant.variantKey,
        );
        assert(index >= 0);
        entries[index] = combined;
        observations.push({
          caseId: variant.caseId,
          variant: variant.variantKey,
          actions,
        });
        saveProgress();
        console.log(
          `${combined.result} ${variant.caseId} ${variant.variantKey}`,
        );
      }
    }
  } finally {
    if (clerk) await clerk.cleanup();
  }
  return {
    variants: observations,
    clerkCleaned: clerk ? true : null,
    renderingChecks,
    recoveryChecks,
  };
}
