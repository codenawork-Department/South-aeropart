"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Palette,
  Code,
  Image as ImageIcon,
  Wind,
  Shield,
  Zap,
  UploadCloud,
  X,
  Wand2,
  ArrowUpRight,
} from "lucide-react";
import {
  AppIcon,
  type IconData,
  normalizeLucideName,
  getLucideComponent,
  sanitizeAndFormatSvg,
} from "@/components/icons/app-icon";
import {
  createIconAction,
  updateIconAction,
  deleteIconAction,
  seedInitialIconsAction,
  uploadIconImageAction,
  type IconInput,
} from "@/actions/icon.actions";

interface IconsTabProps {
  initialIcons: IconData[];
  showToast: (msg: string) => void;
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  aerodynamics: { label: "แอโรไดนามิกส์", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  material: { label: "วัสดุ & งานผลิต", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  performance: { label: "สมรรถนะ & ฟิตติ้ง", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  trust: { label: "ความน่าเชื่อถือ", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  services: { label: "บริการ & ติดตั้ง", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  general: { label: "ทั่วไป", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const POPULAR_LUCIDE_ICONS = [
  "Wind", "Shield", "ShieldCheck", "ShieldAlert", "Zap", "Layers", "Award", "Gauge", "Flame",
  "Wrench", "Sparkles", "CheckCircle2", "Settings", "Headphones", "Compass", "Cpu", "Maximize2",
  "Package", "Car", "Tag", "Activity", "Eye", "Truck", "FileCheck", "Sliders", "Sun", "Droplets",
  "Crosshair", "Flag", "Lock", "Star", "ArrowRight", "Target", "RefreshCw", "Check",
];

export function IconsTab({ initialIcons, showToast }: IconsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IconData | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [form, setForm] = useState<IconInput>({
    name: "",
    slug: "",
    category: "aerodynamics",
    type: "lucide",
    lucideName: "Wind",
    svgContent: "",
    imageUrl: "",
    isActive: true,
  });

  // Image Upload state for Type 3 (Drag & Drop / Cloudinary)
  const [imageFileBase64, setImageFileBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewColor, setPreviewColor] = useState<"red" | "white" | "gray">("red");

  // Computed Lucide state for live typing
  const currentNormalizedLucide = useMemo(() => {
    if (form.type !== "lucide" || !form.lucideName) return "";
    return normalizeLucideName(form.lucideName);
  }, [form.type, form.lucideName]);

  const isLucideValid = useMemo(() => {
    if (form.type !== "lucide" || !form.lucideName) return false;
    return getLucideComponent(form.lucideName) !== null;
  }, [form.type, form.lucideName]);

  const openCreateModal = () => {
    setEditingItem(null);
    setImageFileBase64(null);
    setImagePreviewUrl(null);
    setUploadError(null);
    setForm({
      name: "",
      slug: "",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Wind",
      svgContent: "",
      imageUrl: "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: IconData) => {
    setEditingItem(item);
    setImageFileBase64(null);
    setImagePreviewUrl(item.imageUrl || null);
    setUploadError(null);
    setForm({
      name: item.name || "",
      slug: item.slug || "",
      category: (item.category as any) || "general",
      type: (item.type as any) || "lucide",
      lucideName: item.lucideName || "",
      svgContent: item.svgContent || "",
      imageUrl: item.imageUrl || "",
      isActive: item.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Image Drag & Drop Handlers
  const handleImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("กรุณาเลือกไฟล์รูปภาพ (PNG, WebP, SVG, JPG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageFileBase64(base64);
      setImagePreviewUrl(base64);
      setForm((prev) => ({ ...prev, imageUrl: base64 }));
    };
    reader.onerror = () => {
      setUploadError("เกิดข้อผิดพลาดในการอ่านไฟล์");
    };
    reader.readAsDataURL(file);
  };

  const handleFormatSvg = () => {
    if (!form.svgContent) return;
    const formatted = sanitizeAndFormatSvg(form.svgContent);
    setForm((prev) => ({ ...prev, svgContent: formatted }));
    showToast("จัดระเบียบและแปลงสี SVG (currentColor) เรียบร้อย");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      let finalForm = { ...form };

      // 1. Normalize Lucide name
      if (finalForm.type === "lucide" && finalForm.lucideName) {
        finalForm.lucideName = normalizeLucideName(finalForm.lucideName);
      }

      // 2. Normalize and format SVG code
      if (finalForm.type === "svg_code" && finalForm.svgContent) {
        finalForm.svgContent = sanitizeAndFormatSvg(finalForm.svgContent);
      }

      // 3. Handle Cloudinary Image Upload if a local file was dragged/selected
      if (finalForm.type === "image_url" && imageFileBase64) {
        const uploadRes = await uploadIconImageAction(
          imageFileBase64,
          finalForm.slug || finalForm.name
        );
        if (!uploadRes.success || !uploadRes.data?.secureUrl) {
          alert(uploadRes.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพขึ้น Cloudinary");
          return;
        }
        finalForm.imageUrl = uploadRes.data.secureUrl;
      }

      if (editingItem?.id) {
        const res = await updateIconAction(editingItem.id, finalForm);
        if (res.success) {
          setModalOpen(false);
          showToast(res.message || "อัปเดตไอคอนสำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาดในการอัปเดต");
        }
      } else {
        const res = await createIconAction(finalForm);
        if (res.success) {
          setModalOpen(false);
          showToast(res.message || "สร้างไอคอนใหม่สำเร็จ");
        } else {
          alert(res.message || "เกิดข้อผิดพลาดในการสร้าง");
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      const res = await deleteIconAction(deleteModal.id);
      if (res.success) {
        setDeleteModal(null);
        showToast(res.message || "ลบไอคอนสำเร็จ");
      } else {
        alert(res.message || "เกิดข้อผิดพลาดในการลบ");
      }
    });
  };

  const handleSeedCurated = () => {
    if (
      !confirm(
        "คุณต้องการนำเข้าชุดไอคอนมาตรฐาน 20 รายการสำหรับ South Aero หรือไม่? (รายการที่มีอยู่แล้วจะไม่ถูกเขียนทับ)"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await seedInitialIconsAction();
      if (res.success) {
        showToast(res.message || "นำเข้าไอคอนมาตรฐานสำเร็จ");
      } else {
        alert(res.message || "เกิดข้อผิดพลาดในการนำเข้า");
      }
    });
  };

  // Filtered icon list
  const filteredIcons = useMemo(() => {
    return initialIcons.filter((item) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.slug && item.slug.toLowerCase().includes(q)) ||
        (item.lucideName && item.lucideName.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchType = typeFilter === "all" || item.type === typeFilter;

      return matchSearch && matchCategory && matchType;
    });
  }, [initialIcons, searchTerm, categoryFilter, typeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อไอคอน, slug, หรือ lucide name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Seed Initial Icons Button */}
          <button
            type="button"
            onClick={handleSeedCurated}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
            title="นำเข้าชุดไอคอนมาตรฐาน 20 รายการสำหรับ South Aero"
          >
            <Zap size={14} className="text-amber-400" />
            <span>นำเข้าไอคอนเริ่มต้น ({initialIcons.length}/20)</span>
          </button>

          {/* Add Icon Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg shadow-red-950/40 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>เพิ่มไอคอนใหม่</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Type Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#1E1E1E] py-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === "all"
                ? "bg-red-600 text-white shadow"
                : "bg-[#181818] text-gray-400 hover:text-white hover:bg-[#202020]"
            }`}
          >
            ทั้งหมด ({initialIcons.length})
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, { label }]) => {
            const count = initialIcons.filter((i) => i.category === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === key
                    ? "bg-red-600 text-white shadow"
                    : "bg-[#181818] text-gray-400 hover:text-white hover:bg-[#202020]"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Type Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">ประเภท:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="all">ทุกประเภท</option>
            <option value="lucide">Lucide Icons</option>
            <option value="svg_code">SVG Custom</option>
            <option value="image_url">Image / Cloudinary</option>
          </select>
        </div>
      </div>

      {/* Icons Grid */}
      {filteredIcons.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#121212] border border-[#202020] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#181818] mx-auto flex items-center justify-center text-gray-600">
            <Palette size={22} />
          </div>
          <p className="text-sm font-semibold text-gray-400">ไม่พบไอคอนที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-gray-600">
            ลองปรับเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;นำเข้าไอคอนเริ่มต้น&quot; ด้านบน
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredIcons.map((item) => {
            const isCopied = copiedSlug === item.slug;
            const catInfo = item.category ? CATEGORY_MAP[item.category] : null;

            return (
              <div
                key={item.id || item.slug}
                className="group relative p-3.5 rounded-2xl bg-[#131313] border border-[#202020] hover:border-red-500/40 hover:bg-[#171717] transition-all flex flex-col justify-between"
              >
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg bg-[#222222] hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="แก้ไขไอคอน"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ id: item.id!, name: item.name || item.slug || "" })}
                    className="p-1.5 rounded-lg bg-[#222222] hover:bg-red-950/60 text-gray-400 hover:text-rose-400 transition-colors"
                    title="ลบไอคอน"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Main Icon Visual */}
                <div className="flex flex-col items-center text-center space-y-2.5 pt-2">
                  <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] group-hover:bg-red-950/30 group-hover:border-red-900/40 border border-[#262626] flex items-center justify-center text-red-500 transition-all shadow-inner">
                    <AppIcon icon={item} size={24} className="text-red-500" />
                  </div>

                  <div className="space-y-1 w-full px-1">
                    <h4 className="text-xs font-semibold text-white truncate" title={item.name}>
                      {item.name}
                    </h4>

                    {/* Slug badge with click-to-copy */}
                    <button
                      type="button"
                      onClick={() => handleCopySlug(item.slug!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#282828] border border-[#2B2B2B] text-[10px] font-mono text-gray-400 hover:text-white transition-colors max-w-full truncate"
                      title="คลิกเพื่อคัดลอก Slug"
                    >
                      <span className="truncate">{item.slug}</span>
                      {isCopied ? <Check size={10} className="text-emerald-400 shrink-0" /> : <Copy size={10} className="shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Footer Type info */}
                <div className="mt-3 pt-2 border-t border-[#1C1C1C] flex items-center justify-between text-[10px] text-gray-500">
                  <span className="flex items-center gap-1 font-mono uppercase truncate max-w-[100px]">
                    {item.type === "lucide" && <Sparkles size={11} className="text-amber-400 shrink-0" />}
                    {item.type === "svg_code" && <Code size={11} className="text-blue-400 shrink-0" />}
                    {item.type === "image_url" && <ImageIcon size={11} className="text-emerald-400 shrink-0" />}
                    <span className="truncate">{item.type === "lucide" ? item.lucideName : item.type}</span>
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.isActive ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT ICON ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl rounded-2xl bg-[#141414] border border-[#2B2B2B] p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[92vh]"
          >
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette size={18} className="text-red-500" />
                <span>{editingItem ? "แก้ไขไอคอน" : "เพิ่มไอคอนใหม่เข้าคลัง"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Live Preview & Color Test */}
            <div className="p-4 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all ${
                    previewColor === "red"
                      ? "bg-red-950/40 border-red-800/60 text-red-500"
                      : previewColor === "white"
                      ? "bg-neutral-800 border-neutral-700 text-white"
                      : "bg-neutral-900 border-neutral-800 text-gray-400"
                  }`}
                >
                  <AppIcon
                    icon={{
                      type: form.type,
                      lucideName: form.lucideName,
                      svgContent: form.svgContent,
                      imageUrl: form.imageUrl,
                      name: form.name,
                    }}
                    size={28}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {form.name || "ชื่อไอคอน..."}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    slug: {form.slug || "auto-generated"}
                  </span>
                  {form.type === "lucide" && (
                    <div className="pt-0.5">
                      {isLucideValid ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle2 size={11} /> Lucide: {currentNormalizedLucide}
                        </span>
                      ) : form.lucideName ? (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle size={11} /> ไม่พบชื่อไอคอนนี้ใน Lucide
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Color Test Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 mr-1">ทดสอบสี:</span>
                <button
                  type="button"
                  onClick={() => setPreviewColor("red")}
                  className={`w-5 h-5 rounded-full bg-red-600 transition-transform ${
                    previewColor === "red" ? "scale-125 ring-2 ring-white" : "opacity-70"
                  }`}
                  title="ธีมสีแดง South Aero"
                />
                <button
                  type="button"
                  onClick={() => setPreviewColor("white")}
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    previewColor === "white" ? "scale-125 ring-2 ring-red-500" : "opacity-70"
                  }`}
                  title="สีขาว"
                />
                <button
                  type="button"
                  onClick={() => setPreviewColor("gray")}
                  className={`w-5 h-5 rounded-full bg-gray-500 transition-transform ${
                    previewColor === "gray" ? "scale-125 ring-2 ring-white" : "opacity-70"
                  }`}
                  title="สีเทา"
                />
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ชื่อไอคอน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น Shield Check"
                    className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    รหัส Slug <span className="text-gray-500">(ไม่ซ้ำ)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="เช่น shield-check"
                    className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="aerodynamics">แอโรไดนามิกส์ (Aerodynamics)</option>
                    <option value="material">วัสดุ & งานผลิต (Material & Carbon)</option>
                    <option value="performance">สมรรถนะ & ฟิตติ้ง (Performance & CAD)</option>
                    <option value="trust">ความน่าเชื่อถือ (Trust & Warranty)</option>
                    <option value="services">บริการ & การติดตั้ง (Services)</option>
                    <option value="general">ทั่วไป (General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ประเภทของไอคอน
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="lucide">1. Lucide Built-in (รองรับทุกชื่อ เช่น shield-check)</option>
                    <option value="svg_code">2. Custom SVG Code (พร้อมระบบ Auto-Format)</option>
                    <option value="image_url">3. Image Upload / Cloudinary Folder</option>
                  </select>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────── */}
              {/* Type 1: Lucide Icon */}
              {/* ─────────────────────────────────────────────────────────── */}
              {form.type === "lucide" && (
                <div className="space-y-2 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-300">
                      ชื่อ Lucide Icon (พิมพ์ได้ทั้ง <code className="text-red-400">shield-check</code>, <code className="text-red-400">ShieldCheck</code>, <code className="text-red-400">wind</code>)
                    </label>
                    <a
                      href="https://lucide.dev/icons"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-red-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>ดูรายชื่อ Lucide ทั้งหมด</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>

                  <input
                    type="text"
                    value={form.lucideName || ""}
                    onChange={(e) => setForm({ ...form, lucideName: e.target.value })}
                    placeholder="เช่น shield-check, wind, zap, crosshair"
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 font-mono"
                  />

                  {/* Suggestions Pills */}
                  <div className="pt-1">
                    <span className="text-[10px] text-gray-500 block mb-1.5">ไอคอนยอดนิยม (คลิกเพื่อเลือกทันที):</span>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
                      {POPULAR_LUCIDE_ICONS.map((name) => {
                        const isSelected =
                          currentNormalizedLucide.toLowerCase() === name.toLowerCase();
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setForm({ ...form, lucideName: name })}
                            className={`text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-red-600 text-white font-bold shadow"
                                : "bg-[#222222] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            }`}
                          >
                            <AppIcon icon={{ type: "lucide", lucideName: name }} size={12} />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* Type 2: Custom SVG Code */}
              {/* ─────────────────────────────────────────────────────────── */}
              {form.type === "svg_code" && (
                <div className="space-y-2 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-300">
                      โค้ด SVG (&lt;svg...&gt;&lt;/svg&gt;)
                    </label>
                    <button
                      type="button"
                      onClick={handleFormatSvg}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-[11px] font-medium transition-colors"
                      title="จัดระเบียบโค้ด และแปลงสี #000 เป็น currentColor ให้อัตโนมัติ"
                    >
                      <Wand2 size={12} />
                      <span>✨ จัดระเบียบ & แก้ไขสี SVG</span>
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={form.svgContent || ""}
                    onChange={(e) => setForm({ ...form, svgContent: e.target.value })}
                    placeholder="วางโค้ด <svg viewBox='0 0 24 24'>...</svg> หรือโค้ด <path /> จาก Figma, FontAwesome, Illustrator ที่นี่..."
                    className="w-full px-3 py-2 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                  <div className="text-[11px] text-gray-400 space-y-0.5 leading-relaxed bg-[#141414] p-2.5 rounded-lg border border-[#242424]">
                    <p className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> ระบบรองรับ SVG ทุกรูปแบบอัตโนมัติ:
                    </p>
                    <p className="text-gray-400">
                      • แม้โค้ดจะติดกันเป็นบรรทัดเดียว (Minified) หรือไม่มี <code className="text-red-400">&lt;svg&gt;</code> ครอบ ระบบจะสังเคราะห์ให้อัตโนมัติ
                    </p>
                    <p className="text-gray-400">
                      • ระบบจะแปลงสีดำ/เทา เป็น <code className="text-red-400">currentColor</code> เพื่อให้ไอคอนเปลี่ยนสีตามธีมสดใส
                    </p>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* Type 3: Image Drag & Drop / Cloudinary */}
              {/* ─────────────────────────────────────────────────────────── */}
              {form.type === "image_url" && (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-[#181818] border border-[#262626]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-300">
                      อัปโหลดไฟล์ภาพไอคอน (PNG โปร่งใส / SVG / WebP)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      📁 south-aero/web-assets/icons
                    </span>
                  </div>

                  {/* Drag & Drop Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`relative p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      isDragging
                        ? "border-red-500 bg-red-950/20"
                        : "border-[#303030] hover:border-red-500/50 bg-[#121212]"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFile(e.target.files[0]);
                        }
                      }}
                    />

                    {imagePreviewUrl ? (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-[#222222] border border-[#333333] p-1 flex items-center justify-center relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreviewUrl}
                            alt="Icon preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} /> เลือกรูปภาพพร้อมอัปโหลด
                          </p>
                          <p className="text-[11px] text-gray-400">
                            คลิกเพื่อเปลี่ยนรูป หรือลากไฟล์ใหม่มาวางทับ
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            จะถูกจัดเก็บเข้า: south-aero/web-assets/icons
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="w-10 h-10 rounded-full bg-[#1C1C1C] flex items-center justify-center text-red-500 mx-auto">
                          <UploadCloud size={20} />
                        </div>
                        <p className="text-xs font-semibold text-gray-300">
                          ลากไฟล์รูปภาพมาวางที่นี่ หรือ <span className="text-red-400">คลิกเพื่อเลือกไฟล์</span>
                        </p>
                        <p className="text-[10px] text-gray-500">
                          รองรับ PNG (โปร่งใส Transparent), SVG, WebP, JPG ไม่เกิน 5MB
                        </p>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle size={13} /> {uploadError}
                    </p>
                  )}

                  {/* Fallback Direct URL input */}
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      หรือใส่ Cloudinary Image URL โดยตรง:
                    </label>
                    <input
                      type="url"
                      value={form.imageUrl || ""}
                      onChange={(e) => {
                        setForm({ ...form, imageUrl: e.target.value });
                        setImagePreviewUrl(e.target.value);
                      }}
                      placeholder="https://res.cloudinary.com/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2D2D2D] text-white text-xs focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="iconActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded bg-[#1A1A1A] border-[#2E2E2E] text-red-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="iconActive" className="text-xs text-gray-300 cursor-pointer">
                  เปิดใช้งานไอคอนนี้ในระบบ (Active)
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#202020] text-gray-300 text-xs font-semibold hover:bg-[#2A2A2A]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/40"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>{editingItem ? "บันทึกการแก้ไข" : "บันทึกไอคอน"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-white">ยืนยันการลบไอคอน</h3>
            </div>
            <p className="text-xs text-gray-400">
              คุณแน่ใจหรือไม่ว่าต้องการลบไอคอน <span className="font-semibold text-white">&ldquo;{deleteModal.name}&rdquo;</span> ออกจากระบบ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-gray-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
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
