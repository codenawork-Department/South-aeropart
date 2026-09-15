import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, orders, orderEmailJobs, orderStatusHistory, releaseOrderStock, and, eq, lte, isNull, inArray, sql } from "@repo/db";
import { getStripe } from "@repo/lib/stripe";
import { dispatchOrderEmailJob } from "@/lib/order-email-jobs";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

/** Invoke every minute from the deployment scheduler using a dedicated secret. */
export async function POST(request: NextRequest) {
  const expected = process.env.MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization") || "";
  if (!expected || expected.length < 32 || !timingSafeEqual(
    createHash("sha256").update(`Bearer ${expected}`).digest(), createHash("sha256").update(supplied).digest(),
  )) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let released = 0;
  let failed = 0;
  const expired = await db.select().from(orders).where(and(eq(orders.status, "pending"),
    eq(orders.inventoryState, "reserved"), lte(orders.reservationExpiresAt, new Date()))).limit(25);
  for (const order of expired) {
    try {
      // Cancel at Stripe before releasing inventory. A success/cancel race is
      // resolved by Stripe; provider failure leaves inventory reserved for retry.
      if (order.stripePaymentIntentId) {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (intent.status === "succeeded") {
          const result = await fulfillOrderPayment(order.id, { method: "stripe", chargeId: intent.id });
          if (!result.success) failed++;
          continue;
        }
        if (intent.status !== "canceled") await stripe.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `cancel_order_${order.id}` });
      }
      await db.transaction(async tx => {
        const [changed] = await tx.update(orders).set({ status: "cancelled", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), eq(orders.status, "pending"), eq(orders.inventoryState, "reserved"),
            inArray(orders.paymentStatus, ["pending", "failed", "authorized"]), sql`${orders.stripePaymentIntentId} IS NOT DISTINCT FROM ${order.stripePaymentIntentId}`))
          .returning({ id: orders.id });
        if (!changed) return;
        await releaseOrderStock(tx, order.id);
        await tx.insert(orderStatusHistory).values({ orderId: order.id, status: "cancelled", note: "Reservation expired; payment cancelled before stock release" });
        released++;
      });
    } catch { failed++; }
  }
  const emailJobs = await db.select({ orderId: orderEmailJobs.orderId }).from(orderEmailJobs)
    .where(and(isNull(orderEmailJobs.sentAt), lte(orderEmailJobs.nextAttemptAt, new Date()))).limit(10);
  for (const job of emailJobs) {
    try { await dispatchOrderEmailJob(job.orderId); } catch { failed++; }
  }
  return NextResponse.json({ released, failed, emailJobsAttempted: emailJobs.length }, { status: failed ? 503 : 200 });
}
