"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  confirmMockPayment,
  rejectMockPayment,
  getOrderStatus,
  createOrGetStripePaymentIntent,
  updateOrderReceiptEmail,
} from "@/actions/checkout.actions";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import type { Order, OrderItem, Address } from "@repo/db";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useCart } from "@/components/providers/CartProvider";
import { StripePaymentForm } from "./StripePaymentForm";

interface PaymentClientProps {
  order: Order;
  items: (OrderItem & { imageUrl?: string | null; slug?: string | null })[];
  accountEmail?: string | null;
  guestToken?: string;
}

export function PaymentClient({ order, items, accountEmail, guestToken }: PaymentClientProps) {
  const router = useRouter();
  const { formatPrice, currency } = useCurrency();
  const { clearCart } = useCart();

  // Clear cart only after reaching payment screen if coming from checkout
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const shouldClear = sessionStorage.getItem("southaero_clear_cart");
        if (shouldClear) {
          sessionStorage.removeItem("southaero_clear_cart");
          clearCart();
        }
      }
    } catch {
      // ignore sessionStorage error
    }
  }, [clearCart]);

  // Receipt Email state: Pre-filled with order's shipping address email or user's account email
  const initialEmail =
    (order.shippingAddress as Address)?.email?.trim() || accountEmail?.trim() || "";
  const [receiptEmail, setReceiptEmail] = useState<string>(initialEmail);

  const isProduction = process.env.NODE_ENV === "production";

  // Active Tab: "stripe" (default) or "simulator" (developer/tester)
  const [activeTab, setActiveTab] = useState<"stripe" | "simulator">("stripe");

  // Stripe Payment Data State
  const [stripeData, setStripeData] = useState<{
    clientSecret: string;
    publishableKey: string;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState<boolean>(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // PromptPay QR State
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [mobilePayUrl, setMobilePayUrl] = useState<string>("");
  const [customHost, setCustomHost] = useState<string>("");
  const [showHostInput, setShowHostInput] = useState<boolean>(false);

  // Countdown & Status State
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 minutes in seconds
  const [copied, setCopied] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string>(order.status);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>(order.paymentStatus);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize Stripe Payment Intent
  const initStripe = useCallback(async () => {
    try {
      setStripeLoading(true);
      setStripeError(null);
      const res = await createOrGetStripePaymentIntent(order.id, guestToken);
      if (res.isAlreadyPaid || res.redirectUrl) {
        setActionMessage({
          type: "success",
          text: "คำสั่งซื้อนี้ได้รับการชำระเงินเรียบร้อยแล้ว กำลังนำคุณไปยังหน้าคำสั่งซื้อ...",
        });
        const targetUrl = res.redirectUrl || (guestToken ? `/orders/${order.id}?paid=true&token=${guestToken}` : `/orders/${order.id}?paid=true`);
        setTimeout(() => {
          router.replace(targetUrl);
        }, 600);
        return;
      }
      if (res.success && res.clientSecret && res.publishableKey) {
        setStripeData({
          clientSecret: res.clientSecret,
          publishableKey: res.publishableKey,
        });
      } else {
        setStripeError(res.error || "ไม่สามารถเชื่อมต่อระบบ Stripe ได้");
      }
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลด Stripe");
    } finally {
      setStripeLoading(false);
    }
  }, [order.id, router]);

  useEffect(() => {
    if (currentPaymentStatus === "paid" || currentStatus === "paid") {
      router.replace(`/orders/${order.id}?paid=true`);
      return;
    }
    if (currentStatus !== "cancelled") {
      initStripe();
    }
  }, [initStripe, currentPaymentStatus, currentStatus, order.id, router]);

  // Generate QR Code with target URL for Simulator
  const generateQr = useCallback(async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("[PaymentClient] Failed to generate QR code", err);
    }
  }, []);

  // Initialize URL & QR code on mount
  useEffect(() => {
    const origin = window.location.origin;
    const initialUrl = `${origin}/pay/mock/${order.id}`;
    setMobilePayUrl(initialUrl);
    setCustomHost(origin);
    generateQr(initialUrl);
  }, [order.id, generateQr]);

  // Handle custom host update (for mobile testing over LAN Wi-Fi)
  function handleUpdateHost(e: React.FormEvent) {
    e.preventDefault();
    if (!customHost.trim()) return;
    const cleanHost = customHost.trim().replace(/\/$/, "");
    const updatedUrl = `${cleanHost}/pay/mock/${order.id}`;
    setMobilePayUrl(updatedUrl);
    generateQr(updatedUrl);
  }

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (currentPaymentStatus === "paid" || currentStatus === "cancelled" || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPaymentStatus, currentStatus, timeLeft]);

  // Status Polling: Check order status every 2.5 seconds
  useEffect(() => {
    if (currentPaymentStatus === "paid" || currentStatus === "cancelled") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await getOrderStatus(order.id, guestToken);
        if (res.success && res.paymentStatus && res.status) {
          if (res.paymentStatus !== currentPaymentStatus || res.status !== currentStatus) {
            setCurrentStatus(res.status);
            setCurrentPaymentStatus(res.paymentStatus);

            if (res.paymentStatus === "paid") {
              setActionMessage({ type: "success", text: "ชำระเงินสำเร็จแล้ว! กำลังนำคุณไปยังหน้ารายละเอียดคำสั่งซื้อ..." });
              const paidUrl = guestToken ? `/orders/${order.id}?paid=true&token=${guestToken}` : `/orders/${order.id}?paid=true`;
              setTimeout(() => {
                router.push(paidUrl);
              }, 1800);
            } else if (res.status === "cancelled") {
              setActionMessage({ type: "error", text: "การชำระเงินถูกปฏิเสธหรือยกเลิกเรียบร้อยแล้ว" });
            }
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [order.id, currentPaymentStatus, currentStatus, router, guestToken]);

  // Confirm Payment (In-Page Tester Action)
  async function handleConfirmPayment() {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      if (receiptEmail && receiptEmail.trim()) {
        try {
          await updateOrderReceiptEmail(order.id, receiptEmail.trim(), guestToken);
        } catch (emailErr) {
          console.warn("[PaymentClient] Could not update receipt email:", emailErr);
        }
      }
      const res = await confirmMockPayment(order.id, guestToken);
      if (res.success) {
        setCurrentPaymentStatus("paid");
        setCurrentStatus("paid");
        setActionMessage({ type: "success", text: "ยืนยันการชำระเงินสำเร็จแล้ว! กำลังไปยังหน้าคำสั่งซื้อ..." });
        const paidUrl = guestToken ? `/orders/${order.id}?paid=true&token=${guestToken}` : `/orders/${order.id}?paid=true`;
        setTimeout(() => {
          router.push(paidUrl);
        }, 1500);
      } else {
        setActionMessage({ type: "error", text: res.error || "เกิดข้อผิดพลาดในการยืนยัน" });
        setIsProcessing(false);
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
      setIsProcessing(false);
    }
  }

  // Reject Payment (In-Page Tester Action)
  async function handleRejectPayment() {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await rejectMockPayment(order.id, "ผู้ทดสอบปฏิเสธการชำระเงินบนหน้าจอ", guestToken);
      if (res.success) {
        setCurrentPaymentStatus("failed");
        setCurrentStatus("cancelled");
        setActionMessage({ type: "error", text: "การชำระเงินถูกปฏิเสธ/ยกเลิกเรียบร้อยแล้ว" });
      } else {
        setActionMessage({ type: "error", text: res.error || "เกิดข้อผิดพลาดในการยกเลิก" });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleCopyLink() {
    if (!mobilePayUrl) return;
    navigator.clipboard.writeText(mobilePayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="container-main py-10 md:py-16">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-heading font-bold uppercase tracking-wider mb-3">
          <ShieldCheck size={14} /> SOUTH AERO PAYMENT GATEWAY
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
          SECURE CHECKOUT (ชำระเงิน)
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2">
          หมายเลขคำสั่งซื้อ: <span className="text-white font-mono font-bold">{order.orderNumber}</span>
        </p>
      </div>

      {/* Tabs Navigation (Development / Testing Only) */}
      {!isProduction && (
        <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab("stripe")}
            type="button"
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              activeTab === "stripe"
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 border border-red-500"
                : "bg-[#141414] text-neutral-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>STRIPE SECURE PAYMENT (CARD / PROMPTPAY / WALLET)</span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            type="button"
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
              activeTab === "simulator"
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 border border-red-500"
                : "bg-[#141414] text-neutral-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>PROMPTPAY QR / TESTER SIMULATOR</span>
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Active Payment Method (Stripe or Simulator) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Action Message Banner */}
          {actionMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                actionMessage.type === "success"
                  ? "bg-green-950/40 border-green-800 text-green-200"
                  : "bg-red-950/40 border-red-800 text-red-200"
              }`}
            >
              {actionMessage.type === "success" ? (
                <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{actionMessage.text}</span>
            </div>
          )}

          {/* RECEIPT & CONFIRMATION EMAIL INPUT CARD */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-heading font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Mail size={15} className="text-[var(--accent-red)]" />
                RECEIPT &amp; CONFIRMATION EMAIL (อีเมลรับใบเสร็จและยืนยันชำระเงิน)
                <span className="text-[var(--accent-red)]">*</span>
              </label>
              {accountEmail && receiptEmail.trim().toLowerCase() === accountEmail.trim().toLowerCase() && (
                <span className="text-[0.65rem] px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 font-mono flex items-center gap-1">
                  ✓ บัญชีของคุณ (Account Email)
                </span>
              )}
            </div>
            <p className="text-[0.75rem] text-[var(--text-secondary)] leading-relaxed">
              เอกสารยืนยันคำสั่งซื้อ รายละเอียดชิ้นงานแอโรพาร์ท และใบเสร็จรับเงินจะถูกส่งไปยังอีเมลนี้ทันทีที่การชำระเงินเสร็จสมบูรณ์
            </p>
            <div className="relative">
              <input
                type="email"
                required
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-red)] transition-colors placeholder:text-gray-600 font-mono"
              />
            </div>
          </div>

          {/* TAB 1: STRIPE PAYMENT FORM */}
          {activeTab === "stripe" && (
            <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Paid Overlay */}
              {currentPaymentStatus === "paid" && (
                <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <CheckCircle2 size={64} className="text-[var(--success)] animate-bounce mb-3" />
                  <h3 className="font-heading text-xl font-bold uppercase text-white">
                    PAYMENT COMPLETED!
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs">
                    การชำระเงินได้รับการยืนยันเรียบร้อยแล้ว กำลังนำท่านไปยังหน้าสรุปคำสั่งซื้อ...
                  </p>
                  <Link
                    href={`/orders/${order.id}`}
                    className="btn-primary mt-6 text-xs gap-2 py-3 px-6 font-heading uppercase"
                  >
                    VIEW ORDER DETAILS <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {/* Cancelled Overlay */}
              {currentStatus === "cancelled" && (
                <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <XCircle size={64} className="text-[var(--accent-red)] mb-3" />
                  <h3 className="font-heading text-xl font-bold uppercase text-white">
                    PAYMENT CANCELLED
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs">
                    คำสั่งซื้อนี้ถูกปฏิเสธหรือยกเลิกการชำระเงินแล้ว
                  </p>
                  <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                    <Link
                      href="/products"
                      className="btn-primary text-xs gap-2 py-3 justify-center font-heading uppercase"
                    >
                      SHOP AGAIN <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Header inside Stripe Card */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div>
                  <span className="text-[0.7rem] text-[var(--text-muted)] font-heading uppercase tracking-wider block">
                    TOTAL AMOUNT DUE
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
                      ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-mono text-[var(--accent-red)] font-bold">THB</span>
                  </div>
                </div>
                <span className="text-[0.65rem] px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1">
                  <Lock className="h-3 w-3" /> STRIPE SECURE
                </span>
              </div>

              {/* Loading Spinner */}
              {stripeLoading && (
                <div className="py-14 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                  <p className="text-xs font-heading tracking-wider uppercase text-neutral-300">
                    CONNECTING TO STRIPE ENCRYPTED GATEWAY...
                  </p>
                  <p className="text-[0.75rem] text-neutral-500">
                    กำลังโหลดระบบรับชำระเงินปลอดภัยระดับสากล
                  </p>
                </div>
              )}

              {/* Error Message */}
              {stripeError && (
                <div className="p-6 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-red-950/50 border border-red-500/30 text-red-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">ไม่สามารถเริ่มระบบชำระเงินได้</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">{stripeError}</p>
                  <button
                    onClick={initStripe}
                    className="inline-flex items-center gap-2 text-xs font-heading uppercase tracking-wider px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    ลองใหม่อีกครั้ง (Retry)
                  </button>
                </div>
              )}

              {/* Stripe Payment Element Form */}
              {!stripeLoading && !stripeError && stripeData && (
                <StripePaymentForm
                  clientSecret={stripeData.clientSecret}
                  publishableKey={stripeData.publishableKey}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  total={order.total}
                  receiptEmail={receiptEmail}
                />
              )}
            </div>
          )}

          {/* TAB 2: SIMULATOR & PROMPTPAY QR (Development / Testing Only) */}
          {!isProduction && activeTab === "simulator" && (
            <div className="space-y-6">
              {/* QR Code Card */}
              <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                <div className="w-full bg-[#003B70] text-white py-2.5 px-4 rounded-lg mb-6 flex items-center justify-between shadow-inner">
                  <span className="font-heading text-xs font-extrabold tracking-widest uppercase">PROMPTPAY</span>
                  <span className="text-[0.65rem] tracking-wider text-blue-100 font-mono">SOUTH AERO PARTS</span>
                </div>

                <div className="mb-4">
                  <span className="text-xs text-[var(--text-muted)] font-heading uppercase tracking-wider block">
                    TOTAL AMOUNT DUE
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5 mt-1">
                    <span className="font-heading text-3xl font-extrabold text-white">
                      ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-mono text-[var(--accent-red)] font-bold">THB</span>
                  </div>
                </div>

                {/* QR Code Image */}
                <div className="p-4 bg-white rounded-xl shadow-xl inline-block border-4 border-[#222222] my-2">
                  {qrDataUrl ? (
                    <Image
                      src={qrDataUrl}
                      alt="PromptPay QR Code"
                      width={220}
                      height={220}
                      unoptimized
                      className="w-52 h-52 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-gray-100">
                      <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Timer Countdown */}
                <div className="mt-4 flex items-center gap-2 text-xs font-heading tracking-wider">
                  <Clock size={14} className="text-[var(--warning)]" />
                  <span className="text-[var(--text-muted)]">QR EXPIRES IN:</span>
                  <span className={`font-mono font-bold ${timeLeft < 180 ? "text-[var(--accent-red)] animate-pulse" : "text-white"}`}>
                    {formattedTime}
                  </span>
                </div>
              </div>

              {/* Tester Simulator Controls */}
              <div className="bg-[#161616] border-2 border-[var(--accent-red)]/50 rounded-2xl p-6 shadow-2xl relative">
                <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A] mb-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={18} className="text-[var(--accent-red)]" />
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                      TESTER SIMULATOR (จำลองการชำระเงิน)
                    </h3>
                  </div>
                  <span className="badge-red text-[0.6rem] px-2 py-0.5 font-mono">DEV MODE</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={isProcessing || currentPaymentStatus === "paid" || currentStatus === "cancelled"}
                    id="btn-confirm-payment-tester"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[var(--success)] hover:bg-emerald-600 disabled:opacity-40 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    {isProcessing ? "กำลังบันทึกสถานะ..." : "1. ยืนยันการชำระเงิน (CONFIRM PAYMENT - SUCCESS)"}
                  </button>

                  <button
                    onClick={handleRejectPayment}
                    disabled={isProcessing || currentPaymentStatus === "paid" || currentStatus === "cancelled"}
                    id="btn-reject-payment-tester"
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-transparent hover:bg-red-950/40 border border-[var(--accent-red)] text-[var(--accent-red)] disabled:opacity-40 font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    <XCircle size={16} />
                    2. ปฏิเสธ / ยกเลิกการชำระเงิน (REJECT / CANCEL PAYMENT)
                  </button>
                </div>

                {/* Simulated Mobile Page Link */}
                <div className="mt-5 pt-4 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <a
                    href={mobilePayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-heading text-white hover:text-[var(--accent-red)] flex items-center gap-1.5 tracking-wider uppercase transition-colors"
                  >
                    <ExternalLink size={14} /> เปิดหน้าจอมือถือจำลองในแท็บใหม่
                  </a>

                  <button
                    onClick={handleCopyLink}
                    className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                    <span>{copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์จำลอง"}</span>
                  </button>
                </div>

                {/* Expandable LAN IP Setup */}
                <div className="mt-4 pt-3 border-t border-[#262626]">
                  <button
                    onClick={() => setShowHostInput(!showHostInput)}
                    className="text-[0.7rem] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline transition-colors cursor-pointer"
                  >
                    {showHostInput ? "▲ ซ่อนการตั้งค่า IP มือถือ" : "▼ สแกนด้วยมือถือจริงผ่าน Wi-Fi ในวงแลน? (ตั้งค่า IP)"}
                  </button>

                  {showHostInput && (
                    <form onSubmit={handleUpdateHost} className="mt-3 p-3 bg-[#0E0E0E] border border-[#282828] rounded-lg">
                      <p className="text-[0.65rem] text-[var(--text-muted)] mb-2">
                        หากสแกนด้วยโทรศัพท์จริง มือถือจะไม่สามารถเข้าถึง localhost ได้ ให้ระบุ Local IP เครื่องคุณ เช่น http://192.168.1.100:3000
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customHost}
                          onChange={(e) => setCustomHost(e.target.value)}
                          placeholder="http://192.168.1.X:3000"
                          className="flex-1 bg-[#1A1A1A] border border-[#333333] text-white text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--accent-red)] font-mono"
                        />
                        <button
                          type="submit"
                          className="btn-primary py-1 px-3 text-[0.7rem] font-heading uppercase cursor-pointer"
                        >
                          UPDATE QR
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Order Summary & Info */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[#222222]">
              ORDER SUMMARY
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">ผู้รับ:</span>
                <span className="text-white font-medium">{order.shippingAddress.recipientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">เบอร์โทร:</span>
                <span className="text-white font-mono">{order.shippingAddress.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">อีเมลรับใบเสร็จ:</span>
                <span className="text-white font-mono text-[0.7rem] truncate max-w-[170px]">
                  {receiptEmail || (order.shippingAddress as Address)?.email || "-"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[var(--text-secondary)]">ที่อยู่จัดส่ง:</span>
                <span className="text-white text-right max-w-[200px] leading-relaxed">
                  {order.shippingAddress.line1}, {order.shippingAddress.subDistrict}, {order.shippingAddress.district},{" "}
                  {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C]">
                <span className="text-[var(--text-secondary)]">การจัดส่ง:</span>
                <span className="text-white">{order.shippingCarrier || "South Aero Standard Logistics"}</span>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="pt-3 border-t border-[#202020]">
              <p className="text-[0.7rem] text-[var(--text-muted)] font-heading uppercase tracking-wider mb-2">
                ITEMS ({items.length})
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <span className="text-[var(--text-secondary)] truncate max-w-[180px]">
                      {it.quantity}x {it.productNameSnapshot}
                    </span>
                    <span className="text-white font-mono font-medium">
                      {currency === "THB"
                        ? `฿${parseFloat(it.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : formatPrice(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badge */}
            <div className="pt-4 border-t border-[#202020] flex items-center justify-center gap-2 text-[0.7rem] text-neutral-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>South Aero Buyer Protection Guarantee</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
