import { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | SOUTH AERO High-Performance Aerodynamics",
  description: "Complete your aerodynamic performance parts order with secure checkout and PromptPay QR payment.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
