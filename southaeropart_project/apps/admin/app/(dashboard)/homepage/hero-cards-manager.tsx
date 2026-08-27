"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Car,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import {
  updateHeroCardAction,
  uploadHeroCardImageAction,
  HeroCardInput,
} from "@/actions/homepage.actions";

interface HeroCardItem {
  id: string;
  position: number;
  title: string;
  tag: string;
  brandId: string | null;
  carModelId: string | null;
  imageUrl: string;
  cloudinaryPublicId: string | null;
  href: string;
  isActive: boolean;
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
}

interface ModelItem {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  generation: string | null;
}

interface ManagerProps {
  initialCards: HeroCardItem[];
  brands: BrandItem[];
  models: ModelItem[];
}

export function HomepageHeroCardsManager({
  initialCards,
  brands,
  models,
}: ManagerProps) {
  const [cards, setCards] = useState<HeroCardItem[]>(initialCards);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleCardChange = (
    id: string,
    field: keyof HeroCardItem,
    value: unknown
  ) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Handle Model change and auto-fill URL/Title if requested
  const handleModelChange = (cardId: string, modelId: string) => {
    const selectedModel = models.find((m) => m.id === modelId);
    if (!selectedModel) {
      handleCardChange(cardId, "carModelId", null);
      return;
    }

    const brand = brands.find((b) => b.id === selectedModel.brandId);
    const brandSlug = brand?.slug || "honda";

    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          carModelId: modelId,
          brandId: selectedModel.brandId,
          href: `/products?make=${brandSlug}&model=${selectedModel.slug}`,
        };
      })
    );
  };

  // Upload image to Cloudinary
  const handleFileUpload = async (cardId: string, file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, WEBP)" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "ไฟล์มีขนาดใหญ่เกิน 10MB" });
      return;
    }

    setUploadingCardId(cardId);
    setStatusMessage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await uploadHeroCardImageAction(base64);

        if (res.success && res.data) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    imageUrl: res.data!.secureUrl,
                    cloudinaryPublicId: res.data!.publicId,
                  }
                : c
            )
          );
          setStatusMessage({
            type: "success",
            text: `อัปโหลดรูปภาพขึ้น Cloudinary สำเร็จ!`,
          });
        } else {
          setStatusMessage({
            type: "error",
            text: res.message || "อัปโหลดรูปภาพไม่สำเร็จ",
          });
        }
        setUploadingCardId(null);
      };
      reader.onerror = () => {
        setStatusMessage({ type: "error", text: "อ่านไฟล์รูปภาพไม่สำเร็จ" });
        setUploadingCardId(null);
      };
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: "เกิดข้อผิดพลาดในการอัปโหลด" });
      setUploadingCardId(null);
    }
  };

  // Save Card
  const handleSaveCard = async (card: HeroCardItem) => {
    setSavingCardId(card.id);
    setStatusMessage(null);

    const input: HeroCardInput = {
      title: card.title,
      tag: card.tag,
      brandId: card.brandId,
      carModelId: card.carModelId,
      imageUrl: card.imageUrl,
      cloudinaryPublicId: card.cloudinaryPublicId,
      href: card.href,
      isActive: card.isActive,
    };

    const res = await updateHeroCardAction(card.id, input);

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: `บันทึกการ์ดตำแหน่งที่ ${card.position} เรียบร้อยแล้ว`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: res.message || "บันทึกข้อมูลไม่สำเร็จ",
      });
    }
    setSavingCardId(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
              : "bg-red-950/40 border-red-800/40 text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* 3 Showcase Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const isUploading = uploadingCardId === card.id;
          const isSaving = savingCardId === card.id;
          const brandModels = models.filter((m) => !card.brandId || m.brandId === card.brandId);

          return (
            <div
              key={card.id}
              className="bg-[#111111] border border-[#222222] hover:border-[#333333] rounded-xl overflow-hidden flex flex-col justify-between shadow-xl transition-all"
            >
              {/* Card Header & Position Badge */}
              <div className="p-4 border-b border-[#1C1C1C] flex items-center justify-between bg-[#141414]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                    {card.position}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      การ์ดตำแหน่งที่ {card.position}
                    </h3>
                    <p className="text-[0.65rem] text-gray-400">
                      {card.position === 1 ? "Accord G9 / ด้านซ้าย" : card.position === 2 ? "Civic FD / ตรงกลาง" : "Civic FE / ด้านขวา"}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={card.isActive}
                    onChange={(e) => handleCardChange(card.id, "isActive", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#252525] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-2 text-[0.68rem] font-medium text-gray-400">
                    {card.isActive ? "เปิดแสดง" : "ปิด"}
                  </span>
                </label>
              </div>

              {/* Live Preview Container (Simulating Storefront View) */}
              <div className="p-4 space-y-4 flex-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-red-500" />
                      Live Preview (มุมมองหน้าร้าน)
                    </span>
                    <a
                      href={card.href.startsWith("http") ? card.href : `http://localhost:3000${card.href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.62rem] text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <span>ทดสอบลิงก์</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#2B2B2B] bg-[#0E0E0E] group shadow-inner">
                    {card.imageUrl ? (
                      <Image
                        src={card.imageUrl}
                        alt={card.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <ImageIcon size={32} />
                        <span className="text-xs mt-1">ยังไม่มีรูปภาพ</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <p className="font-heading text-xs font-bold text-white uppercase truncate drop-shadow-md">
                        {card.title || "TITLE"}
                      </p>
                      <p className="text-[0.62rem] text-red-400 font-heading uppercase tracking-wider font-semibold">
                        {card.tag || "SUBTITLE"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Upload Box */}
                <div>
                  <label className="text-[0.68rem] font-semibold text-gray-300 uppercase tracking-wider mb-1.5 block">
                    เปลี่ยนรูปภาพ (Cloudinary)
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => {
                      fileInputRefs.current[card.id] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(card.id, file);
                    }}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[card.id]?.click()}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] border border-[#2D2D2D] hover:border-[#404040] text-xs font-medium text-gray-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-red-500" />
                          <span>กำลังอัปโหลด...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={14} className="text-red-400" />
                          <span>อัปโหลดรูปภาพใหม่</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[0.6rem] text-gray-500 mt-1 truncate" title={card.imageUrl}>
                    URL: {card.imageUrl.split("/").pop()}
                  </p>
                </div>

                {/* Brand & Model Selector */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1C1C1C]">
                  <div>
                    <label className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      แบรนด์รถ
                    </label>
                    <select
                      value={card.brandId || ""}
                      onChange={(e) => {
                        handleCardChange(card.id, "brandId", e.target.value || null);
                        handleCardChange(card.id, "carModelId", null);
                      }}
                      className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      รุ่นรถยนต์ (Model)
                    </label>
                    <select
                      value={card.carModelId || ""}
                      onChange={(e) => handleModelChange(card.id, e.target.value)}
                      className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                    >
                      <option value="">-- เลือกรุ่นรถ --</option>
                      {brandModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.generation ? `(${m.generation})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Fields: Title, Tag, Href */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      ชื่อหัวข้อการ์ด (Title)
                    </label>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => handleCardChange(card.id, "title", e.target.value)}
                      placeholder="e.g. ACCORD G9 REAR"
                      className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      แท็ก / คำบรรยาย (Tag/Subtitle)
                    </label>
                    <input
                      type="text"
                      value={card.tag}
                      onChange={(e) => handleCardChange(card.id, "tag", e.target.value)}
                      placeholder="e.g. DUCKTAIL & DIFFUSER"
                      className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                      เส้นทางลิงก์เมื่อคลิก (Target Route / URL)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={card.href}
                        onChange={(e) => handleCardChange(card.id, "href", e.target.value)}
                        placeholder="/products?make=honda&model=accord"
                        className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg pl-7 pr-3 py-1.5 text-xs text-red-300 font-mono focus:border-red-500 focus:outline-none"
                      />
                      <LinkIcon size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 border-t border-[#1C1C1C] bg-[#141414]">
                <button
                  type="button"
                  disabled={isSaving || isUploading}
                  onClick={() => handleSaveCard(card)}
                  className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-red-900/30 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>บันทึกการ์ดที่ {card.position}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
