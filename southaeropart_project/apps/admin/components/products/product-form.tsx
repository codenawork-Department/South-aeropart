"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createProductAction,
  updateProductAction,
  type ProductInput,
} from "@/actions/product.actions";
import { ImageUploader, type ImageUploadItem } from "./image-uploader";
import {
  Package,
  DollarSign,
  Layers,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  FolderTree,
  Car,
  Tag,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface CarModelOption {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  generation?: string | null;
}

interface CompatibilityItem {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
}

interface ProductFormProps {
  initialData?: {
    id: string;
    sku: string;
    name: string;
    slug: string;
    description?: string | null;
    price: string;
    compareAtPrice?: string | null;
    stockQuantity: number;
    status: "draft" | "active" | "archived" | "out_of_stock";
    weightKg?: string | null;
    categoryId?: string | null;
    brandId?: string | null;
    carModelId?: string | null;
    images?: Array<{
      id: string;
      cloudinaryPublicId: string;
      secureUrl: string;
      position: number;
      isPrimary: boolean;
    }>;
    compatibility?: Array<{
      id: string;
      make: string;
      model: string;
      yearFrom: number;
      yearTo: number;
    }>;
  };
  categories: CategoryOption[];
  brands: BrandOption[];
  carModels: CarModelOption[];
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  categories,
  brands,
  carModels,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form states
  const [sku, setSku] = useState(initialData?.sku || "");
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialData?.compareAtPrice || ""
  );
  const [stockQuantity, setStockQuantity] = useState<number>(
    initialData?.stockQuantity ?? 0
  );
  const [status, setStatus] = useState<"draft" | "active" | "archived" | "out_of_stock">(
    initialData?.status || "draft"
  );
  const [weightKg, setWeightKg] = useState(initialData?.weightKg || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [brandId, setBrandId] = useState(initialData?.brandId || "");
  const [carModelId, setCarModelId] = useState(initialData?.carModelId || "");

  // Available models filtered by brand
  const availableModels = useMemo(() => {
    if (!brandId) return carModels;
    return carModels.filter((m) => m.brandId === brandId);
  }, [brandId, carModels]);

  // Cloudinary Folder Path Preview
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = carModels.find((m) => m.id === carModelId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const previewCloudinaryPath = `south-aero/products/${selectedBrand?.slug || "general"}/${selectedModel?.slug || "universal"}/${selectedCategory?.slug || "aeropart"}/${slug || "product-slug"}`;

  // Images state
  const [images, setImages] = useState<ImageUploadItem[]>(
    initialData?.images?.map((img) => ({
      id: img.id,
      publicId: img.cloudinaryPublicId,
      secureUrl: img.secureUrl,
      position: img.position,
      isPrimary: img.isPrimary,
    })) || []
  );

  // Vehicle Compatibility state
  const [compatibility, setCompatibility] = useState<CompatibilityItem[]>(
    initialData?.compatibility?.map((c) => ({
      make: c.make,
      model: c.model,
      yearFrom: c.yearFrom,
      yearTo: c.yearTo,
    })) || []
  );

  const addCompatibilityRow = () => {
    setCompatibility((prev) => [
      ...prev,
      { make: selectedBrand?.name || "", model: selectedModel?.name || "", yearFrom: 2022, yearTo: 2025 },
    ]);
  };

  const removeCompatibilityRow = (idx: number) => {
    setCompatibility((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCompatibilityRow = (
    idx: number,
    field: keyof CompatibilityItem,
    value: string | number
  ) => {
    setCompatibility((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleBrandChange = (newBrandId: string) => {
    setBrandId(newBrandId);
    // If selected model is not in new brand, reset model
    if (carModelId) {
      const model = carModels.find((m) => m.id === carModelId);
      if (model && model.brandId !== newBrandId) {
        setCarModelId("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const payload: ProductInput = {
      sku: sku.trim(),
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || null,
      price: price.trim(),
      compareAtPrice: compareAtPrice.trim() || null,
      stockQuantity: Number(stockQuantity),
      status,
      weightKg: weightKg.trim() || null,
      categoryId: categoryId || null,
      brandId: brandId || null,
      carModelId: carModelId || null,
      images,
      compatibility: compatibility.filter((c) => c.make.trim() && c.model.trim()),
    };

    startTransition(async () => {
      if (isEdit && initialData?.id) {
        const res = await updateProductAction(initialData.id, payload);
        if (res.success) {
          setSuccessMessage("บันทึกการแก้ไขสินค้าสำเร็จแล้ว");
          router.refresh();
        } else {
          setErrorMessage(res.message || "เกิดข้อผิดพลาดในการแก้ไขสินค้า");
          if (res.errors) setFieldErrors(res.errors);
        }
      } else {
        const res = await createProductAction(payload);
        if (res.success && res.data?.productId) {
          setSuccessMessage("สร้างสินค้าใหม่พร้อมจัดเก็บรูปภาพเข้าโฟลเดอร์ Cloudinary สำเร็จ");
          setTimeout(() => {
            router.push("/products");
          }, 1200);
        } else {
          setErrorMessage(res.message || "เกิดข้อผิดพลาดในการสร้างสินค้า");
          if (res.errors) setFieldErrors(res.errors);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 py-3 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-gray-300 hover:text-white transition-colors border border-[#2D2D2D]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              {isEdit ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/60 font-mono">
                {sku || "NEW-SKU"}
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              {isEdit
                ? "ปรับปรุงข้อมูลสินค้า ราคา สต็อก และรูปภาพ Cloudinary"
                : "สร้างรายการสินค้าอะไหล่และชิ้นส่วนพร้อมจัดเก็บรูปตามแบรนด์/รุ่น/หมวดหมู่"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] rounded-lg transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md shadow-red-950/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{isEdit ? "บันทึกการแก้ไข" : "สร้างสินค้า"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mt-1.5 list-disc list-inside text-xs text-red-300/80 space-y-0.5">
                {Object.entries(fieldErrors).map(([field, errs]) => (
                  <li key={field}>
                    <span className="font-medium capitalize">{field}:</span> {errs.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cloudinary Live Folder Hierarchy Box */}
      <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center gap-3 shadow-inner">
        <div className="w-8 h-8 rounded-lg bg-blue-950/50 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
          <FolderTree size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
            โฟลเดอร์จัดเก็บบน Cloudinary (Auto-generated Folder Path)
          </div>
          <div className="font-mono text-xs text-blue-300 truncate mt-0.5">
            📁 {previewCloudinaryPath}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: General Info */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <Package size={16} className="text-red-500" />
              ข้อมูลทั่วไปของสินค้า
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="เช่น สปอยเลอร์หลัง Ducktail Carbon Fiber สำหรับ GR86"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    รหัสสินค้า (SKU) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    required
                    placeholder="เช่น SA-AERO-DT86-01"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    URL Slug (เว้นว่างเพื่อสร้างอัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="เช่น south-aero-carbon-ducktail-gr86"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  รายละเอียดสินค้า (Description)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดวัสดุ การใช้งาน คุณสมบัติพิเศษ และการรับประกัน..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section: Cloudinary Media Upload */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6">
            <ImageUploader
              images={images}
              onChange={setImages}
              disabled={isPending}
            />
          </div>

          {/* Section: Vehicle Compatibility */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  ความเข้ากันได้กับยานยนต์ (Vehicle Compatibility)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ระบุยี่ห้อ รุ่น และปีรถที่ชิ้นส่วนนี้สามารถใช้งานได้
                </p>
              </div>
              <button
                type="button"
                onClick={addCompatibilityRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600/80 border border-red-800/50 rounded-lg transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>เพิ่มรุ่นรถ</span>
              </button>
            </div>

            {compatibility.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] text-center text-xs text-gray-500">
                ยังไม่ได้ระบุความเข้ากันได้ (สินค้าจะแสดงว่าเป็นชิ้นส่วนทั่วไป Universal)
              </div>
            ) : (
              <div className="space-y-3">
                {compatibility.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-[#181818] border border-[#2A2A2A]"
                  >
                    <input
                      type="text"
                      placeholder="ยี่ห้อ เช่น Toyota"
                      value={row.make}
                      onChange={(e) =>
                        updateCompatibilityRow(idx, "make", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="text"
                      placeholder="รุ่น เช่น GR86"
                      value={row.model}
                      onChange={(e) =>
                        updateCompatibilityRow(idx, "model", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="ปีเริ่ม"
                        value={row.yearFrom}
                        onChange={(e) =>
                          updateCompatibilityRow(
                            idx,
                            "yearFrom",
                            Number(e.target.value)
                          )
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs text-center font-mono focus:outline-none focus:border-red-500"
                      />
                      <span className="text-gray-500 text-xs">-</span>
                      <input
                        type="number"
                        placeholder="ปีสิ้นสุด"
                        value={row.yearTo}
                        onChange={(e) =>
                          updateCompatibilityRow(
                            idx,
                            "yearTo",
                            Number(e.target.value)
                          )
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs text-center font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCompatibilityRow(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors self-end sm:self-auto cursor-pointer"
                      title="ลบรายการนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Pricing, Inventory, Vehicle Classification */}
        <div className="space-y-6">
          {/* Section: Vehicle & Aeropart Classification */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <Car size={16} className="text-red-500" />
              การจัดหมวดหมู่ & รุ่นรถ
            </h2>

            <div className="space-y-4">
              {/* Car Brand */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  แบรนด์รถยนต์ (Car Brand)
                </label>
                <select
                  value={brandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">-- อะไหล่ทั่วไป (Universal) --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Car Model (Cascading) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  รุ่น/โมเดลรถ (Car Model)
                </label>
                <select
                  value={carModelId}
                  onChange={(e) => setCarModelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">-- ไม่ระบุรุ่นรถเฉพาะ (All Models) --</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.generation ? `(${m.generation})` : ""}
                    </option>
                  ))}
                </select>
                {brandId && availableModels.length === 0 && (
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    ยังไม่มีโมเดลรถในแบรนด์นี้ (สามารถเพิ่มได้ในหน้า Catalog)
                  </p>
                )}
              </div>

              {/* Aeropart Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  ประเภทชิ้นส่วน (Aeropart Category)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">-- ไม่ระบุประเภท --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Status */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <Layers size={16} className="text-red-500" />
              สถานะสินค้า (Status)
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                สถานะการวางจำหน่าย
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "draft" | "active" | "archived" | "out_of_stock"
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="draft">ร่าง (Draft - ยังไม่แสดงหน้าร้าน)</option>
                <option value="active">วางขาย (Active - พร้อมขาย)</option>
                <option value="out_of_stock">สินค้าหมด (Out of Stock)</option>
                <option value="archived">เก็บเข้ากรุ (Archived)</option>
              </select>
            </div>
          </div>

          {/* Section: Pricing & Stock */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <DollarSign size={16} className="text-red-500" />
              ราคาและสต็อก (Pricing & Stock)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  ราคาขาย (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="เช่น 6500.00"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  ราคาเปรียบเทียบ (บาท)
                </label>
                <input
                  type="text"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="เช่น 8900.00"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    จำนวนสต็อก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    น้ำหนัก (กก.)
                  </label>
                  <input
                    type="text"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="เช่น 1.45"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
