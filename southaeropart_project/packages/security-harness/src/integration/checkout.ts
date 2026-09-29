import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import { createClerkActors } from "./clerk-actors";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import { checkCheckoutRace } from "./checkout-race";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

type CheckoutResponse = {
  success?: boolean;
  code?: string;
  error?: string | { code?: string; message?: string };
  orderId?: string;
  total?: string;
};
const statuses: Record<string, number> = {
  INVALID_INPUT: 422,
  CONFLICT: 409,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
};
const satang = (value: string) => {
  const [major, fraction = ""] = value.split(".");
  return BigInt(major) * 100n + BigInt(fraction.padEnd(2, "0"));
};

/** Execute createOrder itself; a successful result must match the persisted catalog, order and reservation ledger. */
export async function checkCheckout(
  runtime: NativeRuntime,
  app: NativeApp,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
  requests: Array<{
    target: string;
    caseId: string;
    variant: string;
    bytes: number;
    sha256: string;
  }>,
) {
  const snapshot = await createBusinessObserver(runtime);
  const clerk = await createClerkActors(runtime);
  const raceChecks: Awaited<
    ReturnType<typeof checkCheckoutRace>
  >["scenarios"][] = [];
  const observations: Array<{
    caseId: string;
    variant: string;
    entry: CoverageManifestEntry;
    orderRows: number;
    itemRows: number;
    reservationRows: number;
    emailRequests: number;
  }> = [];
  try {
    for (const testCase of corpus.cases.filter(
      (c) =>
        c.targets.includes("checkout.create") &&
        (!process.argv.some((a) => a.startsWith("--case=")) ||
          process.argv.includes(`--case=${c.id}`)),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "checkout.create",
      )) {
        if (variant.recipe === "checkoutRace") {
          const race = await checkCheckoutRace(runtime, app, clerk);
          const index = entries.findIndex(
            (e) =>
              e.caseId === variant.caseId &&
              e.target === variant.target &&
              e.variant === variant.variantKey,
          );
          entries[index] = evaluateVariant(variant, testCase, race.observed);
          raceChecks.push(race.scenarios);
          requests.push(
            ...race.requests.map((request) => ({
              target: variant.target,
              caseId: variant.caseId,
              variant: variant.variantKey,
              ...request,
            })),
          );
          console.log(
            `${entries[index].result} ${variant.caseId} ${variant.variantKey}`,
          );
          continue;
        }
        const input = structuredClone(variant.payload) as {
          items?: Array<{
            productId?: string;
            quantity?: unknown;
            variant?: string;
          }>;
          shippingMethod?: string;
        } | null;
        const ids = new Map<string, string>();
        // Unrepresentable numeric recipes deliberately have no JS payload. Extract only
        // their generated UUID fields; transmit the untouched numeric lexemes below.
        if (variant.rawPayload !== undefined) {
          const raw = Buffer.isBuffer(variant.rawPayload)
            ? variant.rawPayload.toString("utf8")
            : variant.rawPayload;
          for (const match of raw.matchAll(
            /"productId"\s*:\s*"([a-f0-9-]{36})"/gi,
          )) {
            if (!ids.has(match[1])) ids.set(match[1], randomUUID());
          }
        }
        if (Array.isArray(input?.items))
          for (const item of input.items) {
            if (
              item &&
              typeof item === "object" &&
              typeof item.productId === "string"
            ) {
              const original = item.productId;
              if (!ids.has(original)) ids.set(original, randomUUID());
              item.productId = ids.get(original);
            }
          }
        const stock = Number(variant.metadata?.stockBefore ?? 1000);
        if (ids.size)
          await runtime.pool.query(
            "insert into products(id,sku,slug,name,price,stock_quantity,status) select x,x::text,x::text,'QA server product','100.00',$2,'active' from unnest($1::uuid[]) x",
            [[...ids.values()], stock],
          );
        let raw = variant.rawPayload;
        if (raw !== undefined) {
          let text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
          for (const [original, mapped] of ids)
            text = text.replaceAll(original, mapped);
          raw = Buffer.from(text);
        }
        const before = await snapshot(),
          emailBefore = runtime.emails.length;
        const knownOrderIds = new Set(
          (await runtime.pool.query("select id from orders")).rows.map(
            (r) => r.id,
          ),
        );
        const wire = await invokeNativeAction(app, "checkout", [input], {
          headers: await clerk.headers(0),
          rawFirstArgument: raw,
          timeoutMs: 120000,
        });
        requests.push({
          target: variant.target,
          caseId: variant.caseId,
          variant: variant.variantKey,
          bytes: wire.requestBytes,
          sha256: wire.requestSha256,
        });
        const after = await snapshot();
        const changed = [...after.keys()].filter(
          (table) => before.get(table) !== after.get(table),
        );
        const emails = runtime.emails.length - emailBefore;
        const response = wire.value as CheckoutResponse;
        const success = response.success === true;
        const code =
          response.code ??
          (typeof response.error === "object" ? response.error?.code : null) ??
          null;
        const message =
          typeof response.error === "string"
            ? response.error
            : response.error?.message;
        const semantic = success ? 200 : code ? (statuses[code] ?? null) : null;
        const errors = corpus.semantics.errors as Record<
          string,
          [string, string]
        >;
        const generic =
          semantic !== null &&
          code === errors[String(semantic)]?.[0] &&
          message === errors[String(semantic)]?.[1] &&
          Object.keys(response).every((k) =>
            ["success", "code", "error", "requestId"].includes(k),
          );
        const newOrders = (
          await runtime.pool.query("select * from orders")
        ).rows.filter((r) => !knownOrderIds.has(r.id));
        const order = newOrders.find((r) => r.id === response.orderId);
        const items = order
          ? (
              await runtime.pool.query(
                "select * from order_items where order_id=$1",
                [order.id],
              )
            ).rows
          : [];
        const reservations = order
          ? (
              await runtime.pool.query(
                "select * from order_stock_reservations where order_id=$1",
                [order.id],
              )
            ).rows
          : [];
        const histories = order
          ? (
              await runtime.pool.query(
                "select status from order_status_history where order_id=$1",
                [order.id],
              )
            ).rows
          : [];
        const products = ids.size
          ? (
              await runtime.pool.query(
                "select id,price,stock_quantity from products where id=any($1::uuid[])",
                [[...ids.values()]],
              )
            ).rows
          : [];
        const demand = new Map<string, number>();
        if (Array.isArray(input?.items))
          for (const item of input.items)
            if (item?.productId && Number.isInteger(item.quantity))
              demand.set(
                item.productId,
                (demand.get(item.productId) ?? 0) + Number(item.quantity),
              );
        const subtotal = [...demand.values()].reduce(
          (total, q) => total + 10000n * BigInt(q),
          0n,
        );
        const shipping =
          input?.shippingMethod === "express"
            ? 45000n
            : subtotal >= 1500000n
              ? 0n
              : 15000n;
        const accepted =
          success &&
          !!order &&
          newOrders.length === 1 &&
          order.user_id === clerk.actors[0].id &&
          order.status === "pending" &&
          order.payment_status === "pending" &&
          order.inventory_state === "reserved" &&
          order.stripe_payment_intent_id === null &&
          order.currency === "THB" &&
          satang(order.subtotal) === subtotal &&
          satang(order.shipping_fee) === shipping &&
          satang(order.tax_amount) === 0n &&
          satang(order.total) === subtotal + shipping &&
          response.total === order.total &&
          items.length === input?.items?.length &&
          items.every(
            (row) =>
              row.product_name_snapshot === "QA server product" &&
              row.unit_price === "100.00" &&
              satang(row.line_total) === 10000n * BigInt(row.quantity),
          ) &&
          reservations.length === demand.size &&
          reservations.every(
            (row) => row.quantity === demand.get(row.product_id),
          ) &&
          products.every(
            (row) => row.stock_quantity === stock - (demand.get(row.id) ?? 0),
          ) &&
          histories.length === 1 &&
          histories[0].status === "pending" &&
          emails === 0 &&
          changed.every((table) =>
            [
              "orders",
              "order_items",
              "order_stock_reservations",
              "order_status_history",
              "products",
            ].includes(table),
          );
        const unchanged = changed.length === 0 && emails === 0;
        const leaks = detectErrorLeaks(wire.rawText).leaks;
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
            : {}),
          invariantsChecked: {
            NO_LEAK: !success && generic && leaks.length === 0,
            REJECT_NO_EFFECT: !success && unchanged,
            SAFE_ACCEPT: accepted,
            AUTHORITATIVE: success ? accepted : unchanged,
            INTEGER_EXACT: success ? accepted : unchanged,
          },
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
          caseId: variant.caseId,
          variant: variant.variantKey,
          entry,
          orderRows: newOrders.length,
          itemRows: items.length,
          reservationRows: reservations.length,
          emailRequests: emails,
        });
        console.log(`${entry.result} ${variant.caseId} ${variant.variantKey}`);
      }
    }
  } finally {
    await clerk.cleanup();
  }
  return {
    variants: observations,
    raceChecks,
    clerkCleaned: true,
    scope:
      "Authenticated native createOrder with owned catalog fixtures; payment-intent creation is a separate action.",
  };
}
