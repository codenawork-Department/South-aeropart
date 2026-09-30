"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Package,
  MapPin,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Settings,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { RealtimeSyncWidget } from "@/components/ui/realtime-sync-widget";
import { ShippingSettingsForm } from "@/components/shipping/ShippingForms";

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
  email?: string;
  line1: string;
  line2?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface ShippingQuoteRow {
  id: string;
  status: string;
  subtotal: string;
  fee: string | null;
  carrier: string | null;
  address: QuoteAddress;
  items: QuoteItem[];
  customerNote: string | null;
  offerExpiresAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ShippingDashboardClientProps {
  initialQuotes: ShippingQuoteRow[];
  stats: {
    requested: number;
    offered: number;
    converted: number;
    declined: number;
    cancelled: number;
    total: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentSearch: string;
  currentStatus: string;
  currentSort: string;
  settings: {
    standardFee: string;
    expressFee: string;
    freeThreshold: string | null;
  } | null;
}

const STATUS_TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "requested", label: "รอประเมิน (Action Needed)" },
  { key: "offered", label: "เสนอราคาแล้ว (Offered)" },
  { key: "converted", label: "ชำระแล้ว (Converted)" },
  { key: "declined", label: "ปฏิเสธ (Declined)" },
  { key: "cancelled", label: "ยกเลิก (Cancelled)" },
];

export function ShippingDashboardClient({
  initialQuotes,
  stats,
  pagination,
  currentSearch,
  currentStatus,
  currentSort,
  settings,
}: ShippingDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeViewTab, setActiveViewTab] = useState<"quotes" | "settings">("quotes");
  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [sort, setSort] = useState(currentSort);

  const updateFilters = (newParams: Record<string, string | number>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === "" || v === "all") {
          params.delete(k);
        } else {
          params.set(k, String(v));
        }
      });
      if (!newParams.page) {
        params.delete("page");
      }
      router.push(`/shipping?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search, status, sort });
  };

  const getStatusBadge = (quoteStatus: string) => {
    switch (quoteStatus) {
      case "requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> รอประเมิน
          </span>
        );
      case "offered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Truck className="w-3.5 h-3.5" /> เสนอราคาแล้ว
          </span>
        );
      case "converted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> ยืนยัน / ชำระแล้ว
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> ปฏิเสธ
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <RotateCcw className="w-3.5 h-3.5" /> ยกเลิก
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300">
            {quoteStatus}
          </span>
        );
    }
  };

  const formatDate = (dateVal: Date | string) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">จัดการค่าจัดส่งสินค้า</h1>
              <p className="text-sm text-neutral-400">
                ระบบประเมินค่าจัดส่งชิ้นส่วนอากาศพลศาสตร์และสินค้าขนาดพิเศษ พร้อมตั้งค่าเรตมาตรฐาน
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeSyncWidget />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div
          onClick={() => {
            setActiveViewTab("quotes");
            setStatus("requested");
            updateFilters({ status: "requested" });
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            status === "requested"
              ? "bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">รอประเมินราคา</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.requested}</span>
            <span className="text-xs text-neutral-400">คำขอ</span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">ลูกค้ากำลังรอข้อเสนอค่าส่ง</p>
        </div>

        {/* Offered */}
        <div
          onClick={() => {
            setActiveViewTab("quotes");
            setStatus("offered");
            updateFilters({ status: "offered" });
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            status === "offered"
              ? "bg-sky-950/20 border-sky-500/50 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/30"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-sky-400">เสนอราคาแล้ว</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.offered}</span>
            <span className="text-xs text-neutral-400">รอชำระ</span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">รอการยืนยันและชำระจากลูกค้า</p>
        </div>

        {/* Converted */}
        <div
          onClick={() => {
            setActiveViewTab("quotes");
            setStatus("converted");
            updateFilters({ status: "converted" });
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            status === "converted"
              ? "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">ชำระสำเร็จ</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.converted}</span>
            <span className="text-xs text-neutral-400">ออเดอร์</span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">แปลงเป็นคำสั่งซื้อแล้ว</p>
        </div>

        {/* Total Quotes */}
        <div
          onClick={() => {
            setActiveViewTab("quotes");
            setStatus("all");
            updateFilters({ status: "all" });
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
            status === "all"
              ? "bg-neutral-800/80 border-neutral-600 ring-1 ring-neutral-500/30"
              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">รวมทั้งหมด</span>
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.total}</span>
            <span className="text-xs text-neutral-400">รายการ</span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">คำขอทั้งหมดในระบบ</p>
        </div>
      </div>

      {/* Main Mode Switcher: Quotes vs General Settings */}
      <div className="flex border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveViewTab("quotes")}
          className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            activeViewTab === "quotes"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Truck className="w-4 h-4" />
          คำขอราคาค่าจัดส่ง (Shipping Quotes)
          {stats.requested > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-neutral-950">
              {stats.requested}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab("settings")}
          className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            activeViewTab === "settings"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Settings className="w-4 h-4" />
          ค่าจัดส่งมาตรฐานร้านค้า (General Rates)
        </button>
      </div>

      {/* Tab 1: Shipping Quotes Table & Workbench */}
      {activeViewTab === "quotes" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatus(tab.key);
                    updateFilters({ status: tab.key });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    status === tab.key
                      ? "bg-amber-500 text-neutral-950 font-semibold shadow-sm shadow-amber-500/20"
                      : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700/80 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.key === "requested" && stats.requested > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-950 text-amber-400">
                      {stats.requested}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="ค้นหา ID, ผู้รับ, เบอร์, ขนส่ง..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateFilters({ sort: e.target.value });
                }}
                className="px-3 py-1.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="newest">ใหม่ที่สุด</option>
                <option value="oldest">เก่าที่สุด</option>
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 text-xs rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition-colors font-medium border border-neutral-700"
              >
                ค้นหา
              </button>
            </form>
          </div>

          {/* Quotes Table */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950/80 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-medium">คำขอ / วันที่</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">ผู้รับ & ที่อยู่จัดส่ง</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">สินค้าในคำขอ</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">ยอดสินค้า</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">สถานะ</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">ข้อเสนอค่าส่ง</th>
                    <th scope="col" className="px-5 py-3.5 font-medium text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-normal">
                  {initialQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                        <Truck className="w-12 h-12 mx-auto mb-3 stroke-1 text-neutral-600" />
                        <p className="text-base font-medium text-neutral-400">ไม่พบคำขอราคาจัดส่ง</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {status !== "all" || search
                            ? "ลองเปลี่ยนเงื่อนไขการค้นหาหรือสถานะตัวกรอง"
                            : "ยังไม่มีลูกค้าส่งคำขอประเมินค่าจัดส่งในขณะนี้"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    initialQuotes.map((quote) => {
                      const itemCount = quote.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
                      const isPendingQuote = quote.status === "requested";

                      return (
                        <tr
                          key={quote.id}
                          className={`group transition-colors ${
                            isPendingQuote ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.05]" : "hover:bg-neutral-800/40"
                          }`}
                        >
                          {/* Quote ID & Date */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <Link
                                href={`/shipping/${quote.id}`}
                                className="font-mono text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
                              >
                                #{quote.id.slice(0, 8)}
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              <span className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-neutral-500" />
                                {formatDate(quote.createdAt)}
                              </span>
                            </div>
                          </td>

                          {/* Customer & Address */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col max-w-xs">
                              <span className="font-medium text-white flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                {quote.address.recipientName || "ลูกค้า"}
                              </span>
                              <span className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                                {quote.address.phone}
                              </span>
                              <span className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                                {[quote.address.province, quote.address.postalCode, quote.address.country || "TH"]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </div>
                          </td>

                          {/* Items Preview */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-neutral-200">
                                  {itemCount} ชิ้น ({quote.items.length} รายการ)
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 mt-1 truncate">
                                {quote.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                              </p>
                              {quote.customerNote && (
                                <span className="text-[11px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded mt-1 truncate border border-amber-500/20">
                                  โน้ต: {quote.customerNote}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-semibold text-white">฿{quote.subtotal}</span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {getStatusBadge(quote.status)}
                          </td>

                          {/* Shipping Fee / Offer */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {quote.fee !== null ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-emerald-400">฿{quote.fee}</span>
                                {quote.carrier && (
                                  <span className="text-xs text-neutral-400">{quote.carrier}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-400/90 font-medium bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                รอแอดมินประเมิน
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <Link
                              href={`/shipping/${quote.id}`}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isPendingQuote
                                  ? "bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20"
                                  : "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700"
                              }`}
                            >
                              {isPendingQuote ? (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  ประเมินราคา
                                </>
                              ) : (
                                "ดูรายละเอียด"
                              )}
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800 bg-neutral-950/60 text-xs text-neutral-400">
                <div>
                  หน้า <span className="font-medium text-white">{pagination.page}</span> จาก{" "}
                  <span className="font-medium text-white">{pagination.totalPages}</span> (ทั้งหมด {pagination.total} รายการ)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => updateFilters({ page: pagination.page - 1 })}
                    className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => updateFilters({ page: pagination.page + 1 })}
                    className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Shipping Settings Form */}
      {activeViewTab === "settings" && settings && (
        <div className="max-w-4xl">
          <ShippingSettingsForm initial={settings} />
        </div>
      )}
    </div>
  );
}
