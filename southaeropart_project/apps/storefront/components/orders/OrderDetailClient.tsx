"use client";

import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import type { Order, OrderItem, OrderStatusHistory } from "@repo/db";

interface OrderDetailClientProps {
  order: Order;
  items: (OrderItem & { imageUrl?: string | null; slug?: string | null })[];
  history: OrderStatusHistory[];
}

export function OrderDetailClient({ order, items, history }: OrderDetailClientProps) {
  const searchParams = useSearchParams();
  const isJustPaid = searchParams.get("paid") === "true";

  const isPaid = order.paymentStatus === "paid" || order.status === "paid";
  const isCancelled = order.status === "cancelled";

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
      thLabel: "รับคำสั่งซื้อแล้ว",
      desc: "ยืนยันการทำรายการเข้าระบบ",
      icon: FileText,
    },
    {
      key: "paid",
      stepNumber: 2,
      label: "PAYMENT CONFIRMED",
      thLabel: "ชำระเงินสำเร็จ",
      desc: "ตรวจรับยอดเงินเรียบร้อย",
      icon: CreditCard,
    },
    {
      key: "processing",
      stepNumber: 3,
      label: "AERO CRAFTING",
      thLabel: "เตรียมและตรวจสอบชิ้นงาน",
      desc: "ความประณีตคาร์บอน & บรรจุภัณฑ์",
      icon: Wrench,
    },
    {
      key: "shipped",
      stepNumber: 4,
      label: "SHIPPED",
      thLabel: "จัดส่งสินค้าแล้ว",
      desc: order.trackingNumber
        ? `เลขพัสดุ: ${order.trackingNumber}`
        : "ส่งมอบให้บริษัทขนส่งพัสดุ",
      icon: Truck,
    },
    {
      key: "delivered",
      stepNumber: 5,
      label: "DELIVERED",
      thLabel: "จัดส่งสำเร็จ",
      desc: "ส่งมอบถึงผู้รับเรียบร้อยแล้ว",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="container-main py-10 md:py-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">HOME</Link>
        <span>/</span>
        <Link href="/orders" className="hover:text-white transition-colors">MY ORDERS</Link>
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
              THANK YOU FOR YOUR ORDER!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-300 mt-1 leading-relaxed">
              เราได้รับยอดชำระเงินเรียบร้อยแล้ว ทีมงานวิศวกรรมแอโรไดนามิกจะเริ่มจัดเตรียมและบรรจุชิ้นส่วนคาร์บอนไฟเบอร์ของคุณโดยเร็วที่สุด
            </p>
          </div>
        </div>
      )}

      {/* Order Header Summary Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              ORDER SUMMARY
            </span>
            {isPaid ? (
              <span className="badge-green text-xs font-heading font-bold px-2.5 py-0.5 uppercase tracking-wider">
                PAID (ชำระเงินแล้ว)
              </span>
            ) : isCancelled ? (
              <span className="badge-red text-xs font-heading font-bold px-2.5 py-0.5 uppercase tracking-wider">
                CANCELLED (ยกเลิกแล้ว)
              </span>
            ) : (
              <span className="badge-amber text-xs font-heading font-bold px-2.5 py-0.5 uppercase tracking-wider">
                PENDING PAYMENT (รอชำระเงิน)
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase text-white mt-1">
            {order.orderNumber}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            Placed on {new Date(order.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Action button if pending payment */}
        {!isPaid && !isCancelled && (
          <Link
            href={`/checkout/payment/${order.id}`}
            className="btn-primary text-xs tracking-wider gap-2 py-3 px-6 font-heading uppercase"
          >
            <QrCode size={16} /> CONTINUE TO PAYMENT (ชำระเงินต่อ)
          </Link>
        )}
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
                  (ขั้นตอนการดำเนินงาน)
                </span>
              </div>
              <p className="text-[0.7rem] sm:text-xs text-[var(--text-muted)] mt-1">
                ติดตามขั้นตอนการจัดเตรียมและจัดส่งชิ้นส่วนคาร์บอนไฟเบอร์ของคุณแบบ Real-time
              </p>
            </div>

            {/* Current Active Step Chip */}
            <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#1C1C1C] border border-[#333333] shadow-inner">
              <span className="text-[0.65rem] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                STEP {currentStep + 1} OF 5
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="text-[0.7rem] font-heading font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                {steps[currentStep]?.label || "IN PROGRESS"}
              </span>
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

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Column: Order Items Table */}
        <div className="md:col-span-7 lg:col-span-8 bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl space-y-6">
          <h3 className="font-heading text-base font-bold uppercase tracking-wider text-white pb-3 border-b border-[#222222]">
            ITEMS IN YOUR ORDER ({items.length})
          </h3>

          <div className="divide-y divide-[#1C1C1C]">
            {items.map((it) => (
              <div key={it.id} className="py-4 first:pt-0 flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg overflow-hidden relative flex-shrink-0">
                  {it.imageUrl ? (
                    <Image
                      src={it.imageUrl}
                      alt={it.productNameSnapshot}
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
                    {it.productNameSnapshot}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                    Qty: {it.quantity} × ฿{parseFloat(it.unitPrice).toLocaleString()} THB
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-heading text-sm sm:text-base font-bold text-white">
                    ฿{parseFloat(it.lineTotal).toLocaleString()}
                  </span>
                  <span className="text-[0.65rem] text-[var(--text-muted)] block font-mono">THB</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Calculations */}
          <div className="pt-4 border-t border-[#222222] space-y-2.5 text-xs">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>SUBTOTAL</span>
              <span className="font-heading font-semibold text-white">
                ฿{parseFloat(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>SHIPPING FEE</span>
              <span className="font-heading font-semibold text-white">
                {parseFloat(order.shippingFee) === 0 ? (
                  <span className="text-[var(--success)] uppercase">FREE</span>
                ) : (
                  `฿${parseFloat(order.shippingFee).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB`
                )}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>TAX (VAT 7%)</span>
              <span className="font-heading font-semibold text-[var(--text-muted)]">INCLUDED IN TOTAL</span>
            </div>
            <div className="pt-3 border-t border-[#222222] flex justify-between items-baseline">
              <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                TOTAL PAID / DUE
              </span>
              <span className="font-heading text-xl font-extrabold text-[var(--accent-red)]">
                ฿{parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
              </span>
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
                SHIPPING ADDRESS (ที่อยู่จัดส่ง)
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
            </div>
          </div>

          {/* Logistics & Payment Method Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222]">
              <Truck size={16} className="text-[var(--accent-red)]" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                LOGISTICS &amp; PAYMENT
              </h3>
            </div>
            <div className="text-xs space-y-3">
              <div>
                <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">SHIPPING CARRIER:</span>
                <span className="text-white font-medium">{order.shippingCarrier || "South Aero Standard Logistics"}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[0.7rem] uppercase">PAYMENT METHOD:</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                  <QrCode size={14} className="text-[var(--accent-red)]" />
                  {order.paymentMethod === "promptpay" ? "PromptPay QR Code (Mockup)" : "Credit Card"}
                </span>
              </div>
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
            <Link
              href="/orders"
              className="btn-outline w-full justify-center gap-2 py-3 text-xs tracking-wider uppercase font-heading"
            >
              VIEW ALL MY ORDERS (ดูคำสั่งซื้อทั้งหมด)
            </Link>
            <Link
              href="/products"
              className="btn-primary w-full justify-center gap-2 py-3 text-xs tracking-wider uppercase font-heading"
            >
              CONTINUE SHOPPING <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
