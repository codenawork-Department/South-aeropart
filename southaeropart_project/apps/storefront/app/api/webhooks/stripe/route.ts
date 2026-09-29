import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  constructStripeWebhookEvent,
  isExpectedStripeMode,
  toSmallestCurrencyUnit,
} from "@repo/lib/stripe";
import {
  db,
  orders,
  orderStatusHistory,
  stripeWebhookEvents,
  eq,
  and,
  inArray,
} from "@repo/db";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";
import {
  paymentIntentWebhookSchema,
  parseStripeWebhook,
  readWebhookBody,
  validateSignatureTimestamp,
  WebhookBodyTooLarge,
} from "@/lib/stripe-webhook-input";
import { webhookNowMs } from "@/lib/webhook-clock";

export const dynamic = "force-dynamic";
function failure(status: 400 | 413 | 500) {
  const code =
    status === 413
      ? "PAYLOAD_TOO_LARGE"
      : status === 500
        ? "INTERNAL_ERROR"
        : "BAD_REQUEST";
  const message =
    status === 413
      ? "Request too large"
      : status === 500
        ? "Unable to process request"
        : "Invalid request";
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function POST(req: NextRequest) {
  let event: ReturnType<typeof parseStripeWebhook>;
  try {
    const raw = await readWebhookBody(req);
    const signature = req.headers.get("stripe-signature");
    if (!signature) return failure(400);
    const now = webhookNowMs();
    validateSignatureTimestamp(signature, now);
    constructStripeWebhookEvent(raw, signature, undefined, now);
    event = parseStripeWebhook(raw);
    if (event.account || !isExpectedStripeMode(event.livemode))
      return failure(400);
  } catch (error) {
    return failure(error instanceof WebhookBodyTooLarge ? 413 : 400);
  }

  try {
    if (
      !["payment_intent.succeeded", "payment_intent.payment_failed"].includes(
        event.type,
      )
    ) {
      await db
        .insert(stripeWebhookEvents)
        .values({ eventId: event.id, eventType: event.type })
        .onConflictDoNothing();
      return NextResponse.json({ received: true });
    }
    const parsed = paymentIntentWebhookSchema.safeParse(event.data.object);
    if (!parsed.success) return failure(400);
    const intent = parsed.data;
    if (!isExpectedStripeMode(intent.livemode)) return failure(400);
    const [order] = await db
      .select({
        id: orders.id,
        total: orders.total,
        currency: orders.currency,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, intent.id))
      .limit(1);
    if (
      !order ||
      (intent.metadata.orderId && intent.metadata.orderId !== order.id) ||
      (intent.metadata.orderNumber &&
        intent.metadata.orderNumber !== order.orderNumber)
    )
      return failure(400);
    if (event.type === "payment_intent.succeeded") {
      if (
        intent.amount_received !== toSmallestCurrencyUnit(order.total) ||
        intent.currency.toLowerCase() !== order.currency.toLowerCase()
      )
        return failure(400);
      const fulfillment = await fulfillOrderPayment(order.id, {
        method: "stripe",
        chargeId: intent.id,
        webhook: { eventId: event.id, eventType: event.type },
      });
      if (!fulfillment.success) return failure(500);
    } else {
      await db.transaction(async (tx) => {
        const [claimed] = await tx
          .insert(stripeWebhookEvents)
          .values({
            eventId: event.id,
            eventType: event.type,
            orderId: order.id,
          })
          .onConflictDoNothing()
          .returning({ eventId: stripeWebhookEvents.eventId });
        if (!claimed) return;
        const [changed] = await tx
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(
            and(
              eq(orders.id, order.id),
              eq(orders.status, "pending"),
              inArray(orders.paymentStatus, ["pending", "authorized"]),
            ),
          )
          .returning({ id: orders.id, status: orders.status });
        if (changed)
          await tx
            .insert(orderStatusHistory)
            .values({
              orderId: changed.id,
              status: changed.status,
              note: "Stripe payment attempt failed",
            });
      });
    }
    return NextResponse.json({ received: true });
  } catch {
    process.stderr.write(
      JSON.stringify({
        event: "stripe.webhook.failed",
        requestId: randomUUID(),
      }) + "\n",
    );
    return failure(500);
  }
}
