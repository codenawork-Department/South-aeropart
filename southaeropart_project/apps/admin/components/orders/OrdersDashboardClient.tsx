"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  QrCode,
  CreditCard,
  Search,
  ChevronRight,
  ExternalLink,
  Filter,
  DollarSign,
  Package,
  RotateCcw,
} from "lucide-react";

interface OrderRow {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  shippingFee: string;
  total: string;
  currency: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  shippingAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

interface StatsData {
  totalOrders: number;
  pendingOrders: number;
  paidOrProcessing: number;
  shippedOrDelivered: number;
  cancelledOrders: number;
  totalRevenue: number;
}

interface OrdersDashboardClientProps {
  initialOrders: OrderRow[];
  stats: StatsData;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentSearch: string;
  currentStatus: string;
}

const STATUS_TABS = [
  { key: "all", label: "ทั้งหมด (All)" },
  { key: "pending", label: "รอชำระเงิน (Pending)" },
  { key: "paid", label: "ชำระแล้ว (Paid)" },
  { key: "processing", label: "เตรียมของ (Processing)" },
  { key: "shipped", label: "จัดส่งแล้ว (Shipped)" },
  { key: "delivered", label: "สำเร็จ (Delivered)" },
  { key: "cancelled", label: "ยกเลิก (Cancelled)" },
];

export function OrdersDashboardClient({
  initialOrders,
  stats,
  pagination,
  currentSearch,
  currentStatus,
}: OrdersDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);

  function handleFilterChange(newStatus: string) {
    setStatus(newStatus);
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus && newStatus !== "all") {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="text-red-500" size={24} />
            จัดการคำสั่งซื้อ (Orders Management)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            ตรวจสอบคำสั่งซื้อ สถานะการชำระเงิน และการจัดการจัดส่งชิ้นส่วนแอโรไดนามิก
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              คำสั่งซื้อทั้งหมด
            </span>
            <div className="p-2 rounded-lg bg-[#1C1C1C] text-gray-300">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {stats.totalOrders.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1.5">รายการ</span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">
              รอชำระเงิน
            </span>
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {stats.pendingOrders.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1.5">รายการ</span>
          </div>
        </div>

        {/* Paid / Processing */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider">
              ชำระแล้ว / เตรียมของ
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {stats.paidOrProcessing.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1.5">รายการ</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
              ยอดขายชำระแล้ว (Net)
            </span>
            <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              ฿{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-gray-400 ml-1.5 font-mono">THB</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 shadow-xl space-y-4">
        {/* Top: Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยเลขที่คำสั่งซื้อ (SA-...), ชื่อลูกค้า, เบอร์โทร หรือเลขพัสดุ..."
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Filter size={14} />
            <span>ค้นหา (Search)</span>
          </button>
        </form>

        {/* Bottom: Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#1C1C1C] no-scrollbar text-xs">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                  isActive
                    ? "bg-red-600 text-white font-semibold shadow-md shadow-red-950/40"
                    : "bg-[#181818] text-gray-400 hover:text-white hover:bg-[#202020]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl overflow-hidden shadow-xl">
        {initialOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-gray-400 mx-auto flex items-center justify-center mb-3">
              <ShoppingCart size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">ไม่พบคำสั่งซื้อตามเงื่อนไขที่เลือก</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหาหรือเลือกฟิลเตอร์สถานะอื่นๆ
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#222222]">
                  <tr>
                    <th className="px-5 py-3.5">Order Number</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5">Order Status</th>
                    <th className="px-5 py-3.5">Fulfillment</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {initialOrders.map((ord) => {
                    const isPaid = ord.paymentStatus === "paid" || ord.status === "paid";
                    const isCancelled = ord.status === "cancelled";

                    return (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Order Number */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/orders/${ord.id}`}
                            className="font-mono font-bold text-white hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <span>{ord.orderNumber}</span>
                            <ChevronRight size={12} className="text-gray-500" />
                          </Link>
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{ord.shippingAddress.recipientName}</div>
                          <div className="text-[0.7rem] text-gray-400 font-mono">{ord.shippingAddress.phone}</div>
                        </td>

                        {/* Items */}
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300 font-mono text-[0.7rem]">
                            {ord.itemCount} ชิ้น
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 text-right font-mono font-bold text-white">
                          ฿{parseFloat(ord.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              {ord.paymentMethod === "promptpay" ? (
                                <QrCode size={13} className="text-red-500" />
                              ) : (
                                <CreditCard size={13} className="text-blue-400" />
                              )}
                              <span className="capitalize">{ord.paymentMethod}</span>
                            </div>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-emerald-400">
                                <CheckCircle2 size={10} /> Paid
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-red-400">
                                <XCircle size={10} /> Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-amber-400">
                                <Clock size={10} /> Pending
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Order Status Badge */}
                        <td className="px-5 py-4">
                          {ord.status === "delivered" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 uppercase">
                              <CheckCircle2 size={10} /> Delivered
                            </span>
                          ) : ord.status === "shipped" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-blue-950/60 border border-blue-800 text-blue-400 uppercase">
                              <Truck size={10} /> Shipped
                            </span>
                          ) : ord.status === "processing" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-indigo-950/60 border border-indigo-800 text-indigo-400 uppercase">
                              <Package size={10} /> Processing
                            </span>
                          ) : ord.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400 uppercase">
                              <CheckCircle2 size={10} /> Paid
                            </span>
                          ) : ord.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-red-950/60 border border-red-800 text-red-400 uppercase">
                              <XCircle size={10} /> Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-amber-950/60 border border-amber-800 text-amber-400 uppercase">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </td>

                        {/* Fulfillment */}
                        <td className="px-5 py-4">
                          {ord.trackingNumber ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-gray-200 text-[0.7rem] block">
                                {ord.trackingNumber}
                              </span>
                              <span className="text-gray-500 text-[0.65rem]">
                                {ord.shippingCarrier || "Standard"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-600 text-[0.7rem] italic">ยังไม่มีเลขพัสดุ</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-gray-400 font-mono text-[0.7rem]">
                          {new Date(ord.createdAt).toLocaleDateString("th-TH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/orders/${ord.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#333333] hover:border-red-600 bg-[#161616] hover:bg-red-600/10 text-gray-300 hover:text-white transition-all text-xs font-medium"
                          >
                            <span>จัดการ</span>
                            <ExternalLink size={11} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-[#222222] bg-[#161616] flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  แสดงหน้า <strong className="text-white">{pagination.page}</strong> จากทั้งหมด{" "}
                  <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} รายการ)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 bg-[#202020] hover:bg-[#282828] disabled:opacity-30 rounded text-white transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 bg-[#202020] hover:bg-[#282828] disabled:opacity-30 rounded text-white transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
