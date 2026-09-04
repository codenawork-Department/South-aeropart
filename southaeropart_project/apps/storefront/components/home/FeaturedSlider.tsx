"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  Gauge,
  Layers,
  Box,
  Check,
} from "lucide-react";
import { FeaturedBundleData } from "@/actions/bundle.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";

interface FeaturedSliderProps {
  initialBundles?: FeaturedBundleData[];
}

export function FeaturedSlider({ initialBundles = [] }: FeaturedSliderProps) {
  const bundles = initialBundles.length > 0 ? initialBundles : [];
  const { t, lang } = useLanguage();

  const [activeBundleIdx, setActiveBundleIdx] = useState(0);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  if (bundles.length === 0) {
    return null;
  }

  const safeBundleIdx = activeBundleIdx < bundles.length ? activeBundleIdx : 0;
  const activeBundle = bundles[safeBundleIdx] || bundles[0];

  const defaultViews = ["FRONT 3/4", "FRONT", "SIDE", "REAR 3/4"];

  const slides =
    activeBundle.slides && activeBundle.slides.length > 0
      ? activeBundle.slides.map((s, idx) => ({
          ...s,
          viewLabel: defaultViews[idx % defaultViews.length] || `VIEW 0${idx + 1}`,
        }))
      : [
          {
            id: `${activeBundle.id}-1`,
            title: `${activeBundle.name} — Front 3/4 stance`,
            image: activeBundle.primaryImage || "/images/FRONT.png",
            caption: activeBundle.tagline || "Sculpted front splitter and aerodynamically balanced profile.",
            viewLabel: "FRONT 3/4",
          },
        ];

  const safeSlideIdx = currentSlideIdx < slides.length ? currentSlideIdx : 0;
  const activeSlide = slides[safeSlideIdx];

  // 1. Kit Navigation (สลับเปลี่ยนชุดเซ็ต - ปุ่มซ้ายล่าง)
  const nextBundle = () => {
    setActiveBundleIdx((prev) => (prev + 1) % bundles.length);
    setCurrentSlideIdx(0);
  };

  const prevBundle = () => {
    setActiveBundleIdx((prev) => (prev - 1 + bundles.length) % bundles.length);
    setCurrentSlideIdx(0);
  };

  // 2. Photo Navigation (สลับเปลี่ยนรูปภาพในชุดเซ็ต - ปุ่มลูกศรบนรูปภาพและ Thumbnails)
  const nextPhoto = () => {
    setCurrentSlideIdx((prev) => (prev + 1) % slides.length);
  };

  const prevPhoto = () => {
    setCurrentSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Format Name: Highlight last word in red using localized name
  const localizedName = getLocalizedField(activeBundle.name, activeBundle.nameEn, lang);
  const localizedDescription = getLocalizedField(activeBundle.description, activeBundle.descriptionEn, lang);
  const localizedTagline = lang === "en"
    ? (activeBundle.shortDescriptionEn || `DESIGNED FOR ${activeBundle.carModelName}. ENGINEERED FOR PERFORMANCE.`)
    : (activeBundle.shortDescription || activeBundle.tagline || `ออกแบบมาสำหรับ ${activeBundle.carModelName} เพื่อสมรรถนะที่แท้จริง`);

  const nameParts = localizedName.split(" ");
  const lastPart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const firstParts = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : localizedName;

  const partsCount = activeBundle.bundleItems?.length || 4;
  const yearRangeText = activeBundle.carModelGen
    ? `${activeBundle.brandName} ${activeBundle.carModelName} · ${activeBundle.carModelGen}`
    : `${activeBundle.brandName} ${activeBundle.carModelName} · 2023–2025`;

  return (
    <section className="bg-[#0A0A0A] text-white py-12 md:py-16 lg:py-20 border-y border-[#181818] relative overflow-hidden">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-start">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="order-2 md:order-1 md:col-span-6 lg:col-span-5 flex flex-col justify-between space-y-6">
            
            {/* 1. Header & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A0E0E] border border-[#3A1818] rounded text-[0.65rem] font-heading font-bold tracking-widest text-[#FF3333] uppercase mb-4">
                {t.home.flagshipBadge}
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-white uppercase leading-[1.08]">
                {firstParts} <br className="hidden sm:inline" />
                {lastPart ? (
                  <>
                    <span className="text-[#FF2B2B]">{lastPart}</span>
                  </>
                ) : null}
              </h2>

              <p className="font-heading text-xs uppercase tracking-widest text-gray-400 mt-2.5 font-semibold">
                {localizedTagline}
              </p>

              <p className="text-xs sm:text-sm text-gray-300 mt-3 leading-relaxed">
                {localizedDescription}
              </p>
            </div>

            {/* 2. Specs 2x2 Grid Panel */}
            <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 sm:p-5 grid grid-cols-2 gap-y-4 gap-x-6">
              {/* Row 1: Downforce */}
              <div>
                <div className="flex items-center gap-1.5 text-[0.65rem] font-heading font-semibold text-gray-400 uppercase tracking-wider">
                  <ArrowDown size={13} className="text-emerald-400" />
                  <span>{t.home.downforce}</span>
                </div>
                <div className="text-lg sm:text-xl font-heading font-black text-emerald-400 mt-0.5">
                  {activeBundle.downforceBadge}
                </div>
              </div>

              {/* Row 1: Drag */}
              <div>
                <div className="flex items-center gap-1.5 text-[0.65rem] font-heading font-semibold text-gray-400 uppercase tracking-wider">
                  <Gauge size={13} className="text-[#FF3333]" />
                  <span>{t.home.drag}</span>
                </div>
                <div className="text-lg sm:text-xl font-heading font-black text-[#FF3333] mt-0.5">
                  {activeBundle.dragBadge}
                </div>
              </div>

              {/* Row 2: Material */}
              <div className="border-t border-[#1C1C1C] pt-3">
                <div className="flex items-center gap-1.5 text-[0.65rem] font-heading font-semibold text-gray-400 uppercase tracking-wider">
                  <Layers size={13} className="text-gray-400" />
                  <span>{t.home.material}</span>
                </div>
                <div className="text-sm sm:text-base font-heading font-bold text-white mt-0.5">
                  Carbon / ABS
                </div>
              </div>

              {/* Row 2: Parts Included */}
              <div className="border-t border-[#1C1C1C] pt-3">
                <div className="flex items-center gap-1.5 text-[0.65rem] font-heading font-semibold text-gray-400 uppercase tracking-wider">
                  <Box size={13} className="text-gray-400" />
                  <span>{t.home.partsIncluded}</span>
                </div>
                <div className="text-sm sm:text-base font-heading font-bold text-white mt-0.5">
                  {partsCount} {t.home.pieces}
                </div>
              </div>
            </div>

            {/* 3. Feature Badges Row */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-heading font-semibold text-gray-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141414] border border-[#262626] rounded text-gray-300">
                <Check size={12} className="text-emerald-400" />
                {yearRangeText}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141414] border border-[#262626] rounded text-gray-300">
                <Check size={12} className="text-emerald-400" />
                OEM+ FITMENT
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141414] border border-[#262626] rounded text-gray-300">
                <Check size={12} className="text-emerald-400" />
                CFD TESTED
              </span>
            </div>

            {/* 4. Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
              <Link
                href={activeBundle.link || `/products/${activeBundle.slug}`}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#E5252A] hover:bg-[#c91e23] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-[#E5252A]/20"
                id="explore-bodykit"
              >
                {t.home.exploreBuild} <ArrowRight size={15} />
              </Link>

              <Link
                href={activeBundle.link || `/products/${activeBundle.slug}`}
                className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#444] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all"
              >
                {t.home.viewAllParts.replace("{count}", String(partsCount))}
              </Link>
            </div>

            {/* 5. Bottom Navigation Dock (Kit Selector: 01 / 04) */}
            <div className="flex items-center justify-between pt-6 border-t border-[#1C1C1C] mt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={prevBundle}
                  className="w-8 h-8 flex items-center justify-center border border-[#262626] bg-[#111111] text-gray-400 hover:text-white hover:border-[#555] transition-all rounded-sm"
                  aria-label="Previous kit"
                  title="Previous Kit"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="font-heading text-sm font-bold text-white tracking-widest">
                  {String(safeBundleIdx + 1).padStart(2, "0")}{" "}
                  <span className="text-gray-500 font-normal">/ {String(bundles.length).padStart(2, "0")}</span>
                </span>

                <button
                  onClick={nextBundle}
                  className="w-8 h-8 flex items-center justify-center border border-[#262626] bg-[#111111] text-gray-400 hover:text-white hover:border-[#555] transition-all rounded-sm"
                  aria-label="Next kit"
                  title="Next Kit"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-heading font-semibold tracking-widest text-gray-500 block uppercase">
                  {t.home.designBy}
                </span>
                <span className="text-[11px] font-heading font-bold tracking-wider text-gray-300 uppercase">
                  {activeBundle.designer || "SOUTH AERO DESIGN LAB"}
                </span>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN (STAGE & THUMBNAILS) ================= */}
          <div className="order-1 md:order-2 md:col-span-6 lg:col-span-7 flex flex-col space-y-4">
            
            {/* Main Stage Frame */}
            <div className="bg-[#0E0E0E] border border-[#222222] rounded-lg p-4 sm:p-5 relative shadow-2xl">
              
              {/* Stage Top Bar */}
              <div className="flex items-center justify-between pb-3 text-xs font-heading font-bold uppercase tracking-wider">
                <span className="text-gray-400 tracking-widest text-[11px]">SOUTH</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2B2B] animate-pulse" />
                  {activeSlide.viewLabel || "FRONT 3/4 STANCE"}
                </span>
              </div>

              {/* Main Image Stage */}
              <div className="relative aspect-[16/10] w-full rounded-md overflow-hidden bg-[#0A0A0A] border border-[#1C1C1C]">
                <Image
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  fill
                  priority
                  className="object-cover transition-all duration-500 ease-out"
                  sizes="(max-width: 1024px) 100vw, 700px"
                />

                {/* Left/Right Photo Chevrons */}
                {slides.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#181818]/90 border border-[#333] text-gray-300 hover:text-white hover:border-[#FF2B2B] hover:bg-[#222] transition-all flex items-center justify-center backdrop-blur-sm z-10"
                      aria-label="Previous photo"
                      title="Previous Photo"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#181818]/90 border border-[#333] text-gray-300 hover:text-white hover:border-[#FF2B2B] hover:bg-[#222] transition-all flex items-center justify-center backdrop-blur-sm z-10"
                      aria-label="Next photo"
                      title="Next Photo"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>

              {/* Caption under Image inside Stage */}
              <div className="pt-3.5">
                <h3 className="text-xs sm:text-sm font-heading font-bold text-white">
                  {activeSlide.title || `${activeBundle.name} — Front 3/4 stance`}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                  {activeSlide.caption || "Sculpted front splitter and aerodynamically balanced profile."}
                </p>
              </div>
            </div>

            {/* 4 Multi-view Thumbnails Grid */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {slides.slice(0, 4).map((s, idx) => {
                const isActive = idx === safeSlideIdx;
                const viewTitle = s.viewLabel || defaultViews[idx] || `VIEW 0${idx + 1}`;
                return (
                  <button
                    key={s.id || idx}
                    onClick={() => setCurrentSlideIdx(idx)}
                    className={`relative rounded-md overflow-hidden p-1.5 transition-all text-left group bg-[#111111] border ${
                      isActive
                        ? "border-[#FF2B2B] ring-1 ring-[#FF2B2B] shadow-md shadow-[#FF2B2B]/20"
                        : "border-[#222222] hover:border-[#444444]"
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-[16/10] w-full rounded-sm overflow-hidden bg-[#0A0A0A]">
                      <Image
                        src={s.image}
                        alt={s.title || viewTitle}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="160px"
                      />
                    </div>
                    {/* View Label below thumbnail */}
                    <div className="pt-1.5">
                      <span
                        className={`text-[9px] sm:text-[10px] font-heading font-bold uppercase tracking-wider block truncate ${
                          isActive ? "text-[#FF3333]" : "text-gray-400 group-hover:text-white"
                        }`}
                      >
                        {viewTitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
