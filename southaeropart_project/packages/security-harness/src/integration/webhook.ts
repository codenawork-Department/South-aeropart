import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomInt, randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { createBusinessObserver } from "./db-observer";
import { postNativeHttp } from "./native-http";
import { armResourceWatchdog, resourceBudgetPassed } from "./resource-observer";
import { createStripeFixtures } from "./stripe-fixtures";
import { webhookFixture } from "./webhook-fixture";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

type Wire = Awaited<ReturnType<typeof postNativeHttp>>;
export async function checkWebhook(
  runtime: NativeRuntime,
  app: NativeApp,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
  clockMs: number,
) {
  const fixtures = createStripeFixtures(runtime);
  const snapshot = await createBusinessObserver(runtime);
  const output = path.join(
    runtime.root,
    "docs/security/fuzz-matrix-2026-09-24/artifacts/native",
    runtime.runId,
    "webhook-progress.json",
  );
  const evidence: unknown[] = [];
  const save = () =>
    fs.writeFileSync(
      output,
      JSON.stringify({ observations: evidence }, null, 2),
    );
  const endpoint = `${app.baseUrl}/api/webhooks/stripe`;
  const pid = (await invokeNativeAction(app, "resourceProcessProbe", []))
    .value as number;
  const providerFile = path.join(app.resourceDirectory, `${pid}.jsonl`);
  const providerCalls = () =>
    fs.existsSync(providerFile)
      ? fs
          .readFileSync(providerFile, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(
            (line) =>
              JSON.parse(line) as { method: string; status: number | null },
          )
      : [];
  // Compile the actual route before measuring per-request CPU/RSS budgets.
  await postNativeHttp(endpoint, Buffer.from("{}"));
  let providerCleanup: Awaited<ReturnType<typeof fixtures.cleanup>> | undefined;
  try {
    for (const testCase of corpus.cases.filter(
      (c) =>
        c.targets.includes("stripe.webhook") &&
        (!process.argv.some((a) => a.startsWith("--case=")) ||
          process.argv.includes(`--case=${c.id}`)),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "stripe.webhook",
      )) {
        const orderId = randomUUID(),
          productId = randomUUID(),
          userId = `guest_${randomUUID().replaceAll("-", "")}`;
        const intent = await fixtures.create(orderId);
        await runtime.pool.query(
          "insert into users(id,email,full_name) values($1,$2,'Webhook test customer')",
          [userId, `${userId}@example.invalid`],
        );
        await runtime.pool.query(
          "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,'Webhook test product','100.00',9,'active')",
          [productId, productId],
        );
        await runtime.pool.query(
          "insert into orders(id,order_number,user_id,payment_method,subtotal,total,shipping_address,stripe_payment_intent_id,inventory_state,reservation_expires_at) values($1,$2,$3,'credit_card','100.00','100.00',$4::jsonb,$5,'reserved',now()+interval '30 minutes')",
          [
            orderId,
            `QA-${orderId}`,
            userId,
            JSON.stringify({
              recipientName: "Fixture",
              email: "webhook@example.invalid",
              phone: "0800000000",
              line1: "Fixture",
              subDistrict: "Fixture",
              district: "Fixture",
              province: "Bangkok",
              postalCode: "10110",
            }),
            intent.id,
          ],
        );
        await runtime.pool.query(
          "insert into order_items(order_id,product_id,product_name_snapshot,unit_price,quantity,line_total) values($1,$2,'Webhook test product','100.00',1,'100.00')",
          [orderId, productId],
        );
        await runtime.pool.query(
          "insert into order_stock_reservations(order_id,product_id,quantity) values($1,$2,1)",
          [orderId, productId],
        );
        const late = variant.recipe === "stripeLatePayment";
        if (late)
          await runtime.pool.query(
            "update orders set status=$2,inventory_state='released',reservation_expires_at=now()-interval '1 minute' where id=$1",
            [
              orderId,
              variant.metadata?.state === "canceled" ? "cancelled" : "pending",
            ],
          );
        const prepared = webhookFixture(
          variant,
          corpus,
          {
            orderId,
            intentId: intent.id,
            eventId: `evt_${randomUUID().replaceAll("-", "")}`,
          },
          runtime.env.STRIPE_WEBHOOK_SECRET!,
          Math.floor(clockMs / 1000),
        );
        const before = await snapshot(),
          emailBefore = runtime.emails.length,
          callsBefore = providerCalls().length;
        const prototypeBefore = (
          await invokeNativeAction(app, "prototypeProbe", [])
        ).value as { pid: number; clean: boolean };
        let first: Wire | undefined;
        const deliveries: Wire[] = [];
        let recoveryVerified = false,
          rejectedUnchanged = false,
          pendingEmailObserved = false,
          barrierArrivals = 0;
        let resources:
          | Awaited<
              ReturnType<
                Awaited<ReturnType<typeof armResourceWatchdog>>["finish"]
              >
            >
          | undefined;
        const chunked =
          variant.metadata?.delivery === "chunked_no_content_length";
        const send = (
          payload: { body: Buffer; headers: Record<string, string> } = prepared,
        ) => postNativeHttp(endpoint, payload.body, payload.headers, chunked);
        let fault = false;
        try {
          if (variant.metadata?.at === "fulfillment_transaction_commit") {
            await runtime.pool.query(
              "create or replace function qa_webhook_fault() returns trigger language plpgsql as $$ begin raise exception 'QA_DB_SENTINEL_SQLSTATE_23505_products_unique'; end $$",
            );
            await runtime.pool.query(
              "create constraint trigger qa_webhook_fault after insert on order_status_history deferrable initially deferred for each row execute function qa_webhook_fault()",
            );
            fault = true;
          }
          if (variant.metadata?.at === "email_delivery")
            runtime.setEmailFailure(true);
          if (
            variant.recipe === "stripeDuplicates" &&
            variant.metadata?.concurrency === 2
          ) {
            const controller = await runtime.pool.connect(),
              namespace = 128063,
              key = randomInt(1, 2147483647);
            let attempts: Promise<PromiseSettledResult<Wire>[]> | undefined;
            let locked = false,
              trigger = false;
            try {
              await controller.query("select pg_advisory_lock($1,$2)", [
                namespace,
                key,
              ]);
              locked = true;
              await runtime.pool.query(
                `create or replace function qa_webhook_barrier() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock_shared(${namespace},${key}); return NEW; end $$`,
              );
              await runtime.pool.query(
                "create trigger qa_webhook_barrier before insert on stripe_webhook_events for each row execute function qa_webhook_barrier()",
              );
              trigger = true;
              attempts = Promise.allSettled([
                send(),
                send(
                  prepared.next(
                    undefined,
                    String(variant.metadata?.duplicateVariant).includes(
                      "different",
                    ),
                  ),
                ),
              ]);
              const deadline = performance.now() + 10000;
              while (performance.now() < deadline) {
                barrierArrivals = (
                  await runtime.pool.query(
                    "select count(*)::int as n from pg_locks where locktype='advisory' and classid=$1::oid and objid=$2::oid and objsubid=2 and not granted",
                    [namespace, key],
                  )
                ).rows[0].n;
                if (barrierArrivals === 2) break;
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              assert.equal(
                barrierArrivals,
                2,
                "Both native webhook transactions must reach the barrier",
              );
              await controller.query("select pg_advisory_unlock($1,$2)", [
                namespace,
                key,
              ]);
              locked = false;
              const settled = await attempts;
              assert(settled.every((r) => r.status === "fulfilled"));
              deliveries.push(
                ...settled.map(
                  (r) => (r as PromiseFulfilledResult<Wire>).value,
                ),
              );
              first = deliveries[0];
            } finally {
              if (locked)
                await controller.query("select pg_advisory_unlock($1,$2)", [
                  namespace,
                  key,
                ]);
              if (attempts) await attempts;
              if (trigger)
                await runtime.pool.query(
                  "drop trigger qa_webhook_barrier on stripe_webhook_events",
                );
              controller.release();
            }
          } else {
            const watchdog = variant.invariants.includes("RESOURCE_BOUNDED")
              ? await armResourceWatchdog(app.resourceDirectory, pid)
              : undefined;
            first = await send();
            deliveries.push(first);
            if (watchdog) resources = await watchdog.finish();
            if (variant.recipe === "stripeDuplicates")
              deliveries.push(
                await send(
                  prepared.next(
                    undefined,
                    String(variant.metadata?.duplicateVariant).includes(
                      "different",
                    ),
                  ),
                ),
              );
            if (variant.recipe === "stripeSequence")
              deliveries.push(
                await send(
                  prepared.next("payment_intent.payment_failed", true),
                ),
              );
          }
          const firstAfter = await snapshot();
          rejectedUnchanged =
            [...before].every(
              ([table, hash]) => firstAfter.get(table) === hash,
            ) && runtime.emails.length === emailBefore;
          if (fault) {
            await runtime.pool.query(
              "drop trigger qa_webhook_fault on order_status_history",
            );
            fault = false;
            deliveries.push(await send());
            recoveryVerified =
              first.status === 500 &&
              rejectedUnchanged &&
              deliveries.at(-1)?.status === 200;
          }
          if (variant.metadata?.at === "email_delivery") {
            runtime.setEmailFailure(false);
            const job = (
              await runtime.pool.query(
                "select sent_at,attempts from order_email_jobs where order_id=$1",
                [orderId],
              )
            ).rows[0];
            pendingEmailObserved = job?.sent_at === null && job.attempts === 1;
            await runtime.pool.query(
              "update order_email_jobs set next_attempt_at=now()-interval '1 second' where order_id=$1",
              [orderId],
            );
            deliveries.push(await send());
          }
        } finally {
          runtime.setEmailFailure(false);
          if (fault)
            await runtime.pool.query(
              "drop trigger qa_webhook_fault on order_status_history",
            );
        }
        assert(first);
        const after = await snapshot(),
          changed = [...before.keys()].filter(
            (t) => before.get(t) !== after.get(t),
          );
        const order = (
          await runtime.pool.query(
            "select status,payment_status,inventory_state,total from orders where id=$1",
            [orderId],
          )
        ).rows[0];
        const history = (
          await runtime.pool.query(
            "select count(*)::int as n from order_status_history where order_id=$1 and status='paid'",
            [orderId],
          )
        ).rows[0].n;
        const jobs = (
          await runtime.pool.query(
            "select sent_at,attempts from order_email_jobs where order_id=$1",
            [orderId],
          )
        ).rows;
        const ledger = (
          await runtime.pool.query(
            "select count(*)::int as n from stripe_webhook_events where order_id=$1",
            [orderId],
          )
        ).rows[0].n;
        const reconciliation = (
          await runtime.pool.query(
            "select count(*)::int as n from payment_reconciliation_jobs where order_id=$1 and payment_intent_id=$2 and state='pending_review'",
            [orderId, intent.id],
          )
        ).rows[0].n;
        const stock = (
          await runtime.pool.query(
            "select stock_quantity from products where id=$1",
            [productId],
          )
        ).rows[0].stock_quantity;
        const currentIntent = await fixtures.stripe.paymentIntents.retrieve(
          intent.id,
        );
        const providerUnchanged =
          currentIntent.status === intent.status &&
          currentIntent.amount_received === intent.amount_received &&
          currentIntent.latest_charge === intent.latest_charge &&
          currentIntent.livemode === false;
        const calls = providerCalls().slice(callsBefore);
        const emailCalls = runtime.emails.slice(emailBefore),
          delivered = emailCalls.filter((e) => e.status === 200).length;
        const unknown = variant.metadata?.extensionVariant === "unhandled_type";
        const state = late
          ? reconciliation === 1 &&
            history === 0 &&
            jobs.length === 0 &&
            order.inventory_state === "released" &&
            order.payment_status === "pending" &&
            delivered === 0
          : unknown
            ? history === 0 &&
              jobs.length === 0 &&
              order.payment_status === "pending" &&
              delivered === 0
            : order.status === "paid" &&
              order.payment_status === "paid" &&
              order.inventory_state === "consumed" &&
              order.total === "100.00" &&
              history === 1 &&
              jobs.length === 1 &&
              jobs[0].sent_at !== null &&
              delivered === 1 &&
              ledger >= 1;
        const safeAccept =
          state &&
          stock === 9 &&
          providerUnchanged &&
          calls.every((c) => c.method === "GET" && c.status === 200) &&
          (unknown || calls.length >= 1) &&
          changed.every((t) =>
            [
              "orders",
              "order_status_history",
              "order_email_jobs",
              "stripe_webhook_events",
              "payment_reconciliation_jobs",
            ].includes(t),
          );
        const prototypeAfter = (
          await invokeNativeAction(app, "prototypeProbe", [])
        ).value as { pid: number; clean: boolean };
        const body = JSON.parse(first.rawText) as {
          received?: boolean;
          error?: { code?: string; message?: string };
        };
        const leaks = deliveries.flatMap(
          (w) => detectErrorLeaks(w.rawText).leaks,
        );
        const accepted = first.status === 200 && body.received === true;
        const observed: NormalizedResult = {
          evidenceLayer: "route_handler",
          success: accepted,
          semanticStatus: first.status,
          wireStatus: first.status,
          errorCode: body.error?.code ?? null,
          errorMessage: body.error?.message,
          hasErrorCodeField: !!body.error?.code,
          rawResponse: body,
          leaks,
          executionTimeMs: resources?.durationMs ?? 0,
          providerCalls: { stripe: calls.length, resend: emailCalls.length },
          dbDiff: { tablesModified: changed, rowsChanged: changed.length },
          multiStepVerified: recoveryVerified && safeAccept,
          invariantsChecked: {
            NO_LEAK: leaks.length === 0,
            REJECT_NO_EFFECT:
              rejectedUnchanged &&
              providerUnchanged &&
              (recoveryVerified || calls.length === 0),
            SAFE_ACCEPT:
              safeAccept && deliveries.every((w) => w.status === 200),
            INTEGER_EXACT:
              first.status === 400 && rejectedUnchanged && providerUnchanged,
            AT_MOST_ONCE:
              safeAccept &&
              (variant.metadata?.at !== "email_delivery" ||
                pendingEmailObserved) &&
              (variant.metadata?.concurrency !== 2 || barrierArrivals === 2),
            NO_POLLUTION:
              prototypeBefore.pid === prototypeAfter.pid &&
              prototypeBefore.clean &&
              prototypeAfter.clean,
            ...(resources
              ? { RESOURCE_BOUNDED: resourceBudgetPassed(resources) }
              : {}),
          },
        };
        const index = entries.findIndex(
          (e) =>
            e.target === variant.target &&
            e.caseId === variant.caseId &&
            e.variant === variant.variantKey,
        );
        assert(index >= 0);
        entries[index] = evaluateVariant(variant, testCase, observed);
        evidence.push({
          caseId: variant.caseId,
          variant: variant.variantKey,
          entry: entries[index],
          deliveries: deliveries.map(({ rawText: _, ...w }) => w),
          resources,
          providerCalls: calls,
          providerUnchanged,
          barrierArrivals,
          state: {
            order,
            history,
            emailJobs: jobs.length,
            delivered,
            ledger,
            reconciliation,
            stock,
            pendingEmailObserved,
            recoveryVerified,
            rejectedUnchanged,
          },
        });
        save();
        console.log(
          `${entries[index].result} ${variant.caseId} ${variant.variantKey}`,
        );
      }
    }
  } finally {
    providerCleanup = await fixtures.cleanup();
    fs.writeFileSync(
      path.join(path.dirname(output), "stripe-cleanup.json"),
      JSON.stringify(providerCleanup, null, 2),
    );
  }
  return {
    observations: evidence,
    providerCleanup,
    scope:
      "Actual Next HTTP webhook, real Stripe test charges, owned PostgreSQL fixtures and localhost Resend capture; header clock alone controlled",
  };
}
