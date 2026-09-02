import { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Shopping Cart | SOUTH AERO High-Performance Aerodynamics",
  description: "Review and manage your selected South Aero aerodynamic body kits and carbon fiber accessories.",
};

export default function CartPage() {
  return <CartPageClient />;
}
