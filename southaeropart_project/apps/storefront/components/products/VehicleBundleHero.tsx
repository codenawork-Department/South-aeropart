"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Wind,
  Gauge,
  Layers,
  Flame,
  Sparkles,
  PackageX,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";
import type { VehicleBundleData } from "@/actions/bundle.actions";
import { AddToCartButton } from "./AddToCartButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";

interface VehicleBundleHeroProps {
  bundle: VehicleBundleData | null;
  makeLabel: string;
  modelLabel: string;
  hasFilter?: boolean;
}

export function VehicleBundleHero({
  bundle,
  makeLabel,
  modelLabel,
  hasFilter = false,
}: VehicleBundleHeroProps) {
  const { lang } = useLanguage();

  // ---------------------------------------------------------------------------
  // 1. Empty State Handling
  // ---------------------------------------------------------------------------
  if (!bundle) {
    // If no vehicle is filtered, collapse the container cleanly to prevent any empty space
    if (!hasFilter) {
      return null;
    }

    // When a specific vehicle is filtered but has no body kit bundle:
    // Render a sleek, compact horizontal notification card (NOT a large empty box)
    return (
      <div className="bg-zinc-950/60 border-b border-zinc-800/60">
        <div className="container-main py-3.5">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-sm px-4 py-3 md:px-5 md:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[var(--accent-red)] flex-shrink-0">
                <PackageX size={16} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.68rem] font-heading font-bold text-[var(--accent-red)] tracking-wider uppercase">
                    {makeLabel} {modelLabel}
                  </span>
                  <span className="text-zinc-600 text-xs hidden sm:inline">•</span>
                  <span className="text-xs font-heading font-semibold text-zinc-300">
                    {lang === "en"
                      ? "No body kit package available for this vehicle"
                      : "ไม่มีข้อมูลชุดเซ็ตสำหรับรถรุ่นนี้"}
                  </span>
                </div>
                <p className="text-[0.72rem] text-zinc-400 font-sans mt-0.5">
                  {lang === "en"
                    ? "There is no full body kit package for this model in the system yet. You can browse individual aero accessories below."
                    : "ยังไม่มีชุดแต่งรอบคัน (Full Body Kit) สำหรับรุ่นนี้ในระบบ คุณสามารถเลือกดูชิ้นส่วนตกแต่งเดี่ยว (Aero Accessories) ด้านล่าง"}
                </p>
              </div>
            </div>
            <a
              href="#products-grid-anchor"
              className="text-xs font-heading font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              {lang === "en" ? "View all single parts" : "ดูชิ้นส่วนเดี่ยวทั้งหมด"}{" "}
              <ArrowDown size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Localized Content
  // ---------------------------------------------------------------------------
  const localizedName = getLocalizedField(bundle.name, bundle.nameEn, lang);
  const localizedDescription = getLocalizedField(bundle.description, bundle.descriptionEn, lang);
  const localizedShortDescription = getLocalizedField(bundle.shortDescription, bundle.shortDescriptionEn, lang);
  const displayDescription = localizedDescription || localizedShortDescription;

  // ---------------------------------------------------------------------------
  // 3. Active Bundle Showcase (Aggressive Dark Motorsport Aesthetic)
  // ---------------------------------------------------------------------------
  return (
    <section className="bg-zinc-950 border-b border-zinc-800/80 relative overflow-hidden">
      {/* Subtle glowing motorsport red atmosphere */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-[radial-gradient(ellipse_at_center,rgba(229,29,36,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="container-main py-6 md:py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
          {/* Left Column: Details, Telemetry, & CTAs (order-2 on mobile, md:order-1 on tablet/desktop) */}
          <div className="order-2 md:order-1 md:col-span-6 lg:col-span-6 space-y-3 sm:space-y-3.5">
            {/* Top Row: Vehicle Breadcrumb + Priority Waterfall Badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] sm:text-xs font-heading font-bold tracking-[0.2em] text-[var(--accent-red)] uppercase">
                  {bundle.brandName}
                </span>
                <span className="text-zinc-600">&bull;</span>
                <span className="text-[0.7rem] sm:text-xs font-heading font-semibold tracking-wider text-zinc-300 uppercase">
                  {bundle.carModelName} {bundle.carModelGen ? `(${bundle.carModelGen})` : ""}
                </span>
              </div>

              {/* Priority 1: Top Seller Badge */}
              {bundle.badgeType === "top_seller" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 text-amber-300 text-[0.62rem] font-heading font-extrabold uppercase tracking-widest rounded-sm shadow-sm shadow-amber-500/10">
                  <Flame size={12} className="text-amber-400" />
                  TOP SELLER
                </span>
              )}

              {/* Priority 2: Featured by Admin */}
              {bundle.badgeType === "featured" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 text-[var(--accent-red)] text-[0.62rem] font-heading font-extrabold uppercase tracking-widest rounded-sm">
                  <Sparkles size={12} />
                  FEATURED KIT
                </span>
              )}

              {/* Priority 3: Latest Created */}
              {bundle.badgeType === "latest" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[0.62rem] font-heading font-extrabold uppercase tracking-widest rounded-sm">
                  <Layers size={12} />
                  COMPLETE PACKAGE
                </span>
              )}
            </div>

            {/* Bundle Name (Localized based on current language) */}
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-heading font-black text-white tracking-tight drop-shadow-sm leading-tight">
              {localizedName}
            </h1>

            {/* Description / Tagline */}
            {displayDescription && (
              <p className="body-sm text-zinc-400 line-clamp-2 max-w-xl">
                {displayDescription}
              </p>
            )}

            {/* Aerodynamic Telemetry Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {bundle.downforceN > 0 && (
                <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-sm flex items-center gap-2 shadow-sm">
                  <Wind size={14} className="text-[var(--success)]" />
                  <span className="text-[var(--success)] font-bold text-xs font-mono">
                    +{bundle.downforceN} N
                  </span>
                  <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-heading hidden sm:inline">
                    DOWNFORCE
                  </span>
                </div>
              )}

              {bundle.dragN !== 0 && (
                <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-sm flex items-center gap-2 shadow-sm">
                  <Gauge size={14} className="text-[var(--accent-red)]" />
                  <span className="text-[var(--accent-red)] font-bold text-xs font-mono">
                    {bundle.dragN > 0 ? `+${bundle.dragN}` : bundle.dragN} N
                  </span>
                  <span className="text-[0.65rem] text-zinc-400 uppercase tracking-wider font-heading hidden sm:inline">
                    DRAG
                  </span>
                </div>
              )}
            </div>

            {/* Included Parts / Pieces List (Localized parts) */}
            {bundle.bundleItems.length > 0 && (
              <div className="pt-1">
                <p className="text-[0.62rem] text-zinc-400 font-heading uppercase tracking-wider mb-1.5">
                  {lang === "en"
                    ? `Included in package (${bundle.bundleItems.length} parts):`
                    : `ชุดเซ็ตนี้ประกอบด้วย (${bundle.bundleItems.length} ชิ้นส่วน):`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bundle.bundleItems.map((part) => {
                    const partName = getLocalizedField(part.name, part.nameEn, lang);
                    return (
                      <span
                        key={part.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800/80 text-zinc-300 text-[0.65rem] font-heading rounded-sm"
                      >
                        <CheckCircle2 size={10} className="text-[var(--success)]" />
                        {partName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price & Action CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <div>
                <p className="font-heading text-lg md:text-xl font-bold text-white tracking-wide">
                  {bundle.formattedPrice}
                </p>
                {bundle.compareAtPrice && (
                  <p className="text-xs text-zinc-500 line-through -mt-0.5 font-sans">
                    ฿{parseFloat(bundle.compareAtPrice).toLocaleString()} THB
                  </p>
                )}
              </div>

              <Link
                href={`/products/${bundle.slug}`}
                className="btn-primary gap-2 text-xs py-2.5 px-5 shadow-lg shadow-red-950/30"
                id="view-bundle-package-btn"
              >
                VIEW COMPLETE PACKAGE <ArrowRight size={13} />
              </Link>

              <AddToCartButton
                product={{ ...bundle, name: localizedName }}
                showText={false}
              />
            </div>
          </div>

          {/* Right Column: Hero Car Render (order-1 on mobile, md:order-2 on tablet/desktop) */}
          <div className="order-1 md:order-2 md:col-span-6 lg:col-span-6">
            <Link
              href={`/products/${bundle.slug}`}
              className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-sm overflow-hidden border border-zinc-800 bg-zinc-900/60 shadow-xl group block"
            >
              <Image
                src={bundle.primaryImage || "/images/FRONT.png"}
                alt={localizedName}
                fill
                priority
                className="object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[0.65rem] font-heading font-semibold text-zinc-300 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800/80 px-2.5 py-1 rounded-sm shadow">
                  {bundle.bundleItems.length > 0
                    ? `FULL KIT INSTALLED • ${bundle.bundleItems.length} PIECES`
                    : "FULL KIT INSTALLED"}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
