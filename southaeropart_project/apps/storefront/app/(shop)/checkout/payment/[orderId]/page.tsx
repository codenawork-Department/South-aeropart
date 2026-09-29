import { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getOrderDetails } from "@/actions/checkout.actions";
import { fulfillOrderPayment } from "@/lib/order-fulfillment";
import { retrievePaymentIntent } from "@repo/lib";
import { PaymentClient } from "@/components/checkout/PaymentClient";
import { PaidOrderRedirect } from "@/components/checkout/PaidOrderRedirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment Checkout | SOUTH AERO High-Performance Aerodynamics",
  description: "Complete your South Aero aerodynamic performance parts order payment.",
};

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { orderId } = await params;
  const guestToken = (await searchParams)?.token;
  const res = await getOrderDetails({ orderId, guestToken });

  if (!res.success || !res.data) {
    notFound();
  }

  const { order, items } = res.data;

  if (order.paymentStatus === "paid" || order.status === "paid") {
    return <PaidOrderRedirect orderId={order.id} guestToken={guestToken} />;
  }

  // Retrieve logged-in Clerk account email as default receipt email
  let accountEmail: string | null = null;
  try {
    const clerkUser = await currentUser();
    accountEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || null;
  } catch {
    accountEmail = null;
  }

  // 2. If order has a stripePaymentIntentId, check if it already succeeded
  if (order.stripePaymentIntentId) {
    try {
      const intent = await retrievePaymentIntent(order.stripePaymentIntentId);
      if (intent && intent.status === "succeeded") {
        console.log(`[PaymentPage] PaymentIntent ${order.stripePaymentIntentId} has already succeeded! Fulfilling and redirecting...`);
        const fulfillment = await fulfillOrderPayment(orderId, {
          method: "stripe",
          chargeId: intent.id,
          note: "ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Auto-recovered before payment mount)",
        });
        if (fulfillment.success && !("reconciliationPending" in fulfillment && fulfillment.reconciliationPending)) {
          return <PaidOrderRedirect orderId={order.id} guestToken={guestToken} />;
        }
      }
    } catch (err) {
      console.warn("[PaymentPage] Error checking PaymentIntent status:", err);
    }
  }

  return (
    <PaymentClient
      order={order}
      items={items}
      accountEmail={accountEmail}
      guestToken={guestToken}
    />
  );
}
