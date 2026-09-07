import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getOrderDetails, fulfillOrderPayment } from "@/actions/checkout.actions";
import { retrievePaymentIntent } from "@repo/lib";
import { PaymentClient } from "@/components/checkout/PaymentClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment Checkout | SOUTH AERO High-Performance Aerodynamics",
  description: "Complete your South Aero aerodynamic performance parts order payment.",
};

export default async function PaymentPage({
  params,
}: {
  params: { orderId: string };
}) {
  const { orderId } = params;
  const res = await getOrderDetails(orderId);

  if (!res.success || !res.data) {
    notFound();
  }

  const { order, items } = res.data;

  // Retrieve logged-in Clerk account email as default receipt email
  let accountEmail: string | null = null;
  try {
    const clerkUser = await currentUser();
    accountEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || null;
  } catch {
    accountEmail = null;
  }

  // 1. If order is already paid, redirect to order details immediately
  if (order.paymentStatus === "paid" || order.status === "paid") {
    redirect(`/orders/${orderId}?paid=true`);
  }

  // 2. If order has a stripePaymentIntentId, check if it already succeeded
  if (order.stripePaymentIntentId) {
    try {
      const intent = await retrievePaymentIntent(order.stripePaymentIntentId);
      if (intent && intent.status === "succeeded") {
        console.log(`[PaymentPage] PaymentIntent ${order.stripePaymentIntentId} has already succeeded! Fulfilling and redirecting...`);
        await fulfillOrderPayment(orderId, {
          method: "stripe",
          chargeId: intent.id,
          note: "ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Auto-recovered before payment mount)",
        });
        redirect(`/orders/${orderId}?paid=true`);
      }
    } catch (err) {
      if (err instanceof Error && (err.message === "NEXT_REDIRECT" || (err as any).digest?.startsWith("NEXT_REDIRECT"))) {
        throw err;
      }
      console.warn("[PaymentPage] Error checking PaymentIntent status:", err);
    }
  }

  return (
    <PaymentClient
      order={order}
      items={items}
      accountEmail={accountEmail}
    />
  );
}
