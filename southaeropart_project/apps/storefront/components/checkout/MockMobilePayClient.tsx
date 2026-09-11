"use client";

import { useState } from "react";
import {
  confirmMockPayment,
  rejectMockPayment,
} from "@/actions/checkout.actions";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Order, OrderItem } from "@repo/db";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { getLocalizedOrderItemName } from "@/lib/i18n-helpers";

interface MockMobilePayClientProps {
  order: Order;
  items: (OrderItem & {
    productName?: string | null;
    productNameEn?: string | null;
  })[];
  guestToken?: string;
}

export function MockMobilePayClient({ order, items, guestToken }: MockMobilePayClientProps) {
  const { lang } = useLanguage();
  const { formatPrice, currency } = useCurrency();
  const [status, setStatus] = useState<"idle" | "authorizing" | "paid" | "cancelled">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string>(`TXN-${Date.now().toString(36).toUpperCase()}`);

  async function handleConfirm() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await confirmMockPayment(order.id, guestToken);
      if (res.success) {
        setStatus("paid");
        setTxRef(`SA-SLIP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
      } else {
        setErrorMsg(res.error || (lang === "th" ? "เกิดข้อผิดพลาดในการยืนยัน" : "Error confirming payment"));
      }
    } catch (e) {
      setErrorMsg(lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย" : "Network connection error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await rejectMockPayment(order.id, "ผู้ทดสอบปฏิเสธผ่านมือถือ", guestToken);
      if (res.success) {
        setStatus("cancelled");
      } else {
        setErrorMsg(res.error || (lang === "th" ? "เกิดข้อผิดพลาดในการยกเลิก" : "Error cancelling payment"));
      }
    } catch (e) {
      setErrorMsg(lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย" : "Network connection error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header Bar */}
      <div className="max-w-md mx-auto w-full pt-2">
        <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)]" />
            <span className="font-heading text-sm font-extrabold tracking-widest text-white uppercase">
              SOUTH AERO
            </span>
          </div>
          <span className="text-[0.65rem] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono border border-blue-800">
            PROMPTPAY SIMULATOR
          </span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-md mx-auto w-full my-auto py-6">
        {/* State 1: Paid (e-Slip Success View) */}
        {status === "paid" && (
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-2xl animate-fade-in relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--success)]/10 rounded-full blur-2xl" />

            <div className="flex flex-col items-center text-center pb-6 border-b border-[#222222]">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-white">
                {lang === "th" ? "ชำระเงินสำเร็จ" : "PAYMENT SUCCESSFUL"}
              </h2>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                {lang === "th" ? "การชำระเงินได้รับการยืนยันเรียบร้อยแล้ว" : "Payment has been confirmed successfully"}
              </p>
              <p className="text-[0.7rem] text-[var(--text-muted)] mt-0.5 font-mono">
                {new Date().toLocaleString(lang === "th" ? "th-TH" : "en-US")}
              </p>
            </div>

            {/* Slip Details */}
            <div className="py-5 space-y-3 text-xs border-b border-[#222222]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{lang === "th" ? "ผู้รับเงิน:" : "Recipient:"}</span>
                <span className="font-semibold text-white">South Aero Co., Ltd.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{lang === "th" ? "รหัสอ้างอิง (Ref):" : "Ref:"}</span>
                <span className="font-mono text-gray-300">{txRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{lang === "th" ? "หมายเลขคำสั่งซื้อ:" : "Order #:"}</span>
                <span className="font-mono text-[var(--accent-red)] font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[var(--text-secondary)] font-heading uppercase">{lang === "th" ? "ยอดเงินที่โอน:" : "Amount Transferred:"}</span>
                <div className="text-right">
                  <span className="font-heading text-xl font-bold text-white">
                    ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </span>
                  {currency !== "THB" && (
                    <span className="text-xs text-[var(--text-muted)] font-mono block">
                      ≈ {formatPrice(order.total, { showCode: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[0.7rem] text-[var(--text-muted)] leading-relaxed">
                {lang === "th"
                  ? "หน้าจอคอมพิวเตอร์ของคุณจะเปลี่ยนไปยังหน้ารายละเอียดคำสั่งซื้อโดยอัตโนมัติ คุณสามารถปิดหน้านี้ได้ทันที"
                  : "Your desktop browser will automatically redirect to order details. You may close this window."}
              </p>
            </div>
          </div>
        )}

        {/* State 2: Cancelled View */}
        {status === "cancelled" && (
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-[var(--accent-red)] text-[var(--accent-red)] flex items-center justify-center mx-auto mb-3">
              <XCircle size={36} />
            </div>
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-white">
              {lang === "th" ? "การชำระเงินถูกยกเลิก" : "PAYMENT CANCELLED"}
            </h2>
            <p className="text-xs text-red-400 font-medium mt-1">
              {lang === "th" ? "คำสั่งซื้อนี้ถูกปฏิเสธหรือยกเลิกเรียบร้อยแล้ว" : "This payment has been cancelled or rejected."}
            </p>
            <p className="text-[0.75rem] text-[var(--text-muted)] mt-4 leading-relaxed">
              {lang === "th"
                ? "สถานะถูกอัปเดตไปยังระบบหลักแล้ว ท่านสามารถปิดหน้านี้หรือกลับไปเลือกสินค้าใหม่ได้"
                : "Status has been updated. You may close this tab or return to shop."}
            </p>
          </div>
        )}

        {/* State 3: Pending Authorization View */}
        {status !== "paid" && status !== "cancelled" && (
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Merchant Identity */}
            <div className="flex items-start gap-3.5 pb-5 border-b border-[#222222]">
              <div className="w-11 h-11 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] flex items-center justify-center flex-shrink-0">
                <Building2 size={22} />
              </div>
              <div>
                <span className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-wider block">
                  {lang === "th" ? "ผู้รับเงิน (MERCHANT)" : "MERCHANT"}
                </span>
                <h3 className="font-heading text-sm font-bold uppercase text-white tracking-wide">
                  SOUTH AERO PARTS CO., LTD.
                </h3>
                <p className="text-[0.7rem] text-[var(--text-secondary)] font-mono">PromptPay e-Commerce</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-xl p-4 text-center">
              <span className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wider font-heading">
                {lang === "th" ? "จำนวนเงินที่ต้องชำระ (TOTAL AMOUNT)" : "TOTAL AMOUNT DUE"}
              </span>
              <div className="mt-1">
                <span className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                  ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[var(--accent-red)] font-bold ml-1.5 font-mono">THB</span>
              </div>
              {currency !== "THB" && (
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                  ≈ {formatPrice(order.total, { showCode: true })}
                </p>
              )}
              <p className="text-[0.7rem] text-[var(--text-muted)] mt-1 font-mono">
                Order: {order.orderNumber}
              </p>
            </div>

            {/* Items Summary Brief */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-muted)] font-heading uppercase text-[0.65rem]">
                <span>ITEMS ({items.length})</span>
                <span>SUBTOTAL</span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-[#1F1F1F]">
                {items.map((it) => (
                  <div key={it.id} className="py-2 flex justify-between">
                    <span className="text-gray-300 truncate max-w-[200px]">
                      {it.quantity}x {getLocalizedOrderItemName(it.productNameSnapshot, it.productNameEn, lang)}
                    </span>
                    <span className="text-white font-mono">
                      {currency === "THB" ? `฿${parseFloat(it.lineTotal).toLocaleString()}` : formatPrice(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions: 2 Clear Buttons */}
            <div className="pt-3 space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-[var(--success)] hover:bg-emerald-600 disabled:opacity-50 text-white font-heading font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 size={18} />
                {isSubmitting
                  ? (lang === "th" ? "กำลังดำเนินการ..." : "Processing...")
                  : (lang === "th" ? "ยืนยันการชำระเงิน (CONFIRM)" : "CONFIRM PAYMENT")}
              </button>

              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-transparent hover:bg-red-950/30 border border-[#333333] hover:border-[var(--accent-red)] text-gray-400 hover:text-[var(--accent-red)] disabled:opacity-50 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                {lang === "th" ? "ปฏิเสธ / ยกเลิกการชำระเงิน (REJECT)" : "REJECT / CANCEL PAYMENT"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[0.65rem] text-[var(--text-muted)] pt-1">
              <ShieldCheck size={12} className="text-[var(--success)]" />
              <span>Mockup Payment System for Testing Only</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="max-w-md mx-auto w-full text-center pb-2 text-[0.65rem] text-[var(--text-muted)]">
        &copy; {new Date().getFullYear()} SOUTH AERO PARTS CO., LTD. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
}
