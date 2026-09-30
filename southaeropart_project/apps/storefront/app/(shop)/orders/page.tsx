import { Metadata } from "next";
import { getUserOrders } from "@/actions/checkout.actions";
import { listShippingQuotes } from "@/actions/shipping.actions";
import { OrdersListClient } from "@/components/orders/OrdersListClient";
import type { CustomerShippingQuote } from "@/components/checkout/ShippingQuotesListClient";

export const metadata: Metadata = {
  title: "My Orders & Shipping Quotes | SOUTH AERO High-Performance Aerodynamics",
  description: "View and track all your South Aero aerodynamic performance parts orders and shipping quotations.",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [ordersRes, quotesRes] = await Promise.all([
    getUserOrders(),
    listShippingQuotes(1),
  ]);

  const orders = ordersRes.success && ordersRes.data ? ordersRes.data : [];
  const quotes = quotesRes.success ? (quotesRes.quotes as unknown as CustomerShippingQuote[]) : [];

  return <OrdersListClient initialOrders={orders} initialQuotes={quotes} />;
}
