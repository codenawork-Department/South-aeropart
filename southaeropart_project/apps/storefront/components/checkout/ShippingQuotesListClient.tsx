"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  Calendar,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface QuoteItem {
  productId: string;
  quantity: number;
  variant?: string;
  name: string;
  unitPrice: string;
  productType: "single" | "bundle";
}

interface QuoteAddress {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerShippingQuote {
  id: string;
  status: string;
  version: number;
  subtotal: string;
  fee: string | null;
  carrier: string | null;
  deliveryEstimate: string | null;
  offerExpiresAt: Date | string | null;
  items: QuoteItem[];
  address: QuoteAddress;
  orderId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ShippingQuotesListClientProps {
  initialQuotes: CustomerShippingQuote[];
  page: number;
  hasMore: boolean;
}

export function ShippingQuotesListClient({
  initialQuotes,
  page,
  hasMore,
}: ShippingQuotesListClientProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const th = lang === "th";
  const { formatPrice } = useCurrency();

  const [filter, setFilter] = useState<"all" | "offered" | "requested" | "converted">("all");
  const [now, setNow] = useState(Date.now());

  // Update clock every minute for live expiration countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen for real-time updates from admin
  useEffect(() => {
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent;
      const action = custom.detail?.action;
      if (!action || action === "quote_offered" || action === "quote_declined" || action === "refresh") {
        router.refresh();
      }
    };

    window.addEventListener("southaero:realtime", handleRealtime);
    return () => window.removeEventListener("southaero:realtime", handleRealtime);
  }, [router]);

  const filteredQuotes = initialQuotes.filter((q) => {
    if (filter === "all") return true;
    if (filter === "offered") return q.status === "offered";
    if (filter === "requested") return q.status === "requested";
    if (filter === "converted") return q.status === "converted";
    return true;
  });

  const offeredCount = initialQuotes.filter((q) => q.status === "offered").length;
  const requestedCount = initialQuotes.filter((q) => q.status === "requested").length;

  const getStatusBadge = (status: string, offerExpiresAt: Date | string | null) => {
    const isExpired = offerExpiresAt && new Date(offerExpiresAt).getTime() <= now;

    if (status === "offered") {
      if (isExpired) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            {th ? "ข้อเสนอหมดอายุแล้ว" : "Offer Expired"}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/40 animate-pulse shadow-sm shadow-amber-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          {th ? "พร้อมให้ยืนยันราคา" : "Ready to Confirm"}
        </span>
      );
    }

    if (status === "requested") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
          <Clock className="w-3.5 h-3.5" />
          {th ? "รอแอดมินประเมินราคา" : "Awaiting Quote"}
        </span>
      );
    }

    if (status === "converted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {th ? "ยืนยันสั่งซื้อแล้ว" : "Order Created"}
        </span>
      );
    }

    if (status === "declined") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5" />
          {th ? "ไม่สามารถจัดส่งได้" : "Unavailable"}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300">
        <RotateCcw className="w-3.5 h-3.5" />
        {th ? "ยกเลิกคำขอแล้ว" : "Cancelled"}
      </span>
    );
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {th ? "คำขอราคาค่าจัดส่ง" : "Shipping Quotations"}
              </h1>
              <p className="text-sm text-neutral-400">
                {th
                  ? "ตรวจสอบข้อเสนอค่าจัดส่งสำหรับสินค้าขนาดใหญ่และชิ้นส่วนสั่งทำพิเศษ"
                  : "Track your shipping quotes for oversize aerodynamic parts and custom packages"}
              </p>
            </div>
          </div>
        </div>

        {/* Link back to Orders */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          {th ? "ดูคำสั่งซื้อทั้งหมด" : "View all orders"}
        </Link>
      </div>

      {/* Alert Banner for pending offers */}
      {offeredCount > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 animate-bounce" />
            <div>
              <h3 className="font-semibold text-sm text-amber-300">
                {th
                  ? `คุณมี ${offeredCount} คำขอที่แอดมินเสนอราคาเรียบร้อยแล้ว!`
                  : `You have ${offeredCount} quote(s) ready for your review!`}
              </h3>
              <p className="text-xs text-amber-200/80">
                {th
                  ? "กรุณาตรวจสอบรายละเอียดค่าจัดส่งและกดยืนยันเพื่อชำระเงินก่อนราคาหมดอายุ"
                  : "Please review and confirm to proceed to checkout before the offer expires"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          {th ? "ทั้งหมด" : "All"} ({initialQuotes.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("offered")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "offered"
              ? "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {th ? "พร้อมชำระเงิน" : "Ready to Pay"}
          {offeredCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-neutral-950 font-bold">
              {offeredCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("requested")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "requested"
              ? "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {th ? "รอประเมิน" : "Awaiting Quote"}
          {requestedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-bold">
              {requestedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("converted")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "converted"
              ? "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {th ? "สั่งซื้อสำเร็จแล้ว" : "Converted"}
        </button>
      </div>

      {/* Quotes Cards Grid */}
      {filteredQuotes.length === 0 ? (
        <div className="rounded-3xl border border-neutral-800/80 bg-neutral-900/40 p-12 text-center shadow-xl">
          <Truck className="w-14 h-14 mx-auto mb-4 text-neutral-600 stroke-1" />
          <h3 className="text-base font-bold text-white">
            {th ? "ไม่พบคำขอราคาค่าจัดส่ง" : "No shipping quotes found"}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            {th
              ? "เมื่อคุณมีสินค้าขนาดใหญ่หรือสินค้าที่ต้องประเมินค่าจัดส่ง คำขอราคาจะแสดงที่นี่"
              : "When you request shipping assessment for oversize parts, they will appear here"}
          </p>
          <div className="mt-6">
            <Link
              href="/collection"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors border border-neutral-700"
            >
              <ShoppingBag className="w-4 h-4" />
              {th ? "เลือกชมสินค้าแอร์โรพาร์ท" : "Explore Aerodynamics"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const isOffered = quote.status === "offered";
            const isExpired = quote.offerExpiresAt && new Date(quote.offerExpiresAt).getTime() <= now;
            const totalItemsCount = quote.items.reduce((sum, i) => sum + (i.quantity || 1), 0);

            return (
              <div
                key={quote.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xl ${
                  isOffered && !isExpired
                    ? "bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 border-amber-500/40 shadow-amber-500/5 ring-1 ring-amber-500/20"
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80"
                }`}
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white">
                        #{quote.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        {new Date(quote.createdAt).toLocaleDateString(th ? "th-TH" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(quote.status, quote.offerExpiresAt)}
                    </div>
                  </div>

                  {/* Card Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    {/* Left: Items Preview (7 cols) */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        {totalItemsCount} {th ? "ชิ้นสินค้าในคำขอ" : "items requested"}
                      </div>

                      <div className="space-y-1.5">
                        {quote.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-neutral-300">
                            <span className="truncate pr-2 font-medium">
                              {item.name} {item.variant ? `(${item.variant})` : ""}
                            </span>
                            <span className="text-neutral-400 flex-shrink-0">
                              ฿{item.unitPrice} × {item.quantity}
                            </span>
                          </div>
                        ))}
                        {quote.items.length > 3 && (
                          <p className="text-[11px] text-neutral-500 italic">
                            {th
                              ? `และอีก ${quote.items.length - 3} รายการ...`
                              : `and ${quote.items.length - 3} more item(s)...`}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <span className="truncate">
                          {quote.address.recipientName} •{" "}
                          {[quote.address.province, quote.address.postalCode, quote.address.country || "TH"]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </div>
                    </div>

                    {/* Right: Price & CTA (5 cols) */}
                    <div className="md:col-span-5 md:border-l md:border-neutral-800/80 md:pl-5 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>{th ? "ยอดรวมสินค้า" : "Products Subtotal"}</span>
                          <span className="font-medium text-white">฿{quote.subtotal}</span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">{th ? "ค่าจัดส่ง" : "Shipping Fee"}</span>
                          {quote.fee !== null ? (
                            <span className="font-bold text-emerald-400">฿{quote.fee}</span>
                          ) : (
                            <span className="text-amber-400/90 font-medium">
                              {th ? "รอประเมินราคา" : "Awaiting quote"}
                            </span>
                          )}
                        </div>

                        {quote.carrier && (
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-0.5">
                            <Truck className="w-3 h-3 text-sky-400 flex-shrink-0" />
                            <span className="truncate">
                              {quote.carrier} {quote.deliveryEstimate ? `(${quote.deliveryEstimate})` : ""}
                            </span>
                          </div>
                        )}

                        {isOffered && !isExpired && quote.offerExpiresAt && (
                          <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 pt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatRemainingTime(quote.offerExpiresAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="pt-2">
                        {isOffered && !isExpired ? (
                          <Link
                            href={`/shipping-quotes/${quote.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                          >
                            <Sparkles className="w-4 h-4" />
                            {th ? "ดูข้อเสนอและชำระเงิน" : "Review Quote & Pay"}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : quote.status === "converted" && quote.orderId ? (
                          <Link
                            href={`/orders/${quote.orderId}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors border border-neutral-700"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            {th ? "ดูคำสั่งซื้อที่สร้างแล้ว" : "View Created Order"}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/shipping-quotes/${quote.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors border border-neutral-700"
                          >
                            {th ? "ดูรายละเอียดคำขอ" : "View Quote Details"}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-4 pt-6">
          {page > 1 && (
            <Link
              href={`/shipping-quotes?page=${page - 1}`}
              className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              ← {th ? "ก่อนหน้า" : "Previous"}
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/shipping-quotes?page=${page + 1}`}
              className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              {th ? "ถัดไป" : "Next"} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
