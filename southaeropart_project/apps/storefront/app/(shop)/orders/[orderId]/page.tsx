import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";
import { retrievePaymentIntent, toSmallestCurrencyUnit } from "@repo/lib";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Details | SOUTH AERO High-Performance Aerodynamics",
  description: "View your South Aero performance parts order status, receipt, and delivery details.",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams?: {
    token?: string;
    payment_status?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
    paid?: string;
  };
}) {
  const { orderId } = params;
  const guestToken = searchParams?.token;
  let res = await getOrderDetails(orderId, guestToken);

  if (!res.success || !res.data) {
    notFound();
  }

  // --------------------------------------------------------------------------
  // Instant Fallback: If order is still pending, verify Stripe PaymentIntent
  // --------------------------------------------------------------------------
  const isOrderPaid = res.data.order.paymentStatus === "paid" || res.data.order.status === "paid";

  if (!isOrderPaid) {
    const paymentIntentId = res.data.order.stripePaymentIntentId || searchParams?.payment_intent;

    if (paymentIntentId) {
      try {
        console.log(`[OrderDetailPage] Checking Stripe API for PaymentIntent: ${paymentIntentId} on order: ${orderId}...`);
        const stripeIntent = await retrievePaymentIntent(paymentIntentId);

        if (stripeIntent && stripeIntent.status === "succeeded") {
          // Security checks (SEC §5.3):
          // 1. Verify PaymentIntent is associated with this exact order
          const isAssociatedWithOrder =
            stripeIntent.metadata?.orderId === orderId ||
            paymentIntentId === res.data.order.stripePaymentIntentId;

          // 2. Verify amount & currency
          const expectedAmount = toSmallestCurrencyUnit(res.data.order.total);
          const receivedAmount = stripeIntent.amount_received || stripeIntent.amount;
          const expectedCurrency = (res.data.order.currency || "THB").toLowerCase();
          const receivedCurrency = (stripeIntent.currency || "").toLowerCase();

          const isAmountValid =
            expectedAmount === receivedAmount &&
            expectedCurrency === receivedCurrency;

          // 3. Verify livemode in production
          const isModeValid =
            process.env.NODE_ENV !== "production" || stripeIntent.livemode;

          if (isAssociatedWithOrder && isAmountValid && isModeValid) {
            console.log(`[OrderDetailPage] Stripe PaymentIntent ${paymentIntentId} verified. Executing instant fulfillment...`);
            const fulfillRes = await fulfillOrderPayment(orderId, {
              method: "stripe",
              chargeId: stripeIntent.id,
              note: `ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Instant Fallback Confirmation, Amount: ${(receivedAmount / 100).toFixed(2)} ${receivedCurrency.toUpperCase()})`,
            });

            if (fulfillRes.success) {
              console.log(`[OrderDetailPage] Order ${orderId} successfully marked as PAID via instant fallback.`);
              // Reload fresh order details after fulfillment
              res = await getOrderDetails(orderId, guestToken);
            } else {
              console.error(`[OrderDetailPage] Failed to fulfill order ${orderId}:`, fulfillRes.error);
            }
          } else {
            console.warn(
              `[OrderDetailPage Security] Refusing instant fulfillment: binding=${isAssociatedWithOrder}, amount=${isAmountValid}, mode=${isModeValid}`
            );
          }
        } else {
          console.log(`[OrderDetailPage] Stripe PaymentIntent ${paymentIntentId} status is: ${stripeIntent?.status}`);
        }
      } catch (stripeErr) {
        console.warn(`[OrderDetailPage] Could not retrieve Stripe PaymentIntent ${paymentIntentId}:`, stripeErr);
      }
    }
  }

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <OrderDetailClient
      order={res.data.order}
      items={res.data.items}
      history={res.data.history}
    />
  );
}
