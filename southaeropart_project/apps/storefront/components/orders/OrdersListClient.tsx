"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Calendar,
  CreditCard,
  QrCode,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  ExternalLink,
  Star,
  Sparkles,
  FileText,
} from "lucide-react";
import type { Address } from "@repo/db";
import type { UserOrderItemDetail } from "@/actions/checkout.actions";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedOrderItemName } from "@/lib/i18n-helpers";
import { ProductReviewModal } from "@/components/reviews/ProductReviewModal";
import { getUserProductReviewsAction } from "@/actions/review.actions";

export interface OrderWithCount {
  id: string;
  orderNumber: string;
  userId: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentMethod: "credit_card" | "promptpay";
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded";
  subtotal: string;
  shippingFee: string;
  taxAmount: string;
  total: string;
  currency: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  shippingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  items?: UserOrderItemDetail[];
}

export function OrdersListClient({ initialOrders }: { initialOrders: OrderWithCount[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithCount[]>(initialOrders);
  const { formatPrice, currency } = useCurrency();
  const { lang, t } = useLanguage();
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Sync state when initialOrders updates via server revalidation or router.refresh()
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Real-time listener for order status updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const action = customEvent.detail?.action;
      if (
        !action ||
        action === "order_shipped" ||
        action === "order_status_updated" ||
        action === "order_created" ||
        action === "refresh"
      ) {
        router.refresh();
      }
    };

    window.addEventListener("southaero:realtime", handleRealtimeUpdate);
    window.addEventListener("southaero:order_shipped", handleRealtimeUpdate);
    return () => {
      window.removeEventListener("southaero:realtime", handleRealtimeUpdate);
      window.removeEventListener("southaero:order_shipped", handleRealtimeUpdate);
    };
  }, [router]);

  // Review states
  const [userReviews, setUserReviews] = useState<Record<string, any>>({});
  const [selectedProductForReview, setSelectedProductForReview] = useState<{
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchUserReviews = useCallback(async () => {
    const allProductIds = new Set<string>();
    for (const ord of orders) {
      if (ord.items) {
        for (const it of ord.items) {
          if (it.productId) allProductIds.add(it.productId);
        }
      }
    }
    const idList = Array.from(allProductIds);
    if (idList.length === 0) return;
    try {
      const res = await getUserProductReviewsAction(idList);
      if (res.success && res.data) {
        setUserReviews(res.data);
      }
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    fetchUserReviews();
  }, [fetchUserReviews]);

  const handleOpenReview = (item: {
    productId: string | null;
    productNameSnapshot: string;
    productNameEn?: string | null;
    imageUrl?: string | null;
  }) => {
    if (!item.productId) return;
    setSelectedProductForReview({
      id: item.productId,
      name: getLocalizedOrderItemName(item.productNameSnapshot, item.productNameEn, lang),
      imageUrl: item.imageUrl,
    });
    setIsReviewModalOpen(true);
  };

  const handleCopy = useCallback((trackingNumber: string) => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopiedTracking(trackingNumber);
    setTimeout(() => setCopiedTracking(null), 2500);
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const activeShipments = orders.filter((o) => o.status === "shipped");

  if (orders.length === 0) {
    return (
      <div className="container-main py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-[#121212] border border-[#222222] rounded-2xl p-8 sm:p-12 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-[var(--text-muted)] mx-auto flex items-center justify-center mb-5">
            <Package size={30} className="text-[var(--accent-red)]" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
            {t.orders.empty}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
            {t.orders.emptyDesc}
          </p>
          <Link
            href="/products"
            className="btn-primary mt-6 text-xs gap-2 py-3 px-6 font-heading uppercase inline-flex"
          >
            {t.orders.startShopping} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-10 md:py-16">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase"
      >
        <Link href="/" className="hover:text-white transition-colors">
          {t.nav.home}
        </Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">{t.orders.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#222222] gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              CUSTOMER PORTAL
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white mt-1">
            {t.orders.title}
          </h1>
        </div>
        <span className="text-xs font-heading uppercase tracking-wider text-[var(--text-muted)]">
          {lang === "th" ? "คำสั่งซื้อทั้งหมด: " : "TOTAL ORDERS: "}<strong className="text-white font-mono">{orders.length}</strong>
        </span>
      </div>

      {/* Active In-Transit Shipments Top Highlight Banner */}
      {activeShipments.length > 0 && (
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#161616] to-[#121212] border border-red-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 right-10 w-48 h-32 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 flex-shrink-0">
                <Truck size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-heading font-black tracking-wider uppercase text-red-400">
                    {lang === "th" ? "พัสดุกำลังจัดส่งถึงคุณ (IN TRANSIT)" : "ORDERS IN TRANSIT"}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  {lang === "th"
                    ? `มีคำสั่งซื้อที่อยู่ระหว่างการนำส่งจำนวน ${activeShipments.length} รายการ`
                    : `${activeShipments.length} order(s) currently out for delivery`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {activeShipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/orders/${shipment.id}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0F0F0F] border border-red-500/40 hover:border-red-400 text-xs text-white hover:text-red-300 transition-all font-mono"
                >
                  <span className="text-red-400 font-bold">#{shipment.orderNumber}</span>
                  {shipment.trackingNumber && (
                    <span className="text-neutral-400 text-[0.7rem] hidden sm:inline">
                      ({shipment.trackingNumber})
                    </span>
                  )}
                  <ArrowRight size={12} className="text-red-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-6">
        {orders.map((ord) => {
          const isPaid = ord.paymentStatus === "paid" || ord.status === "paid";
          const isCancelled = ord.status === "cancelled";
          const isShipped = ord.status === "shipped";
          const isDelivered = ord.status === "delivered";
          const isProcessing = ord.status === "processing";

          const items = ord.items || [];
          const isExpanded = Boolean(expandedOrders[ord.id]);
          const displayedItems = isExpanded ? items : items.slice(0, 3);
          const hasMoreItems = items.length > 3;

          return (
            <div
              key={ord.id}
              className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-2xl overflow-hidden transition-all shadow-xl"
            >
              {/* Order Header / Top Bar */}
              <div className="p-5 sm:p-6 pb-4 border-b border-[#1C1C1C] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414]/50">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                      #{ord.orderNumber}
                    </span>

                    {/* Status Badges */}
                    {isDelivered ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.35)]">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>{t.orders.deliveredStatus}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                      </span>
                    ) : isShipped ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-sky-950/80 border-2 border-sky-400 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                        <Truck size={13} className="animate-pulse text-sky-400" />
                        <span>{t.orders.shippedStatus}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping ml-0.5" />
                      </span>
                    ) : isProcessing ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-amber-950/80 border-2 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)]">
                        <Package size={13} className="text-amber-400" />
                        <span>{t.orders.processing}</span>
                      </span>
                    ) : isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-emerald-950/60 border-2 border-emerald-500/70 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>{t.orders.paid}</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-red-950/60 border-2 border-red-500/70 text-red-400">
                        <XCircle size={13} className="text-red-400" />
                        <span>{t.orders.cancelled}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-amber-950/60 border-2 border-amber-500/70 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                        <Clock size={13} className="text-amber-400" />
                        <span>{t.orders.pending}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[var(--text-muted)] font-mono">
                    <span className="flex items-center gap-1 text-neutral-300">
                      <Calendar size={12} />
                      {new Date(ord.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-300">{ord.itemCount} {lang === "th" ? "ชิ้น" : "items"}</span>
                    <span>•</span>
                    <span className="text-neutral-400 flex items-center gap-1">
                      <MapPin size={11} /> {ord.shippingAddress.recipientName} ({ord.shippingAddress.province})
                    </span>
                  </div>
                </div>

                {/* Tracking Badge Callout in Header (if tracking available) */}
                {ord.trackingNumber && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A0A0A] border border-red-500/30 self-start md:self-center">
                    <Truck size={13} className="text-red-400 flex-shrink-0" />
                    <div className="text-left">
                      <span className="text-[0.65rem] text-neutral-400 uppercase font-mono block leading-tight">
                        {ord.shippingCarrier || (lang === "th" ? "ขนส่งมาตรฐาน" : "Standard Logistics")}:
                      </span>
                      <span className="font-mono text-xs font-bold text-white tracking-wider select-all">
                        {ord.trackingNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(ord.trackingNumber!)}
                      title={t.orders.copyTracking}
                      className="ml-1 p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    >
                      {copiedTracking === ord.trackingNumber ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Product Items Preview List */}
              <div className="p-5 sm:p-6 space-y-3">
                <div className="text-[0.7rem] font-heading font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  {lang === "th" ? `รายการสินค้าในคำสั่งซื้อนี้ (${items.length} รายการ)` : `ITEMS IN THIS ORDER (${items.length})`}
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">
                    {lang === "th"
                      ? `${ord.itemCount} ชิ้นในคำสั่งซื้อ (ดูรายละเอียดเพิ่มเติมในหน้ารายละเอียดคำสั่งซื้อ)`
                      : `${ord.itemCount} items in order (see details page)`}
                  </p>
                ) : (
                  <div className="divide-y divide-[#1C1C1C]">
                    {displayedItems.map((item) => {
                      const localizedItemName = getLocalizedOrderItemName(
                        item.productNameSnapshot,
                        item.productNameEn,
                        lang
                      );

                      return (
                        <div
                          key={item.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                        >
                          {/* Image & Product Info */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {item.imageUrl ? (
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[#262626] bg-[#181818] flex-shrink-0">
                                <Image
                                  src={item.imageUrl}
                                  alt={localizedItemName}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-[#262626] bg-[#181818] flex items-center justify-center flex-shrink-0 text-neutral-600">
                                <Package size={22} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-semibold text-white truncate leading-snug">
                                {localizedItemName}
                              </h4>

                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {item.bundlePartsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-medium bg-red-950/40 text-red-400 border border-red-500/20">
                                    <Layers size={10} /> {lang === "th" ? `ชุดเซ็ต (${item.bundlePartsCount} ชิ้น)` : `Kit (${item.bundlePartsCount} pcs)`}
                                  </span>
                                )}
                                <span className="text-[0.7rem] font-mono text-neutral-400">
                                  {lang === "th" ? "จำนวน: " : "Qty: "}<strong className="text-neutral-200">{item.quantity}</strong> {lang === "th" ? "ชิ้น" : "pcs"}
                                </span>
                                <span className="text-[0.7rem] font-mono text-neutral-500 hidden sm:inline">
                                  ({currency === "THB" ? `฿${parseFloat(item.unitPrice).toLocaleString()}` : formatPrice(item.unitPrice)} / {lang === "th" ? "ชิ้น" : "pc"})
                                </span>

                                {/* Review Action in Item row */}
                                {isPaid && item.productId && (
                                  <div className="ml-1">
                                    {userReviews[item.productId] ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview(item)}
                                        className="inline-flex items-center gap-1 text-[0.68rem] font-mono text-neutral-300 hover:text-white px-2 py-0.5 rounded-lg bg-red-950/40 border border-red-500/30 hover:border-red-400 transition-all cursor-pointer"
                                      >
                                        <Star size={10} className="text-red-500 fill-red-500" />
                                        <span className="font-bold text-red-400">{userReviews[item.productId].rating}/5</span>
                                        <span className="text-[0.62rem] text-neutral-400">{lang === "th" ? "แก้ไข" : "Edit"}</span>
                                      </button>
                                    ) : isDelivered ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview(item)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[0.68rem] font-heading font-black uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.45)] border border-red-400/60 transition-all active:scale-95 cursor-pointer"
                                      >
                                        <Sparkles size={11} className="text-white fill-white animate-pulse" />
                                        <span>{t.orders.reviewProduct}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview(item)}
                                        className="inline-flex items-center gap-1 text-[0.68rem] font-mono text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                                      >
                                        <Star size={11} className="text-red-400" />
                                        <span>{t.orders.reviewProduct}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="text-right flex-shrink-0 font-mono">
                            <span className="text-xs sm:text-sm font-bold text-white block">
                              {currency === "THB"
                                ? `฿${parseFloat(item.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                : formatPrice(item.lineTotal)}
                            </span>
                            <span className="text-[0.65rem] text-neutral-500">{currency}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Toggle Show More Items Button */}
                {hasMoreItems && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(ord.id)}
                    className="mt-2 text-xs font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 transition-colors pt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} /> {lang === "th" ? "ย่อรายการสินค้า" : "Show less"}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} /> {lang === "th" ? `ดูรายการสินค้าเพิ่มเติมอีก ${items.length - 3} รายการ` : `Show ${items.length - 3} more items`}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Order Footer: Total & Actions */}
              <div className="p-4 sm:p-6 pt-4 border-t border-[#1C1C1C] bg-[#0E0E0E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Total Price */}
                <div>
                  <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase tracking-wider block">
                    {t.orders.totalAmount}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading text-xl sm:text-2xl font-black text-white">
                      {currency === "THB"
                        ? `฿${parseFloat(ord.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : formatPrice(ord.total)}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">{currency}</span>
                    {currency !== "THB" && (
                      <span className="text-[0.65rem] text-neutral-500 font-mono ml-1">
                        (฿{parseFloat(ord.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB)
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {!isPaid && !isCancelled && (
                    <Link
                      href={`/checkout/payment/${ord.id}`}
                      className="btn-primary text-xs py-2.5 px-4 gap-1.5 font-heading uppercase flex-1 sm:flex-initial justify-center"
                    >
                      <QrCode size={14} /> {lang === "th" ? "ชำระเงินต่อ" : "PAY NOW"}
                    </Link>
                  )}

                  {isShipped && (
                    <Link
                      href={`/orders/${ord.id}`}
                      className="btn-primary text-xs py-2.5 px-4 gap-1.5 font-heading uppercase bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 flex-1 sm:flex-initial justify-center shadow-lg shadow-red-950/40"
                    >
                      <Truck size={14} /> {t.orders.trackShipment}
                    </Link>
                  )}

                  {isPaid && (
                    <Link
                      href={`/orders/${ord.id}/invoice`}
                      target="_blank"
                      className="btn-outline text-xs py-2.5 px-3 gap-1.5 font-heading uppercase hover:text-white border-[#333333] hover:border-red-500/60 flex-1 sm:flex-initial justify-center"
                      title={t.invoice.viewInvoice}
                    >
                      <FileText size={14} className="text-red-500" />
                      <span className="hidden lg:inline">{lang === "th" ? "ใบเสร็จ" : "Receipt"}</span>
                    </Link>
                  )}

                  <Link
                    href={`/orders/${ord.id}`}
                    className="btn-outline text-xs py-2.5 px-4 gap-1.5 font-heading uppercase hover:text-white flex-1 sm:flex-initial justify-center"
                  >
                    <span>{t.orders.viewDetails}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Review Modal */}
      <ProductReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        product={selectedProductForReview}
        existingReview={
          selectedProductForReview ? userReviews[selectedProductForReview.id] : null
        }
        onReviewSubmitted={() => {
          fetchUserReviews();
        }}
      />
    </div>
  );
}
