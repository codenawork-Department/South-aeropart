import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import {
  ORDER_READ_MAX_REQUESTS,
  ORDER_READ_WINDOW_MS,
} from "../../../../apps/storefront/lib/order-read-policy";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import { guestArguments, guestCreationTime } from "./guest-fixture";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import { unavailable } from "../adapters/unavailable";
import { createClerkActors } from "./clerk-actors";
import { checkGuestTlsCookie } from "./guest-tls-cookie";
import {
  resourceBudgetPassed,
  type ResourceMeasurement,
} from "./resource-observer";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

type RequestEvidence = {
  target: string;
  caseId: string;
  variant: string;
  binding?: string;
  bytes: number;
  sha256: string;
};
type GuestResponse = {
  success?: boolean;
  code?: string;
  error?: string | { code?: string; message?: string };
  data?: {
    order?: Record<string, unknown>;
    items?: unknown[];
    history?: unknown[];
  };
  orderId?: string;
  retryAfter?: number;
};
const statusCodes: Record<string, number> = {
  INVALID_INPUT: 422,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
};

/** Two real application actions must both satisfy a variant; never add two passes to the denominator. */
export async function checkGuestTracking(
  runtime: NativeRuntime,
  app: NativeApp,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
  requests: RequestEvidence[],
  nowMs: number,
) {
  const snapshot = await createBusinessObserver(runtime);
  const observations: Array<{
    caseId: string;
    variant: string;
    actions: Array<{ binding: string; entry: CoverageManifestEntry }>;
    gap?: string;
  }> = [];
  const customerSessions: Array<{
    actor: string;
    binding: string;
    argumentMode: string;
    ownerAccepted: boolean;
  }> = [];
  const resourceChecks: Array<{
    caseId: string;
    variant: string;
    binding: string;
    requestBytes: number;
    requestDepth: number | undefined;
    measurement: ResourceMeasurement;
    passed: boolean;
  }> = [];
  const rateChecks: Array<{
    binding: string;
    lastAllowed: boolean;
    countAfterRejection: number;
    retryAfter: number | undefined;
    recovered: boolean;
  }> = [];
  let clerk: Awaited<ReturnType<typeof createClerkActors>> | undefined;
  let clerkGap: string | undefined;
  let clerkCleaned = false;
  let tlsCookie:
    | Awaited<ReturnType<typeof checkGuestTlsCookie>>
    | { passed: false; errorName: string }
    | undefined;
  const customerOrders = [randomUUID(), randomUUID()];
  try {
    try {
      clerk = await createClerkActors(runtime);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("could not all be deleted")
      )
        throw error;
      clerkGap =
        error instanceof Error
          ? error.message
          : "Clerk test fixture setup failed";
    }
    if (clerk) {
      for (const [index, actor] of clerk.actors.entries()) {
        await runtime.pool.query(
          "insert into orders(id,order_number,user_id,payment_method,subtotal,total,shipping_address) values($1,$2,$3,'credit_card','100.00','100.00',$4)",
          [
            customerOrders[index],
            `QA-${customerOrders[index]}`,
            actor.id,
            JSON.stringify({
              recipientName: "Customer fixture",
              phone: "0800000000",
              line1: "Fixture",
              subDistrict: "Fixture",
              district: "Fixture",
              province: "Bangkok",
              postalCode: "10500",
            }),
          ],
        );
        for (const binding of ["guestDetails", "guestStatus"]) {
          for (const argumentMode of ["positional", "object"]) {
            const wire = await invokeNativeAction(
              app,
              binding,
              argumentMode === "positional"
                ? [customerOrders[index]]
                : [{ orderId: customerOrders[index] }],
              { headers: await clerk.headers(index) },
            );
            const response = wire.value as GuestResponse;
            const ownerAccepted =
              wire.wireStatus === 200 &&
              response.success === true &&
              (binding === "guestDetails"
                ? response.data?.order?.id
                : response.orderId) === customerOrders[index];
            customerSessions.push({
              actor: index === 0 ? "A" : "B",
              binding,
              argumentMode,
              ownerAccepted,
            });
          }
        }
      }
      if (customerSessions.some((check) => !check.ownerAccepted))
        clerkGap =
          "Real Clerk sessions were created but positive owner controls failed; cross-user denial alone cannot prove ownership.";
    }
    for (const testCase of corpus.cases.filter((c) =>
      c.targets.includes("guest.track"),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "guest.track",
      )) {
        const ownership = variant.metadata?.ownershipVariant;
        const creation = variant.metadata?.creationValue;
        let gap: string | undefined;
        if (
          typeof ownership === "string" &&
          ownership.startsWith("customer_") &&
          (!clerk || clerkGap)
        )
          gap =
            clerkGap ??
            "Real Clerk customer A/B sessions and positive owner controls have not been provisioned in this run.";
        const actions: Array<{
          binding: string;
          entry: CoverageManifestEntry;
        }> = [];
        let combined: CoverageManifestEntry;
        if (gap) {
          combined = evaluateVariant(variant, testCase, unavailable(gap));
        } else {
          const orderId = randomUUID(),
            otherOrderId = randomUUID(),
            nonexistentOrderId = randomUUID();
          const userId = `guest_${randomUUID()}`;
          const createdAt = guestCreationTime(variant, nowMs);
          const fixture = {
            orderId,
            otherOrderId,
            nonexistentOrderId,
            userId,
            createdAt,
            nowMs,
            secret: runtime.env.ORDER_TOKEN_SECRET!,
          };
          const prepared = guestArguments(variant, fixture);
          if (ownership === "customer_B_session_order_A")
            prepared.args = [customerOrders[0]];
          await runtime.pool.query(
            "insert into users(id,email,full_name) values($1,$2,'Guest fixture')",
            [userId, `${randomUUID()}@example.invalid`],
          );
          for (const id of [orderId, otherOrderId]) {
            await runtime.pool.query(
              "insert into orders(id,order_number,user_id,payment_method,subtotal,total,shipping_address,created_at) values($1,$2,$3,'credit_card','100.00','100.00',$4,$5)",
              [
                id,
                `QA-${id}`,
                userId,
                JSON.stringify({
                  recipientName: "Owned guest fixture",
                  phone: "0800000000",
                  email: "fixture@example.invalid",
                  line1: "Fixture",
                  subDistrict: "Fixture",
                  district: "Fixture",
                  province: "Bangkok",
                  postalCode: "10500",
                }),
                createdAt,
              ],
            );
          }
          const productId = randomUUID();
          if (creation === "invalid_date" || creation === "out_of_date_range") {
            const storedDate = await invokeNativeAction(
              app,
              "guestStoredDateProbe",
              [orderId],
            );
            assert.deepEqual(
              storedDate.value,
              { isDate: true, finite: false },
              "The actual Drizzle read must deliver Invalid Date to the action",
            );
          }
          await runtime.pool.query(
            "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'Guest fixture product','100.00',10,'active')",
            [productId, productId],
          );
          await runtime.pool.query(
            "insert into order_items(order_id,product_id,product_name_snapshot,unit_price,quantity,line_total) values($1,$2,'Guest fixture product','100.00',1,'100.00')",
            [orderId, productId],
          );
          await runtime.pool.query(
            "insert into order_status_history(order_id,status,note) values($1,'pending','PRIVATE_INTERNAL_HISTORY_SENTINEL')",
            [orderId],
          );
          for (const binding of ["guestDetails", "guestStatus"]) {
            const rateKey = createHash("sha256")
              .update("order-read:unknown")
              .digest("hex");
            // Preserve Clerk's handshake cookies; clear only the guest credentials.
            await app.context.clearCookies({ name: /^guest_order_/ });
            if (prepared.cookieOnly)
              await app.context.addCookies([
                {
                  name: `guest_order_${orderId}`,
                  value: prepared.token,
                  url: app.baseUrl,
                  httpOnly: true,
                  sameSite: "Lax",
                },
              ]);
            if (variant.caseId === "A-04") {
              // Seed only the run's isolated security counter at the final allowed request.
              await runtime.pool.query(
                "insert into abuse_buckets(key,count,expires_at) values($1,$2,now()+($3 * interval '1 millisecond')) on conflict(key) do update set count=excluded.count,expires_at=excluded.expires_at",
                [rateKey, ORDER_READ_MAX_REQUESTS - 1, ORDER_READ_WINDOW_MS],
              );
              const allowed = await invokeNativeAction(
                app,
                binding,
                prepared.args,
              );
              assert.equal(
                (allowed.value as GuestResponse).success,
                true,
                "Last allowed native request must succeed before the rejection",
              );
              const bucket = (
                await runtime.pool.query(
                  "select count from abuse_buckets where key=$1",
                  [rateKey],
                )
              ).rows[0];
              assert.equal(bucket.count, ORDER_READ_MAX_REQUESTS);
            }
            const before = await snapshot(),
              emailBefore = runtime.emails.length;
            const requestHeaders =
              typeof ownership === "string" && ownership.startsWith("customer_")
                ? await clerk!.headers(1)
                : undefined;
            let resourcePid: number | undefined;
            if (variant.invariants.includes("RESOURCE_BOUNDED")) {
              const probe = await invokeNativeAction(
                app,
                "resourceProcessProbe",
                [randomUUID()],
              );
              assert(
                Number.isSafeInteger(probe.value) && Number(probe.value) > 0,
              );
              resourcePid = Number(probe.value);
            }
            const wire = await invokeNativeAction(app, binding, prepared.args, {
              headers: requestHeaders,
              resourcePid,
            });
            if (
              resourcePid !== undefined &&
              wire.resources?.state !== "violated"
            ) {
              const probe = await invokeNativeAction(
                app,
                "resourceProcessProbe",
                [randomUUID()],
              );
              assert.equal(
                probe.value,
                resourcePid,
                "Measured server process must not change during the request",
              );
            }
            requests.push({
              target: "guest.track",
              caseId: variant.caseId,
              variant: variant.variantKey,
              binding,
              bytes: wire.requestBytes,
              sha256: wire.requestSha256,
            });
            const after = await snapshot();
            const unchanged =
              [...after].every(
                ([table, digest]) => before.get(table) === digest,
              ) && runtime.emails.length === emailBefore;
            let response = wire.value as GuestResponse;
            if (wire.wireStatus !== null && wire.wireStatus >= 400) {
              try {
                response = JSON.parse(wire.rawText) as GuestResponse;
              } catch {
                /* Keep native RSC failures distinct. */
              }
            }
            const success = response.success === true;
            const code =
              response.code ??
              (typeof response.error === "object"
                ? response.error?.code
                : null) ??
              null;
            const message =
              typeof response.error === "string"
                ? response.error
                : response.error?.message;
            const semantic = success
              ? 200
              : code
                ? (statusCodes[code] ?? null)
                : null;
            const leaks = detectErrorLeaks(wire.rawText, [
              prepared.token,
              runtime.env.ORDER_TOKEN_SECRET!,
              "PRIVATE_INTERNAL_HISTORY_SENTINEL",
              ...(!success
                ? [
                    userId,
                    orderId,
                    "Owned guest fixture",
                    "fixture@example.invalid",
                  ]
                : []),
            ]).leaks.map((value) =>
              value.split(" leaked:")[0].replace(/: ".*"$/, ""),
            );
            const errors = corpus.semantics.errors as Record<
              string,
              [string, string]
            >;
            const expectedError =
              semantic === null ? undefined : errors[String(semantic)];
            const generic =
              !!expectedError &&
              code === expectedError[0] &&
              message === expectedError[1] &&
              Object.keys(response).every((key) =>
                ["success", "code", "error", "data", "retryAfter"].includes(
                  key,
                ),
              ) &&
              response.data == null;
            const orderKeys = [
              "id",
              "orderNumber",
              "status",
              "paymentMethod",
              "paymentStatus",
              "omiseChargeId",
              "stripePaymentIntentId",
              "subtotal",
              "shippingFee",
              "taxAmount",
              "total",
              "currency",
              "trackingNumber",
              "shippingCarrier",
                "customerNote",
              "shippingAddress",
              "billingAddress",
              "createdAt",
              "updatedAt",
            ];
            const dto =
              binding === "guestDetails"
                ? response.data?.order?.id === orderId &&
                  Array.isArray(response.data.items) &&
                  Array.isArray(response.data.history) &&
                  Object.keys(response.data.order).length ===
                    orderKeys.length &&
                  Object.keys(response.data.order).every((key) =>
                    orderKeys.includes(key),
                  ) &&
                  response.data.order.total === "100.00" &&
                  response.data.items.length === 1 &&
                  response.data.history.length === 1 &&
                  response.data.items.every(
                    (item) => (item as { orderId: string }).orderId === orderId,
                  ) &&
                  response.data.history.every((item) =>
                    Object.keys(item as object).every((key) =>
                      ["id", "orderId", "status", "createdAt"].includes(key),
                    ),
                  )
                : response.orderId === orderId &&
                  Object.keys(response).every((key) =>
                    [
                      "success",
                      "orderId",
                      "status",
                      "paymentStatus",
                      "orderNumber",
                    ].includes(key),
                  );
            const observed: NormalizedResult = {
              success,
              wireStatus: wire.wireStatus,
              semanticStatus: semantic,
              errorCode: code,
              errorMessage: message,
              hasErrorCodeField: code !== null,
              rawResponse: response,
              evidenceLayer: "server_action",
              rawText: wire.rawText,
              leaks,
              executionTimeMs: wire.executionTimeMs,
              ...(unchanged
                ? { dbDiff: { tablesModified: [], rowsChanged: 0 } }
                : {}),
              invariantsChecked: {
                NO_LEAK: !success && generic && leaks.length === 0,
                REJECT_NO_EFFECT: !success && unchanged,
                SAFE_ACCEPT: success && unchanged && dto && leaks.length === 0,
                GUEST_PRIVATE: (success ? dto : generic) && leaks.length === 0,
              },
            };
            if (variant.caseId === "A-04") {
              const bucket = (
                await runtime.pool.query(
                  "select count from abuse_buckets where key=$1",
                  [rateKey],
                )
              ).rows[0];
              await runtime.pool.query(
                "update abuse_buckets set expires_at=now()-interval '1 second' where key=$1",
                [rateKey],
              );
              const recovery = await invokeNativeAction(
                app,
                binding,
                prepared.args,
              );
              const reset = (
                await runtime.pool.query(
                  "select count from abuse_buckets where key=$1",
                  [rateKey],
                )
              ).rows[0];
              const recovered =
                (recovery.value as GuestResponse).success === true &&
                reset.count === 1;
              const bounded =
                Number.isInteger(response.retryAfter) &&
                Number(response.retryAfter) >= 1 &&
                Number(response.retryAfter) <= ORDER_READ_WINDOW_MS / 1000 &&
                bucket.count === ORDER_READ_MAX_REQUESTS + 1 &&
                recovered;
              observed.invariantsChecked.NO_LEAK =
                observed.invariantsChecked.NO_LEAK && bounded;
              rateChecks.push({
                binding,
                lastAllowed: true,
                countAfterRejection: bucket.count,
                retryAfter: response.retryAfter,
                recovered,
              });
            }
            if (wire.resources) {
              const bounded =
                resourceBudgetPassed(wire.resources) && wire.requestDepth === 1;
              observed.invariantsChecked.RESOURCE_BOUNDED = bounded;
              resourceChecks.push({
                caseId: variant.caseId,
                variant: variant.variantKey,
                binding,
                requestBytes: wire.requestBytes,
                requestDepth: wire.requestDepth,
                measurement: wire.resources,
                passed: bounded,
              });
            }
            const entry = evaluateVariant(variant, testCase, observed);
            if (prepared.cookieOnly && entry.result === "PASS") {
              if (!tlsCookie) {
                try {
                  tlsCookie = await checkGuestTlsCookie(runtime);
                } catch (error) {
                  tlsCookie = {
                    passed: false,
                    errorName:
                      error instanceof Error ? error.name : "Unknown failure",
                  };
                }
              }
              if (!tlsCookie.passed) {
                entry.result = "BLOCKED";
                entry.gapReason = entry.evidence =
                  "Development cookie access passed; production HTTPS cookie verification did not complete. See tlsCookie diagnostics and the owned TLS log.";
              } else
                entry.evidence +=
                  " Actual checkout cookie issuance, attributes and cookie-only reads also verified on this run's production build over HTTPS.";
            }
            actions.push({ binding, entry });
          }
          const severity = { FAIL: 0, BLOCKED: 1, UNIMPLEMENTED: 2, PASS: 3 };
          combined = structuredClone(
            [...actions].sort(
              (a, b) => severity[a.entry.result] - severity[b.entry.result],
            )[0].entry,
          );
          combined.evidence = actions
            .map(({ binding, entry }) => `${binding}: ${entry.evidence}`)
            .join("; ");
          if (combined.result !== "PASS")
            combined.gapReason = combined.evidence;
        }
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
          gap,
        });
        console.log(
          `${combined.result} ${variant.caseId} ${variant.variantKey}`,
        );
      }
    }
  } finally {
    if (clerk) {
      await clerk.cleanup();
      clerkCleaned = true;
    }
  }
  return {
    variants: observations,
    customerSessions,
    clerkGap,
    clerkCleaned,
    resourceChecks,
    rateChecks,
    tlsCookie,
  };
}
