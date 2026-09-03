"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Boxes,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Car,
  Layers,
  Wind,
  Shield,
  Tag,
  DollarSign,
  Info,
  Check,
  X,
  Plus,
  Package,
  Wand2,
  Flame,
  Star,
  Languages,
} from "lucide-react";
import {
  createBundleAction,
  updateBundleAction,
  getAvailablePartsForModelAction,
  type BundleInput,
} from "@/actions/bundle.actions";
import { translateBundleAction } from "@/actions/translate.actions";
import { ImageUploader, type ImageUploadItem } from "@/components/products/image-uploader";

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface CarModelOption {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  generation?: string | null;
}

interface MaterialOption {
  id: string;
  name: string;
  slug: string;
}

interface InstallationOption {
  id: string;
  name: string;
  slug: string;
}

interface AvailablePart {
  id: string;
  name: string;
  nameEn?: string | null;
  sku: string;
  slug: string;
  price: string;
  stockQuantity: number;
  status: string;
  downforceN?: string | null;
  dragN?: string | null;
  weightKg?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryNameEn?: string | null;
  categorySlug?: string | null;
  materialName?: string | null;
  carModelId?: string | null;
  primaryImage?: string | null;
}

interface BundleFormProps {
  brands: BrandOption[];
  carModels: CarModelOption[];
  materials: MaterialOption[];
  installations: InstallationOption[];
  initialData?: {
    id: string;
    sku: string;
    name: string;
    nameEn?: string | null;
    slug: string;
    description?: string | null;
    descriptionEn?: string | null;
    shortDescription?: string | null;
    shortDescriptionEn?: string | null;
    brandId: string;
    carModelId: string;
    materialId?: string | null;
    installationId?: string | null;
    status: "draft" | "active" | "archived" | "out_of_stock";
    isFeatured: boolean;
    isCustomCfd: boolean;
    customDownforceN?: string | null;
    customDragN?: string | null;
    items: Array<{
      id: string;
      childProductId: string;
      childName: string;
      childNameEn?: string | null;
      childPrice: string;
      categoryId?: string | null;
      categoryName?: string | null;
      categoryNameEn?: string | null;
    }>;
    images: Array<{
      id: string;
      secureUrl: string;
      cloudinaryPublicId: string;
      position: number;
      isPrimary: boolean;
    }>;
  };
  isEdit?: boolean;
}

export function BundleForm({
  brands,
  carModels,
  materials,
  installations,
  initialData,
  isEdit = false,
}: BundleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Language Tab State (Default: English)
  const [activeLangTab, setActiveLangTab] = useState<"th" | "en">("en");

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn || "");
  const [sku, setSku] = useState(initialData?.sku || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || "");
  const [shortDescriptionEn, setShortDescriptionEn] = useState(initialData?.shortDescriptionEn || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [status, setStatus] = useState<"draft" | "active" | "archived" | "out_of_stock">(
    initialData?.status || "active"
  );
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);

  const [brandId, setBrandId] = useState(initialData?.brandId || (brands[0]?.id || ""));
  const [carModelId, setCarModelId] = useState(initialData?.carModelId || "");
  const [materialId, setMaterialId] = useState(initialData?.materialId || "");
  const [installationId, setInstallationId] = useState(initialData?.installationId || "");

  // CFD State
  const [isCustomCfd, setIsCustomCfd] = useState(initialData?.isCustomCfd || false);
  const [customDownforceN, setCustomDownforceN] = useState(initialData?.customDownforceN || "");
  const [customDragN, setCustomDragN] = useState(initialData?.customDragN || "");

  // Child Parts State
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>(
    initialData?.items?.map((item) => item.childProductId) || []
  );
  const [availableParts, setAvailableParts] = useState<AvailablePart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  // Images State
  const [images, setImages] = useState<ImageUploadItem[]>(
    initialData?.images?.map((img) => ({
      id: img.id,
      publicId: img.cloudinaryPublicId,
      secureUrl: img.secureUrl,
      position: img.position,
      isPrimary: img.isPrimary,
    })) || []
  );

  // Filtered Models by Selected Brand
  const filteredModels = useMemo(() => {
    if (!brandId) return carModels;
    return carModels.filter((m) => m.brandId === brandId);
  }, [brandId, carModels]);

  // Set default model when brand changes
  useEffect(() => {
    if (filteredModels.length > 0 && (!carModelId || !filteredModels.some((m) => m.id === carModelId))) {
      setCarModelId(filteredModels[0].id);
    }
  }, [brandId, filteredModels, carModelId]);

  // Fetch available single parts when carModelId changes
  useEffect(() => {
    if (!carModelId) return;

    let isMounted = true;
    setIsLoadingParts(true);

    getAvailablePartsForModelAction(carModelId).then((res) => {
      if (!isMounted) return;
      setIsLoadingParts(false);
      if (res.success) {
        setAvailableParts(res.parts as AvailablePart[]);
      } else {
        setAvailableParts([]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [carModelId]);

  // Group available parts by Category
  const partsByCategory = useMemo(() => {
    const map = new Map<string, { categoryName: string; parts: AvailablePart[] }>();

    availableParts.forEach((part) => {
      const catKey = part.categoryId || "uncategorized";
      const catName = part.categoryName || "ทั่วไป (General)";
      if (!map.has(catKey)) {
        map.set(catKey, { categoryName: catName, parts: [] });
      }
      map.get(catKey)!.parts.push(part);
    });

    return Array.from(map.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      parts: data.parts,
    }));
  }, [availableParts]);

  // Selected Parts Details
  const selectedPartsList = useMemo(() => {
    return availableParts.filter((p) => selectedPartIds.includes(p.id));
  }, [availableParts, selectedPartIds]);

  // Calculations
  const calculatedTotalPrice = useMemo(() => {
    return selectedPartsList.reduce((sum, p) => sum + Number(p.price || 0), 0);
  }, [selectedPartsList]);

  const defaultTotalDownforce = useMemo(() => {
    return selectedPartsList.reduce((sum, p) => sum + Number(p.downforceN || 0), 0);
  }, [selectedPartsList]);

  const defaultTotalDrag = useMemo(() => {
    return selectedPartsList.reduce((sum, p) => sum + Number(p.dragN || 0), 0);
  }, [selectedPartsList]);

  const minStock = useMemo(() => {
    if (selectedPartsList.length === 0) return 0;
    return Math.min(...selectedPartsList.map((p) => p.stockQuantity || 0));
  }, [selectedPartsList]);

  // Toggle Part Selection:
  // Enforce Rule: Only 1 part per category! Selecting a part replaces any existing selection in the same category.
  const handleTogglePart = (part: AvailablePart) => {
    const isCurrentlySelected = selectedPartIds.includes(part.id);

    if (isCurrentlySelected) {
      // Deselect
      setSelectedPartIds((prev) => prev.filter((id) => id !== part.id));
    } else {
      // Find if there is another part in the same category already selected
      const sameCategoryPart = availableParts.find(
        (p) => p.categoryId === part.categoryId && selectedPartIds.includes(p.id)
      );

      if (sameCategoryPart) {
        // Swap selection in this category
        setSelectedPartIds((prev) => [...prev.filter((id) => id !== sameCategoryPart.id), part.id]);
      } else {
        // Add new selection
        setSelectedPartIds((prev) => [...prev, part.id]);
      }
    }
  };

  // Auto SKU Suggestion
  const handleGenerateSku = () => {
    const selectedModel = carModels.find((m) => m.id === carModelId);
    const modelCode = (selectedModel?.name || "CAR").toUpperCase().replace(/\s+/g, "").slice(0, 4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setSku(`KIT-${modelCode}-STAGE${selectedPartIds.length > 3 ? "2" : "1"}-${randomSuffix}`);
  };

  // Auto Translate from English to Thai in one click
  const handleAutoTranslateToThai = async () => {
    if (!nameEn?.trim() && !shortDescriptionEn?.trim() && !descriptionEn?.trim()) {
      setErrorMessage("กรุณากรอกข้อมูลภาษาอังกฤษ (ชื่อชุดเซ็ต หรือคำอธิบาย) ก่อนกดแปลภาษา");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsTranslating(true);
    setErrorMessage(null);
    try {
      const res = await translateBundleAction({
        nameEn,
        shortDescriptionEn,
        descriptionEn,
      });

      if (res.success && res.data) {
        if (res.data.name) setName(res.data.name);
        if (res.data.shortDescription) setShortDescription(res.data.shortDescription);
        if (res.data.description) setDescription(res.data.description);

        setSuccessMessage("แปลข้อมูลภาษาไทยจากภาษาอังกฤษสำเร็จเรียบร้อยแล้ว!");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "ไม่สามารถแปลภาษาได้ กรุณาลองใหม่อีกครั้ง");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อระบบแปลภาษา");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsTranslating(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation 1: Min 2 parts
    if (selectedPartIds.length < 2) {
      setErrorMessage("ชุดเซ็ตต้องประกอบด้วยชิ้นส่วนอย่างน้อย 2 ชิ้นขึ้นไป กรุณาเลือกชิ้นส่วนเพิ่มเติม");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!nameEn.trim() && !name.trim()) {
      setActiveLangTab("en");
      setErrorMessage("กรุณากรอกชื่อชุดเซ็ตภาษาอังกฤษ (Kit Name)");
      return;
    }

    if (!sku.trim()) {
      setErrorMessage("กรุณากรอกรหัสสินค้า SKU");
      return;
    }

    const payload: BundleInput = {
      name: name.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || null,
      sku: sku.trim(),
      slug: slug.trim() || undefined,
      shortDescription: shortDescription.trim() || null,
      shortDescriptionEn: shortDescriptionEn.trim() || null,
      description: description.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      brandId,
      carModelId,
      materialId: materialId || null,
      installationId: installationId || null,
      status,
      isFeatured,
      isCustomCfd,
      customDownforceN: isCustomCfd && customDownforceN ? customDownforceN : null,
      customDragN: isCustomCfd && customDragN ? customDragN : null,
      childProductIds: selectedPartIds,
      images,
    };

    startTransition(async () => {
      let result;
      if (isEdit && initialData?.id) {
        result = await updateBundleAction(initialData.id, payload);
      } else {
        result = await createBundleAction(payload);
      }

      if (result.success) {
        setSuccessMessage(result.message || "บันทึกข้อมูลชุดเซ็ตสำเร็จ");
        setTimeout(() => {
          router.push("/bundles");
          router.refresh();
        }, 1200);
      } else {
        setErrorMessage(result.message || "เกิดข้อผิดพลาดในการบันทึก");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/bundles"
            className="p-2 bg-[#1A1A1A] hover:bg-[#262626] text-gray-300 hover:text-white rounded-lg border border-[#2A2A2A] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                AERO KIT BUILDER
              </span>
              <h1 className="text-xl font-bold text-white tracking-wide">
                {isEdit ? `แก้ไขชุดเซ็ต: ${initialData?.name}` : "สร้างชุดเซ็ตสินค้าใหม่ (New Aero Kit)"}
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              เลือกชิ้นส่วนรถรุ่นเดียวกันอย่างน้อย 2 ชิ้นเพื่อรวมเป็นเซ็ต ราคารวมคำนวณตามจริงอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/bundles"
            className="px-4 py-2 bg-[#1C1C1C] hover:bg-[#282828] text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-[#2C2C2C] transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-red-900/30 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEdit ? "บันทึกการแก้ไข" : "สร้างชุดเซ็ต"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-sm animate-in fade-in duration-200">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-red-200">ไม่สามารถทำรายการได้:</strong>
            <p className="mt-0.5 text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Car Model Selection & Aero Parts Picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Step 1: Select Brand & Car Model */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-[#222222] pb-3">
              <Car size={18} className="text-[var(--accent-red)]" />
              <span>ขั้นตอนที่ 1: เลือกรุ่นรถยนต์ (Car Model Fitment)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  แบรนด์รถยนต์ (Brand) <span className="text-red-500">*</span>
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  disabled={isEdit}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-60"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  รุ่นรถยนต์ (Model) <span className="text-red-500">*</span>
                </label>
                <select
                  value={carModelId}
                  onChange={(e) => {
                    setCarModelId(e.target.value);
                    if (!isEdit) setSelectedPartIds([]);
                  }}
                  disabled={isEdit}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-60"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.generation ? `(${m.generation})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEdit && (
              <p className="text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                * ไม่อนุญาตให้เปลี่ยนรุ่นรถระหว่างการแก้ไขชุดเซ็ต เพื่อความสอดคล้องของ Fitment Compatibility
              </p>
            )}
          </div>

          {/* 2. Step 2: Interactive Aero Parts Checklist Grouped by Category */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Layers size={18} className="text-amber-400" />
                <span>ขั้นตอนที่ 2: เลือกชิ้นส่วน Aero Parts เข้าชุดเซ็ต</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    selectedPartIds.length >= 2
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  เลือกแล้ว {selectedPartIds.length} ชิ้น (ขั้นต่ำ 2 ชิ้น)
                </span>
              </div>
            </div>

            {isLoadingParts ? (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-amber-400" />
                <span className="text-sm">กำลังโหลดรายการชิ้นส่วนของรุ่นรถนี้...</span>
              </div>
            ) : partsByCategory.length === 0 ? (
              <div className="py-10 text-center text-gray-500 bg-[#161616] rounded-lg border border-[#242424]">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm text-gray-300 font-semibold">
                  ยังไม่มีชิ้นส่วน Aero Parts (Single Parts) สำหรับรุ่นรถนี้ในระบบ
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  กรุณาไปที่หน้า &quot;Products&quot; เพื่อเพิ่มชิ้นส่วนเดี่ยวของรุ่นนี้อย่างน้อย 2 ชิ้นก่อนสร้างชุดเซ็ต
                </p>
                <Link
                  href="/products/new"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  ไปเพิ่มชิ้นส่วนเดี่ยว
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-gray-400">
                  💡 กฎการจัดเซ็ต: <strong>1 หมวดหมู่เลือกได้สูงสุด 1 ชิ้นส่วน</strong> (การคลิกเลือกชิ้นใหม่ในหมวดเดียวกันจะสลับชิ้นเดิมออกให้อัตโนมัติ)
                </p>

                {partsByCategory.map(({ categoryId, categoryName, parts }) => {
                  const hasSelectedInCategory = parts.some((p) => selectedPartIds.includes(p.id));

                  return (
                    <div
                      key={categoryId}
                      className={`rounded-xl border transition-all p-4 ${
                        hasSelectedInCategory
                          ? "bg-[#181818] border-amber-500/40 shadow-sm"
                          : "bg-[#151515] border-[#252525]"
                      }`}
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag size={15} className="text-amber-400" />
                          <span className="font-bold text-white text-sm">
                            หมวดหมู่: {categoryName}
                          </span>
                        </div>
                        {hasSelectedInCategory ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Check size={12} /> เลือกแล้ว 1 ชิ้น
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500">ยังไม่ได้เลือก</span>
                        )}
                      </div>

                      {/* Parts Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {parts.map((part) => {
                          const isSelected = selectedPartIds.includes(part.id);

                          return (
                            <div
                              key={part.id}
                              onClick={() => handleTogglePart(part)}
                              className={`cursor-pointer rounded-lg border p-3 flex gap-3 items-center transition-all duration-200 select-none ${
                                isSelected
                                  ? "bg-amber-950/20 border-amber-500/60 shadow-md ring-1 ring-amber-500/50"
                                  : "bg-[#1c1c1c] border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222222]"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="relative w-14 h-14 rounded-md bg-black/40 border border-[#333333] shrink-0 overflow-hidden flex items-center justify-center">
                                {part.primaryImage ? (
                                  <Image
                                    src={part.primaryImage}
                                    alt={part.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <Package size={20} className="text-gray-600" />
                                )}
                              </div>

                              {/* Part Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="font-semibold text-xs text-white truncate">
                                    {part.name}
                                  </h4>
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? "bg-amber-500 border-amber-500 text-black font-black"
                                        : "border-[#444444]"
                                    }`}
                                  >
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </div>
                                </div>

                                <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                                  SKU: {part.sku}
                                </div>
                                {part.nameEn && (
                                  <div className="text-[10px] text-gray-400 truncate mt-0.5" title={part.nameEn}>
                                    EN: {part.nameEn}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-1.5 text-xs">
                                  <span className="font-mono font-bold text-amber-400">
                                    ฿{Number(part.price).toLocaleString()}
                                  </span>
                                  {part.downforceN && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                      <Wind size={10} className="text-[var(--accent-red)]" />
                                      +{part.downforceN}N
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Step 3: Bundle Details & Descriptions */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Boxes size={18} className="text-[var(--accent-red)]" />
                <span>ขั้นตอนที่ 3: ข้อมูลรายละเอียดชุดเซ็ต</span>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141414] border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setActiveLangTab("en")}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeLangTab === "en"
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🇬🇧 English (หลัก / Primary)</span>
                  {nameEn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab("th")}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeLangTab === "th"
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🇹🇭 ภาษาไทย (รอง / Optional)</span>
                  {name && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
              </div>
            </div>

            {/* Auto-Translate Banner for Thai Tab */}
            {activeLangTab === "th" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-800/40 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>แปลภาษาไทยอัตโนมัติจากฝั่งอังกฤษ</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono">1-Click</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      ดึงชื่อชุดเซ็ต, คำอธิบายสั้น และรายละเอียดจากภาษาอังกฤษมาแปลและกรอกลงช่องให้อัตโนมัติทันที
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoTranslateToThai}
                  disabled={isTranslating}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>กำลังแปลภาษา...</span>
                    </>
                  ) : (
                    <>
                      <Languages size={13} />
                      <span>แปลภาษาไทยอัตโนมัติ</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2-Column Grid matching reference layout:
                Row 1: Kit Name | SKU (with auto-generate)
                Row 2: URL Slug | Status
                Row 3: Material | Installation Method
            */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Row 1 Left: Kit Name */}
              {activeLangTab === "en" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    KIT NAME (ENGLISH) <span className="text-red-500">* (หลัก / Primary)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full Aero Body Kit — Clubsport Spec"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                  {name && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      ชื่อภาษาไทย (TH): <span className="text-gray-400">{name}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    ชื่อชุดเซ็ต (KIT NAME) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={nameEn ? `เช่น ${nameEn}` : "เช่น Full Aero Body Kit — Clubsport Spec"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                  {nameEn && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      Kit Name (EN): <span className="text-gray-400">{nameEn}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Row 1 Right: SKU with Auto-generate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    รหัสสินค้า (SKU) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors font-medium"
                  >
                    <Wand2 size={12} />
                    สร้าง SKU อัตโนมัติ
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="เช่น KIT-GR86-FULL-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              {/* Row 2 Left: URL Slug */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  URL SLUG (ไม่ระบุระบบจะสร้างให้อัตโนมัติ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น full-aero-body-kit-gr86"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              {/* Row 2 Right: Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  สถานะสินค้า (STATUS)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="active">วางขายอยู่ (Active)</option>
                  <option value="draft">ฉบับร่าง (Draft)</option>
                  <option value="out_of_stock">สินค้าหมด (Out of Stock)</option>
                  <option value="archived">เก็บถาวร (Archived)</option>
                </select>
              </div>

              {/* Row 3 Left: Material */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  วัสดุหลักของเซ็ต (MATERIAL)
                </label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="">เลือกวัสดุ (ตามชิ้นส่วนย่อย)</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3 Right: Installation Method */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  วิธีการติดตั้ง (INSTALLATION METHOD)
                </label>
                <select
                  value={installationId}
                  onChange={(e) => setInstallationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="">เลือกวิธีการติดตั้ง</option>
                  {installations.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descriptions based on Language */}
            {activeLangTab === "en" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    SHORT DESCRIPTION (ENGLISH)
                    <span className="text-gray-500 font-normal ml-1.5 text-[11px] lowercase">(ไม่บังคับ)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Summary of this aero kit in 1-2 sentences in English..."
                    value={shortDescriptionEn}
                    onChange={(e) => setShortDescriptionEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    FULL DESCRIPTION (ENGLISH)
                    <span className="text-gray-500 font-normal ml-1.5 text-[11px] lowercase">(ไม่บังคับ)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Full description, specifications, compatibility, and features in English..."
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    คำอธิบายสั้น (SHORT DESCRIPTION)
                    <span className="text-gray-500 font-normal ml-1.5 text-[11px] lowercase">(ไม่บังคับ)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="สรุปจุดเด่นของชุดเซ็ตนี้ใน 1-2 ประโยค"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    รายละเอียดแบบเต็ม (FULL DESCRIPTION)
                    <span className="text-gray-500 font-normal ml-1.5 text-[11px] lowercase">(ไม่บังคับ)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="อธิบายรายละเอียด สเปก ความเข้ากันได้ และคุณสมบัติของชุดเซ็ตแบบละเอียด"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </>
            )}

            <div className="pt-2 p-3.5 bg-[#171410] border border-amber-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <div className="flex items-center gap-2">
                  <Star size={14} className={isFeatured ? "text-amber-400 fill-amber-400" : "text-gray-400"} />
                  <span className="text-xs font-bold text-white">
                    ตั้งเป็นชุดเซ็ตแนะนำบนหน้าแรก (Featured Bundle)
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-extrabold">
                    สูงสุด 4 ชุด
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 pl-13">
                * ชุดเซ็ตที่เลือกเป็นเซ็ตแนะนำจะถูกดึงไปแสดงในส่วน Flagship Showcase บนหน้าแรกของ Storefront (จำกัดพร้อมกันไม่เกิน 4 ชุด)
              </p>
            </div>
          </div>

          {/* 4. Step 4: Bundle Images Uploader */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles size={18} className="text-amber-400" />
                <span>ขั้นตอนที่ 4: รูปภาพชุดเซ็ต (Kit Photography)</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              อัปโหลดรูปภาพรถทั้งคันที่ติดตั้งชุดแต่งครบชุด รูปแรกจะถูกตั้งเป็นรูปหน้าปกหลัก
            </p>
            <ImageUploader
              images={images}
              onChange={setImages}
              maxImages={10}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Right 1 Column: Live Financial & CFD Aero Telemetry Summary */}
        <div className="space-y-6">
          {/* Dynamic Financial Summary Card */}
          <div className="bg-gradient-to-b from-[#181818] to-[#121212] border border-[#2E2E2E] rounded-xl p-5 shadow-xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  สรุปราคายกเซ็ต (Live Price)
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                DYNAMIC SUM
              </span>
            </div>

            {/* Total Price Big Box */}
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 text-center space-y-1">
              <span className="text-xs text-gray-400">ราคารวมของชุดเซ็ต</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                ฿{calculatedTotalPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-500">
                * คำนวณจากผลรวมของราคาชิ้นส่วนย่อย {selectedPartsList.length} ชิ้น
              </p>
            </div>

            {/* Selected Parts List Breakdown */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>ชิ้นส่วนในเซ็ต ({selectedPartsList.length}):</span>
                <span className="text-[11px] text-gray-400 font-mono">
                  สต็อกพร้อมส่ง: {minStock} ชุด
                </span>
              </span>

              {selectedPartsList.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-center text-xs text-gray-500">
                  ยังไม่ได้เลือกชิ้นส่วน (กรุณาเลือกอย่างน้อย 2 ชิ้น)
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedPartsList.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between text-xs p-2 rounded bg-[#161616] border border-[#242424]"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-gray-300 truncate font-medium">
                          {part.categoryName}: {part.name}
                        </span>
                      </div>
                      <span className="font-mono text-amber-400 font-bold shrink-0">
                        ฿{Number(part.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CFD Aerodynamics Telemetry Card */}
            <div className="border-t border-[#2A2A2A] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Wind size={16} className="text-[var(--accent-red)]" />
                  <span className="font-bold text-xs text-white">
                    CFD Aero Telemetry รวม
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomCfd((prev) => !prev)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                    isCustomCfd
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                      : "bg-[#222222] text-gray-400 border-[#333333] hover:text-white"
                  }`}
                >
                  {isCustomCfd ? "โหมด: กำหนดเอง (Custom)" : "โหมด: ผลรวมอัตโนมัติ"}
                </button>
              </div>

              {!isCustomCfd ? (
                <div className="grid grid-cols-2 gap-2 bg-[#0E0E0E] p-3 rounded-lg border border-[#222222] text-center font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 block">DOWNFORCE รวม</span>
                    <span className="text-sm font-bold text-white">
                      +{defaultTotalDownforce} N
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">DRAG รวม</span>
                    <span className="text-sm font-bold text-gray-300">
                      {defaultTotalDrag} N
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-[#0E0E0E] p-3 rounded-lg border border-blue-500/30">
                  <div className="text-[10px] text-blue-400">
                    ✏️ ระบุค่า Downforce และ Drag รวมที่ผ่านการปรับแต่งหรือทดสอบจริง:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">
                        Downforce (+N)
                      </label>
                      <input
                        type="text"
                        placeholder={`${defaultTotalDownforce}`}
                        value={customDownforceN}
                        onChange={(e) => setCustomDownforceN(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#333333] rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">
                        Drag (-N / N)
                      </label>
                      <input
                        type="text"
                        placeholder={`${defaultTotalDrag}`}
                        value={customDragN}
                        onChange={(e) => setCustomDragN(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#333333] rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isPending || selectedPartIds.length < 2}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isEdit ? "บันทึกการแก้ไขชุดเซ็ต" : "ยืนยันการสร้างชุดเซ็ต"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification for Success / Error */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141414]/95 border border-emerald-500/60 text-emerald-300 shadow-2xl backdrop-blur-md animate-fade-in text-xs font-semibold max-w-md">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span className="flex-1 leading-snug">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl bg-[#141414]/95 border border-red-500/60 text-red-300 shadow-2xl backdrop-blur-md animate-fade-in text-xs font-semibold max-w-md">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p>{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </form>
  );
}
