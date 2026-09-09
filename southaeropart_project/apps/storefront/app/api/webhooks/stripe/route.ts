import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent, Stripe } from "@repo/lib";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";
import { db, orders, orderStatusHistory, eq } from "@repo/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
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

        const fulfillmentResult = await fulfillOrderPayment(orderId, {
          method: "stripe",
          chargeId: paymentIntent.id,
          note: `ชำระเงินสำเร็จผ่าน Stripe Webhook (PaymentIntent: ${paymentIntent.id}, Amount: ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()})`,
        });

        if (!fulfillmentResult.success) {
          console.error(`[Stripe Webhook] Fulfillment failed for orderId ${orderId}:`, fulfillmentResult.error);
          return NextResponse.json({ error: fulfillmentResult.error }, { status: 500 });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let orderId = paymentIntent.metadata?.orderId;
        const orderNumber = paymentIntent.metadata?.orderNumber;

        console.warn(`[Stripe Webhook] Payment failed for intentId: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message || "unknown"}`);

        // Fallback 1: Look up by stripePaymentIntentId
        if (!orderId && paymentIntent.id) {
          const [matchedOrder] = await db
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
            .limit(1);
          if (matchedOrder) {
            orderId = matchedOrder.id;
          }
        }

        // Fallback 2: Look up by orderNumber
        if (!orderId && orderNumber) {
          const [matchedOrder] = await db
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.orderNumber, orderNumber))
            .limit(1);
          if (matchedOrder) {
            orderId = matchedOrder.id;
          }
        }

        if (orderId) {
          const [currentOrder] = await db
            .select({ id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

          // Only update if not already marked paid
          if (currentOrder && currentOrder.paymentStatus !== "paid") {
            await db
              .update(orders)
              .set({
                paymentStatus: "failed",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, orderId));

            const failureReason = paymentIntent.last_payment_error?.message || "PaymentIntent execution failed";
            await db.insert(orderStatusHistory).values({
              orderId,
              status: currentOrder.status,
              note: `การชำระเงินไม่สำเร็จผ่าน Stripe: ${failureReason}`,
            });
            console.warn(`[Stripe Webhook] Order ${orderId} marked as payment_failed: ${failureReason}`);
          }
        }
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
