import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent, Stripe } from "@repo/lib";
import { fulfillOrderPayment } from "@/actions/checkout.actions";
import { db, orders, eq } from "@repo/db";

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

    console.log(`[Stripe Webhook] Successfully verified incoming event: ${event.type} (ID: ${event.id})`);

    // Handle supported Stripe events
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let orderId = paymentIntent.metadata?.orderId;
        const orderNumber = paymentIntent.metadata?.orderNumber;

        console.log(`[Stripe Webhook] Processing payment_intent.succeeded for PaymentIntent: ${paymentIntent.id}, Amount: ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);

        // Fallback 1: Look up by stripePaymentIntentId in DB if metadata.orderId is missing
        if (!orderId) {
          console.warn("[Stripe Webhook] metadata.orderId is missing, querying database by stripePaymentIntentId...");
          const [matchedOrder] = await db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
            .limit(1);

          if (matchedOrder) {
            orderId = matchedOrder.id;
            console.log(`[Stripe Webhook] Found order by stripePaymentIntentId: ${matchedOrder.orderNumber} (ID: ${matchedOrder.id})`);
          }
        }

        // Fallback 2: Look up by orderNumber if orderId is still missing
        if (!orderId && orderNumber) {
          console.warn(`[Stripe Webhook] Querying database by metadata.orderNumber: ${orderNumber}...`);
          const [matchedOrder] = await db
            .select({ id: orders.id, orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.orderNumber, orderNumber))
            .limit(1);

          if (matchedOrder) {
            orderId = matchedOrder.id;
            console.log(`[Stripe Webhook] Found order by orderNumber: ${matchedOrder.orderNumber} (ID: ${matchedOrder.id})`);
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

        console.log(`[Stripe Webhook] Fulfillment result for orderId ${orderId}:`, fulfillmentResult);

        if (!fulfillmentResult.success) {
          console.error(`[Stripe Webhook] Fulfillment failed for orderId ${orderId}:`, fulfillmentResult.error);
          return NextResponse.json({ error: fulfillmentResult.error }, { status: 500 });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        console.warn(`[Stripe Webhook] Payment failed for orderId: ${orderId || "unknown"}, intentId: ${paymentIntent.id}, message: ${paymentIntent.last_payment_error?.message}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Acknowledging unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Unexpected error handling webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
