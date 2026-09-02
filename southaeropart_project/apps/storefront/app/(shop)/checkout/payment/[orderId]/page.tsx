import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { PaymentClient } from "@/components/checkout/PaymentClient";

export const metadata: Metadata = {
  title: "PromptPay QR Payment | SOUTH AERO High-Performance Aerodynamics",
  description: "Scan the PromptPay QR code to complete your South Aero aerodynamic performance parts order.",
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

  return <PaymentClient order={res.data.order} items={res.data.items} />;
}
