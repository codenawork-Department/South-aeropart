"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Wind,
  Star,
  Sparkles,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";
import {
  deleteBundleAction,
  toggleBundleFeaturedAction,
  updateBundleStatusAction,
} from "@/actions/bundle.actions";

export interface BundleRow {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: string;
  stockQuantity: number;
  status: "draft" | "active" | "archived" | "out_of_stock";
  isFeatured: boolean;
  brandName?: string | null;
  carModelName?: string | null;
  carModelGen?: string | null;
  primaryImage?: string | null;
  childPartsCount: number;
  childParts: Array<{
    id: string;
    name: string;
    price: string;
    categoryName: string;
  }>;
  effectiveDownforce: number;
  effectiveDrag: number;
  isCustomCfd: boolean;
  createdAt: Date;
}

interface BundlesTableProps {
  bundles: BundleRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  carModels: Array<{ id: string; name: string; brandName?: string }>;
}

const MAX_FEATURED_BUNDLES = 4;

export function BundlesTable({
  bundles: initialBundles,
  pagination,
  carModels,
}: BundlesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteModalBundle, setDeleteModalBundle] = useState<BundleRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic featured bundles state
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialBundles.forEach((b) => {
      map[b.id] = b.isFeatured;
    });
    return map;
  });

  // Optimistic status state
  const [statusMap, setStatusMap] = useState<Record<string, BundleRow["status"]>>(() => {
    const map: Record<string, BundleRow["status"]> = {};
    initialBundles.forEach((b) => {
      map[b.id] = b.status;
    });
    return map;
  });
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [isTogglingFeaturedId, setIsTogglingFeaturedId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 3500);
  };

  // Sync state if props change
  useMemo(() => {
    const fMap: Record<string, boolean> = {};
    const sMap: Record<string, BundleRow["status"]> = {};
    initialBundles.forEach((b) => {
      fMap[b.id] = b.isFeatured;
      sMap[b.id] = b.status;
    });
    setFeaturedMap(fMap);
    setStatusMap(sMap);
  }, [initialBundles]);

  // Compute current featured list and count
  const featuredBundlesList = useMemo(() => {
    return initialBundles.filter((b) => featuredMap[b.id]);
  }, [initialBundles, featuredMap]);

  const featuredCount = featuredBundlesList.length;

  // Filter bundles
  const filteredBundles = useMemo(() => {
    return initialBundles.filter((b) => {
      const isBundleFeatured = featuredMap[b.id];
      const currentStatus = statusMap[b.id] ?? b.status;

      const matchesSearch =
        !searchTerm.trim() ||
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      const matchesModel =
        modelFilter === "all" || b.carModelName === modelFilter;

      const matchesFeatured = !onlyFeatured || isBundleFeatured;

      return matchesSearch && matchesStatus && matchesModel && matchesFeatured;
    });
  }, [initialBundles, featuredMap, statusMap, searchTerm, statusFilter, modelFilter, onlyFeatured]);

  // Handle Quick Status Change
  const handleStatusChange = async (
    bundle: BundleRow,
    newStatus: BundleRow["status"]
  ) => {
    const previousStatus = statusMap[bundle.id] ?? bundle.status;
    if (newStatus === previousStatus) return;

    // Optimistic update
    setStatusMap((prev) => ({ ...prev, [bundle.id]: newStatus }));
    setUpdatingStatusId(bundle.id);

    try {
      const res = await updateBundleStatusAction(bundle.id, newStatus);
      setUpdatingStatusId(null);

      if (res.success) {
        showToast(res.message || "เปลี่ยนสถานะชุดเซ็ตสำเร็จ", "success");
        router.refresh();
      } else {
        // Revert
        setStatusMap((prev) => ({ ...prev, [bundle.id]: previousStatus }));
        showToast(res.message || "ไม่สามารถเปลี่ยนสถานะชุดเซ็ตได้", "error");
      }
    } catch {
      setUpdatingStatusId(null);
      setStatusMap((prev) => ({ ...prev, [bundle.id]: previousStatus }));
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
    }
  };

  // Handle Toggle Featured
  const handleToggleFeatured = async (bundle: BundleRow) => {
    const currentlyFeatured = Boolean(featuredMap[bundle.id]);
    const nextFeatured = !currentlyFeatured;

    // Check limit if turning ON
    if (nextFeatured && featuredCount >= MAX_FEATURED_BUNDLES) {
      showToast(
        `สามารถเลือกชุดเซ็ตแนะนำได้สูงสุด ${MAX_FEATURED_BUNDLES} ชุดเท่านั้น กรุณายกเลิกชุดอื่นก่อน`,
        "warning"
      );
      return;
    }

    // Optimistic UI update
    setFeaturedMap((prev) => ({
      ...prev,
      [bundle.id]: nextFeatured,
    }));
    setIsTogglingFeaturedId(bundle.id);

    try {
      const res = await toggleBundleFeaturedAction(bundle.id, nextFeatured);
      setIsTogglingFeaturedId(null);

      if (res.success) {
        showToast(
          nextFeatured
            ? `ตั้ง '${bundle.name}' เป็นชุดเซ็ตแนะนำเรียบร้อยแล้ว`
            : `ยกเลิกเซ็ตแนะนำสำหรับ '${bundle.name}' แล้ว`,
          "success"
        );
        router.refresh();
      } else {
        // Revert optimistic update
        setFeaturedMap((prev) => ({
          ...prev,
          [bundle.id]: currentlyFeatured,
        }));
        showToast(res.message || "ไม่สามารถเปลี่ยนสถานะเซ็ตแนะนำได้", "error");
      }
    } catch (err: any) {
      setIsTogglingFeaturedId(null);
      // Revert optimistic update
      setFeaturedMap((prev) => ({
        ...prev,
        [bundle.id]: currentlyFeatured,
      }));
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
    }
  };

  const handleDelete = async (bundleId: string) => {
    setIsDeletingId(bundleId);
    startTransition(async () => {
      const res = await deleteBundleAction(bundleId);
      setIsDeletingId(null);
      setDeleteModalBundle(null);
      if (res.success) {
        showToast("ลบชุดเซ็ตสำเร็จ", "success");
        router.refresh();
      } else {
        showToast(res.message || "เกิดข้อผิดพลาดในการลบชุดเซ็ต", "error");
      }
    });
  };

  const renderStatusSelector = (bundle: BundleRow) => {
    const currentStatus = statusMap[bundle.id] ?? bundle.status;
    const isUpdating = updatingStatusId === bundle.id;

    const getStatusConfig = (st: BundleRow["status"]) => {
      switch (st) {
        case "active":
          return {
            dotColor: "bg-emerald-400",
            className: "bg-emerald-950/70 text-emerald-300 border-emerald-700/70 hover:border-emerald-500",
          };
        case "draft":
          return {
            dotColor: "bg-zinc-400",
            className: "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500",
          };
        case "out_of_stock":
          return {
            dotColor: "bg-amber-400",
            className: "bg-amber-950/70 text-amber-300 border-amber-700/70 hover:border-amber-500",
          };
        case "archived":
          return {
            dotColor: "bg-gray-400",
            className: "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600",
          };
      }
    };

    const config = getStatusConfig(currentStatus);

    if (isUpdating) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-900 border border-zinc-700 text-zinc-300">
          <Loader2 size={11} className="animate-spin text-amber-400" />
          <span>กำลังบันทึก...</span>
        </span>
      );
    }

    return (
      <div className="relative inline-flex items-center group">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(bundle, e.target.value as BundleRow["status"])}
          className={`appearance-none pl-6 pr-6 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500 ${config.className}`}
          title="คลิกเพื่อเปลี่ยนสถานะชุดเซ็ตทันที"
        >
          <option value="active" className="bg-[#181818] text-emerald-400 py-1">● วางขาย (Active)</option>
          <option value="draft" className="bg-[#181818] text-zinc-300 py-1">● ร่าง (Draft)</option>
          <option value="out_of_stock" className="bg-[#181818] text-amber-400 py-1">● สินค้าหมด (Out of Stock)</option>
          <option value="archived" className="bg-[#181818] text-gray-400 py-1">● เก็บเข้ากรุ (Archived)</option>
        </select>
        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${config.dotColor}`} />
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 border ${
            toastNotification.type === "success"
              ? "bg-[#141d16] border-emerald-500/50 text-emerald-300"
              : toastNotification.type === "warning"
              ? "bg-[#231a10] border-amber-500/50 text-amber-300"
              : "bg-[#221313] border-red-500/50 text-red-300"
          }`}
        >
          {toastNotification.type === "success" && (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          )}
          {toastNotification.type === "warning" && (
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          )}
          {toastNotification.type === "error" && (
            <AlertCircle size={18} className="text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium pr-2">{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Boxes size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">
                  ชุดเซ็ตสินค้า (Aero Kits & Bundles)
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  จัดการชุดแต่งรอบคันที่รวม Aero Parts หลายชิ้นสำหรับรถรุ่นเดียวกัน คำนวณราคาและสต็อกตามจริง
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/bundles/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-red-900/30 transition-all duration-200"
          >
            <Plus size={16} />
            <span>สร้างชุดเซ็ตใหม่</span>
          </Link>
        </div>
      </div>

      {/* 🌟 Featured Bundles Quota Management Showcase Card */}
      <div className="bg-gradient-to-r from-[#171410] via-[#141210] to-[#121212] border border-amber-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Star size={13} className="fill-amber-400" />
              </span>
              <h2 className="text-sm font-bold text-white tracking-wide">
                เซ็ทแนะนำบนหน้าร้าน (Storefront Featured Kits)
              </h2>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  featuredCount === MAX_FEATURED_BUNDLES
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                }`}
              >
                โควตา {featuredCount} / {MAX_FEATURED_BUNDLES} ชุด
              </span>
            </div>
            <p className="text-xs text-gray-400">
              ชุดเซ็ตที่เปิด ⭐ เซ็ทแนะนำ จะถูกนำไปแสดงเป็นไฮไลท์เด่นบนหน้าแรกของ Storefront (คลิกที่รูปดาว ⭐ ในตารางด้านล่างเพื่อเปิด/ปิด)
            </p>
          </div>

          {/* Quick filter toggle button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOnlyFeatured(!onlyFeatured)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                onlyFeatured
                  ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-[#1C1C1C] text-gray-300 border-[#2E2E2E] hover:text-white hover:border-amber-500/40"
              }`}
            >
              <Sparkles size={14} className={onlyFeatured ? "text-black" : "text-amber-400"} />
              <span>{onlyFeatured ? "แสดงชุดเซ็ตทั้งหมด" : `ดูเฉพาะเซ็ทแนะนำ (${featuredCount}/${MAX_FEATURED_BUNDLES})`}</span>
            </button>
          </div>
        </div>

        {/* 4 Visual Slots Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#26211c]">
          {[0, 1, 2, 3].map((slotIdx) => {
            const featuredBundle = featuredBundlesList[slotIdx];

            return (
              <div
                key={slotIdx}
                className={`rounded-lg border p-2.5 flex items-center gap-3 transition-all ${
                  featuredBundle
                    ? "bg-[#1c1813] border-amber-500/40 shadow-sm"
                    : "bg-[#141414]/60 border-dashed border-[#282828]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    featuredBundle
                      ? "bg-amber-500 text-black"
                      : "bg-[#1F1F1F] text-gray-600 border border-[#2E2E2E]"
                  }`}
                >
                  {slotIdx + 1}
                </div>

                {featuredBundle ? (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate" title={featuredBundle.name}>
                      {featuredBundle.name}
                    </p>
                    <p className="text-[10px] text-amber-400/80 font-mono truncate">
                      {featuredBundle.carModelName || featuredBundle.sku}
                    </p>
                  </div>
                ) : (
                  <div className="text-left">
                    <p className="text-xs text-gray-500 font-medium">ช่องว่าง (Empty Slot)</p>
                    <p className="text-[10px] text-gray-600">กด ⭐ เพื่อเลือก</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="ค้นหาชื่อชุดเซ็ต หรือ SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#262626] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Model Filter */}
        <div className="relative">
          <Filter
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-[#121212] border border-[#262626] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 appearance-none transition-colors"
          >
            <option value="all">รุ่นรถทั้งหมด (All Models)</option>
            {carModels.map((m) => (
              <option key={m.id} value={m.name}>
                {m.brandName ? `${m.brandName} - ${m.name}` : m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#121212] border border-[#262626] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 appearance-none transition-colors"
          >
            <option value="all">สถานะทั้งหมด (All Status)</option>
            <option value="active">วางขายอยู่ (Active)</option>
            <option value="draft">ฉบับร่าง (Draft)</option>
            <option value="out_of_stock">สินค้าหมด (Out of Stock)</option>
            <option value="archived">เก็บถาวร (Archived)</option>
          </select>
        </div>
      </div>

      {/* Bundles Grid / Table */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl overflow-hidden shadow-xl shadow-black/40">
        {filteredBundles.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Boxes size={28} />
            </div>
            <h3 className="text-base font-semibold text-gray-300">
              ไม่พบรายการชุดเซ็ตสินค้า
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {onlyFeatured
                ? "ขณะนี้ยังไม่ได้เลือกชุดเซ็ตแนะนำ หรือไม่มีชุดเซ็ตแนะนำที่ตรงกับคำค้นหา"
                : "ยังไม่มีชุดเซ็ตหรือไม่มีรายการที่ตรงกับเงื่อนไขการค้นหา สามารถกดปุ่ม \"สร้างชุดเซ็ตใหม่\" เพื่อเริ่มต้น"}
            </p>
            {onlyFeatured ? (
              <button
                type="button"
                onClick={() => setOnlyFeatured(false)}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold rounded-lg transition-colors"
              >
                แสดงชุดเซ็ตทั้งหมด
              </button>
            ) : (
              <Link
                href="/bundles/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={14} />
                สร้างชุดเซ็ตใหม่
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-[#222222] bg-[#161616]/80 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ชุดเซ็ต / รหัส SKU</th>
                  <th className="py-3.5 px-3 text-center">เซ็ทแนะนำ (Max 4)</th>
                  <th className="py-3.5 px-4">รุ่นรถยนต์ (Model)</th>
                  <th className="py-3.5 px-4">ชิ้นส่วนในเซ็ต (Parts Included)</th>
                  <th className="py-3.5 px-4">CFD Downforce รวม</th>
                  <th className="py-3.5 px-4 text-right">ราคารวมเซ็ต (฿)</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D]">
                {filteredBundles.map((bundle) => {
                  const isFeatured = Boolean(featuredMap[bundle.id]);
                  const isToggling = isTogglingFeaturedId === bundle.id;

                  return (
                    <tr
                      key={bundle.id}
                      className={`hover:bg-[#181818]/60 transition-colors group ${
                        isFeatured ? "bg-amber-500/[0.02]" : ""
                      }`}
                    >
                      {/* Kit Info & Image */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden shrink-0 flex items-center justify-center">
                            {bundle.primaryImage ? (
                              <Image
                                src={bundle.primaryImage}
                                alt={bundle.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <ImageIcon size={20} className="text-gray-600" />
                            )}
                            <span className="absolute bottom-0 right-0 bg-amber-500 text-black text-[9px] font-black px-1 rounded-tl">
                              KIT
                            </span>
                          </div>
                          <div>
                            <Link
                              href={`/bundles/${bundle.id}`}
                              className="font-semibold text-white hover:text-amber-400 transition-colors line-clamp-1 flex items-center gap-1.5"
                            >
                              {bundle.name}
                              {isFeatured && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/40 font-extrabold flex items-center gap-0.5">
                                  <Star size={9} className="fill-amber-400" /> FEATURED
                                </span>
                              )}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-mono">
                              <span>SKU: {bundle.sku}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ⭐ 1-Click Toggle Featured Column */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(bundle)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isFeatured
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-sm"
                              : "bg-[#181818] text-gray-400 border border-[#2A2A2A] hover:text-white hover:border-amber-500/40 hover:bg-[#202020]"
                          }`}
                          title={
                            isFeatured
                              ? "คลิกเพื่อยกเลิกเซ็ทแนะนำ"
                              : `คลิกเพื่อตั้งเป็นเซ็ทแนะนำ (${featuredCount}/${MAX_FEATURED_BUNDLES})`
                          }
                        >
                          {isToggling ? (
                            <Loader2 size={13} className="animate-spin text-amber-400" />
                          ) : (
                            <Star
                              size={13}
                              className={
                                isFeatured
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-gray-500 group-hover:text-amber-400"
                              }
                            />
                          )}
                          <span className="text-[11px]">
                            {isFeatured ? "แนะนำอยู่" : "ตั้งแนะนำ"}
                          </span>
                        </button>
                      </td>

                      {/* Car Model */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-1 rounded bg-[#1C1C1C] border border-[#2C2C2C] text-xs font-semibold text-gray-300">
                            {bundle.brandName} {bundle.carModelName}
                          </span>
                        </div>
                      </td>

                      {/* Included Parts */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20">
                              {bundle.childPartsCount} ชิ้นส่วน
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bundle.childParts.map((part) => (
                              <span
                                key={part.id}
                                className="inline-block px-1.5 py-0.5 rounded bg-[#1A1A1A] text-gray-400 text-[10px] border border-[#282828] truncate max-w-[140px]"
                                title={`${part.categoryName}: ${part.name} (฿${Number(part.price).toLocaleString()})`}
                              >
                                {part.categoryName}: {part.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* CFD Downforce */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Wind size={14} className="text-[var(--accent-red)]" />
                          <span className="font-mono text-xs text-white font-bold">
                            +{bundle.effectiveDownforce} N
                          </span>
                          {bundle.isCustomCfd && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 rounded">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dynamic Price */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-white text-base">
                          ฿{Number(bundle.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-gray-500">คำนวณจากผลรวมชิ้นย่อย</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {renderStatusSelector(bundle)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/bundles/${bundle.id}`}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors"
                            title="แก้ไขชุดเซ็ต"
                          >
                            <Edit2 size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteModalBundle(bundle)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="ลบชุดเซ็ต"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#161616] border border-[#2E2E2E] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">ยืนยันการลบชุดเซ็ต</h3>
            </div>

            <p className="text-sm text-gray-300">
              คุณต้องการลบชุดเซ็ต{" "}
              <strong className="text-white">&quot;{deleteModalBundle.name}&quot;</strong>{" "}
              (SKU: {deleteModalBundle.sku}) หรือไม่?
            </p>
            <p className="text-xs text-gray-500">
              * การลบชุดเซ็ตจะไม่ส่งผลกระทบต่อชิ้นส่วนย่อยที่อยู่ในระบบ แต่รูปภาพของชุดเซ็ตจะถูกลบออกจาก Cloudinary
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalBundle(null)}
                disabled={Boolean(isDeletingId)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-[#222222] hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteModalBundle.id)}
                disabled={Boolean(isDeletingId)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/30 transition-colors disabled:opacity-50"
              >
                {isDeletingId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>ยืนยันการลบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
