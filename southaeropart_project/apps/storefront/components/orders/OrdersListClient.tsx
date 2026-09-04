"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { Order } from "@repo/db";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface OrderWithCount extends Order {
  itemCount: number;
}

export function OrdersListClient({ initialOrders }: { initialOrders: OrderWithCount[] }) {
  const [orders] = useState<OrderWithCount[]>(initialOrders);
  const { formatPrice, currency } = useCurrency();

  if (orders.length === 0) {
    return (
      <div className="container-main py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-[#121212] border border-[#222222] rounded-2xl p-8 sm:p-12 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-[var(--text-muted)] mx-auto flex items-center justify-center mb-5">
            <Package size={30} className="text-[var(--accent-red)]" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
            NO ORDERS FOUND
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
            คุณยังไม่มีประวัติการสั่งซื้อสินค้า เริ่มต้นเลือกชมชุดแต่งแอโรไดนามิกคาร์บอนไฟเบอร์สำหรับรถของคุณได้ทันที
          </p>
          <Link href="/products" className="btn-primary mt-6 text-xs gap-2 py-3 px-6 font-heading uppercase inline-flex">
            EXPLORE PRODUCTS <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-10 md:py-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">HOME</Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">MY ORDERS</span>
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
            MY ORDERS (ประวัติคำสั่งซื้อ)
          </h1>
        </div>
        <span className="text-xs font-heading uppercase tracking-wider text-[var(--text-muted)]">
          TOTAL ORDERS: <strong className="text-white font-mono">{orders.length}</strong>
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((ord) => {
          const isPaid = ord.paymentStatus === "paid" || ord.status === "paid";
          const isCancelled = ord.status === "cancelled";

          return (
            <div
              key={ord.id}
              className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-2xl p-5 sm:p-6 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Order Meta */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                    {ord.orderNumber}
                  </span>
                  {isPaid ? (
                    <span className="badge-green text-[0.65rem] font-heading font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={11} /> PAID
                    </span>
                  ) : isCancelled ? (
                    <span className="badge-red text-[0.65rem] font-heading font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                      <XCircle size={11} /> CANCELLED
                    </span>
                  ) : (
                    <span className="badge-amber text-[0.65rem] font-heading font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={11} /> PENDING
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {new Date(ord.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span>{ord.itemCount} รายการสินค้า</span>
                  <span>•</span>
                  <span>{ord.shippingAddress.recipientName}</span>
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 sm:gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#1C1C1C]">
                <div className="text-left md:text-right flex sm:block items-baseline justify-between">
                  <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase tracking-wider block sm:inline-block md:block">
                    TOTAL
                  </span>
                  <div>
                    <span className="font-heading text-lg sm:text-xl font-bold text-white">
                      {currency === "THB"
                        ? `฿${parseFloat(ord.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : formatPrice(ord.total)}
                    </span>
                    <span className="text-[0.65rem] text-[var(--text-muted)] font-mono ml-1">{currency}</span>
                    {currency !== "THB" && (
                      <span className="text-[0.6rem] text-[var(--text-muted)] block font-mono">
                        (฿{parseFloat(ord.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isPaid && !isCancelled && (
                    <Link
                      href={`/checkout/payment/${ord.id}`}
                      className="btn-primary text-xs py-2 px-3 gap-1.5 font-heading uppercase"
                    >
                      <QrCode size={14} /> ชำระเงินต่อ
                    </Link>
                  )}
                  <Link
                    href={`/orders/${ord.id}`}
                    className="btn-outline text-xs py-2 px-3 gap-1 font-heading uppercase hover:text-white"
                  >
                    DETAILS <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
