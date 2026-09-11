import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { InvoiceClient } from "@/components/orders/InvoiceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Official Tax Invoice & Commercial Receipt | SOUTH AERO High-Performance Aerodynamics",
  description: "Official VAT Tax Invoice and International Commercial Export Receipt for South Aero orders.",
};

export default async function OrderInvoicePage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams?: { token?: string };
}) {
  const { orderId } = params;
  const guestToken = searchParams?.token;

  // Authoritative server-side IDOR guard via getOrderDetails
  const res = await getOrderDetails(orderId, guestToken);

  if (!res.success || !res.data) {
    notFound();
  }

  const { order, items } = res.data;

  return (
    <InvoiceClient
      order={order}
      items={items}
      guestToken={guestToken}
    />
  );
}
