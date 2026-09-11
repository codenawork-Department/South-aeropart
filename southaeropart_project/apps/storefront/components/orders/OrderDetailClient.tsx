"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  CreditCard,
  QrCode,
  ArrowRight,
  Sparkles,
  RotateCcw,
  XCircle,
  FileText,
  Wrench,
  Check,
  Mail,
  Copy,
  RefreshCw,
  ShieldCheck,
  Star,
  ExternalLink,
} from "lucide-react";
import type { Order, OrderItem, OrderItemBundlePart, OrderStatusHistory } from "@repo/db";
import type { OrderItemBundlePartDetail } from "@/actions/checkout.actions";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedOrderItemName } from "@/lib/i18n-helpers";
import { ProductReviewModal } from "@/components/reviews/ProductReviewModal";
import { getUserProductReviewsAction } from "@/actions/review.actions";

interface OrderDetailClientProps {
  order: Order;
  items: (OrderItem & {
    imageUrl?: string | null;
    slug?: string | null;
    productName?: string | null;
    productNameEn?: string | null;
    bundleParts?: (OrderItemBundlePart & Partial<OrderItemBundlePartDetail>)[];
  })[];
  history: OrderStatusHistory[];
  guestToken?: string;
}

export function OrderDetailClient({ order, items, history, guestToken }: OrderDetailClientProps) {
  const { formatPrice, currency } = useCurrency();
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isJustPaid = searchParams.get("paid") === "true";

  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isCopied, setIsCopied] = useState(false);

  // Review states
  const [userReviews, setUserReviews] = useState<Record<string, any>>({});
  const [selectedProductForReview, setSelectedProductForReview] = useState<{
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchUserReviews = useCallback(async () => {
    const productIds = Array.from(
      new Set(items.map((i) => i.productId).filter(Boolean))
    ) as string[];
    if (productIds.length === 0) return;
    try {
      const res = await getUserProductReviewsAction(productIds);
      if (res.success && res.data) {
        setUserReviews(res.data);
      }
    } catch {
      // ignore
    }
  }, [items]);

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

  const handleCopyTracking = useCallback((trackingNum: string) => {
    if (!trackingNum) return;
    navigator.clipboard.writeText(trackingNum);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  }, []);

  const handleManualRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefreshed(new Date());
    });
  }, [router]);

  // Real-time live auto-refresh (6s for in-progress orders, 15s for delivered/cancelled)
  useEffect(() => {
    const isTerminal = order.status === "delivered" || order.status === "cancelled";
    const intervalMs = isTerminal ? 15000 : 6000;

    const intervalId = setInterval(() => {
      startTransition(() => {
        router.refresh();
        setLastRefreshed(new Date());
      });
    }, intervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTransition(() => {
          router.refresh();
          setLastRefreshed(new Date());
        });
      }
    };

    const onRealtimeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent.detail?.payload;
      const targetOrderId = payload?.orderId || payload?.id;

      // If targeted to this order or general broadcast
      if (!targetOrderId || targetOrderId === order.id) {
        startTransition(() => {
          router.refresh();
          setLastRefreshed(new Date());
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("southaero:realtime", onRealtimeUpdate);
    window.addEventListener("southaero:order_shipped", onRealtimeUpdate);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("southaero:realtime", onRealtimeUpdate);
      window.removeEventListener("southaero:order_shipped", onRealtimeUpdate);
    };
  }, [order.id, order.status, router]);

  const isPaid = order.paymentStatus === "paid" || order.status === "paid";
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isShipped = order.status === "shipped";
  const isProcessing = order.status === "processing";

  // Step index for progress tracker
  // 0: Placed, 1: Paid, 2: Processing, 3: Shipped, 4: Delivered
  let currentStep = 0;
  if (isCancelled) {
    currentStep = -1;
  } else if (order.status === "delivered") {
    currentStep = 4;
  } else if (order.status === "shipped") {
    currentStep = 3;
  } else if (order.status === "processing") {
    currentStep = 2;
  } else if (isPaid) {
    currentStep = 1;
  }

  const steps = [
    {
      key: "placed",
      stepNumber: 1,
      label: "ORDER PLACED",
      thLabel: t.orders.orderPlaced,
      desc: t.orders.orderPlacedDesc,
      icon: FileText,
    },
    {
      key: "paid",
      stepNumber: 2,
      label: "PAYMENT CONFIRMED",
      thLabel: t.orders.paymentConfirmed,
      desc: t.orders.paymentConfirmedDesc,
      icon: CreditCard,
    },
    {
      key: "processing",
      stepNumber: 3,
      label: "AERO CRAFTING",
      thLabel: t.orders.aeroCrafting,
      desc: t.orders.aeroCraftingDesc,
      icon: Wrench,
    },
    {
      key: "shipped",
      stepNumber: 4,
      label: "SHIPPED",
      thLabel: t.orders.shippedStatus,
      desc: t.orders.shippedStatusDesc,
      icon: Truck,
    },
    {
      key: "delivered",
      stepNumber: 5,
      label: "DELIVERED",
      thLabel: t.orders.deliveredStatus,
      desc: t.orders.deliveredStatusDesc,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="container-main py-10 md:py-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">{t.nav.home}</Link>
        <span>/</span>
        <Link href="/orders" className="hover:text-white transition-colors">{t.orders.title}</Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">{order.orderNumber}</span>
      </nav>

      {/* Hero Celebration Banner if Just Paid */}
      {isJustPaid && (
        <div className="mb-8 p-6 sm:p-8 bg-gradient-to-r from-emerald-950/60 to-[#121212] border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Sparkles size={32} />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide text-white flex items-center justify-center sm:justify-start gap-2">
              {lang === "th" ? "ขอบคุณสำหรับคำสั่งซื้อของคุณ!" : "THANK YOU FOR YOUR ORDER!"}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-300 mt-1 leading-relaxed">
              {lang === "th"
                ? "เราได้รับยอดชำระเงินเรียบร้อยแล้ว ทีมงานวิศวกรรมแอโรไดนามิกจะเริ่มจัดเตรียมและบรรจุชิ้นส่วนคาร์บอนไฟเบอร์ของคุณโดยเร็วที่สุด"
                : "Payment cleared. Our aerodynamic engineering team will begin preparing and crating your carbon fiber components shortly."}
            </p>
          </div>
        </div>
      )}

      {/* Order Header Summary Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              {t.orders.orderSummary}
            </span>
            {isDelivered ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)]">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{t.orders.deliveredStatus}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </span>
            ) : isShipped ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-sky-950/80 border-2 border-sky-400 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                <Truck size={14} className="animate-pulse text-sky-400" />
                <span>{t.orders.shippedStatus}</span>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping ml-0.5" />
              </span>
            ) : isProcessing ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-amber-950/80 border-2 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                <Package size={14} className="text-amber-400" />
                <span>{t.orders.processing}</span>
              </span>
            ) : isPaid ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-emerald-950/60 border-2 border-emerald-500/70 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{t.orders.paid}</span>
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-red-950/60 border-2 border-red-500/70 text-red-400">
                <XCircle size={14} className="text-red-400" />
                <span>{t.orders.cancelled}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-amber-950/60 border-2 border-amber-500/70 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse">
                <Clock size={14} className="text-amber-400" />
                <span>{t.orders.pending}</span>
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase text-white mt-2">
            {order.orderNumber}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            {lang === "th" ? "สั่งซื้อเมื่อ " : "Placed on "}
            {new Date(order.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Action button: Invoice / Continue Payment */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isPaid ? (
            <Link
              href={`/orders/${order.id}/invoice${guestToken ? `?token=${guestToken}` : ""}`}
              target="_blank"
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-950/40 via-[#181818] to-[#121212] hover:bg-[#1E1E1E] border border-red-500/40 hover:border-red-400 text-white text-xs font-heading font-black uppercase tracking-wider transition-all shadow-lg shadow-red-950/20"
            >
              <FileText size={15} className="text-red-500" />
              <span>{t.invoice.viewInvoice}</span>
              <ExternalLink size={12} className="text-neutral-400" />
            </Link>
          ) : !isCancelled ? (
            <Link
              href={`/checkout/payment/${order.id}`}
              className="btn-primary text-xs tracking-wider gap-2 py-3 px-6 font-heading uppercase"
            >
              <QrCode size={16} /> {lang === "th" ? "ดำเนินการชำระเงินต่อ" : "CONTINUE TO PAYMENT"}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Stepper Timeline (if not cancelled) */}
      {!isCancelled && (
        <div className="bg-gradient-to-b from-[#151515] to-[#0F0F0F] border border-[#262626] rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
          {/* Subtle Ambient Red Glow on Active Header */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Stepper Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-5 border-b border-[#222222] relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-heading text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  ORDER STATUS PROGRESS
                </h3>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  ({lang === "th" ? "ขั้นตอนการดำเนินงาน" : "Live Status"})
                </span>
              </div>
              <p className="text-[0.7rem] sm:text-xs text-[var(--text-muted)] mt-1">
                {lang === "th"
                  ? "ติดตามขั้นตอนการจัดเตรียมและจัดส่งชิ้นส่วนคาร์บอนไฟเบอร์ของคุณแบบ Real-time"
                  : "Track each stage of your precision aerodynamic carbon fiber order in real-time"}
              </p>
            </div>

            {/* Live Indicator & Active Step Chip */}
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {/* Real-Time Live Sync Beacon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[0.65rem] font-mono shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold tracking-wider uppercase">{t.orders.liveUpdateBadge}</span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isPending}
                  title={t.orders.manualRefresh}
                  className="p-1 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isPending ? "animate-spin text-white" : ""} />
                </button>
              </div>

              {/* Current Active Step Chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1C1C] border border-[#333333] shadow-inner">
                <span className="text-[0.65rem] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  STEP {currentStep + 1} OF 5
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-[0.7rem] font-heading font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  {steps[currentStep]?.thLabel || steps[currentStep]?.label || "IN PROGRESS"}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Track & Nodes */}
          <div className="relative z-10">
            <div className="relative">
              {/* Connecting Background Line for Desktop / Tablet */}
              <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-[3px] bg-[#222222] rounded-full z-0">
                {/* Active Progress Line with Red Glow */}
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                  style={{
                    width: `${Math.min(100, Math.max(0, (currentStep / (steps.length - 1)) * 100))}%`,
                  }}
                />
              </div>

              {/* Grid of Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-2">
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.key}
                      className={`flex flex-row md:flex-col items-center md:items-center text-left md:text-center gap-4 md:gap-3 p-3.5 md:p-2 rounded-xl transition-all relative z-10 ${
                        isCurrent
                          ? "bg-red-950/20 md:bg-transparent border border-red-900/40 md:border-transparent shadow-lg shadow-red-950/20 md:shadow-none"
                          : ""
                      }`}
                    >
                      {/* Node Icon Container */}
                      <div className="relative flex-shrink-0">
                        {/* Current Pulsing Halo */}
                        {isCurrent && (
                          <div className="absolute -inset-1.5 bg-red-600/30 rounded-full blur-sm animate-pulse" />
                        )}

                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative z-10 ${
                            isCompleted
                              ? "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-900/40 border border-red-500/40"
                              : isCurrent
                              ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-600/50 ring-4 ring-red-500/25 border-2 border-white scale-110"
                              : "bg-[#181818] border border-[#2D2D2D] text-gray-500"
                          }`}
                        >
                          <StepIcon size={isCurrent ? 20 : 18} />

                          {/* Completed Mini Badge */}
                          {isCompleted && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[9px] shadow">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text Details */}
                      <div className="flex-1 md:flex-initial">
                        <div className="flex items-center md:justify-center gap-1.5 mb-0.5">
                          <span
                            className={`font-heading text-xs font-extrabold uppercase tracking-wider ${
                              isCurrent
                                ? "text-white"
                                : isCompleted
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        <p
                          className={`text-xs font-medium ${
                            isCurrent
                              ? "text-red-400 font-semibold"
                              : isCompleted
                              ? "text-gray-400"
                              : "text-gray-600"
                          }`}
                        >
                          {step.thLabel}
                        </p>

                        <p className="text-[0.7rem] text-[var(--text-muted)] mt-1 hidden md:block leading-tight line-clamp-2">
                          {step.desc}
                        </p>

                        {/* Mobile Status Tag */}
                        <div className="mt-1.5 md:hidden">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-bold bg-red-950/60 border border-red-800 text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> กำลังดำเนินการ
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-medium bg-emerald-950/40 text-emerald-400">
                              <Check size={10} /> เสร็จสิ้น
                            </span>
                          ) : (
                            <span className="text-[0.65rem] text-gray-600 font-mono">
                              ขั้นตอนที่ {step.stepNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Impact Dedicated Shipment Tracking Card */}
      {order.trackingNumber && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#181818] via-[#121212] to-[#0D0D0D] border border-red-500/40 hover:border-red-500/60 p-5 sm:p-7 shadow-2xl shadow-red-950/20 transition-all">
          {/* Subtle Ambient Red Glow Effects */}
          <div className="absolute -top-12 right-1/4 w-96 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Status Badge & Carrier */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-500/40 text-red-300 font-heading text-xs font-extrabold uppercase tracking-wider shadow-inner">
                <Truck size={15} className="text-red-400 animate-pulse" />
                {order.status === "delivered" ? t.orders.deliveredStatus : t.orders.shippedStatus}
              </span>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs">
                <span className="text-[var(--text-muted)] text-[0.7rem] uppercase font-mono">{t.orders.carrier}:</span>
                <span className="text-white font-heading font-bold uppercase tracking-wider">
                  {order.shippingCarrier || "South Aero Standard Logistics"}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[0.7rem]">
                SECURE LOGISTICS DISPATCH
              </span>
            </div>
          </div>

          {/* Center Main: Prominent Monospace Tracking Display */}
          <div className="relative z-10 py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] sm:text-xs font-heading font-extrabold uppercase tracking-[0.2em] text-red-400 flex items-center gap-1.5">
                <Package size={14} className="text-red-500" />
                {t.orders.trackingNumber} (TRACKING NUMBER)
              </span>
              <span className="text-[0.65rem] font-mono text-neutral-500 hidden sm:inline-block">
                {lang === "th" ? "คลิกปุ่มเพื่อคัดลอกหมายเลขพัสดุ" : "Click button to copy tracking code"}
              </span>
            </div>

            {/* High-Tech Tracking Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-[#080808] border-2 border-red-500/50 hover:border-red-500/70 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.18)] transition-all">
              <div className="flex items-center gap-3 overflow-x-auto py-1 sm:py-0">
                <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-[0.18em] select-all drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]">
                  {order.trackingNumber}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyTracking(order.trackingNumber!)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider shadow-lg shadow-red-950/60 transition-all cursor-pointer flex-shrink-0"
              >
                {isCopied ? (
                  <>
                    <Check size={16} className="text-white" />
                    <span>{t.orders.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>{t.orders.copyTracking}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Guidance Alert Bar */}
          <div className="relative z-10 pt-1">
            <div className="bg-red-950/20 border-l-4 border-red-500 rounded-r-xl p-3 sm:p-3.5 flex items-start gap-3">
              <ShieldCheck size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300 leading-relaxed">
                <strong className="text-white font-medium">
                  {lang === "th" ? "คำแนะนำในการตรวจรับชิ้นงาน: " : "Inspection Guidelines: "}
                </strong>
                {lang === "th"
                  ? "ชิ้นส่วนแอโรพาร์ตได้รับการตรวจสอบคุณภาพและบรรจุในกล่องเสริมโฟมกันกระแทกพิเศษ กรุณาบันทึกวิดีโอขณะเปิดแกะกล่องพัสดุไว้เป็นหลักฐานเพื่อความรวดเร็วในการดูแลรับประกัน"
                  : "All aerodynamic components are quality-checked and packaged in reinforced protective crates. Please record an unboxing video upon receipt for seamless warranty validation."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Column: Order Items Table */}
        <div className="md:col-span-7 lg:col-span-8 bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
            <h3 className="font-heading text-base font-bold uppercase tracking-wider text-white">
              {lang === "th" ? `รายการสินค้าในคำสั่งซื้อ (${items.length})` : `ITEMS IN YOUR ORDER (${items.length})`}
            </h3>
            {isDelivered && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <CheckCircle2 size={13} />
                <span>{t.orders.deliveredStatus}</span>
              </span>
            )}
          </div>

          {/* Delivered Order Callout Banner */}
          {isDelivered && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/40 via-[#161616] to-[#121212] border border-red-500/40 rounded-xl shadow-lg flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 flex-shrink-0">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-heading font-black tracking-wider uppercase text-white flex items-center gap-2">
                    <span>{t.orders.deliveredStatus}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h4>
                  <p className="text-[0.75rem] text-neutral-300 mt-0.5">
                    {lang === "th"
                      ? "แบ่งปันภาพการติดตั้งและคะแนนความพึงพอใจในชิ้นงานคาร์บอนไฟเบอร์ของคุณ"
                      : "Share your installation build photos and satisfaction rating for your carbon fiber parts"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-[#1C1C1C]">
            {items.map((it) => {
              const localizedItemName = getLocalizedOrderItemName(
                it.productNameSnapshot,
                it.productNameEn,
                lang
              );

              return (
                <div key={it.id} className="py-4 first:pt-0 flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg overflow-hidden relative flex-shrink-0">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={localizedItemName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[0.6rem] text-[var(--text-muted)] p-1 text-center font-heading">
                        AERO
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[0.65rem] font-heading font-bold uppercase tracking-widest text-[var(--accent-red)]">
                      SOUTH AERO
                    </p>
                    <h4 className="font-heading text-sm sm:text-base font-bold uppercase text-white truncate">
                      {localizedItemName}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {lang === "th" ? "จำนวน: " : "Qty: "}{it.quantity} × {currency === "THB" ? `฿${parseFloat(it.unitPrice).toLocaleString()} THB` : formatPrice(it.unitPrice, { showCode: true })}
                    </p>

                    {/* Included Bundle Parts if item is a Kit */}
                    {it.bundleParts && it.bundleParts.length > 0 && (
                      <div className="mt-2 p-2.5 bg-[#171717] border-l-2 border-[var(--accent-red)] rounded-r-lg">
                        <p className="text-[0.65rem] font-heading font-bold uppercase tracking-wider text-neutral-400 mb-1">
                          {lang === "th" ? "ชิ้นส่วนในชุดแต่ง (INCLUDED KIT PARTS):" : "INCLUDED KIT PARTS:"}
                        </p>
                        <ul className="space-y-0.5 text-[0.7rem] text-neutral-300">
                          {it.bundleParts.map((part) => {
                            const localizedPartName = getLocalizedOrderItemName(
                              part.childProductNameSnapshot,
                              part.childProductNameEn,
                              lang
                            );
                            return (
                              <li key={part.id} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-[var(--accent-red)]" />
                                <span>{localizedPartName}</span>
                                <span className="text-[var(--text-muted)] font-mono text-[0.65rem]">
                                  × {part.quantity}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                  {/* Customer Review Button / Status Badge */}
                  {isPaid && it.productId && (
                    <div className="mt-3 flex items-center gap-2">
                      {userReviews[it.productId] ? (
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: userReviews[it.productId].rating }).map((_, i) => (
                                <Star key={i} size={11} className="text-red-500 fill-red-500" />
                              ))}
                            </div>
                            <span className="font-bold text-white">{userReviews[it.productId].rating}/5</span>
                            <span className="text-[0.65rem] text-neutral-400">{t.orders.reviewed}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(it)}
                            className="text-xs font-mono text-neutral-400 hover:text-white underline decoration-dotted transition-colors cursor-pointer"
                          >
                            {lang === "th" ? "แก้ไขรีวิว" : "Edit review"}
                          </button>
                        </div>
                      ) : isDelivered ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReview(it)}
                          className="group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-400 text-white text-xs font-heading font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.45)] hover:shadow-[0_0_28px_rgba(239,68,68,0.7)] border border-red-400/60 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer overflow-hidden"
                        >
                          <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
                          <Sparkles size={14} className="text-white fill-white animate-pulse" />
                          <span className="relative z-10">{t.orders.reviewProduct}</span>
                          <span className="relative z-10 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReview(it)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Star size={13} className="text-red-400" />
                          <span>{t.orders.reviewProduct}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-heading text-sm sm:text-base font-bold text-white">
                    {currency === "THB" ? `฿${parseFloat(it.lineTotal).toLocaleString()}` : formatPrice(it.lineTotal)}
                  </span>
                  <span className="text-[0.65rem] text-[var(--text-muted)] block font-mono">{currency}</span>
                </div>
              </div>
            );
          })}
          </div>

          {/* Pricing Calculations */}
          <div className="pt-4 border-t border-[#222222] space-y-2.5 text-xs">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>{t.orders.subtotal}</span>
              <span className="font-heading font-semibold text-white">
                {currency === "THB"
                  ? `฿${parseFloat(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB`
                  : formatPrice(order.subtotal, { showCode: true })}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>{t.orders.shippingFee}</span>
              <span className="font-heading font-semibold text-white">
                {parseFloat(order.shippingFee) === 0 ? (
                  <span className="text-[var(--success)] uppercase">{t.orders.freeShipping}</span>
                ) : currency === "THB" ? (
                  `฿${parseFloat(order.shippingFee).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB`
                ) : (
                  formatPrice(order.shippingFee, { showCode: true })
                )}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>{lang === "th" ? "ภาษีมูลค่าเพิ่ม (VAT 7%)" : "TAX (VAT 7%)"}</span>
              <span className="font-heading font-semibold text-[var(--text-muted)]">{lang === "th" ? "รวมในยอดสุทธิแล้ว" : "INCLUDED IN TOTAL"}</span>
            </div>
            <div className="pt-3 border-t border-[#222222] flex justify-between items-baseline">
              <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                {t.orders.total}
              </span>
              <div className="text-right">
                <span className="font-heading text-xl font-extrabold text-[var(--accent-red)]">
                  {currency === "THB"
                    ? `฿${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB`
                    : formatPrice(order.total, { showCode: true })}
                </span>
                {currency !== "THB" && (
                  <span className="text-[0.65rem] text-[var(--text-muted)] block font-mono">
                    (฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Info */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          {/* Shipping Address Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222]">
              <MapPin size={16} className="text-[var(--accent-red)]" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                {t.orders.shippingAddress}
              </h3>
            </div>
            <div className="text-xs space-y-1 text-gray-300">
              <p className="font-bold text-white text-sm">{order.shippingAddress.recipientName}</p>
              <p className="text-[var(--text-muted)] font-mono">{order.shippingAddress.phone}</p>
              <p className="pt-2 text-[var(--text-secondary)] leading-relaxed">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? ` ${order.shippingAddress.line2}` : ""},{" "}
                {order.shippingAddress.subDistrict}, {order.shippingAddress.district},{" "}
                {order.shippingAddress.province} {order.shippingAddress.postalCode}
              </p>
              {order.shippingAddress.email && (
                <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-1.5 text-neutral-300">
                  <Mail size={13} className="text-[var(--accent-red)] flex-shrink-0" />
                  <span className="font-mono text-[0.75rem] text-white">{order.shippingAddress.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Logistics & Payment Method Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222]">
              <Truck size={16} className="text-[var(--accent-red)]" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                {lang === "th" ? "การขนส่งและการชำระเงิน" : "LOGISTICS & PAYMENT"}
              </h3>
            </div>
            <div className="text-xs space-y-3">
              <div>
                <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">{t.orders.carrier}:</span>
                <span className="text-white font-medium">{order.shippingCarrier || "South Aero Standard Logistics"}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">{t.orders.paymentMethod}:</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                  {order.stripePaymentIntentId ? (
                    <>
                      <CreditCard size={14} className="text-[var(--accent-red)]" />
                      Stripe Payment Gateway (Card / PromptPay)
                    </>
                  ) : order.paymentMethod === "credit_card" ? (
                    <>
                      <CreditCard size={14} className="text-[var(--accent-red)]" />
                      Credit Card
                    </>
                  ) : (
                    <>
                      <QrCode size={14} className="text-[var(--accent-red)]" />
                      PromptPay QR Code
                    </>
                  )}
                </span>
              </div>
              {order.stripePaymentIntentId && (
                <div>
                  <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">STRIPE REF (TRANSACTION ID):</span>
                  <span className="text-gray-300 font-mono text-[0.7rem]">{order.stripePaymentIntentId}</span>
                </div>
              )}
              {order.omiseChargeId && (
                <div>
                  <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">TRANSACTION REF:</span>
                  <span className="text-gray-300 font-mono text-[0.7rem]">{order.omiseChargeId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            {isPaid && (
              <Link
                href={`/orders/${order.id}/invoice${guestToken ? `?token=${guestToken}` : ""}`}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-950/40 via-[#161616] to-[#121212] hover:bg-[#1E1E1E] text-white border border-red-500/40 hover:border-red-400 text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-950/20"
              >
                <FileText size={15} className="text-red-500" />
                <span>{t.invoice.viewInvoice}</span>
                <ExternalLink size={12} className="text-neutral-400 ml-auto" />
              </Link>
            )}

            <Link
              href="/orders"
              className="btn-outline w-full justify-center gap-2 py-3 text-xs tracking-wider uppercase font-heading"
            >
              {t.orders.backToOrders}
            </Link>
            <Link
              href="/products"
              className="btn-primary w-full justify-center gap-2 py-3 text-xs tracking-wider uppercase font-heading"
            >
              {t.cartPage.browseParts} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
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
