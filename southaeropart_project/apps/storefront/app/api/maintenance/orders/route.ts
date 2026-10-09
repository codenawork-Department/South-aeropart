import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  db,
  orders,
  orderEmailJobs,
  orderStatusHistory,
  paymentReconciliationJobs,
  releaseOrderStock,
  and,
  eq,
  lte,
  isNull,
  inArray,
  sql,
} from "@repo/db";
import { getStripe } from "@repo/lib/stripe";
import { sendEmail } from "@repo/lib";
import { dispatchOrderEmailJob } from "@/lib/order-email-jobs";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

/** Invoke every minute from the deployment scheduler using a dedicated secret. */
export async function POST(request: NextRequest) {
  const expected = process.env.MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization") || "";
  if (
    !expected ||
    expected.length < 32 ||
    !timingSafeEqual(
      createHash("sha256").update(`Bearer ${expected}`).digest(),
      createHash("sha256").update(supplied).digest()
    )
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let released = 0;
  let failed = 0;

  // 1. Release expired order reservations
  const expired = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        eq(orders.inventoryState, "reserved"),
        lte(orders.reservationExpiresAt, new Date())
      )
    )
    .limit(25);

  for (const order of expired) {
    try {
      // Cancel at Stripe before releasing inventory. A success/cancel race is
      // resolved by Stripe; provider failure leaves inventory reserved for retry.
      if (order.stripePaymentIntentId) {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (intent.status === "succeeded") {
          const result = await fulfillOrderPayment(order.id, {
            method: "stripe",
            chargeId: intent.id,
          });
          if (!result.success) failed++;
          continue;
        }
        if (intent.status !== "canceled") {
          await stripe.paymentIntents.cancel(
            intent.id,
            {},
            { idempotencyKey: `cancel_order_${order.id}` }
          );
        }
      }
      await db.transaction(async (tx) => {
        const [changed] = await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(orders.id, order.id),
              eq(orders.status, "pending"),
              eq(orders.inventoryState, "reserved"),
              inArray(orders.paymentStatus, ["pending", "failed", "authorized"]),
              sql`${orders.stripePaymentIntentId} IS NOT DISTINCT FROM ${order.stripePaymentIntentId}`
            )
          )
          .returning({ id: orders.id });

        if (!changed) return;
        await releaseOrderStock(tx, order.id);
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: "cancelled",
          note: "Reservation expired; payment cancelled before stock release",
        });
        released++;
      });
    } catch {
      failed++;
    }
  }

  // 2. Retry outstanding customer order email jobs
  const emailJobs = await db
    .select({ orderId: orderEmailJobs.orderId })
    .from(orderEmailJobs)
    .where(and(isNull(orderEmailJobs.sentAt), lte(orderEmailJobs.nextAttemptAt, new Date())))
    .limit(10);

  for (const job of emailJobs) {
    try {
      await dispatchOrderEmailJob(job.orderId);
    } catch {
      failed++;
    }
  }

  // 3. Alert admins of unalerted payment reconciliation anomalies
  let reconciliationAlertsSent = 0;
  const unalertedJobs = await db
    .select({
      paymentIntentId: paymentReconciliationJobs.paymentIntentId,
      orderId: paymentReconciliationJobs.orderId,
      reason: paymentReconciliationJobs.reason,
      createdAt: paymentReconciliationJobs.createdAt,
    })
    .from(paymentReconciliationJobs)
    .where(
      and(
        eq(paymentReconciliationJobs.state, "pending_review"),
        isNull(paymentReconciliationJobs.alertedAt)
      )
    )
    .limit(10);

  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  for (const job of unalertedJobs) {
    try {
      if (adminAlertEmail) {
        await sendEmail({
          to: adminAlertEmail,
          subject: `[ACTION REQUIRED] South Aero: พบรายการชำระเงินตกค้างต้องตรวจสอบ (${job.paymentIntentId})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ededed; padding: 32px 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #262626;">
              <h2 style="color: #ef4444; margin-top: 0; font-size: 20px; font-weight: 700;">
                ⚠️ แจ้งเตือน: มีรายการรอการตรวจสอบใน Reconciliation Queue
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #a3a3a3;">
                ระบบพบรายการชำระเงินที่เงินเข้าสู่ Stripe สำเร็จแล้ว แต่มีข้อขัดข้องในขั้นตอนระบบ (เช่น เวลาจองสต็อกหมดก่อนทำรายการเสร็จ) จำเป็นต้องได้รับการพิจารณาจากเจ้าหน้าที่ Admin:
              </p>
              <div style="background-color: #171717; border: 1px solid #2e2e2e; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">Payment Intent ID:</td>
                    <td style="padding: 6px 0; font-family: monospace; color: #f5f5f5; text-align: right;">${job.paymentIntentId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">Order ID:</td>
                    <td style="padding: 6px 0; font-family: monospace; color: #f5f5f5; text-align: right;">${job.orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">เหตุผล / ข้อผิดพลาด:</td>
                    <td style="padding: 6px 0; color: #fbbf24; font-weight: 600; text-align: right;">${job.reason}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #737373;">เวลาที่เกิดเหตุ:</td>
                    <td style="padding: 6px 0; color: #d4d4d4; text-align: right;">${new Date(job.createdAt).toISOString()}</td>
                  </tr>
                </table>
              </div>
              <p style="text-align: center; margin: 28px 0 12px;">
                <a href="${process.env.ADMIN_URL || "http://localhost:3001"}/orders/reconciliation" 
                   style="background: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                  เปิดดูคิวงาน Reconciliation ในระบบแอดมิน →
                </a>
              </p>
              <p style="font-size: 11px; color: #525252; text-align: center; margin-top: 24px;">
                South Aero Performance · Payment Reconciliation Monitor · Auto-Generated Alert
              </p>
            </div>
          `,
        });
      }

      // Mark alerted_at atomically to prevent duplicate emails
      await db
        .update(paymentReconciliationJobs)
        .set({ alertedAt: new Date() })
        .where(
          and(
            eq(paymentReconciliationJobs.paymentIntentId, job.paymentIntentId),
            isNull(paymentReconciliationJobs.alertedAt)
          )
        );
      reconciliationAlertsSent++;
    } catch (err) {
      console.error("[Maintenance Cron] Failed to alert reconciliation job:", job.paymentIntentId, err);
      failed++;
    }
  }

  return NextResponse.json(
    {
      released,
      failed,
      emailJobsAttempted: emailJobs.length,
      reconciliationAlertsSent,
    },
    { status: failed ? 503 : 200 }
  );
}
