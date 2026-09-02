import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { MockMobilePayClient } from "@/components/checkout/MockMobilePayClient";

export const metadata: Metadata = {
  title: "PromptPay Payment Simulator | SOUTH AERO",
  description: "Mock PromptPay QR Code confirmation screen for testing South Aero checkout.",
};

export default async function MockMobilePayPage({
  params,
}: {
  params: { orderId: string };
}) {
  const { orderId } = params;
  const res = await getOrderDetails(orderId);

  if (!res.success || !res.data) {
    notFound();
  }

  return <MockMobilePayClient order={res.data.order} items={res.data.items} />;
}
