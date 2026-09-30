"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Layers,
  Info,
} from "lucide-react";
import { getShippingQuote, cancelShippingQuote } from "@/actions/shipping.actions";
import { createOrder } from "@/actions/checkout.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatSatang } from "@repo/lib/money-arithmetic";
import { moneySatang } from "@repo/lib/shipping";

type Quote = Extract<Awaited<ReturnType<typeof getShippingQuote>>, { success: true }>["quote"];

export function ShippingQuoteClient({ quote: q }: { quote: Quote }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const th = lang === "th";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [payment, setPayment] = useState<"credit_card" | "promptpay">("credit_card");
  const [now, setNow] = useState(Date.now());
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);

  // Live timer tick for expiration
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen to realtime SSE broadcast
  useEffect(() => {
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent;
      const action = custom.detail?.action;
      const payload = custom.detail?.payload;

      if (!action || action === "quote_offered" || action === "quote_declined" || action === "refresh") {
        if (!payload || payload.quoteId === q.id) {
          setRealtimeNotice(
            th ? "มีการอัปเดตข้อมูลจากแอดมิน กำลังซิงค์ข้อมูลล่าสุด..." : "Updated by admin. Refreshing latest data..."
          );
          setTimeout(() => {
            router.refresh();
            setRealtimeNotice(null);
          }, 800);
        }
      }
    };

    window.addEventListener("southaero:realtime", handleRealtime);
    return () => window.removeEventListener("southaero:realtime", handleRealtime);
  }, [q.id, router, th]);

  const isExpired = q.offerExpiresAt && new Date(q.offerExpiresAt).getTime() <= now;
  const isOffered = q.status === "offered";
  const isConverted = q.status === "converted";
  const isDeclined = q.status === "declined";
  const isCancelled = q.status === "cancelled";
  const isRequested = q.status === "requested";

  const grandTotalSatang = q.fee !== null ? moneySatang(q.subtotal) + moneySatang(q.fee) : null;

  async function handleAccept() {
    setBusy(true);
    setError("");
    try {
      const r = await createOrder({
        shippingQuote: { id: q.id, version: q.version },
        shippingAddress: q.address,
        shippingMethod: "standard",
        paymentMethod: payment,
        customerNote: q.customerNote || undefined,
        items: q.items.map((i) => ({
          productId: i.productId,
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          variant: i.variant,
        })),
        saveAddress: false,
      });

      if (r.success) {
        router.push(`/checkout/payment/${r.orderId}`);
      } else {
        setError(
          th
            ? "ไม่สามารถยืนยันได้ ราคา สินค้า หรือสถานะอาจเปลี่ยนไป กรุณารีเฟรช หากยังยืนยันไม่ได้ให้ขอราคาใหม่"
            : "Cannot confirm. The price, stock or request may have changed. Refresh or request a new quote."
        );
      }
    } catch {
      setError(th ? "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง" : "Connection failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm(th ? "คุณต้องการยกเลิกคำขอราคาค่าจัดส่งนี้ใช่หรือไม่?" : "Are you sure you want to cancel this quote request?")) {
      return;
    }
    setBusy(true);
    try {
      const r = await cancelShippingQuote({ id: q.id, version: q.version });
      if (r.success) {
        router.refresh();
      } else {
        setError(r.error || "Unable to cancel");
      }
    } catch {
      setError("Unable to cancel");
    } finally {
      setBusy(false);
    }
  }

  const formatRemainingTime = (expiresAt: Date | string) => {
    const diffMs = new Date(expiresAt).getTime() - now;
    if (diffMs <= 0) return th ? "หมดอายุแล้ว" : "Expired";
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return th ? `เหลือเวลา ${days} วัน ${remHours} ชม.` : `${days}d ${remHours}h remaining`;
    }
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return th ? `เหลือเวลา ${remHours} ชม. ${mins} นาที` : `${remHours}h ${mins}m remaining`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Realtime Notification Toast */}
      {realtimeNotice && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          {realtimeNotice}
        </div>
      )}

      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <Link
          href="/shipping-quotes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {th ? "กลับไปรายการคำขอราคา" : "Back to Shipping Quotes"}
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-mono">
            ID: #{q.id.slice(0, 8)}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => router.refresh()}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
            {th ? "รีเฟรชข้อมูล" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Step Tracker */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-white">{th ? "1. ส่งคำขอราคา" : "1. Request Sent"}</p>
              <p className="text-[11px] text-neutral-400">{th ? "บันทึกรายการสินค้าแล้ว" : "Items recorded"}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                isOffered || isConverted
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : isRequested
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {isOffered || isConverted ? "✓" : "2"}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{th ? "2. ประเมินค่าจัดส่ง" : "2. Assessment"}</p>
              <p className="text-[11px] text-neutral-400">
                {isOffered
                  ? th ? "แอดมินเสนอราคาแล้ว" : "Quote Ready"
                  : isRequested
                  ? th ? "กำลังประเมินขนาดพัสดุ" : "Calculating rates..."
                  : isConverted
                  ? th ? "ยืนยันแล้ว" : "Confirmed"
                  : th ? "สิ้นสุดคำขอ" : "Closed"}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                isConverted
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : isOffered && !isExpired
                  ? "bg-amber-500 text-neutral-950 font-extrabold animate-bounce shadow-lg shadow-amber-500/20"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {isConverted ? "✓" : "3"}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{th ? "3. ยืนยัน & ชำระเงิน" : "3. Confirm & Pay"}</p>
              <p className="text-[11px] text-neutral-400">
                {isConverted
                  ? th ? "สั่งซื้อสำเร็จ" : "Completed"
                  : isOffered && !isExpired
                  ? th ? "พร้อมให้คุณยืนยัน" : "Action Required"
                  : th ? "รอขั้นตอนก่อนหน้า" : "Pending"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Notice Banners */}
      {isRequested && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sky-200 flex items-start gap-3.5 shadow-lg shadow-sky-500/5">
          <Clock className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-sky-300">
              {th ? "คำขอของคุณอยู่ระหว่างการประเมินราคา" : "Your quote is currently being reviewed"}
            </h3>
            <p className="text-xs text-sky-200/80 leading-relaxed">
              {th
                ? "ทีมงานแอดมิน South Aero กำลังตรวจสอบขนาดพัสดุและเลือกบริการจัดส่งที่ปลอดภัยและประหยัดที่สุดสำหรับคุณ หน้านี้จะอัปเดตแบบเรียลไทม์ทันทีที่แอดมินส่งข้อเสนอราคา"
                : "Our logistics team is calculating parcel crating dimensions and selecting the optimal carrier. This page will automatically update the moment our quote is ready."}
            </p>
          </div>
        </div>
      )}

      {isOffered && !isExpired && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-neutral-900 p-5 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30">
          <div className="flex items-start gap-3.5">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-amber-300">
                {th ? "แอดมินเสนอราคาค่าจัดส่งเรียบร้อยแล้ว!" : "Shipping quote is ready for your review!"}
              </h3>
              <p className="text-xs text-amber-200/80">
                {th
                  ? "กรุณาตรวจสอบยอดค่าจัดส่ง ขนส่ง และเงื่อนไขด้านล่าง จากนั้นกดยืนยันเพื่อไปหน้าชำระเงิน"
                  : "Please review the proposed shipping fee, carrier, and terms below, then confirm to checkout."}
              </p>
            </div>
          </div>

          {q.offerExpiresAt && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRemainingTime(q.offerExpiresAt)}</span>
            </div>
          )}
        </div>
      )}

      {isOffered && isExpired && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-neutral-300 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white">
              {th ? "ข้อเสนอราคานี้หมดอายุแล้ว" : "This shipping quote has expired"}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {th
                ? "เนื่องจากราคาค่าขนส่งและสต็อกสินค้าอาจมีการเปลี่ยนแปลง หากท่านยังต้องการสั่งซื้อ กรุณากดขอราคาใหม่จากตะกร้าสินค้า"
                : "Carrier rates and product stock may have changed. Please create a new request from your cart."}
            </p>
            <div className="pt-2">
              <Link
                href="/checkout"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                {th ? "ไปที่หน้าตะกร้าเพื่อขอราคาใหม่ →" : "Go to cart to request a new quote →"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {isConverted && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-emerald-300">
                {th ? "คุณได้ยืนยันและสร้างคำสั่งซื้อแล้ว" : "Order has been created"}
              </h3>
              <p className="text-xs text-emerald-200/80">
                {th
                  ? "คำขอนี้ถูกแปลงเป็นคำสั่งซื้อเรียบร้อยแล้ว ท่านสามารถดูสถานะการจัดส่งได้จากหน้าคำสั่งซื้อ"
                  : "This quote has been converted into an order. You can track payment and shipment in your orders."}
              </p>
            </div>
          </div>
          {q.orderId && (
            <Link
              href={`/orders/${q.orderId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors flex-shrink-0"
            >
              {th ? "ดูคำสั่งซื้อ" : "View Order"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {isDeclined && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-200 flex items-start gap-3.5">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-rose-300">
              {th ? "ไม่สามารถจัดส่งได้ตามคำขอ" : "Shipping request unavailable"}
            </h3>
            <p className="text-xs text-rose-200/80">
              {th ? "เหตุผล: " : "Reason: "}
              {q.terms || (th ? "ขนส่งไม่สามารถรองรับการจัดส่งไปยังที่อยู่นี้ได้" : "Carrier cannot deliver to this destination")}
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer & Destination Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {th ? "ข้อมูลผู้รับและที่อยู่ปลายทาง" : "Recipient & Shipping Address"}
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-sm font-semibold text-white">{q.address.recipientName}</p>
              <p className="text-neutral-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                {q.address.phone}
              </p>
              <div className="pt-2 text-neutral-300 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                <span>
                  {[
                    q.address.line1,
                    q.address.line2,
                    q.address.subDistrict,
                    q.address.district,
                    q.address.province,
                    q.address.postalCode,
                    q.address.country || "TH",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>

              {q.customerNote && (
                <div className="mt-3 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300">
                  <span className="font-semibold text-amber-400 block mb-0.5">
                    {th ? "หมายเหตุที่คุณระบุ:" : "Your Note:"}
                  </span>
                  <p className="whitespace-pre-wrap">{q.customerNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Requested Items Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  {th ? "รายการสินค้าที่ขอราคา" : "Requested Items"}
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                {q.items.reduce((s, i) => s + (i.quantity || 1), 0)} {th ? "ชิ้น" : "items"}
              </span>
            </div>

            <div className="divide-y divide-neutral-800/80">
              {q.items.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    {item.variant && (
                      <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {item.variant}
                      </span>
                    )}
                    <p className="text-xs text-neutral-400">
                      ฿{item.unitPrice} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    ฿{formatSatang(moneySatang(item.unitPrice) * BigInt(item.quantity))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Crating Boxes Plan (if provided by admin) */}
          {q.parcels && q.parcels.length > 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  {th ? "แผนการบรรจุกล่องพัสดุ (Packaging Plan)" : "Packaging & Parcel Plan"}
                </h2>
              </div>

              <div className="space-y-2.5">
                {q.parcels.map((parcel, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-amber-400">
                      <span>{th ? `กล่องที่ ${idx + 1}` : `Box #${idx + 1}`}: {parcel.contents}</span>
                      <span className="text-neutral-400 font-mono">{parcel.weightKg} กก.</span>
                    </div>
                    <p className="text-neutral-400 text-[11px]">
                      {th ? "ขนาด:" : "Dimensions:"} {parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} ซม.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {q.terms && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-2 text-xs text-neutral-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>{th ? "เงื่อนไขและข้อตกลงการจัดส่ง" : "Terms & Conditions"}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">{q.terms}</p>
            </div>
          )}
        </div>

        {/* Right Column: Pricing & Action Center (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl backdrop-blur-md space-y-6">
            <h2 className="text-base font-bold text-white border-b border-neutral-800 pb-3">
              {th ? "สรุปยอดค่าจัดส่งและสินค้า" : "Quotation Summary"}
            </h2>

            {/* Price Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-300">
                <span>{th ? "ยอดรวมสินค้า" : "Products Subtotal"}</span>
                <span className="font-semibold text-white">฿{q.subtotal}</span>
              </div>

              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-neutral-300 block">{th ? "ค่าจัดส่งและบรรจุภัณฑ์" : "Shipping & Crating"}</span>
                  {q.carrier && (
                    <span className="text-xs text-amber-400/90 font-medium">
                      {q.carrier} {q.deliveryEstimate ? `(${q.deliveryEstimate})` : ""}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {q.fee !== null ? (
                    <span className="font-bold text-emerald-400 text-base">฿{q.fee}</span>
                  ) : (
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                      {th ? "รอแอดมินประเมิน" : "Pending Review"}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
                <span className="font-bold text-base text-white">{th ? "ยอดรวมทั้งสิ้น" : "Grand Total"}</span>
                <span className="font-extrabold text-2xl text-amber-400">
                  {grandTotalSatang !== null ? `฿${formatSatang(grandTotalSatang)}` : "—"}
                </span>
              </div>
            </div>

            {/* Confirm & Checkout Section */}
            {isOffered && !isExpired && (
              <div className="pt-4 border-t border-neutral-800 space-y-5">
                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    {th ? "เลือกช่องทางชำระเงิน" : "Select Payment Method"}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPayment("credit_card")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        payment === "credit_card"
                          ? "bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/40"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mb-1 text-amber-400" />
                      <span className="text-xs font-semibold block">{th ? "บัตรเครดิต/เดบิต" : "Credit Card"}</span>
                      <span className="text-[10px] text-neutral-500">Stripe Secure</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayment("promptpay")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        payment === "promptpay"
                          ? "bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/40"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <QrCode className="w-5 h-5 mb-1 text-amber-400" />
                      <span className="text-xs font-semibold block">PromptPay QR</span>
                      <span className="text-[10px] text-neutral-500">{th ? "สแกนจ่ายทันที" : "Instant Scan"}</span>
                    </button>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 cursor-pointer hover:bg-neutral-950 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-500/20 bg-neutral-900 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-xs text-neutral-300 leading-relaxed">
                    {th
                      ? "ฉันได้ตรวจสอบรายการสินค้า ที่อยู่ และยอมรับค่าจัดส่งและเงื่อนไขข้างต้นเรียบร้อยแล้ว"
                      : "I have verified items, address, and agree to the shipping quote and terms above."}
                  </span>
                </label>

                {/* Action CTA Button */}
                <button
                  type="button"
                  disabled={busy || !agreed}
                  onClick={() => void handleAccept()}
                  className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {busy
                    ? th ? "กำลังสร้างออเดอร์..." : "Creating Order..."
                    : th ? "ยืนยันราคาและดำเนินการชำระเงิน" : "Confirm Quote & Proceed to Payment"}
                </button>
              </div>
            )}

            {/* If Converted: Continue to Order */}
            {isConverted && q.orderId && (
              <div className="pt-2">
                <Link
                  href={`/orders/${q.orderId}`}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {th ? "เปิดดูคำสั่งซื้อและสถานะพัสดุ" : "View Order & Tracking"}
                </Link>
              </div>
            )}

            {/* Cancel & Helper options */}
            <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2 text-xs">
              <Link
                href="/checkout"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {th ? "← ขอราคาใหม่จากตะกร้าสินค้า" : "← Request a new quote from cart"}
              </Link>

              {["requested", "offered"].includes(q.status) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCancel()}
                  className="text-neutral-500 hover:text-rose-400 transition-colors text-left disabled:opacity-50"
                >
                  {th ? "ยกเลิกคำขอราคานี้" : "Cancel this quote request"}
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
