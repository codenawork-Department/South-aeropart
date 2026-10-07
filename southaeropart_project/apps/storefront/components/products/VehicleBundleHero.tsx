"use client";

import { useEffect, useRef, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Wind,
  Gauge,
  Layers,
  PackageX,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Tag,
} from "lucide-react";
import type { VehicleBundleData } from "@/actions/bundle.actions";
import { AddToCartButton } from "./AddToCartButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import styles from "./VehicleBundleHero.module.css";

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
  const { formatPrice } = useCurrency();
  const heroRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Interactive Photo Slider & Spec Tooltip State
  // ---------------------------------------------------------------------------
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Close active tooltip when tapping outside on mobile/touch screens
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`.${styles.specChipWrapper}`)) {
        setActiveTooltip(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const images =
    bundle?.images && bundle.images.length > 0
      ? bundle.images
      : bundle?.primaryImage
        ? [bundle.primaryImage]
        : ["/images/g9r.png"];

  const safeIdx = activeImageIdx < images.length ? activeImageIdx : 0;
  const currentImage = images[safeIdx];

  const prevImage = () => {
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const defaultViewLabels =
    lang === "en"
      ? ["FRONT 3/4", "SIDE PROFILE", "REAR 3/4", "FRONT STANCE", "AERO WING", "DETAIL"]
      : ["มุมเฉียงหน้า", "มุมข้างลำตัว", "มุมเฉียงหลัง", "มุมตรงหน้า", "สปอยเลอร์", "รายละเอียด"];

  const currentViewLabel = defaultViewLabels[safeIdx] || `VIEW 0${safeIdx + 1}`;

  const viewAngles = ["45° FRONT", "90° PROFILE", "135° REAR", "0° STANCE", "AERO WING", "MACRO"];
  const currentAngle = viewAngles[safeIdx] || `CAM 0${safeIdx + 1}`;

  // ---------------------------------------------------------------------------
  // Bidirectional Scroll Focus/Blur Effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      visual.style.setProperty("--scroll-blur", "0px");
      visual.style.setProperty("--scroll-opacity", "1");
      visual.style.setProperty("--scroll-scale", "1");
      return;
    }

    let rafId = 0;
    const calculateFocus = () => {
      if (!heroRef.current || !visual) return;
      const rect = heroRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;

      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;

      const distance = Math.abs(sectionCenter - viewportCenter);
      const focusRange = viewportHeight * 0.72;

      const ratio = Math.min(1, Math.max(0, distance / focusRange));
      const ease = ratio * ratio;

      const blurVal = (ease * 10).toFixed(1);
      const opacityVal = (1 - ease * 0.45).toFixed(2);
      const scaleVal = (1 - ease * 0.025).toFixed(3);

      visual.style.setProperty("--scroll-blur", `${blurVal}px`);
      visual.style.setProperty("--scroll-opacity", opacityVal);
      visual.style.setProperty("--scroll-scale", scaleVal);
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateFocus);
    };

    calculateFocus();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [bundle]);

  // ---------------------------------------------------------------------------
  // 1. Empty State Handling
  // ---------------------------------------------------------------------------
  if (!bundle) {
    if (!hasFilter) {
      return null;
    }

    return (
      <div className="pt-6 pb-2 md:pt-8 md:pb-3">
        <div className="container-main">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-3.5 md:px-5 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
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
  // 2. Direct Admin Field Mappings (From Admin Form: Name, SKU, Material, Short & Full Desc)
  // ---------------------------------------------------------------------------
  const localizedName = getLocalizedField(bundle.name, bundle.nameEn, lang);
  const localizedShortDesc = getLocalizedField(bundle.shortDescription, bundle.shortDescriptionEn, lang);
  const localizedFullDesc = getLocalizedField(bundle.description, bundle.descriptionEn, lang);
  const localizedMaterial = getLocalizedField(bundle.material, bundle.materialEn, lang);
  const localizedInstallation = getLocalizedField(bundle.installation, bundle.installationEn, lang);
  const localizedMaterialDesc = getLocalizedField(bundle.materialDescription, bundle.materialDescriptionEn, lang);
  const localizedInstallationDesc = getLocalizedField(bundle.installationDescription, bundle.installationDescriptionEn, lang);

  // Line 2: Subtitle directly from Admin "SHORT DESCRIPTION" (คำอธิบายสั้น)
  const shortDescriptionText =
    localizedShortDesc ||
    bundle.tagline ||
    (lang === "en"
      ? `${bundle.brandName} ${bundle.carModelName} Complete Aerodynamics Package`
      : `ชุดแต่งรอบคันสมรรถนะสูง ${bundle.brandName} ${bundle.carModelName}`);

  // Line 3: Paragraph directly from Admin "FULL DESCRIPTION" (คำอธิบายเต็ม)
  const fullDescriptionText = localizedFullDesc || "";

  // Split Name for massive dual-color wordmark
  const nameParts = localizedName.split(" ");
  const firstTitlePart = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : localizedName;
  const lastTitlePart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const vehicleHeadline = bundle.carModelName
    ? `${bundle.brandName} ${bundle.carModelName} ${bundle.carModelGen ? `(${bundle.carModelGen})` : ""}`
    : `${makeLabel} ${modelLabel}`;

  const partsCount = bundle.bundleItems?.length || 4;

  // ---------------------------------------------------------------------------
  // 3. Render Component
  // ---------------------------------------------------------------------------
  return (
    <section ref={heroRef} className={styles.hero} id="featured-bundle-hero">
      <div className={styles.stage}>
        
        {/* Dynamic Focus & Blur Wrapper: reacts smoothly to scroll */}
        <div
          ref={visualRef}
          className={styles.stageFocus}
          style={{
            filter: "blur(var(--scroll-blur, 0px))",
            opacity: "var(--scroll-opacity, 1)",
            transform: "scale(var(--scroll-scale, 1)) translateZ(0)",
          }}
        >
          {/* Blueprint Engineering Grid Overlay */}
          <div className={styles.blueprint} aria-hidden="true" />

          {/* Crimson Radial Atmospheric Spotlight behind car */}
          <div className={styles.glow} aria-hidden="true" />

          {/* Top Masthead */}
          <div className={styles.masthead}>
            <div className={styles.mastheadTitle}>
              <span className={styles.statusDot} />
              <span>SOUTH AERO</span>
              <span className={styles.archive}>/ FLAGSHIP SPECIFICATION &bull; {vehicleHeadline}</span>
            </div>
            <a href="#products-grid-anchor" className={styles.skip}>
              {lang === "en" ? "Explore parts" : "ดูอะไหล่เดี่ยว"} <ArrowDown size={13} />
            </a>
          </div>

          {/* Unified Harmonious Left Column */}
          <div className={styles.leftColumn}>
            
            {/* Top Block: Vehicle Identification + Master Headline */}
            <div className={styles.heroBrandBlock}>
              <div className={styles.modelBadge}>
                <span className={styles.modelBadgeDot} />
                <span>{bundle.brandName} {bundle.carModelName} {bundle.carModelGen ? `(${bundle.carModelGen})` : ""}</span>
                <span className={styles.modelBadgeDivider}>•</span>
                <span className={styles.modelBadgeSub}>{bundle.sku ? bundle.sku : "EDITION 01"}</span>
              </div>

              <h1 className={styles.unifiedWordmark}>
                <span>{firstTitlePart || bundle.brandName}</span>
                <span className={styles.unifiedWordmarkAccent}>
                  {lastTitlePart || bundle.carModelName}
                  <i className={styles.unifiedWordmarkDot}>.</i>
                </span>
              </h1>
            </div>

            {/* Middle Block: Directly bound to Admin Fields (Material/SKU -> Short Description -> Full Description) */}
            <div className={styles.storyBlock}>
              {/* Line 1: Technical Specs Eyebrow (DB-Driven Interactive Icon Chips: Material & Installation Method) */}
              <div
                className={styles.specsEyebrow}
                role="toolbar"
                aria-label={lang === "en" ? "Package specifications" : "ข้อมูลจำเพาะของชุดแต่ง"}
              >
                <span className={styles.eyebrowBar} aria-hidden="true" />

                <div className={styles.specChipsRow}>
                  {/* Spec 1: วัสดุหลักของเซ็ต (MATERIAL) */}
                  {localizedMaterial && (
                    <div
                      className={styles.specChipWrapper}
                      data-open={activeTooltip === "material"}
                      onMouseEnter={() => setActiveTooltip("material")}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <button
                        type="button"
                        className={styles.specChipButton}
                        onClick={() => setActiveTooltip(activeTooltip === "material" ? null : "material")}
                        aria-label={`${lang === "en" ? "Primary Material" : "วัสดุหลักของเซ็ต"}: ${localizedMaterial}`}
                        aria-expanded={activeTooltip === "material"}
                      >
                        <DynamicIcon
                          name={bundle.materialIcon}
                          fallback="Layers"
                          size={14}
                          className={styles.chipIcon}
                        />
                        <span className={styles.chipDot} aria-hidden="true" />
                      </button>

                      <div
                        className={styles.tooltipPopover}
                        role="tooltip"
                        aria-hidden={activeTooltip !== "material"}
                      >
                        <div className={styles.tooltipHeader}>
                          <span className={styles.tooltipBadgeDot} />
                          <span className={styles.tooltipCategory}>
                            {lang === "en" ? "PRIMARY MATERIAL" : "วัสดุหลักของเซ็ต (MATERIAL)"}
                          </span>
                        </div>
                        <div className={styles.tooltipValue}>{localizedMaterial}</div>
                        {localizedMaterialDesc && (
                          <div className={styles.tooltipDesc}>{localizedMaterialDesc}</div>
                        )}
                        <div className={styles.tooltipArrow} aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {/* Spec 2: วิธีการติดตั้ง (INSTALLATION METHOD) */}
                  {localizedInstallation && (
                    <div
                      className={styles.specChipWrapper}
                      data-open={activeTooltip === "installation"}
                      onMouseEnter={() => setActiveTooltip("installation")}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <button
                        type="button"
                        className={styles.specChipButton}
                        onClick={() => setActiveTooltip(activeTooltip === "installation" ? null : "installation")}
                        aria-label={`${lang === "en" ? "Installation Method" : "วิธีการติดตั้ง"}: ${localizedInstallation}`}
                        aria-expanded={activeTooltip === "installation"}
                      >
                        <DynamicIcon
                          name={bundle.installationIcon}
                          fallback="Wrench"
                          size={14}
                          className={styles.chipIcon}
                        />
                        <span className={styles.chipDot} aria-hidden="true" />
                      </button>

                      <div
                        className={styles.tooltipPopover}
                        role="tooltip"
                        aria-hidden={activeTooltip !== "installation"}
                      >
                        <div className={styles.tooltipHeader}>
                          <span className={styles.tooltipBadgeDot} />
                          <span className={styles.tooltipCategory}>
                            {lang === "en" ? "INSTALLATION METHOD" : "วิธีการติดตั้ง (INSTALLATION METHOD)"}
                          </span>
                        </div>
                        <div className={styles.tooltipValue}>{localizedInstallation}</div>
                        {localizedInstallationDesc && (
                          <div className={styles.tooltipDesc}>{localizedInstallationDesc}</div>
                        )}
                        <div className={styles.tooltipArrow} aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {/* Spec 3: รหัสสินค้า (SKU) */}
                  {bundle.sku && (
                    <div
                      className={styles.specChipWrapper}
                      data-open={activeTooltip === "sku"}
                      onMouseEnter={() => setActiveTooltip("sku")}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <button
                        type="button"
                        className={styles.specChipButton}
                        onClick={() => setActiveTooltip(activeTooltip === "sku" ? null : "sku")}
                        aria-label={`SKU: ${bundle.sku}`}
                        aria-expanded={activeTooltip === "sku"}
                      >
                        <Tag size={13} className={styles.chipIcon} />
                        <span className={styles.chipDot} aria-hidden="true" />
                      </button>

                      <div
                        className={styles.tooltipPopover}
                        role="tooltip"
                        aria-hidden={activeTooltip !== "sku"}
                      >
                        <div className={styles.tooltipHeader}>
                          <span className={styles.tooltipBadgeDot} />
                          <span className={styles.tooltipCategory}>
                            {lang === "en" ? "PACKAGE SPECIFICATION" : "รหัสสินค้า (SKU)"}
                          </span>
                        </div>
                        <div className={styles.tooltipValue}>{bundle.sku}</div>
                        <div className={styles.tooltipDesc}>
                          {lang === "en"
                            ? "Genuine South Aero aerodynamic package code"
                            : "รหัสแพ็กเกจชิ้นส่วนแท้ South Aero ผ่านการทดสอบ CFD"}
                        </div>
                        <div className={styles.tooltipArrow} aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {/* Fallback if no specs available */}
                  {!localizedMaterial && !localizedInstallation && !bundle.sku && (
                    <span className={styles.eyebrowFallback}>
                      {lang === "en" ? "AERODYNAMICS SPECIFICATION" : "ข้อมูลเฉพาะทางอากาศพลศาสตร์"}
                    </span>
                  )}
                </div>
              </div>

              {/* Line 2: SHORT DESCRIPTION from Admin */}
              {shortDescriptionText && (
                <h2 className={styles.storyTitle}>
                  {shortDescriptionText}
                </h2>
              )}

              {/* Line 3: FULL DESCRIPTION from Admin */}
              {fullDescriptionText && (
                <p className={styles.storyDesc}>
                  {fullDescriptionText}
                </p>
              )}
            </div>

            {/* Bottom Block: Telemetry HUD Grid + Commercial Price & CTA */}
            <div className={styles.footerDeck}>
              {/* Telemetry 3-Card Grid */}
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryCard}>
                  <div className={styles.telemetryHeader}>
                    <Wind size={12} className={styles.telemetryDownforceIcon} />
                    <span>DOWNFORCE</span>
                  </div>
                  <div className={styles.telemetryValueGreen}>
                    {bundle.downforceN > 0 ? `+${bundle.downforceN} N` : "CFD TUNED"}
                  </div>
                </div>

                <div className={styles.telemetryCard}>
                  <div className={styles.telemetryHeader}>
                    <Gauge size={12} className={styles.telemetryDragIcon} />
                    <span>DRAG INDEX</span>
                  </div>
                  <div className={styles.telemetryValueRed}>
                    {bundle.dragN !== 0 ? (bundle.dragN > 0 ? `+${bundle.dragN} N` : `${bundle.dragN} N`) : "BALANCED"}
                  </div>
                </div>

                <div className={styles.telemetryCard}>
                  <div className={styles.telemetryHeader}>
                    <Layers size={12} className={styles.telemetryPartsIcon} />
                    <span>INCLUDED</span>
                  </div>
                  <div className={styles.telemetryValueWhite}>
                    {partsCount} PIECES
                  </div>
                </div>
              </div>

              {/* Price & Primary Action Buttons */}
              <div className={styles.commerceRow}>
                <div className={styles.priceContainer}>
                  <span className={styles.priceMeta}>
                    {lang === "en" ? "COMPLETE PACKAGE PRICE" : "ราคายกชุดทั้งเซ็ต"}
                  </span>
                  <div className={styles.priceAmount}>
                    {formatPrice(bundle.price, { showCode: true })}
                  </div>
                </div>

                <div className={styles.ctaGroup}>
                  <Link href={`/products/${bundle.slug}`} className={styles.ctaPrimary} id="view-bundle-package-btn">
                    {lang === "en" ? "VIEW COMPLETE PACKAGE" : "ดูชุดแต่งเต็ม"} <ArrowUpRight size={15} />
                  </Link>
                  <AddToCartButton product={{ ...bundle, name: localizedName }} showText={false} />
                </div>
              </div>
            </div>

          </div>

          {/* Seamless Floating Car Photo with Mask Composite */}
          <div className={styles.photo}>
            <Image
              key={currentImage}
              src={currentImage}
              alt={`${localizedName} — ${currentViewLabel}`}
              fill
              priority
              sizes="(max-width: 767px) 120vw, 85vw"
              className={styles.image}
            />
          </div>

          {/* Left/Right Floating Navigation Chevrons over the Stage */}
          {images.length > 1 && (
            <div className={styles.photoNav}>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous view"
                title="Previous photo view"
                className={styles.navButton}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next view"
                title="Next photo view"
                className={styles.navButton}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Deep Black Gradient Shade for Left Legibility */}
          <div className={styles.shade} />

          {/* Motorsport Tech HUD Badge (Top-Right) */}
          <div className={styles.specimenBadge} aria-hidden="true">
            <div className={styles.specimenHeader}>
              <span className={styles.specimenPulseDot} />
              <span className={styles.specimenCategory}>
                {lang === "en" ? "STUDIO PERSPECTIVE" : "มุมมองสตูดิโอ"}
              </span>
              <span className={styles.specimenAngle}>{currentAngle}</span>
            </div>
            <div className={styles.specimenBody}>
              <span className={styles.specimenCode}>SA—0{safeIdx + 1}</span>
              <span className={styles.specimenDivider}>/</span>
              <span className={styles.specimenView}>{currentViewLabel}</span>
            </div>
          </div>

          {/* Big Number Watermark (Syncs with active photo index!) */}
          <div className={styles.number} aria-hidden="true">
            / 0{safeIdx + 1}
          </div>

          {/* Huge Faint SOUTH Watermark in Background */}
          <div className={styles.watermark} aria-hidden="true">
            SOUTH
          </div>

          {/* Side Vertical Label */}
          <div className={styles.sideLabel} aria-hidden="true">
            SOUTH AERO PERFORMANCE &bull; {currentViewLabel}
          </div>

          {/* Bottom Footer: Scroll hint & Interactive Photo Slider Tabs (01, 02, 03, 04) */}
          <div className={styles.footer}>
            <p className={styles.hint}>
              <ArrowDown size={14} />
              <span>
                {lang === "en"
                  ? "Click views below to inspect angles. Scroll to explore parts."
                  : "คลิกตัวเลขด้านขวาเพื่อสลับมุมมองภาพ หรือเลื่อนลงเพื่อดูอะไหล่"}
              </span>
            </p>

            <nav aria-label="Photo views" className={styles.chapters} role="tablist">
              {images.map((_, idx) => {
                const isActive = idx === safeIdx;
                const viewName = defaultViewLabels[idx] || `VIEW 0${idx + 1}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`${styles.chapterItem} ${isActive ? styles.chapterItemActive : ""}`}
                    title={`Switch to ${viewName}`}
                  >
                    <span className={styles.chapterIndex}>0{idx + 1}</span>
                    <span className={styles.chapterLabel}>{viewName}</span>
                    <span className={`${styles.chapterLine} ${isActive ? styles.chapterLineActive : ""}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Accent Track (Dynamic Width based on active slide) */}
          <div className={styles.track} aria-hidden="true">
            <div
              className={styles.trackFill}
              style={{
                width: `${((safeIdx + 1) / Math.max(1, images.length)) * 100}%`,
              }}
            />
          </div>

        </div>

      </div>
    </section>
  );
}
