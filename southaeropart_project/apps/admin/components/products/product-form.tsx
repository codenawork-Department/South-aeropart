"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createProductAction,
  updateProductAction,
  generateSuggestedSkuAction,
  checkSkuAvailabilityAction,
  type ProductInput,
} from "@/actions/product.actions";
import { translateProductAction } from "@/actions/translate.actions";
import { parseSku } from "@/lib/sku-helper";
import { ImageUploader, type ImageUploadItem } from "./image-uploader";
import { IconPicker } from "@/components/icons/icon-picker";
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
  Wand2,
  HelpCircle,
  Hash,
  Info,
  Check,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Zap,
  Shield,
  Star,
  Wind,
  Wrench,
  ExternalLink,
  X,
  Languages,
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
  yearFrom?: number | null;
  yearTo?: number | null;
}

interface MaterialOption {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface InstallationOption {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
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
    nameEn?: string | null;
    slug: string;
    description?: string | null;
    descriptionEn?: string | null;
    shortDescription?: string | null;
    shortDescriptionEn?: string | null;
    price: string;
    compareAtPrice?: string | null;
    stockQuantity: number;
    status: "draft" | "active" | "archived" | "out_of_stock";
    isFeatured?: boolean | null;
    weightKg?: string | null;
    installation?: string | null;
    installationEn?: string | null;
    installationId?: string | null;
    categoryId?: string | null;
    brandId?: string | null;
    carModelId?: string | null;
    materialId?: string | null;
    downforceN?: string | null;
    dragN?: string | null;
    downforceBefore?: string | null;
    downforceAfter?: string | null;
    dragBefore?: string | null;
    dragAfter?: string | null;
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
    features?: Array<{
      title: string;
      titleEn?: string | null;
      description: string;
      descriptionEn?: string | null;
      iconSlug?: string | null;
      iconId?: string | null;
    }>;
  };
  categories: CategoryOption[];
  brands: BrandOption[];
  carModels: CarModelOption[];
  materials: MaterialOption[];
  installations: InstallationOption[];
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  categories,
  brands,
  carModels,
  materials,
  installations,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Active Language Tab for General Info / Descriptions / Features (Default: English)
  const [activeLangTab, setActiveLangTab] = useState<"th" | "en">("en");
  const [isTranslating, setIsTranslating] = useState(false);

  // Form states
  const [sku, setSku] = useState(initialData?.sku || "");
  const [name, setName] = useState(initialData?.name || "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
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

  // New fields
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || "");
  const [shortDescriptionEn, setShortDescriptionEn] = useState(initialData?.shortDescriptionEn || "");
  const [materialId, setMaterialId] = useState(initialData?.materialId || "");
  const [installationId, setInstallationId] = useState(initialData?.installationId || "");
  const [installation, setInstallation] = useState(initialData?.installation || "");
  const [installationEn, setInstallationEn] = useState(initialData?.installationEn || "");
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [downforceN, setDownforceN] = useState(initialData?.downforceN || "");
  const [dragN, setDragN] = useState(initialData?.dragN || "");
  const [downforceBefore, setDownforceBefore] = useState(initialData?.downforceBefore || "");
  const [downforceAfter, setDownforceAfter] = useState(initialData?.downforceAfter || "");
  const [dragBefore, setDragBefore] = useState(initialData?.dragBefore || "");
  const [dragAfter, setDragAfter] = useState(initialData?.dragAfter || "");

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // SKU Auto-generation & Helper States
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [showSkuGuide, setShowSkuGuide] = useState(false);
  const [skuFeedback, setSkuFeedback] = useState<{
    status: "idle" | "success" | "warning";
    message: string;
  } | null>(null);
  const [skuAvailability, setSkuAvailability] = useState<{
    isAvailable?: boolean;
    message?: string;
    isChecking?: boolean;
  } | null>(null);

  // Available models filtered by brand
  const availableModels = useMemo(() => {
    if (!brandId) return carModels;
    return carModels.filter((m) => m.brandId === brandId);
  }, [brandId, carModels]);

  // Cloudinary Folder Path Preview & Selected Entity Labels
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = carModels.find((m) => m.id === carModelId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const previewCloudinaryPath = `south-aero/products/${selectedBrand?.slug || "general"}/${selectedModel?.slug || "universal"}/${selectedCategory?.slug || "aeropart"}/${slug || "product-slug"}`;

  // Live SKU Decoder: Breakdown format [Brand][Model]-[Type][Seq] e.g. HDAC-DT01
  const parsedSku = useMemo(() => {
    return parseSku(
      sku,
      selectedBrand?.name,
      selectedModel?.name,
      selectedCategory?.name
    );
  }, [sku, selectedBrand, selectedModel, selectedCategory]);

  const handleAutoGenerateSku = async (silent = false) => {
    setIsGeneratingSku(true);
    try {
      const res = await generateSuggestedSkuAction({
        brandId: brandId || null,
        carModelId: carModelId || null,
        categoryId: categoryId || null,
      });
      if (res.success && res.data) {
        setSku(res.data.sku);
        setSkuFeedback({
          status: "success",
          message: `สร้างรหัส: ${res.data.sku} (${res.data.brandName} ${res.data.modelName} · ${res.data.categoryName} ลำดับ #${res.data.sequence})`,
        });
        setSkuAvailability({
          isAvailable: true,
          message: "รหัส SKU นี้พร้อมใช้งาน (รันหมายเลขลำดับล่าสุดอัตโนมัติ ไม่ซ้ำ)",
        });
      } else if (!silent) {
        setSkuFeedback({
          status: "warning",
          message: res.message || "ไม่สามารถคำนวณรหัส SKU อัตโนมัติได้",
        });
      }
    } catch {
      if (!silent) {
        setSkuFeedback({
          status: "warning",
          message: "เกิดข้อผิดพลาดในการสร้างรหัส SKU",
        });
      }
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const handleSkuBlur = async () => {
    if (!sku.trim()) {
      setSkuAvailability(null);
      return;
    }
    setSkuAvailability({ isChecking: true });
    const res = await checkSkuAvailabilityAction(sku, initialData?.id);
    setSkuAvailability({
      isAvailable: res.isAvailable,
      message: res.message,
      isChecking: false,
    });
  };

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

  // Key Features state
  interface FormFeatureItem {
    title: string;
    titleEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    iconSlug?: string | null;
    iconId?: string | null;
  }

  const [features, setFeatures] = useState<FormFeatureItem[]>(
    initialData?.features?.map((f) => ({
      title: f.title,
      titleEn: f.titleEn || "",
      description: f.description,
      descriptionEn: f.descriptionEn || "",
      iconSlug: f.iconSlug || null,
      iconId: f.iconId || null,
    })) || []
  );

  const handleAddFeature = () => {
    setFeatures((prev) => [
      ...prev,
      {
        title: "",
        titleEn: "",
        description: "",
        descriptionEn: "",
        iconSlug: "aero-downforce",
        iconId: null,
      },
    ]);
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFeature = (
    idx: number,
    field: keyof FormFeatureItem,
    value: string | null
  ) => {
    setFeatures((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleMoveFeature = (idx: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? idx - 1 : idx + 1;
    if (targetIndex < 0 || targetIndex >= features.length) return;
    const updated = [...features];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIndex, 0, moved);
    setFeatures(updated);
  };

  const handleLoadAeroPresets = () => {
    const defaultPresets: FormFeatureItem[] = [
      {
        title: "High-Speed Downforce Generation",
        description:
          "ออกแบบตามหลักอากาศพลศาสตร์ จัดระเบียบกระแสลมและสร้างแรงกดท้ายรถ (Positive Downforce) เพื่อการทรงตัวที่มั่นคงในย่านความเร็วสูง",
        iconSlug: "aero-downforce",
      },
      {
        title: "3D Laser Scan & CAD Precision Fit",
        description:
          "ขึ้นรูปจากโมเดลสแกน 3 มิติจากตัวรถจริง เข้ารูปแนบสนิท 100% ตามแนวเส้นสายตัวถังเดิม ไม่ต้องดัดแปลงตัวรถ",
        iconSlug: "fitment-cad",
      },
      {
        title: "Pre-preg Carbon / High-Grade ABS",
        description:
          "วัสดุเกรดพรีเมียม น้ำหนักเบา ทนทานต่อแรงกระแทก เคลือบชั้นกันรังสี UV แบบ High-Gloss ใสเงางาม ไม่ซีดเหลือง",
        iconSlug: "material-carbon",
      },
      {
        title: "Direct Bolt-On & 3M VHB Tape Mounting",
        description:
          "รองรับการติดตั้งแบบตรงรุ่น พร้อมอุปกรณ์ยึดและเทปกาว 3M VHB คุณภาพสูง แน่นหนา ปลอดภัยต่อสีรถ",
        iconSlug: "install-hardware",
      },
    ];

    if (features.length > 0) {
      if (!confirm("คุณต้องการโหลดชุดเทมเพลตมาตรฐาน Aeropart ทับรายการจุดเด่นปัจจุบันหรือไม่?")) {
        return;
      }
    }

    setFeatures(defaultPresets);
  };

  // Vehicle Compatibility state
  const [compatibility, setCompatibility] = useState<CompatibilityItem[]>(
    () => {
      if (initialData?.compatibility && initialData.compatibility.length > 0) {
        return initialData.compatibility.map((c) => ({
          make: c.make,
          model: c.model,
          yearFrom: c.yearFrom,
          yearTo: c.yearTo,
        }));
      }
      // If brand and carModel were pre-selected, auto-initialize first compatibility row
      if (initialData?.carModelId) {
        const m = carModels.find((model) => model.id === initialData.carModelId);
        const b = brands.find(
          (brand) => brand.id === (m?.brandId || initialData.brandId)
        );
        if (m && b) {
          return [
            {
              make: b.name,
              model: m.name,
              yearFrom: m.yearFrom || 2022,
              yearTo: m.yearTo || 2025,
            },
          ];
        }
      }
      return [];
    }
  );

  const addCompatibilityRow = () => {
    const selectedModelNames = new Set(
      compatibility.map((c) => c.model.trim().toLowerCase())
    );

    // Try to find a model from DB that isn't selected yet
    let targetBrand = brands.find((b) => b.id === brandId) || brands[0];
    let candidateModel = carModels.find(
      (m) =>
        m.brandId === targetBrand?.id &&
        !selectedModelNames.has(m.name.trim().toLowerCase())
    );

    // If all models in targetBrand are already selected, search other brands
    if (!candidateModel) {
      for (const b of brands) {
        candidateModel = carModels.find(
          (m) =>
            m.brandId === b.id &&
            !selectedModelNames.has(m.name.trim().toLowerCase())
        );
        if (candidateModel) {
          targetBrand = b;
          break;
        }
      }
    }

    if (!candidateModel) {
      alert("ได้เลือกรุ่นรถที่มีอยู่ในฐานข้อมูลครบทุกรุ่นแล้ว ไม่สามารถเพิ่มซ้ำได้");
      return;
    }

    setCompatibility((prev) => [
      ...prev,
      {
        make: targetBrand?.name || "",
        model: candidateModel!.name,
        yearFrom: candidateModel!.yearFrom || 2022,
        yearTo: candidateModel!.yearTo || 2025,
      },
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

  // Top Section Brand Change Handler (Auto-sync to compatibility[0])
  const handleBrandChange = (newBrandId: string) => {
    setBrandId(newBrandId);
    if (!newBrandId) {
      setCarModelId("");
      return;
    }

    const brandObj = brands.find((b) => b.id === newBrandId);
    const modelsOfBrand = carModels.filter((m) => m.brandId === newBrandId);
    const currentModelInNewBrand = modelsOfBrand.find((m) => m.id === carModelId);

    if (currentModelInNewBrand) {
      if (brandObj) {
        setCompatibility((prev) => {
          const newRow: CompatibilityItem = {
            make: brandObj.name,
            model: currentModelInNewBrand.name,
            yearFrom: currentModelInNewBrand.yearFrom || 2022,
            yearTo: currentModelInNewBrand.yearTo || 2025,
          };
          if (prev.length === 0) return [newRow];
          return [newRow, ...prev.slice(1).filter((r) => r.model !== currentModelInNewBrand.name)];
        });
      }
    } else if (modelsOfBrand.length > 0) {
      const firstModel = modelsOfBrand[0];
      setCarModelId(firstModel.id);
      if (brandObj) {
        setCompatibility((prev) => {
          const newRow: CompatibilityItem = {
            make: brandObj.name,
            model: firstModel.name,
            yearFrom: firstModel.yearFrom || 2022,
            yearTo: firstModel.yearTo || 2025,
          };
          if (prev.length === 0) return [newRow];
          return [newRow, ...prev.slice(1).filter((r) => r.model !== firstModel.name)];
        });
      }
    } else {
      setCarModelId("");
    }
  };

  // Top Section Car Model Change Handler (Auto-sync to compatibility[0])
  const handleCarModelChange = (newModelId: string) => {
    setCarModelId(newModelId);
    if (newModelId) {
      const modelObj = carModels.find((m) => m.id === newModelId);
      const brandObj = brands.find(
        (b) => b.id === (modelObj?.brandId || brandId)
      );
      if (modelObj && brandObj) {
        if (brandId !== brandObj.id) {
          setBrandId(brandObj.id);
        }
        setCompatibility((prev) => {
          const newRow: CompatibilityItem = {
            make: brandObj.name,
            model: modelObj.name,
            yearFrom: modelObj.yearFrom || 2022,
            yearTo: modelObj.yearTo || 2025,
          };
          if (prev.length === 0) return [newRow];
          return [newRow, ...prev.slice(1).filter((r) => r.model !== modelObj.name)];
        });
      }
    }
  };

  // Auto-Translate all fields from English to Thai in 1 click
  const handleAutoTranslateToThai = async () => {
    const hasEnglishFeatures = features.some((f) => f.titleEn?.trim() || f.descriptionEn?.trim());
    if (!nameEn?.trim() && !shortDescriptionEn?.trim() && !descriptionEn?.trim() && !hasEnglishFeatures) {
      setErrorMessage("กรุณากรอกข้อมูลภาษาอังกฤษ (ชื่อ, คำอธิบาย หรือจุดเด่น) ก่อนกดแปลภาษา");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsTranslating(true);
    setErrorMessage(null);
    try {
      const res = await translateProductAction({
        nameEn,
        shortDescriptionEn,
        descriptionEn,
        features: features.map((f) => ({
          titleEn: f.titleEn,
          descriptionEn: f.descriptionEn,
        })),
      });

      if (res.success && res.data) {
        if (res.data.name) setName(res.data.name);
        if (res.data.shortDescription) setShortDescription(res.data.shortDescription);
        if (res.data.description) setDescription(res.data.description);

        if (Array.isArray(res.data.features) && res.data.features.length > 0) {
          setFeatures((prev) =>
            prev.map((item, idx) => {
              const trans = res.data?.features[idx];
              if (!trans) return item;
              return {
                ...item,
                title: trans.title || item.title,
                description: trans.description || item.description,
              };
            })
          );
        }

        setSuccessMessage("แปลข้อมูลภาษาไทยจากภาษาอังกฤษสำเร็จเรียบร้อยทุกช่อง!");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    if (!nameEn.trim() && !name.trim()) {
      setActiveLangTab("en");
      setErrorMessage("กรุณากรอกชื่อสินค้าภาษาอังกฤษ (Product Name)");
      return;
    }

    const selectedInst = installations.find((i) => i.id === installationId);
    const payload: ProductInput = {
      sku: sku.trim(),
      name: name.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || null,
      slug: slug.trim() || undefined,
      description: description.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      shortDescription: shortDescription.trim() || null,
      shortDescriptionEn: shortDescriptionEn.trim() || null,
      price: price.trim(),
      compareAtPrice: compareAtPrice.trim() || null,
      stockQuantity: Number(stockQuantity),
      status,
      isFeatured,
      weightKg: weightKg.trim() || null,
      installation: selectedInst?.name || installation.trim() || null,
      installationEn: installationEn.trim() || null,
      installationId: installationId || null,
      categoryId: categoryId || null,
      brandId: brandId || null,
      carModelId: carModelId || null,
      materialId: materialId || null,
      downforceN: downforceN.trim() || null,
      dragN: dragN.trim() || null,
      downforceBefore: downforceBefore.trim() || null,
      downforceAfter: downforceAfter.trim() || null,
      dragBefore: dragBefore.trim() || null,
      dragAfter: dragAfter.trim() || null,
      images,
      compatibility: compatibility.filter((c) => c.make.trim() && c.model.trim()),
      features: features
        .filter((f) => (f.titleEn?.trim() || f.title.trim()) && (f.descriptionEn?.trim() || f.description.trim()))
        .map((f) => ({
          title: f.title.trim() || f.titleEn?.trim() || "",
          titleEn: f.titleEn?.trim() || null,
          description: f.description.trim() || f.descriptionEn?.trim() || "",
          descriptionEn: f.descriptionEn?.trim() || null,
          iconSlug: f.iconSlug || null,
          iconId: f.iconId || null,
        })),
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
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mt-1 list-disc list-inside text-[11px] text-red-300/80 space-y-0.5">
                {Object.entries(fieldErrors).map(([field, errs]) => (
                  <li key={field}>
                    <span className="font-medium capitalize">{field}:</span> {errs.join(", ")}
                  </li>
                ))}
              </ul>
            )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E1E] pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Package size={16} className="text-red-500" />
                ข้อมูลทั่วไปของสินค้า
              </h2>
              {/* Language Switcher Tabs */}
              <div className="flex items-center p-1 rounded-lg bg-[#181818] border border-[#2A2A2A] self-start sm:self-auto">
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

            <div className="space-y-4">
              {/* Auto-Translate Banner for Thai Tab */}
              {activeLangTab === "th" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-800/40 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Sparkles size={16} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>ระบบแปลภาษาไทยอัตโนมัติจากฝั่งอังกฤษ</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono">1-Click</span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        ดึงชื่อสินค้า, คำอธิบายสั้น, รายละเอียด และรายการจุดเด่นจากภาษาอังกฤษ มาแปลเป็นภาษาไทยและใส่ลงช่องทั้งหมดให้อัตโนมัติทันที
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
                        <span>แปลภาษาไทยทั้งหมด</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeLangTab === "en" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Product Name (English) <span className="text-red-500">* (หลัก / Primary)</span>
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    required={!name}
                    placeholder="e.g. GR86 Carbon Fiber Ducktail Spoiler"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                  {name && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      ชื่อภาษาไทย (TH): <span className="text-gray-400">{name}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    ชื่อสินค้า (ภาษาไทย)
                    <span className="text-gray-500 font-normal ml-1.5 text-[11px]">(ไม่บังคับ — หากเว้นว่างไว้จะแสดงภาษาอังกฤษ)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={nameEn ? `เช่น ${nameEn}` : "เช่น สปอยเลอร์หลัง Ducktail Carbon Fiber สำหรับ GR86"}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                  {nameEn && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      English Name: <span className="text-gray-400">{nameEn}</span>
                    </p>
                  )}
                </div>
              )}

              {/* ─── SKU Manager & Generator Section ─── */}
              <div className="p-4 rounded-xl bg-[#151515] border border-[#262626] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Hash size={14} className="text-red-500" />
                      <span>รหัสสินค้า (SKU)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSkuGuide(!showSkuGuide)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded-md bg-[#202020] hover:bg-[#282828] border border-white/5 transition-colors cursor-pointer"
                    >
                      <BookOpen size={11} className="text-amber-400" />
                      <span>{showSkuGuide ? "ซ่อนแนวทางตั้งรหัส" : "แนวทางการตั้งรหัส SKU"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoGenerateSku(false)}
                    disabled={isGeneratingSku}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingSku ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Wand2 size={13} />
                    )}
                    <span>สร้างรหัส SKU อัตโนมัติ</span>
                  </button>
                </div>

                {/* SKU Convention Guide Card */}
                {showSkuGuide && (
                  <div className="p-3.5 rounded-lg bg-[#0F0F0F] border border-amber-500/25 space-y-2.5 text-xs text-gray-300 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                        <Info size={14} className="text-amber-400" />
                        โครงสร้างการตั้งรหัส SKU มาตรฐาน South Aero
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        [แบรนด์][รุ่น]-[ประเภท][ลำดับ]
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                      <div className="bg-[#181818] p-2 rounded-md border border-white/5">
                        <span className="text-emerald-400 font-bold block text-sm">HD</span>
                        <span className="text-[10px] text-gray-400">Honda (แบรนด์)</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-md border border-white/5">
                        <span className="text-blue-400 font-bold block text-sm">AC</span>
                        <span className="text-[10px] text-gray-400">Accord (รุ่นรถ)</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-md border border-white/5">
                        <span className="text-purple-400 font-bold block text-sm">DT</span>
                        <span className="text-[10px] text-gray-400">Ducktail (ประเภท)</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-md border border-white/5">
                        <span className="text-orange-400 font-bold block text-sm">01, 02...</span>
                        <span className="text-[10px] text-gray-400">ลำดับชิ้นส่วน (ไม่ซ้ำ)</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                      💡 <strong>ตัวอย่าง:</strong> รหัส <code className="text-amber-300 font-bold bg-black/40 px-1 py-0.5 rounded">HDAC-DT01</code> คือ Ducktail ชิ้นที่ 1 ของ Honda Accord — หากมี Ducktail ลายใหม่อีกสำหรับรุ่นนี้ ระบบจะรันเป็น <code className="text-amber-300 font-bold bg-black/40 px-1 py-0.5 rounded">HDAC-DT02</code> อัตโนมัติ
                    </p>
                  </div>
                )}

                {/* SKU Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      onBlur={handleSkuBlur}
                      required
                      placeholder="เช่น HDAC-DT01"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors uppercase tracking-wider font-bold"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="URL Slug (เช่น south-aero-ducktail-accord)"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Live SKU Decoder Pills */}
                {parsedSku.isValid && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                    <span className="text-gray-500 text-[10px]">ถอดรหัส SKU:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      🚗 {parsedSku.brandCode}: {parsedSku.brandLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      🏎️ {parsedSku.modelCode}: {parsedSku.modelLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      🪽 {parsedSku.partCode}: {parsedSku.partLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                      🔢 ลำดับ #{parsedSku.sequence}
                    </span>
                  </div>
                )}

                {/* SKU Availability Feedback */}
                {skuAvailability && (
                  <div
                    className={`flex items-center gap-1.5 text-xs pt-1 ${
                      skuAvailability.isChecking
                        ? "text-gray-400"
                        : skuAvailability.isAvailable
                        ? "text-emerald-400"
                        : "text-rose-400 font-semibold"
                    }`}
                  >
                    {skuAvailability.isChecking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : skuAvailability.isAvailable ? (
                      <CheckCircle2 size={13} className="shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="shrink-0" />
                    )}
                    <span>{skuAvailability.message}</span>
                  </div>
                )}

                {skuFeedback && !skuAvailability && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 size={12} />
                    <span>{skuFeedback.message}</span>
                  </p>
                )}
              </div>

              {activeLangTab === "en" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Product Description (English)
                      <span className="text-gray-500 font-normal ml-1.5 text-[11px]">(ไม่บังคับ)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      placeholder="Material specifications, installation notes, warranty information in English..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
                      <BookOpen size={13} className="text-blue-400" />
                      Short Description (English)
                      <span className="text-gray-500 font-normal ml-1.5 text-[11px]">(ไม่บังคับ)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={shortDescriptionEn}
                      onChange={(e) => setShortDescriptionEn(e.target.value)}
                      placeholder="e.g. Premium autoclave carbon fiber ducktail spoiler engineered with 3D CAD precision."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">1-2 sentences overview shown under product title on storefront</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      รายละเอียดสินค้า (Description - ภาษาไทย)
                      <span className="text-gray-500 font-normal ml-1.5 text-[11px]">(ไม่บังคับ)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="รายละเอียดวัสดุ การใช้งาน คุณสมบัติพิเศษ และการรับประกัน..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
                      <BookOpen size={13} className="text-blue-400" />
                      คำอธิบายสั้น (Short Description - ภาษาไทย)
                      <span className="text-gray-500 font-normal">— แสดงผลใต้ชื่อสินค้าบนหน้าร้าน</span>
                    </label>
                    <textarea
                      rows={2}
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="เช่น สปอยเลอร์หลังพรีเมียมคาร์บอนไฟเบอร์ จากลาย 3D CAD ตรงรุ่น 100%"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">1-2 ประโยค ใช้อธิบายสินค้าสั้นๆ สำหรับแสดงระหว่างสินค้า</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section: Material & Installation */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <Shield size={16} className="text-teal-500" />
              วัสดุ & วิธีการติดตั้ง
            </h2>

            <div className="space-y-4">
              {/* Material Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Shield size={13} className="text-teal-400" />
                  วัสดุผลิต (Material)
                </label>
                {materials.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
                    <Info size={14} className="shrink-0 text-amber-400" />
                    <span>ยังไม่มีวัสดุในระบบ — </span>
                    <Link href="/catalog" className="underline text-amber-300 hover:text-white inline-flex items-center gap-1">
                      ไปเพิ่มวัสดุที่หน้า Catalog <ExternalLink size={11} />
                    </Link>
                  </div>
                ) : (
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    <option value="">— ไม่ระบุวัสดุ —</option>
                    {materials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name}{mat.description ? ` — ${mat.description.substring(0, 50)}...` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {materialId && (
                  <p className="text-[11px] text-teal-400 mt-1">
                    ✓ {materials.find((m) => m.id === materialId)?.name || ""}
                  </p>
                )}
              </div>

              {/* Installation Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Wrench size={13} className="text-orange-400" />
                  วิธีการติดตั้ง (Installation)
                </label>
                {installations.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
                    <Info size={14} className="shrink-0 text-amber-400" />
                    <span>ยังไม่มีวิธีการติดตั้งในระบบ — </span>
                    <Link href="/catalog" className="underline text-amber-300 hover:text-white inline-flex items-center gap-1">
                      ไปเพิ่มวิธีการติดตั้งที่หน้า Catalog <ExternalLink size={11} />
                    </Link>
                  </div>
                ) : (
                  <select
                    value={installationId}
                    onChange={(e) => setInstallationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="">— ไม่ระบุวิธีการติดตั้ง —</option>
                    {installations.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}{inst.description ? ` — ${inst.description.substring(0, 50)}...` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {installationId && (
                  <p className="text-[11px] text-orange-400 mt-1">
                    ✓ {installations.find((i) => i.id === installationId)?.name || ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section: CFD Aerodynamic Telemetry */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E1E1E] pb-3">
              <Wind size={16} className="text-blue-400" />
              ข้อมูลอากาศพลศาสตร์ (CFD Aerodynamic Telemetry)
              <span className="text-[10px] font-normal text-gray-500 ml-1">(ไม่บังคับ)</span>
            </h2>

            {/* isFeatured Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#151515] border border-[#252525]">
              <div className="flex items-center gap-2">
                <Star size={14} className={isFeatured ? "text-amber-400" : "text-gray-500"} />
                <span className="text-xs font-semibold text-gray-200">สินค้าแนะนำ (Featured Product)</span>
                <span className="text-[11px] text-gray-500">— แสดงบนหน้าหลัก หรือส่วน Featured บนเว็บ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFeatured(!isFeatured)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isFeatured ? "bg-amber-500" : "bg-[#2D2D2D]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${
                    isFeatured ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4">
              {/* Net Values Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    แรงกดสุทธิ์ — Downforce N
                    <span className="text-gray-500 font-normal ml-1">(N)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={downforceN}
                    onChange={(e) => setDownforceN(e.target.value)}
                    placeholder="เช่น -285.50"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">ค่าติดลบ = กดลงพื้นถนน ค่าบวก = แรงยกขึ้น</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    แรงต้านสุทธิ์ — Drag N
                    <span className="text-gray-500 font-normal ml-1">(N)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dragN}
                    onChange={(e) => setDragN(e.target.value)}
                    placeholder="เช่น 12.30"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">ค่าแรงต้านสุทธิ์จาก CFD</p>
                </div>
              </div>

              {/* Before / After Block */}
              <div className="p-4 rounded-xl bg-[#151515] border border-[#252525] space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={13} className="text-blue-400" />
                  ผลเปรียบเทียบ Before / After
                </div>

                {/* Downforce Before / After */}
                <div>
                  <p className="text-[11px] text-blue-300 font-semibold mb-2">Downforce (N)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Before (ก่อนติดตั้ง)</label>
                      <input
                        type="number" step="0.01"
                        value={downforceBefore}
                        onChange={(e) => setDownforceBefore(e.target.value)}
                        placeholder="เช่น -120.00"
                        className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">After (หลังติดตั้ง)</label>
                      <input
                        type="number" step="0.01"
                        value={downforceAfter}
                        onChange={(e) => setDownforceAfter(e.target.value)}
                        placeholder="เช่น -405.50"
                        className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                  </div>
                  {downforceBefore && downforceAfter && (
                    <p className="text-[11px] mt-1.5 font-semibold font-mono"
                      style={{ color: (parseFloat(downforceAfter) - parseFloat(downforceBefore)) < 0 ? '#34d399' : '#f87171' }}
                    >
                      เปลี่ยนแปลง: {(parseFloat(downforceAfter) - parseFloat(downforceBefore)).toFixed(2)} N
                      ({(parseFloat(downforceBefore) !== 0 ? (((parseFloat(downforceAfter) - parseFloat(downforceBefore)) / Math.abs(parseFloat(downforceBefore))) * 100).toFixed(1) : "0")}%)
                    </p>
                  )}
                </div>

                {/* Drag Before / After */}
                <div>
                  <p className="text-[11px] text-orange-300 font-semibold mb-2">Drag (N)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Before (ก่อนติดตั้ง)</label>
                      <input
                        type="number" step="0.01"
                        value={dragBefore}
                        onChange={(e) => setDragBefore(e.target.value)}
                        placeholder="เช่น 58.40"
                        className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-orange-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">After (หลังติดตั้ง)</label>
                      <input
                        type="number" step="0.01"
                        value={dragAfter}
                        onChange={(e) => setDragAfter(e.target.value)}
                        placeholder="เช่น 70.70"
                        className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-orange-600 font-mono"
                      />
                    </div>
                  </div>
                  {dragBefore && dragAfter && (
                    <p className="text-[11px] mt-1.5 font-semibold font-mono"
                      style={{ color: (parseFloat(dragAfter) - parseFloat(dragBefore)) < 0 ? '#34d399' : '#f87171' }}
                    >
                      เปลี่ยนแปลง: +{(parseFloat(dragAfter) - parseFloat(dragBefore)).toFixed(2)} N
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Key Features (จุดเด่นสินค้า) */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E1E1E] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  <span>จุดเด่นสินค้า (Key Features)</span>
                  {features.length > 0 && (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-950/60 text-red-400 border border-red-800/40 font-mono">
                      {features.length} รายการ
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ระบุจุดเด่นสำคัญ 3-5 ข้อ พร้อมเลือกไอคอนเพื่อนำไปแสดงผลบนหน้าสินค้า
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadAeroPresets}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all cursor-pointer"
                  title="โหลดชุดจุดเด่นมาตรฐาน Aeropart (4 ข้อ)"
                >
                  <Zap size={13} className="text-amber-400" />
                  <span>โหลดเทมเพลต Aeropart</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600/80 border border-red-800/50 rounded-lg transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>เพิ่มจุดเด่น</span>
                </button>
              </div>
            </div>

            {features.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#161616] border border-dashed border-[#2A2A2A] text-center space-y-2">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#1F1F1F] flex items-center justify-center text-gray-500">
                  <Sparkles size={16} />
                </div>
                <p className="text-xs text-gray-400 font-medium">ยังไม่มีการระบุจุดเด่นสินค้า</p>
                <p className="text-[11px] text-gray-500">
                  คลิกปุ่ม &quot;+ เพิ่มจุดเด่น&quot; เพื่อกรอกเอง หรือคลิก &quot;โหลดเทมเพลต Aeropart&quot; เพื่อเติมข้อมูลสำเร็จรูป
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#181818] border border-[#282828] space-y-3 relative group transition-colors hover:border-[#383838]"
                  >
                    {/* Row Header: Number Badge, Reorder, Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-xs text-gray-400 font-medium truncate max-w-[220px]">
                          {feature.title || `จุดเด่นข้อที่ ${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveFeature(idx, "up")}
                          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === features.length - 1}
                          onClick={() => handleMoveFeature(idx, "down")}
                          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนลง"
                        >
                          <ChevronDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-1"
                          title="ลบข้อนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Form Fields: Icon Picker + Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <div className="sm:col-span-4 min-w-0">
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                          ไอคอนประจำจุดเด่น
                        </label>
                        <IconPicker
                          value={feature.iconSlug || undefined}
                          onChange={(selected) => {
                            handleUpdateFeature(idx, "iconSlug", selected.slug);
                            if (selected.id) handleUpdateFeature(idx, "iconId", selected.id);
                          }}
                          onClear={() => {
                            handleUpdateFeature(idx, "iconSlug", null);
                            handleUpdateFeature(idx, "iconId", null);
                          }}
                          label="เลือกไอคอน"
                        />
                      </div>

                      <div className="sm:col-span-8 min-w-0">
                        {activeLangTab === "en" ? (
                          <>
                            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                              Feature Title (EN) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={feature.titleEn || ""}
                              onChange={(e) => handleUpdateFeature(idx, "titleEn", e.target.value)}
                              placeholder="e.g. High-Speed Downforce Generation"
                              className="w-full h-[38px] px-3 py-2 rounded-lg bg-[#141414] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500 min-w-0"
                            />
                          </>
                        ) : (
                          <>
                            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                              หัวข้อจุดเด่น (Feature Title - TH) <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
                            </label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) => handleUpdateFeature(idx, "title", e.target.value)}
                              placeholder={feature.titleEn ? `เช่น ${feature.titleEn}` : "เช่น การสร้างแรงกดขณะขับขี่ความเร็วสูง"}
                              className="w-full h-[38px] px-3 py-2 rounded-lg bg-[#141414] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500 min-w-0"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Description Textarea */}
                    <div>
                      {activeLangTab === "en" ? (
                        <>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                            Feature Description (EN) <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={feature.descriptionEn || ""}
                            onChange={(e) => handleUpdateFeature(idx, "descriptionEn", e.target.value)}
                            placeholder="Aerodynamic drag reduction and high-speed stability enhancement..."
                            className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500 min-h-[64px]"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                            คำอธิบายจุดเด่น (Description - TH) <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={feature.description}
                            onChange={(e) => handleUpdateFeature(idx, "description", e.target.value)}
                            placeholder="เช่น ออกแบบตามหลักอากาศพลศาสตร์ จัดระเบียบกระแสลมและสร้างแรงกดท้ายรถ..."
                            className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#2D2D2D] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500 min-h-[64px]"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600/80 border border-red-800/50 rounded-lg transition-all cursor-pointer shrink-0"
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
                {compatibility.map((row, idx) => {
                  const matchingBrand = brands.find(
                    (b) =>
                      b.name.toLowerCase() === row.make.toLowerCase() ||
                      b.slug.toLowerCase() === row.make.toLowerCase()
                  );
                  const brandModels = matchingBrand
                    ? carModels.filter((m) => m.brandId === matchingBrand.id)
                    : carModels;

                  // Exclude models chosen in other rows to prevent duplicate car models
                  const otherSelectedModelNames = compatibility
                    .filter((_, i) => i !== idx)
                    .map((r) => r.model.trim().toLowerCase());

                  const selectableModels = brandModels.filter(
                    (m) =>
                      !otherSelectedModelNames.includes(m.name.trim().toLowerCase()) ||
                      m.name.trim().toLowerCase() === row.model.trim().toLowerCase()
                  );

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 rounded-xl bg-[#181818] border border-[#2A2A2A] items-center"
                    >
                      {/* Brand Select (จาก DB) */}
                      <div className="sm:col-span-4 min-w-0">
                        <select
                          value={matchingBrand ? matchingBrand.name : row.make}
                          onChange={(e) => {
                            const newBrandName = e.target.value;
                            const newBrandObj = brands.find((b) => b.name === newBrandName);
                            const modelsOfNewBrand = newBrandObj
                              ? carModels.filter((m) => m.brandId === newBrandObj.id)
                              : [];
                            // Find first model of new brand that is not already selected in other rows
                            const candidateModel =
                              modelsOfNewBrand.find(
                                (m) =>
                                  !otherSelectedModelNames.includes(
                                    m.name.trim().toLowerCase()
                                  )
                              ) || modelsOfNewBrand[0];

                            setCompatibility((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      make: newBrandName,
                                      model: candidateModel ? candidateModel.name : "",
                                      yearFrom: candidateModel?.yearFrom || r.yearFrom || 2022,
                                      yearTo: candidateModel?.yearTo || r.yearTo || 2025,
                                    }
                                  : r
                              )
                            );
                          }}
                          className="w-full h-[36px] px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 min-w-0"
                        >
                          <option value="" disabled>-- เลือกยี่ห้อ (Brand) --</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Model Select (จาก DB ตามยี่ห้อที่เลือก ป้องกันเลือกรุ่นซ้ำ) */}
                      <div className="sm:col-span-4 min-w-0">
                        <select
                          value={row.model}
                          onChange={(e) => {
                            const newModelName = e.target.value;
                            const modelObj = carModels.find(
                              (m) =>
                                m.name === newModelName &&
                                (!matchingBrand || m.brandId === matchingBrand.id)
                            );

                            setCompatibility((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      model: newModelName,
                                      yearFrom: modelObj?.yearFrom || r.yearFrom,
                                      yearTo: modelObj?.yearTo || r.yearTo,
                                    }
                                  : r
                              )
                            );
                          }}
                          className="w-full h-[36px] px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 min-w-0"
                        >
                          <option value="" disabled>-- เลือกรุ่นรถ (Model) --</option>
                          {selectableModels.length > 0 ? (
                            selectableModels.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name} {m.generation ? `(${m.generation})` : ""}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>-- รุ่นทั้งหมดของยี่ห้อนี้ถูกเลือกแล้ว --</option>
                          )}
                        </select>
                      </div>

                      {/* Years Range (Auto-fill จาก DB พร้อมให้แก้ไขได้) */}
                      <div className="sm:col-span-3 min-w-0 flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="ปีเริ่ม"
                          value={row.yearFrom || ""}
                          onChange={(e) =>
                            updateCompatibilityRow(
                              idx,
                              "yearFrom",
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 h-[36px] px-2 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs text-center font-mono focus:outline-none focus:border-red-500"
                          title="ปีเริ่มต้น"
                        />
                        <span className="text-gray-500 text-xs shrink-0">-</span>
                        <input
                          type="number"
                          placeholder="ปีสิ้นสุด"
                          value={row.yearTo || ""}
                          onChange={(e) =>
                            updateCompatibilityRow(
                              idx,
                              "yearTo",
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-w-0 h-[36px] px-2 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs text-center font-mono focus:outline-none focus:border-red-500"
                          title="ปีสิ้นสุด"
                        />
                      </div>

                      {/* Delete Button */}
                      <div className="sm:col-span-1 flex justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => removeCompatibilityRow(idx)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                  onChange={(e) => handleCarModelChange(e.target.value)}
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
