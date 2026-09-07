import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails, fulfillOrderPayment } from "@/actions/checkout.actions";
import { retrievePaymentIntent } from "@repo/lib";
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
    payment_status?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
    paid?: string;
  };
}) {
  const { orderId } = params;
  let res = await getOrderDetails(orderId);

  if (!res.success || !res.data) {
    notFound();
  }

  // --------------------------------------------------------------------------
  // Instant Fallback: If order is still pending, verify Stripe PaymentIntent
  // --------------------------------------------------------------------------
  const isOrderPaid = res.data.order.paymentStatus === "paid" || res.data.order.status === "paid";

  if (!isOrderPaid) {
    const paymentIntentId = searchParams?.payment_intent || res.data.order.stripePaymentIntentId;

    if (paymentIntentId) {
      try {
        console.log(`[OrderDetailPage] Checking Stripe API for PaymentIntent: ${paymentIntentId} on order: ${orderId}...`);
        const stripeIntent = await retrievePaymentIntent(paymentIntentId);

        if (stripeIntent && stripeIntent.status === "succeeded") {
          console.log(`[OrderDetailPage] Stripe PaymentIntent ${paymentIntentId} is SUCCEEDED! Executing instant fulfillment...`);
          const fulfillRes = await fulfillOrderPayment(orderId, {
            method: "stripe",
            chargeId: stripeIntent.id,
            note: `ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Instant Fallback Confirmation, Amount: ${(stripeIntent.amount / 100).toFixed(2)} ${stripeIntent.currency.toUpperCase()})`,
          });

          if (fulfillRes.success) {
            console.log(`[OrderDetailPage] Order ${orderId} successfully marked as PAID via instant fallback.`);
            // Reload fresh order details after fulfillment
            res = await getOrderDetails(orderId);
          } else {
            console.error(`[OrderDetailPage] Failed to fulfill order ${orderId}:`, fulfillRes.error);
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
