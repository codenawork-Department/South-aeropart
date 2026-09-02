import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetails } from "@/actions/checkout.actions";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";

export const metadata: Metadata = {
  title: "Order Details | SOUTH AERO High-Performance Aerodynamics",
  description: "View your South Aero performance parts order status, receipt, and delivery details.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const { orderId } = params;
  const res = await getOrderDetails(orderId);

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
