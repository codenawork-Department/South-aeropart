import { Metadata } from "next";
import { getUserOrders } from "@/actions/checkout.actions";
import { OrdersListClient } from "@/components/orders/OrdersListClient";

export const metadata: Metadata = {
  title: "My Orders | SOUTH AERO High-Performance Aerodynamics",
  description: "View and track all your South Aero aerodynamic performance parts orders.",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const res = await getUserOrders();
  const orders = res.success && res.data ? res.data : [];

  return <OrdersListClient initialOrders={orders} />;
}
