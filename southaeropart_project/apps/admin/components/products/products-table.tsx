"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Package,
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
  Star,
  ChevronDown,
} from "lucide-react";
import {
  deleteProductAction,
  toggleProductFeaturedAction,
  updateProductStatusAction,
} from "@/actions/product.actions";

interface ProductRow {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  stockQuantity: number;
  status: "draft" | "active" | "archived" | "out_of_stock";
  isFeatured: boolean;
  categoryName?: string | null;
  brandName?: string | null;
  primaryImage?: {
    id: string;
    cloudinaryPublicId: string;
    secureUrl: string;
  } | null;
  imagesCount: number;
  createdAt: Date;
}

interface ProductsTableProps {
  products: ProductRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
}

export function ProductsTable({
  products,
  pagination,
  categories,
  brands,
}: ProductsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<ProductRow | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Optimistic featured state
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    products.forEach((p) => {
      map[p.id] = p.isFeatured;
    });
    return map;
  });
  const [isTogglingFeaturedId, setIsTogglingFeaturedId] = useState<string | null>(null);

  // Optimistic status state
  const [statusMap, setStatusMap] = useState<Record<string, ProductRow["status"]>>(() => {
    const map: Record<string, ProductRow["status"]> = {};
    products.forEach((p) => {
      map[p.id] = p.status;
    });
    return map;
  });
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Sync state if products prop changes
  useEffect(() => {
    const fMap: Record<string, boolean> = {};
    const sMap: Record<string, ProductRow["status"]> = {};
    products.forEach((p) => {
      fMap[p.id] = p.isFeatured;
      sMap[p.id] = p.status;
    });
    setFeaturedMap(fMap);
    setStatusMap(sMap);
  }, [products]);

  // Client-side filtering for fast UI response
  const filteredProducts = products.filter((p) => {
    const isFeatured = Boolean(featuredMap[p.id]);
    const currentStatus = statusMap[p.id] ?? p.status;

    if (onlyFeatured && !isFeatured) return false;

    const matchesSearch =
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || currentStatus === statusFilter;

    const matchesCategory =
      categoryFilter === "all" || p.categoryName === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleToggleFeatured = async (product: ProductRow) => {
    const currentlyFeatured = Boolean(featuredMap[product.id]);
    const nextFeatured = !currentlyFeatured;

    // Optimistic UI update
    setFeaturedMap((prev) => ({
      ...prev,
      [product.id]: nextFeatured,
    }));
    setIsTogglingFeaturedId(product.id);

    try {
      const res = await toggleProductFeaturedAction(product.id, nextFeatured);
      setIsTogglingFeaturedId(null);

      if (res.success) {
        setToastMessage(
          nextFeatured
            ? `ตั้ง '${product.name}' เป็นสินค้าแนะนำเรียบร้อยแล้ว`
            : `ยกเลิกสินค้าแนะนำสำหรับ '${product.name}' แล้ว`
        );
        router.refresh();
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        // Revert optimistic update
        setFeaturedMap((prev) => ({
          ...prev,
          [product.id]: currentlyFeatured,
        }));
        alert(res.message || "ไม่สามารถเปลี่ยนสถานะสินค้าแนะนำได้");
      }
    } catch {
      setIsTogglingFeaturedId(null);
      setFeaturedMap((prev) => ({
        ...prev,
        [product.id]: currentlyFeatured,
      }));
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleStatusChange = async (
    product: ProductRow,
    newStatus: ProductRow["status"]
  ) => {
    const previousStatus = statusMap[product.id] ?? product.status;
    if (newStatus === previousStatus) return;

    // Optimistic update
    setStatusMap((prev) => ({ ...prev, [product.id]: newStatus }));
    setUpdatingStatusId(product.id);

    try {
      const res = await updateProductStatusAction(product.id, newStatus);
      setUpdatingStatusId(null);

      if (res.success) {
        setToastMessage(res.message || "เปลี่ยนสถานะสินค้าสำเร็จ");
        router.refresh();
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        // Revert
        setStatusMap((prev) => ({ ...prev, [product.id]: previousStatus }));
        alert(res.message || "ไม่สามารถเปลี่ยนสถานะสินค้าได้");
      }
    } catch {
      setUpdatingStatusId(null);
      setStatusMap((prev) => ({ ...prev, [product.id]: previousStatus }));
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleDelete = async (productId: string) => {
    setIsDeletingId(productId);
    startTransition(async () => {
      const res = await deleteProductAction(productId);
      setIsDeletingId(null);
      setDeleteModalProduct(null);
      if (res.success) {
        setToastMessage("ลบสินค้าและรูปภาพจาก Cloudinary สำเร็จ");
        router.refresh();
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        alert(res.message || "เกิดข้อผิดพลาดในการลบสินค้า");
      }
    });
  };

  const renderStatusSelector = (product: ProductRow) => {
    const currentStatus = statusMap[product.id] ?? product.status;
    const isUpdating = updatingStatusId === product.id;

    const getStatusConfig = (st: ProductRow["status"]) => {
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
          onChange={(e) => handleStatusChange(product, e.target.value as ProductRow["status"])}
          className={`appearance-none pl-6 pr-6 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500 ${config.className}`}
          title="คลิกเพื่อเปลี่ยนสถานะสินค้าทันที"
        >
          <option value="active" className="bg-[#181818] text-emerald-400 py-1">วางขาย (Active)</option>
          <option value="draft" className="bg-[#181818] text-zinc-300 py-1">ร่าง (Draft)</option>
          <option value="out_of_stock" className="bg-[#181818] text-amber-400 py-1">สินค้าหมด (Out of Stock)</option>
          <option value="archived" className="bg-[#181818] text-gray-400 py-1">เก็บเข้ากรุ (Archived)</option>
        </select>
        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${config.dotColor}`} />
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#181818] border border-emerald-500/50 text-emerald-300 shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package size={24} className="text-red-500" />
            จัดการสินค้า (Products Management)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            รายการสินค้าอะไหล่และชิ้นส่วน South Aero พร้อมจัดการรูปภาพ Cloudinary
          </p>
        </div>

        <Link
          href="/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-red-950/40 w-full sm:w-auto shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          <span>เพิ่มสินค้าใหม่</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl sm:rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อสินค้า หรือ รหัส SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Featured Only Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyFeatured(!onlyFeatured)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              onlyFeatured
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/40"
                : "bg-[#181818] border-[#2D2D2D] text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <Star
              size={14}
              className={onlyFeatured ? "text-amber-400 fill-amber-400" : "text-gray-400"}
            />
            <span>เฉพาะสินค้าแนะนำ</span>
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">วางขาย (Active)</option>
            <option value="draft">ร่าง (Draft)</option>
            <option value="out_of_stock">สินค้าหมด</option>
            <option value="archived">เก็บเข้ากรุ</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-gray-500 mx-auto flex items-center justify-center mb-3">
              <Package size={24} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              ไม่พบสินค้าในเงื่อนไขที่เลือก
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
              ลองเปลี่ยนคำค้นหา หรือกดปุ่มด้านล่างเพื่อเพิ่มสินค้าชิ้นแรกเข้าสู่ระบบ
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition-all"
            >
              <Plus size={14} />
              <span>เพิ่มสินค้าใหม่</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] border-b border-[#222222] text-gray-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16">รูปภาพ</th>
                  <th className="py-3 px-4">ชื่อสินค้า / SKU</th>
                  <th className="py-3 px-4">หมวดหมู่ & แบรนด์</th>
                  <th className="py-3 px-4 text-right">ราคา</th>
                  <th className="py-3 px-4 text-center">สต็อก</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">สินค้าแนะนำ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D] text-gray-300">
                {filteredProducts.map((product) => {
                  const hasImage = Boolean(product.primaryImage?.secureUrl);
                  const isFeatured = Boolean(featuredMap[product.id]);
                  const isToggling = isTogglingFeaturedId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isFeatured
                          ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                          : "hover:bg-[#161616]"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#1D1D1D] border border-[#2D2D2D] shrink-0">
                          {hasImage ? (
                            <Image
                              src={product.primaryImage!.secureUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          {product.imagesCount > 1 && (
                            <div className="absolute bottom-0 right-0 px-1 rounded-tl bg-black/80 text-[9px] font-mono text-gray-300">
                              +{product.imagesCount}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name and SKU */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="font-semibold text-white truncate hover:text-red-400 transition-colors">
                            <Link href={`/products/${product.id}/edit`}>
                              {product.name}
                            </Link>
                          </div>
                          {isFeatured && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                              แนะนำ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-red-400 bg-red-950/40 px-1.5 py-0.2 rounded border border-red-900/40">
                            {product.sku}
                          </span>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3 px-4">
                        <div className="text-gray-200">
                          {product.categoryName || "-"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {product.brandName || "-"}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-bold text-white">
                          ฿{Number(product.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                        {product.compareAtPrice && (
                          <div className="text-[10px] text-gray-500 line-through">
                            ฿{Number(product.compareAtPrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                            product.stockQuantity > 10
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                              : product.stockQuantity > 0
                              ? "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                              : "bg-red-950/40 text-red-400 border border-red-800/40"
                          }`}
                        >
                          {product.stockQuantity} ชิ้น
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {renderStatusSelector(product)}
                      </td>

                      {/* Featured Quick Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(product)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isFeatured
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                              : "bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500"
                          }`}
                          title={isFeatured ? "คลิกเพื่อยกเลิกสินค้าแนะนำ" : "คลิกเพื่อตั้งเป็นสินค้าแนะนำหน้าแรก"}
                        >
                          {isToggling ? (
                            <Loader2 size={13} className="animate-spin text-amber-400" />
                          ) : (
                            <Star
                              size={13}
                              className={
                                isFeatured
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-zinc-400"
                              }
                            />
                          )}
                          <span className="text-[10px]">
                            {isFeatured ? "แนะนำ" : "ตั้งแนะนำ"}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                            title="แก้ไขข้อมูลสินค้า"
                          >
                            <Edit2 size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteModalProduct(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            title="ลบสินค้า"
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
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ยืนยันการลบสินค้า
                </h3>
                <p className="text-xs text-gray-400">
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#262626] text-xs space-y-1">
              <p className="text-gray-300 font-semibold">
                {deleteModalProduct.name}
              </p>
              <p className="text-gray-500 font-mono">
                SKU: {deleteModalProduct.sku}
              </p>
              {deleteModalProduct.imagesCount > 0 && (
                <p className="text-amber-400/90 text-[11px] pt-1">
                  ⚠️ รูปภาพทั้งหมด ({deleteModalProduct.imagesCount} รูป) ใน Cloudinary จะถูกทำลายถาวร
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteModalProduct(null)}
                className="px-4 py-2 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-gray-300 text-xs font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(deleteModalProduct.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>ยืนยันลบสินค้า</span>
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
