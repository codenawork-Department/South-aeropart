import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { MockMobilePayClient } from "@/components/checkout/MockMobilePayClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PromptPay Payment Simulator | SOUTH AERO",
  description: "Mock PromptPay QR Code confirmation screen for testing South Aero checkout.",
};

export default async function MockMobilePayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { orderId } = await params;
  const guestToken = (await searchParams)?.token;
  const res = await getOrderDetails(orderId, guestToken);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <MockMobilePayClient
      order={res.data.order}
      items={res.data.items}
      guestToken={guestToken}
    />
  );
}
