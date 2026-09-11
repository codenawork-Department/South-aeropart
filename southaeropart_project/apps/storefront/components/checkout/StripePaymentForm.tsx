"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Loader2, ShieldCheck, AlertCircle, Lock } from "lucide-react";
import { updateOrderReceiptEmail } from "@/actions/checkout.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface StripePaymentFormProps {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
  orderNumber: string;
  total: string;
  receiptEmail: string;
}

function CheckoutForm({
  orderId,
  total,
  receiptEmail,
}: {
  orderId: string;
  total: string;
  receiptEmail: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { lang } = useLanguage();
  const { formatPrice } = useCurrency();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!receiptEmail || !receiptEmail.trim() || !receiptEmail.includes("@")) {
      setErrorMessage(
        lang === "th"
          ? "กรุณากรอกอีเมลที่ถูกต้องสำหรับรับใบเสร็จรับเงินและการยืนยันคำสั่งซื้อ"
          : "Please enter a valid email address to receive order receipt and confirmation."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // 1. Sync updated receipt email to DB order and Stripe PaymentIntent
    try {
      await updateOrderReceiptEmail(orderId, receiptEmail.trim());
    } catch (err) {
      console.warn("[CheckoutForm] Could not update receipt email before payment:", err);
    }

    // 2. Confirm payment with Stripe
    const returnUrl = `${window.location.origin}/orders/${orderId}?payment_status=success`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: receiptEmail.trim(),
      },
    });

    // If stripe.confirmPayment returns an error, it did not redirect immediately (e.g., card declined or validation error)
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(
          error.message ||
            (lang === "th"
              ? "การชำระเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูลบัตรอีกครั้ง"
              : "Payment failed. Please verify your card details.")
        );
      } else {
        setErrorMessage(
          lang === "th"
            ? "เกิดข้อผิดพลาดในการประมวลผลคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง"
            : "An error occurred while processing your order. Please try again."
        );
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-400 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Stripe Payment Element (Renders Cards, PromptPay, Apple Pay, Google Pay) */}
      <div className="rounded-xl border border-white/10 bg-[#161616]/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Security note & submit button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            256-Bit SSL Encrypted & PCI DSS Compliant
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-300" />
            Powered by Stripe
          </span>
        </div>

        <button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] transition-all px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{lang === "th" ? "กำลังประมวลผลการชำระเงิน..." : "Processing Payment..."}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 text-white/90" />
              <span>{lang === "th" ? `ชำระเงิน ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Module-level cached Stripe instances by publishable key
const stripeInstances = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(publishableKey: string) {
  if (!stripeInstances.has(publishableKey)) {
    stripeInstances.set(publishableKey, loadStripe(publishableKey));
  }
  return stripeInstances.get(publishableKey)!;
}

export function StripePaymentForm({
  clientSecret,
  publishableKey,
  orderId,
  orderNumber,
  total,
  receiptEmail,
}: StripePaymentFormProps) {
  const stripePromise = getStripePromise(publishableKey);

  // South Aero Night / Carbon theme options for Stripe Elements
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#D60000",
        colorBackground: "#161616",
        colorText: "#FFFFFF",
        colorDanger: "#EF4444",
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        borderRadius: "8px",
        colorTextPlaceholder: "#666666",
        spacingUnit: "4px",
      },
      rules: {
        ".Tab": {
          backgroundColor: "#1f1f1f",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#A3A3A3",
        },
        ".Tab:hover": {
          backgroundColor: "#262626",
          color: "#FFFFFF",
        },
        ".Tab--selected": {
          backgroundColor: "#2a0e0e",
          borderColor: "#D60000",
          color: "#FFFFFF",
          boxShadow: "0 0 0 1px #D60000",
        },
        ".Input": {
          backgroundColor: "#111111",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#FFFFFF",
        },
        ".Input:focus": {
          borderColor: "#D60000",
          boxShadow: "0 0 0 1px #D60000",
        },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm orderId={orderId} total={total} receiptEmail={receiptEmail} />
    </Elements>
  );
}
