"use client";

import { useState, useTransition } from "react";
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
  ExternalLink,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Tag,
  CheckCircle2,
  Wind,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { deleteBundleAction } from "@/actions/bundle.actions";

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

export function BundlesTable({
  bundles,
  pagination,
  carModels,
}: BundlesTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteModalBundle, setDeleteModalBundle] = useState<BundleRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredBundles = bundles.filter((b) => {
    const matchesSearch =
      !searchTerm.trim() ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || b.status === statusFilter;

    const matchesModel =
      modelFilter === "all" || b.carModelName === modelFilter;

    return matchesSearch && matchesStatus && matchesModel;
  });

  const handleDelete = async (bundleId: string) => {
    setIsDeletingId(bundleId);
    startTransition(async () => {
      const res = await deleteBundleAction(bundleId);
      setIsDeletingId(null);
      setDeleteModalBundle(null);
      if (res.success) {
        setToastMessage("ลบชุดเซ็ตสำเร็จ");
        router.refresh();
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        alert(res.message || "เกิดข้อผิดพลาดในการลบชุดเซ็ต");
      }
    });
  };

  const statusBadge = (status: BundleRow["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            วางขายอยู่ (Active)
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
            ฉบับร่าง (Draft)
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            สินค้าหมด
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            เก็บถาวร
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#181818] border border-emerald-500/40 text-emerald-400 rounded-lg shadow-xl shadow-black/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
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
              ยังไม่มีชุดเซ็ตหรือไม่มีรายการที่ตรงกับเงื่อนไขการค้นหา สามารถกดปุ่ม &quot;สร้างชุดเซ็ตใหม่&quot; เพื่อเริ่มต้น
            </p>
            <Link
              href="/bundles/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} />
              สร้างชุดเซ็ตใหม่
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-[#222222] bg-[#161616]/80 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ชุดเซ็ต / รหัส SKU</th>
                  <th className="py-3.5 px-4">รุ่นรถยนต์ (Model)</th>
                  <th className="py-3.5 px-4">ชิ้นส่วนในเซ็ต (Parts Included)</th>
                  <th className="py-3.5 px-4">CFD Downforce รวม</th>
                  <th className="py-3.5 px-4 text-right">ราคารวมเซ็ต (฿)</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D]">
                {filteredBundles.map((bundle) => (
                  <tr
                    key={bundle.id}
                    className="hover:bg-[#181818]/60 transition-colors group"
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
                            {bundle.isFeatured && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded border border-red-500/30 font-bold">
                                FEATURED
                              </span>
                            )}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-mono">
                            <span>SKU: {bundle.sku}</span>
                          </div>
                        </div>
                      </div>
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
                      {statusBadge(bundle.status)}
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
                ))}
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
