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
} from "@/actions/checkout.actions";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { Order, OrderItem } from "@repo/db";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface PaymentClientProps {
  order: Order;
  items: (OrderItem & { imageUrl?: string | null; slug?: string | null })[];
}

export function PaymentClient({ order, items }: PaymentClientProps) {
  const router = useRouter();
  const { formatPrice, currency } = useCurrency();

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [mobilePayUrl, setMobilePayUrl] = useState<string>("");
  const [customHost, setCustomHost] = useState<string>("");
  const [showHostInput, setShowHostInput] = useState<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 minutes in seconds
  const [copied, setCopied] = useState<boolean>(false);

  const [currentStatus, setCurrentStatus] = useState<string>(order.status);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>(order.paymentStatus);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Generate QR Code with target URL
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

  // Status Polling: Check order status every 2 seconds
  useEffect(() => {
    if (currentPaymentStatus === "paid" || currentStatus === "cancelled") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await getOrderStatus(order.id);
        if (res.success && res.paymentStatus && res.status) {
          if (res.paymentStatus !== currentPaymentStatus || res.status !== currentStatus) {
            setCurrentStatus(res.status);
            setCurrentPaymentStatus(res.paymentStatus);

            if (res.paymentStatus === "paid") {
              setActionMessage({ type: "success", text: "ชำระเงินสำเร็จแล้ว! กำลังนำคุณไปยังหน้ารายละเอียดคำสั่งซื้อ..." });
              setTimeout(() => {
                router.push(`/orders/${order.id}?paid=true`);
              }, 1800);
            } else if (res.status === "cancelled") {
              setActionMessage({ type: "error", text: "การชำระเงินถูกปฏิเสธหรือยกเลิกเรียบร้อยแล้ว" });
            }
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [order.id, currentPaymentStatus, currentStatus, router]);

  // Confirm Payment (In-Page Tester Action)
  async function handleConfirmPayment() {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await confirmMockPayment(order.id);
      if (res.success) {
        setCurrentPaymentStatus("paid");
        setCurrentStatus("paid");
        setActionMessage({ type: "success", text: "ยืนยันการชำระเงินสำเร็จแล้ว! กำลังไปยังหน้าคำสั่งซื้อ..." });
        setTimeout(() => {
          router.push(`/orders/${order.id}?paid=true`);
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
      const res = await rejectMockPayment(order.id, "ผู้ทดสอบปฏิเสธการชำระเงินบนหน้าจอ");
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
          <QrCode size={14} /> MOCKUP PROMPTPAY PAYMENT GATEWAY
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
          SCAN TO PAY (สแกนเพื่อชำระเงิน)
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2">
          หมายเลขคำสั่งซื้อ: <span className="text-white font-mono font-bold">{order.orderNumber}</span>
        </p>
      </div>

      {/* Main Grid: QR Box vs Details & Simulator */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Side: QR Code Card */}
        <div className="md:col-span-6 bg-[#121212] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* PromptPay Top Bar */}
          <div className="w-full bg-[#003B70] text-white py-2.5 px-4 rounded-lg mb-6 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-extrabold tracking-widest uppercase">PROMPTPAY</span>
            </div>
            <span className="text-[0.65rem] tracking-wider text-blue-100 font-mono">SOUTH AERO PARTS</span>
          </div>

          {/* Status Overlay if Paid or Cancelled */}
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
                <Link
                  href="/cart"
                  className="btn-outline text-xs gap-2 py-2.5 justify-center font-heading uppercase"
                >
                  RETURN TO CART
                </Link>
              </div>
            </div>
          )}

          {/* Amount to Pay */}
          <div className="mb-4">
            <span className="text-xs text-[var(--text-muted)] font-heading uppercase tracking-wider block">
              TOTAL AMOUNT DUE (ยอดชำระสุทธิ)
            </span>
            <div className="flex items-baseline justify-center gap-1.5 mt-1">
              <span className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono text-[var(--accent-red)] font-bold">THB</span>
            </div>
            {currency !== "THB" && (
              <span className="text-xs font-mono text-[var(--text-muted)] block mt-1">
                ≈ {formatPrice(order.total, { showCode: true })}
              </span>
            )}
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-xl shadow-xl inline-block border-4 border-[#222222] my-2">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="PromptPay QR Code Mockup"
                width={240}
                height={240}
                unoptimized
                className="w-56 h-56 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-gray-100">
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

          {/* Scan Instructions */}
          <p className="text-[0.7rem] text-[var(--text-secondary)] mt-3 max-w-xs leading-relaxed">
            เปิดแอปกล้องถ่ายรูป หรือแอปธนาคารใดก็ได้บนโทรศัพท์มือถือ เพื่อสแกน QR Code นี้และทำการทดสอบยืนยัน
          </p>
        </div>

        {/* Right Side: Simulator Controls & Order Info */}
        <div className="md:col-span-6 space-y-6">
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

          {/* Tester Simulation Controls Box */}
          <div className="bg-[#161616] border-2 border-[var(--accent-red)]/50 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A] mb-4">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[var(--accent-red)]" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                  TESTER SIMULATOR (จำลองการชำระเงิน)
                </h3>
              </div>
              <span className="badge-red text-[0.6rem] px-2 py-0.5 font-mono">TEST MODE</span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
              สำหรับผู้ทดสอบที่ไม่สะดวกใช้โทรศัพท์มือถือสแกน สามารถคลิกเลือกผลการทดสอบได้ทันทีผ่าน 2 ปุ่มด้านล่างนี้:
            </p>

            {/* 2 Primary Test Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessing || currentPaymentStatus === "paid" || currentStatus === "cancelled"}
                id="btn-confirm-payment-tester"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[var(--success)] hover:bg-emerald-600 disabled:opacity-40 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-950/50 transition-all"
              >
                <CheckCircle2 size={16} />
                {isProcessing ? "กำลังบันทึกสถานะ..." : "1. ยืนยันการชำระเงิน (CONFIRM PAYMENT - SUCCESS)"}
              </button>

              <button
                onClick={handleRejectPayment}
                disabled={isProcessing || currentPaymentStatus === "paid" || currentStatus === "cancelled"}
                id="btn-reject-payment-tester"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-transparent hover:bg-red-950/40 border border-[var(--accent-red)] text-[var(--accent-red)] disabled:opacity-40 font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
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
                className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                <span>{copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์จำลอง"}</span>
              </button>
            </div>

            {/* Expandable LAN IP Setup for physical phone scanning */}
            <div className="mt-4 pt-3 border-t border-[#262626]">
              <button
                onClick={() => setShowHostInput(!showHostInput)}
                className="text-[0.7rem] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline transition-colors"
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
                      className="btn-primary py-1 px-3 text-[0.7rem] font-heading uppercase"
                    >
                      UPDATE QR
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Order Details Brief Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[#222222]">
              ORDER INFORMATION
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
              <div className="flex items-start justify-between gap-4">
                <span className="text-[var(--text-secondary)]">ที่อยู่จัดส่ง:</span>
                <span className="text-white text-right max-w-xs">
                  {order.shippingAddress.line1}, {order.shippingAddress.subDistrict}, {order.shippingAddress.district},{" "}
                  {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C]">
                <span className="text-[var(--text-secondary)]">การจัดส่ง:</span>
                <span className="text-white">{order.shippingCarrier || "Standard Delivery"}</span>
              </div>
            </div>

            {/* Items Thumbnails */}
            <div className="pt-3 border-t border-[#202020]">
              <p className="text-[0.7rem] text-[var(--text-muted)] font-heading uppercase tracking-wider mb-2">
                ITEMS ({items.length})
              </p>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] truncate max-w-[220px]">
                      {it.quantity}x {it.productNameSnapshot}
                    </span>
                    <span className="text-white font-mono">
                      {currency === "THB"
                        ? `฿${parseFloat(it.lineTotal).toLocaleString()}`
                        : formatPrice(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
