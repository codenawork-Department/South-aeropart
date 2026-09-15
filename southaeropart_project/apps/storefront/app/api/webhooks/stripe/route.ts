import { isExpectedStripeMode } from "@repo/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent, toSmallestCurrencyUnit, Stripe } from "@repo/lib";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";
import { db, orders, orderStatusHistory, eq, and, inArray } from "@repo/db";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_SIZE = 1024 * 1024; // 1MB payload limit

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_WEBHOOK_SIZE) {
      console.warn("[Stripe Webhook] Request body exceeds 1MB limit");
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_SIZE) {
      console.warn("[Stripe Webhook] Raw body exceeds 1MB limit");
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.warn("[Stripe Webhook] Missing stripe-signature header");
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = constructStripeWebhookEvent(rawBody, signature);
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return NextResponse.json({
        error: "Webhook signature verification failed",
      }, { status: 400 });
    }

    if (event.account || (!isExpectedStripeMode(event.livemode))) {
      return NextResponse.json({ error: "Unexpected Stripe account or mode" }, { status: 400 });
    }
    // Handle supported Stripe events
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let orderId = paymentIntent.metadata?.orderId;
        const orderNumber = paymentIntent.metadata?.orderNumber;

        // Fallback 1: Look up by stripePaymentIntentId in DB if metadata.orderId is missing
        if (!orderId) {
          const [matchedOrder] = await db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
            .limit(1);

          if (matchedOrder) {
            orderId = matchedOrder.id;
          }
        }

        // Fallback 2: Look up by orderNumber if orderId is still missing
        if (!orderId && orderNumber) {
          const [matchedOrder] = await db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.orderNumber, orderNumber))
            .limit(1);

          if (matchedOrder) {
            orderId = matchedOrder.id;
          }
        }

        if (!orderId) {
          console.error(`[Stripe Webhook] CRITICAL: Unable to associate PaymentIntent ${paymentIntent.id} with any order in database.`);
          return NextResponse.json({ error: "Order not found for PaymentIntent" }, { status: 404 });
        }

        // Authoritative Database Lookup before fulfillment
        const [targetOrder] = await db
          .select({
            id: orders.id,
            total: orders.total,
            currency: orders.currency,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            stripePaymentIntentId: orders.stripePaymentIntentId,
          })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (!targetOrder) {
          console.error(`[Stripe Webhook] Order ${orderId} not found in database.`);
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Mode verification (SEC §5.3): Refuse test-mode events in production
        if (!isExpectedStripeMode(event.livemode)) {
          console.error(`[Stripe Webhook Security] Test-mode event received in production for order ${orderId}!`);
          return NextResponse.json({ error: "Test-mode event not permitted in production" }, { status: 400 });
        }

        // Amount & Currency Verification (SEC §5.3: Server-authoritative totals)
        const expectedAmount = toSmallestCurrencyUnit(targetOrder.total);
        const receivedAmount = paymentIntent.amount_received;
        const expectedCurrency = (targetOrder.currency || "THB").toLowerCase();
        const receivedCurrency = (paymentIntent.currency || "").toLowerCase();

        if (expectedAmount !== receivedAmount || expectedCurrency !== receivedCurrency) {
          console.error(
            `[Stripe Webhook Security] CRITICAL: Amount or currency mismatch on order ${orderId}! ` +
            `Expected: ${expectedAmount} ${expectedCurrency}, Received: ${receivedAmount} ${receivedCurrency}`
          );

          await db.insert(orderStatusHistory).values({
            orderId,
            status: targetOrder.status,
            note: `[Security Alert] ยอดเงินไม่ตรงกับออเดอร์: คาดหวัง ${targetOrder.total} ${expectedCurrency.toUpperCase()}, ได้รับ ${(receivedAmount / 100).toFixed(2)} ${receivedCurrency.toUpperCase()} (PaymentIntent: ${paymentIntent.id})`,
          });

          return NextResponse.json({ error: "Payment amount or currency mismatch" }, { status: 400 });
        }

        // Payment binding check: If a payment intent was already recorded on the order, ensure it matches
        if (!targetOrder.stripePaymentIntentId || targetOrder.stripePaymentIntentId !== paymentIntent.id || (!isExpectedStripeMode(paymentIntent.livemode))) {
          console.warn(
            `[Stripe Webhook Security] PaymentIntent ID mismatch for order ${orderId}. Bound: ${targetOrder.stripePaymentIntentId}, Event: ${paymentIntent.id}`
          );
        }

        if (targetOrder.stripePaymentIntentId !== paymentIntent.id || (!isExpectedStripeMode(paymentIntent.livemode))) {
          return NextResponse.json({ error: "Payment binding or mode mismatch" }, { status: 400 });
        }
        if (targetOrder.paymentStatus === "paid") return NextResponse.json({ received: true, alreadyPaid: true });
        const fulfillmentResult = await fulfillOrderPayment(orderId, {
          method: "stripe",
          chargeId: paymentIntent.id,
          note: `ชำระเงินสำเร็จผ่าน Stripe Webhook (PaymentIntent: ${paymentIntent.id}, Amount: ${(receivedAmount / 100).toFixed(2)} ${receivedCurrency.toUpperCase()})`,
        });

        if (!fulfillmentResult.success) {
          console.error(`[Stripe Webhook] Fulfillment failed for orderId ${orderId}:`, fulfillmentResult.error);
          return NextResponse.json({ error: fulfillmentResult.error }, { status: 500 });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (!isExpectedStripeMode(paymentIntent.livemode)) {
          return NextResponse.json({ error: "Unexpected payment mode" }, { status: 400 });
        }
        await db.transaction(async tx => {
          const [changed] = await tx.update(orders).set({ paymentStatus: "failed", updatedAt: new Date() })
            .where(and(eq(orders.stripePaymentIntentId, paymentIntent.id), eq(orders.status, "pending"), inArray(orders.paymentStatus, ["pending", "authorized"])))
            .returning({ id: orders.id, status: orders.status });
          if (changed) await tx.insert(orderStatusHistory).values({ orderId: changed.id, status: changed.status, note: "Stripe payment attempt failed" });
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Unexpected error handling webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
