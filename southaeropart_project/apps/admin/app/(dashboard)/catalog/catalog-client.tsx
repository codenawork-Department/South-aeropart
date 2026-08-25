"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Sparkles,
  Loader2,
  Car,
  Tag,
  Shield,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Palette,
} from "lucide-react";
import { IconsTab } from "./components/icons-tab";
import type { IconData } from "@/components/icons/app-icon";
import {
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
  createCarModelAction,
  updateCarModelAction,
  deleteCarModelAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  seedInitialCatalogAction,
  type BrandInput,
  type CarModelInput,
  type CategoryInput,
} from "@/actions/catalog.actions";

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  isActive: boolean;
  modelsCount: number;
  productsCount: number;
}

interface CarModelItem {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  name: string;
  slug: string;
  generation?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  isActive: boolean;
  productsCount: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  position: number;
  isActive: boolean;
  productsCount: number;
}

interface CatalogClientProps {
  initialBrands: BrandItem[];
  initialCarModels: CarModelItem[];
  initialCategories: CategoryItem[];
  initialIcons?: IconData[];
}

export function CatalogClient({
  initialBrands,
  initialCarModels,
  initialCategories,
  initialIcons = [],
}: CatalogClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"brands" | "models" | "categories" | "icons">("brands");
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");

  // Modal States
  const [brandModal, setBrandModal] = useState<{ isOpen: boolean; item?: BrandItem | null }>({
    isOpen: false,
    item: null,
  });
  const [modelModal, setModelModal] = useState<{ isOpen: boolean; item?: CarModelItem | null }>({
    isOpen: false,
    item: null,
  });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; item?: CategoryItem | null }>({
    isOpen: false,
    item: null,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "brand" | "model" | "category";
    id: string;
    name: string;
  } | null>(null);

  // Form states for modals
  const [brandForm, setBrandForm] = useState<BrandInput>({ name: "", slug: "", logoUrl: "", isActive: true });
  const [modelForm, setModelForm] = useState<CarModelInput>({
    brandId: "",
    name: "",
    slug: "",
    generation: "",
    yearFrom: 2022,
    yearTo: 2025,
    isActive: true,
  });
  const [categoryForm, setCategoryForm] = useState<CategoryInput>({
    name: "",
    slug: "",
    position: 0,
    isActive: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    router.refresh();
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Seed Handler
  const handleSeed = () => {
    if (!confirm("คุณต้องการเริ่มต้นชุดข้อมูลแบรนด์ รุ่นรถ และหมวดหมู่ Aeropart ยอดฮิตเข้าสู่ระบบใช่หรือไม่?")) return;
    startTransition(async () => {
      const res = await seedInitialCatalogAction();
      if (res.success) {
        showToast(res.message || "โหลดข้อมูลเริ่มต้นสำเร็จ");
      } else {
        alert(res.message || "เกิดข้อผิดพลาด");
      }
    });
  };

  // Brand Submit
  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (brandModal.item) {
        const res = await updateBrandAction(brandModal.item.id, brandForm);
        if (res.success) {
          setBrandModal({ isOpen: false, item: null });
          showToast(res.message || "อัปเดตแบรนด์สำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      } else {
        const res = await createBrandAction(brandForm);
        if (res.success) {
          setBrandModal({ isOpen: false, item: null });
          showToast(res.message || "สร้างแบรนด์สำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      }
    });
  };

  // Model Submit
  const handleModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (modelModal.item) {
        const res = await updateCarModelAction(modelModal.item.id, modelForm);
        if (res.success) {
          setModelModal({ isOpen: false, item: null });
          showToast(res.message || "อัปเดตรุ่นรถสำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      } else {
        const res = await createCarModelAction(modelForm);
        if (res.success) {
          setModelModal({ isOpen: false, item: null });
          showToast(res.message || "สร้างรุ่นรถสำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      }
    });
  };

  // Category Submit
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (categoryModal.item) {
        const res = await updateCategoryAction(categoryModal.item.id, categoryForm);
        if (res.success) {
          setCategoryModal({ isOpen: false, item: null });
          showToast(res.message || "อัปเดตหมวดหมู่สำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      } else {
        const res = await createCategoryAction(categoryForm);
        if (res.success) {
          setCategoryModal({ isOpen: false, item: null });
          showToast(res.message || "สร้างหมวดหมู่สำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาด");
        }
      }
    });
  };

  // Delete Handler
  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      let res;
      if (deleteModal.type === "brand") res = await deleteBrandAction(deleteModal.id);
      else if (deleteModal.type === "model") res = await deleteCarModelAction(deleteModal.id);
      else if (deleteModal.type === "category") res = await deleteCategoryAction(deleteModal.id);

      setDeleteModal(null);
      if (res?.success) {
        showToast(res.message || "ลบรายการสำเร็จ");
      } else {
        alert(res?.message || "เกิดข้อผิดพลาดในการลบ");
      }
    });
  };

  // Filtered Lists
  const filteredBrands = initialBrands.filter(
    (b) => !searchTerm.trim() || b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.slug.includes(searchTerm.toLowerCase())
  );

  const filteredModels = initialCarModels.filter((m) => {
    const matchesSearch =
      !searchTerm.trim() ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.generation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrandFilter === "all" || m.brandId === selectedBrandFilter;
    return matchesSearch && matchesBrand;
  });

  const filteredCategories = initialCategories.filter(
    (c) => !searchTerm.trim() || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.slug.includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
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
            <Layers size={24} className="text-red-500" />
            แคตตาล็อก & หมวดหมู่ (Catalog Master Data)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            จัดการแบรนด์รถ โมเดลรถ และหมวดหมู่ชิ้นส่วน Aeropart เพื่อสร้างโครงสร้างโฟลเดอร์รูปภาพบน Cloudinary
          </p>
        </div>

        <div className="flex items-center gap-2">
          {initialBrands.length === 0 && initialCategories.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>เติมข้อมูลเริ่มต้น (Seed)</span>
            </button>
          )}

          {activeTab !== "icons" && (
            <button
              onClick={() => {
                if (activeTab === "brands") {
                  setBrandForm({ name: "", slug: "", logoUrl: "", isActive: true });
                  setBrandModal({ isOpen: true, item: null });
                } else if (activeTab === "models") {
                  setModelForm({
                    brandId: initialBrands[0]?.id || "",
                    name: "",
                    slug: "",
                    generation: "",
                    yearFrom: 2022,
                    yearTo: 2025,
                    isActive: true,
                  });
                  setModelModal({ isOpen: true, item: null });
                } else if (activeTab === "categories") {
                  setCategoryForm({ name: "", slug: "", position: initialCategories.length + 1, isActive: true });
                  setCategoryModal({ isOpen: true, item: null });
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>
                {activeTab === "brands"
                  ? "เพิ่มแบรนด์รถ"
                  : activeTab === "models"
                  ? "เพิ่มโมเดลรถ"
                  : "เพิ่มหมวดหมู่ชิ้นส่วน"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Cloudinary Architecture Visual Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#161616] via-[#141414] to-[#121212] border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
            <FolderTree size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Cloudinary Storage Hierarchy</span>
              <span className="text-[10px] font-normal px-2 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                ACTIVE
              </span>
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 font-mono text-[11px]">
              <span className="text-gray-400">south-aero/products/</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                [แบรนด์รถ]
              </span>
              <span className="text-gray-500">/</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                [โมเดลรถ]
              </span>
              <span className="text-gray-500">/</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                [หมวดหมู่ Aeropart]
              </span>
              <span className="text-gray-500">/</span>
              <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                [ชื่อสินค้า-sku]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#222222] pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveTab("brands");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "brands"
              ? "bg-[#181818] text-white border-t border-x border-[#2A2A2A] shadow-md text-red-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Car size={15} />
          <span>แบรนด์รถยนต์ (Car Brands)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#242424] text-[10px] text-gray-300 font-mono">
            {initialBrands.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("models");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "models"
              ? "bg-[#181818] text-white border-t border-x border-[#2A2A2A] shadow-md text-red-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Car size={15} />
          <span>รุ่น/โมเดลรถ (Car Models)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#242424] text-[10px] text-gray-300 font-mono">
            {initialCarModels.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("categories");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "categories"
              ? "bg-[#181818] text-white border-t border-x border-[#2A2A2A] shadow-md text-red-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Tag size={15} />
          <span>ประเภทชิ้นส่วน (Categories)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#242424] text-[10px] text-gray-300 font-mono">
            {initialCategories.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("icons");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "icons"
              ? "bg-[#181818] text-white border-t border-x border-[#2A2A2A] shadow-md text-red-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Palette size={15} />
          <span>คลังไอคอน (Icons Library)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#242424] text-[10px] text-gray-300 font-mono">
            {initialIcons.length}
          </span>
        </button>
      </div>

      {/* Filter Bar (Only for Brands, Models, Categories) */}
      {activeTab !== "icons" && (
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={`ค้นหาใน ${
                activeTab === "brands" ? "แบรนด์..." : activeTab === "models" ? "รุ่นรถ / รหัสตัวถัง..." : "หมวดหมู่ชิ้นส่วน..."
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {activeTab === "models" && (
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500"
            >
              <option value="all">ทุกแบรนด์รถ</option>
              {initialBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ─── TAB 1: BRANDS ─── */}
      {activeTab === "brands" && (
        <div className="bg-[#121212] border border-[#222222] rounded-xl overflow-hidden shadow-lg">
          {filteredBrands.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Car size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-white">ยังไม่มีข้อมูลแบรนด์รถยนต์</p>
              <p className="text-xs text-gray-500 mt-1">กดปุ่ม &quot;เติมข้อมูลเริ่มต้น&quot; ด้านบนเพื่อโหลดข้อมูลแบรนด์ยอดฮิตได้ทันที</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] border-b border-[#222222] text-gray-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">ชื่อแบรนด์</th>
                  <th className="py-3 px-4">URL Slug (Cloudinary Folder)</th>
                  <th className="py-3 px-4 text-center">จำนวนรุ่นรถ</th>
                  <th className="py-3 px-4 text-center">จำนวนสินค้า</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D] text-gray-300">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <Car size={16} className="text-red-400" />
                      <span>{brand.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-blue-400">
                      /{brand.slug}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#1F1F1F] text-gray-300 font-mono text-[11px]">
                        {brand.modelsCount} รุ่น
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#1F1F1F] text-gray-300 font-mono text-[11px]">
                        {brand.productsCount} ชิ้น
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          brand.isActive
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {brand.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setBrandForm({
                              name: brand.name,
                              slug: brand.slug,
                              logoUrl: brand.logoUrl || "",
                              isActive: brand.isActive,
                            });
                            setBrandModal({ isOpen: true, item: brand });
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              type: "brand",
                              id: brand.id,
                              name: brand.name,
                            })
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── TAB 2: CAR MODELS ─── */}
      {activeTab === "models" && (
        <div className="bg-[#121212] border border-[#222222] rounded-xl overflow-hidden shadow-lg">
          {filteredModels.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Car size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-white">ยังไม่มีข้อมูลโมเดลรถ</p>
              <p className="text-xs text-gray-500 mt-1">กดปุ่ม &quot;เติมข้อมูลเริ่มต้น&quot; ด้านบนเพื่อโหลดข้อมูลรุ่นรถยอดฮิตได้ทันที</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] border-b border-[#222222] text-gray-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">แบรนด์รถ</th>
                  <th className="py-3 px-4">ชื่อโมเดล / รหัสตัวถัง</th>
                  <th className="py-3 px-4">URL Slug (Cloudinary Folder)</th>
                  <th className="py-3 px-4 text-center">ปีที่ผลิต</th>
                  <th className="py-3 px-4 text-center">จำนวนสินค้า</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D] text-gray-300">
                {filteredModels.map((model) => (
                  <tr key={model.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-300">
                      {model.brandName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white">{model.name}</span>
                      {model.generation && (
                        <span className="ml-2 font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {model.generation}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-purple-400">
                      /{model.brandSlug}/{model.slug}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-gray-400">
                      {model.yearFrom || model.yearTo
                        ? `${model.yearFrom || "?"} - ${model.yearTo || "?"}`
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#1F1F1F] text-gray-300 font-mono text-[11px]">
                        {model.productsCount} ชิ้น
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          model.isActive
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {model.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setModelForm({
                              brandId: model.brandId,
                              name: model.name,
                              slug: model.slug,
                              generation: model.generation || "",
                              yearFrom: model.yearFrom || 2022,
                              yearTo: model.yearTo || 2025,
                              isActive: model.isActive,
                            });
                            setModelModal({ isOpen: true, item: model });
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              type: "model",
                              id: model.id,
                              name: `${model.brandName} ${model.name}`,
                            })
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── TAB 3: CATEGORIES ─── */}
      {activeTab === "categories" && (
        <div className="bg-[#121212] border border-[#222222] rounded-xl overflow-hidden shadow-lg">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Tag size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-white">ยังไม่มีข้อมูลประเภทชิ้นส่วน Aeropart</p>
              <p className="text-xs text-gray-500 mt-1">กดปุ่ม &quot;เติมข้อมูลเริ่มต้น&quot; ด้านบนเพื่อโหลดรายการชิ้นส่วนมาตรฐานได้ทันที</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] border-b border-[#222222] text-gray-400 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">ลำดับ</th>
                  <th className="py-3 px-4">ชื่อประเภทชิ้นส่วน Aeropart</th>
                  <th className="py-3 px-4">URL Slug (Cloudinary Folder)</th>
                  <th className="py-3 px-4 text-center">จำนวนสินค้า</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D1D1D] text-gray-300">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-gray-500 font-bold">
                      #{cat.position}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <Tag size={14} className="text-amber-400" />
                      <span>{cat.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-400">
                      /{cat.slug}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#1F1F1F] text-gray-300 font-mono text-[11px]">
                        {cat.productsCount} ชิ้น
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          cat.isActive
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {cat.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCategoryForm({
                              name: cat.name,
                              slug: cat.slug,
                              position: cat.position,
                              isActive: cat.isActive,
                            });
                            setCategoryModal({ isOpen: true, item: cat });
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              type: "category",
                              id: cat.id,
                              name: cat.name,
                            })
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── TAB 4: ICONS LIBRARY ─── */}
      {activeTab === "icons" && (
        <IconsTab initialIcons={initialIcons} showToast={showToast} />
      )}

      {/* ─── MODAL: BRAND ADD/EDIT ─── */}
      {brandModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleBrandSubmit}
            className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Car size={18} className="text-red-500" />
              <span>{brandModal.item ? "แก้ไขแบรนด์รถยนต์" : "เพิ่มแบรนด์รถยนต์ใหม่"}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  ชื่อแบรนด์รถ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Toyota, Honda, Nissan"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  URL Slug (โฟลเดอร์บน Cloudinary)
                </label>
                <input
                  type="text"
                  placeholder="เช่น toyota (เว้นว่างเพื่อสร้างอัตโนมัติ)"
                  value={brandForm.slug}
                  onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brandActive"
                  checked={brandForm.isActive}
                  onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                  className="rounded bg-[#1A1A1A] border-[#2E2E2E] text-red-600 focus:ring-0"
                />
                <label htmlFor="brandActive" className="text-xs text-gray-300 cursor-pointer">
                  เปิดใช้งานแบรนด์นี้ในระบบ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setBrandModal({ isOpen: false, item: null })}
                className="px-4 py-1.5 rounded-lg bg-[#202020] text-gray-300 text-xs font-semibold hover:bg-[#2A2A2A]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>บันทึก</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: CAR MODEL ADD/EDIT ─── */}
      {modelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleModelSubmit}
            className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Car size={18} className="text-purple-400" />
              <span>{modelModal.item ? "แก้ไขโมเดลรถ" : "เพิ่มโมเดลรถใหม่"}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  แบรนด์รถ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={modelForm.brandId}
                  onChange={(e) => setModelForm({ ...modelForm, brandId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white text-xs focus:outline-none focus:border-red-500"
                >
                  <option value="">-- เลือกแบรนด์รถ --</option>
                  {initialBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  ชื่อโมเดลรถ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น GR86, GR Yaris, Civic Type R FL5"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    รหัสตัวถัง (Generation)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ZN8, FL5, R35"
                    value={modelForm.generation || ""}
                    onChange={(e) => setModelForm({ ...modelForm, generation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น gr86"
                    value={modelForm.slug || ""}
                    onChange={(e) => setModelForm({ ...modelForm, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ปีเริ่มผลิต
                  </label>
                  <input
                    type="number"
                    placeholder="2022"
                    value={modelForm.yearFrom || ""}
                    onChange={(e) => setModelForm({ ...modelForm, yearFrom: Number(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ปีสิ้นสุดผลิต
                  </label>
                  <input
                    type="number"
                    placeholder="2025"
                    value={modelForm.yearTo || ""}
                    onChange={(e) => setModelForm({ ...modelForm, yearTo: Number(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modelActive"
                  checked={modelForm.isActive}
                  onChange={(e) => setModelForm({ ...modelForm, isActive: e.target.checked })}
                  className="rounded bg-[#1A1A1A] border-[#2E2E2E] text-red-600 focus:ring-0"
                />
                <label htmlFor="modelActive" className="text-xs text-gray-300 cursor-pointer">
                  เปิดใช้งานรุ่นรถนี้ในระบบ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setModelModal({ isOpen: false, item: null })}
                className="px-4 py-1.5 rounded-lg bg-[#202020] text-gray-300 text-xs font-semibold hover:bg-[#2A2A2A]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>บันทึก</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: CATEGORY ADD/EDIT ─── */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleCategorySubmit}
            className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag size={18} className="text-amber-400" />
              <span>{categoryModal.item ? "แก้ไขประเภทชิ้นส่วน" : "เพิ่มประเภทชิ้นส่วนใหม่"}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  ชื่อประเภทชิ้นส่วน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Ducktail Spoiler, Front Lip, GT Wing"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ducktail-spoiler"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ลำดับการแสดงผล
                  </label>
                  <input
                    type="number"
                    value={categoryForm.position}
                    onChange={(e) => setCategoryForm({ ...categoryForm, position: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="rounded bg-[#1A1A1A] border-[#2E2E2E] text-red-600 focus:ring-0"
                />
                <label htmlFor="catActive" className="text-xs text-gray-300 cursor-pointer">
                  เปิดใช้งานหมวดหมู่นี้ในระบบ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setCategoryModal({ isOpen: false, item: null })}
                className="px-4 py-1.5 rounded-lg bg-[#202020] text-gray-300 text-xs font-semibold hover:bg-[#2A2A2A]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>บันทึก</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-white">ยืนยันการลบรายการ</h3>
            </div>
            <p className="text-xs text-gray-400">
              คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="font-semibold text-white">&ldquo;{deleteModal.name}&rdquo;</span> ออกจากระบบ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-gray-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>ยืนยันลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
