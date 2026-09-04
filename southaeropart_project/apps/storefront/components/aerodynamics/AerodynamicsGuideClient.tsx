"use client";

import { useState, useEffect, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wind,
  Gauge,
  Shield,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Globe,
  Layers,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Car,
  RotateCcw,
  Info,
  Compass,
  BatteryCharging,
  Maximize2,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  AeroLanguage,
  AERODYNAMICS_TELEMETRY_STATS,
  SPEED_CURVE_DATA,
  AEROPARTS_ANATOMY,
  ACTIVE_AERO_TECHNOLOGY,
  RACING_PHENOMENA,
  SOUTH_AERO_VALIDATION,
  FAQ_ITEMS,
} from "@/data/aerodynamics-content";

interface AerodynamicsGuideClientProps {
  initialLanguage: AeroLanguage;
}

export function AerodynamicsGuideClient({ initialLanguage }: AerodynamicsGuideClientProps) {
  const [lang, setLang] = useState<AeroLanguage>(initialLanguage);
  const [activeTab, setActiveTab] = useState<string>("spoiler-vs-wing");
  const [speedKmh, setSpeedKmh] = useState<number>(120); // Real-time smooth continuous speed (40 to 200 km/h)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activePhenomenon, setActivePhenomenon] = useState<"porpoising" | "aeroacoustics">("porpoising");

  // Sync language with global LanguageProvider
  const { lang: globalLang, setLanguage: setGlobalLang } = useLanguage();

  useEffect(() => {
    if (globalLang && (globalLang === "th" || globalLang === "en") && globalLang !== lang) {
      setLang(globalLang);
    }
  }, [globalLang, lang]);

  // Language switch handler
  const handleToggleLanguage = (newLang: AeroLanguage) => {
    setLang(newLang);
    setGlobalLang(newLang);
  };

  // ══════════════════════════════════════════════════════════
  // REAL-TIME FLUID DYNAMICS CALCULATIONS (1 km/h Resolution)
  // ══════════════════════════════════════════════════════════
  const dragForceN = Math.round(0.05 * speedKmh * speedKmh);
  const dragForceKgf = (dragForceN / 9.80665).toFixed(1);
  const powerWatts = dragForceN * (speedKmh / 3.6);
  const powerHp = (powerWatts / 745.7).toFixed(1);
  const powerMultiplierPct = Math.round(Math.pow(speedKmh / 100, 3) * 100);

  // % of energy overcoming aerodynamic drag vs mechanical rolling resistance (nominal ~900N)
  const rollingResistanceN = 900;
  const energyPctOvercomingDrag = Math.min(
    88,
    Math.max(10, Math.round((dragForceN / (dragForceN + rollingResistanceN)) * 100))
  );

  // EV Battery Range impact relative to 60 km/h baseline
  const workAt60 = 0.05 * 60 * 60 + rollingResistanceN;
  const workCurrent = dragForceN + rollingResistanceN;
  const evRangePenaltyPct = Math.max(
    0,
    Math.min(65, Math.round(((workCurrent - workAt60) / workCurrent) * 100))
  );
  const speedMph = Math.round(speedKmh * 0.621371);
  const sliderProgress = Math.max(0, Math.min(100, ((speedKmh - 40) / (200 - 40)) * 100));

  const activePart = AEROPARTS_ANATOMY.find((p) => p.id === activeTab) || AEROPARTS_ANATOMY[0];

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen selection:bg-[var(--accent-red)] selection:text-white">
      {/* ══════════════════════════════════════════════════════════
          1. TOP HERO & TELEMETRY HEADER
          ══════════════════════════════════════════════════════════ */}
      <section className="relative pt-10 md:pt-12 pb-8 md:pb-10 border-b border-[#1C1C1C] overflow-hidden bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A]">
        {/* Background Grid & Ambient Glow */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[var(--accent-red)]/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="container-main relative z-10">
          {/* Breadcrumb & Language Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-5">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading uppercase tracking-wider">
              <Link href="/" className="hover:text-white transition-colors">
                HOME
              </Link>
              <span>/</span>
              <span className="text-[var(--accent-red)]">
                {lang === "th" ? "คลังความรู้อากาศพลศาสตร์" : "AERODYNAMICS ACADEMY"}
              </span>
            </div>

            {/* Sticky/Header Language Pill Selector */}
            <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-full shadow-lg">
              <Globe size={14} className="text-[var(--accent-red)]" />
              <span className="text-[0.65rem] text-[var(--text-secondary)] font-heading uppercase tracking-wider hidden sm:inline">
                {lang === "th" ? "ภาษา" : "LANGUAGE"}:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="toggle-lang-th"
                  onClick={() => handleToggleLanguage("th")}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-heading font-bold tracking-wider transition-all ${
                    lang === "th"
                      ? "bg-[var(--accent-red)] text-white shadow"
                      : "text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  ไทย (TH)
                </button>
                <button
                  type="button"
                  id="toggle-lang-en"
                  onClick={() => handleToggleLanguage("en")}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-heading font-bold tracking-wider transition-all ${
                    lang === "en"
                      ? "bg-[var(--accent-red)] text-white shadow"
                      : "text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-[0.7rem] font-heading font-bold tracking-widest uppercase mb-3">
              <Wind size={14} />
              {lang === "th"
                ? "คู่มือวิศวกรรมอากาศพลศาสตร์ยานยนต์ฉบับสมบูรณ์"
                : "COMPREHENSIVE AUTOMOTIVE AERODYNAMICS GUIDE"}
            </div>

            <h1 className="heading-xl text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight">
              {lang === "th" ? (
                <>
                  ศาสตร์แห่งความเร็ว: <br className="hidden sm:inline" />
                  <span className="text-[var(--accent-red)]">อากาศพลศาสตร์ยานยนต์</span>{" "}
                  และการควบคุมกระแสลม
                </>
              ) : (
                <>
                  THE SCIENCE OF SPEED: <br className="hidden sm:inline" />
                  <span className="text-[var(--accent-red)]">AUTOMOTIVE AERODYNAMICS</span>{" "}
                  &amp; FLOW CONTROL
                </>
              )}
            </h1>

            <p className="body-lg mt-3 md:mt-4 text-[var(--text-secondary)] text-base sm:text-lg max-w-3xl leading-relaxed">
              {lang === "th"
                ? "ย่อยความรู้จากงานวิจัยด้านวิศวกรรมของไหลฉบับสมบูรณ์ ทำไมรถยนต์จึงต้องการชิ้นส่วนแอโรพาร์ท? แรงต้านอากาศ (Drag) และแรงกด (Downforce) ส่งผลต่อสมรรถนะ การทรงตัวในโค้ง และการประหยัดพลังงานของรถคุณอย่างไรในชีวิตจริง"
                : "A masterclass in automotive fluid dynamics: Learn how aerodynamic drag (Cd) and downforce (Cl) govern high-speed stability, cornering grip, fuel economy, and electric vehicle battery range."}
            </p>

            {/* Quick Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-4 border-t border-[#1F1F1F] text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-[var(--accent-red)]" />
                <span>
                  {lang === "th" ? "ระดับ: วิศวกรรมยานยนต์ประยุกต์" : "Level: Applied Automotive Engineering"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge size={15} className="text-[var(--accent-red)]" />
                <span>{lang === "th" ? "เวลาอ่าน: 7-8 นาที" : "Reading Time: ~8 Mins"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-[var(--accent-red)]" />
                <span>{lang === "th" ? "รับรองโดย: South Aero R&D" : "Verified by: South Aero R&D"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. TELEMETRY STATS GRID
          ══════════════════════════════════════════════════════════ */}
      <section className="py-6 md:py-8 bg-[#0E0E0E] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {AERODYNAMICS_TELEMETRY_STATS.map((stat) => (
              <div
                key={stat.id}
                className="card p-4 bg-[#141414] border-[#222222] hover:border-[var(--accent-red)]/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-xl sm:text-2xl font-heading font-black text-[var(--accent-red)] tracking-tight">
                    {stat.value}
                  </span>
                  <p className="text-xs font-heading font-bold text-white uppercase mt-1">
                    {stat.label[lang]}
                  </p>
                </div>
                <p className="text-[0.68rem] text-[var(--text-muted)] mt-2 leading-tight">
                  {stat.description[lang]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. SECTION 1: THE CORE BATTLE (DRAG VS DOWNFORCE)
          ══════════════════════════════════════════════════════════ */}
      <section id="physics-core" className="py-16 md:py-24 bg-[#0A0A0A] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="max-w-2xl mb-12">
            <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              MODULE 01 &bull; FLUID MECHANICS
            </span>
            <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl">
              {lang === "th" ? (
                <>
                  การต่อสู้ 2 ด้าน: <span className="text-[var(--accent-red)]">แรงต้าน (Drag)</span> vs{" "}
                  <span className="text-[var(--accent-red)]">แรงกด (Downforce)</span>
                </>
              ) : (
                <>
                  The Dual Objectives: <span className="text-[var(--accent-red)]">Drag</span> vs.{" "}
                  <span className="text-[var(--accent-red)]">Downforce</span>
                </>
              )}
            </h2>
            <p className="body-md mt-3 text-[var(--text-secondary)]">
              {lang === "th"
                ? "อากาศพลศาสตร์ยานยนต์ไม่ใช่แค่การทำให้รถดูสปอร์ต แต่คือการจัดการแรงทางฟิสิกส์ 2 ตัวแปรหลักที่ทำหน้าที่ตรงข้ามกันอย่างสิ้นเชิง"
                : "Aerodynamic engineering centers around managing two fundamental vector forces: the horizontal force opposing motion, and the vertical force keeping tires glued to the road."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Card A: Aerodynamic Drag */}
            <div className="card p-6 md:p-8 bg-[#121212] border-[#222222] relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wind size={20} className="text-[var(--accent-red)]" />
                    <span className="text-xs font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider">
                      HORIZONTAL VECTOR (Fd)
                    </span>
                  </div>
                  <span className="telemetry-pill text-[0.65rem]">Cd INDEX</span>
                </div>

                <h3 className="heading-md text-white text-xl sm:text-2xl">
                  {lang === "th" ? "1. แรงต้านอากาศ (Aerodynamic Drag)" : "1. Aerodynamic Drag (Fd)"}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                  Formula: Fd = ½ &rho; v² A Cd
                </p>

                <p className="body-md mt-4 text-[var(--text-secondary)] leading-relaxed text-sm">
                  {lang === "th"
                    ? "แรงต้านอากาศเปรียบเสมือน 'ร่มชูชีพที่มองไม่เห็น' คอยดึงรถไปข้างหลัง ยิ่งรถวิ่งเร็ว แรงต้านจะไม่ได้เพิ่มเป็นเส้นตรง แต่เพิ่มขึ้นตามความเร็วยกกำลังสอง (v²) และต้องใช้กำลังเครื่องยนต์สูงขึ้นถึงความเร็วยกกำลังสาม (v³) ในการเอาชนะ!"
                    : "Drag is the horizontal resistance opposing vehicle travel. Because drag scales with velocity squared (v²), and required engine power scales with velocity cubed (v³), high-speed cruising drains tremendous energy solely to push air aside."}
                </p>

                {/* Sub-breakdown: Form Drag vs Skin Friction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#1F1F1F]">
                  <div className="bg-[#181818] p-4 rounded border border-[#262626]">
                    <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] uppercase">
                      {lang === "th" ? "แรงต้านจากรูปทรง (~60%)" : "Form Drag (~60%)"}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                      {lang === "th"
                        ? "เกิดจากความต่างของแรงดัน: หน้ารถชนลมเป็นแรงดันสูง บั้นท้ายรถเกิดโซนลมวนดูดรถไปข้างหลัง"
                        : "Dictated by vehicle shape. High front stagnation pressure vs rear turbulent vacuum suction."}
                    </p>
                  </div>
                  <div className="bg-[#181818] p-4 rounded border border-[#262626]">
                    <span className="text-[0.65rem] font-heading font-bold text-white uppercase">
                      {lang === "th" ? "แรงเสียดทานผิวสัมผัส" : "Skin Friction Drag"}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                      {lang === "th"
                        ? "ความหนืดของอากาศในชั้น Boundary Layer ตามพื้นผิวตัวถัง รอยต่อ และมือจับประตู"
                        : "Viscous air shear along the body panels, panel gaps, door handles, and exterior surfaces."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1F1F1F] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{lang === "th" ? "เป้าหมาย: ลด Cd ให้ต่ำที่สุด" : "Goal: Minimize Cd & Frontal Area"}</span>
                <span className="text-[var(--accent-red)] font-bold">5% - 12% Fuel / Energy Impact</span>
              </div>
            </div>

            {/* Card B: Downforce & Lift */}
            <div className="card p-6 md:p-8 bg-[#121212] border-[#222222] relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={20} className="text-[var(--accent-red)]" />
                    <span className="text-xs font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider">
                      VERTICAL VECTOR (Fl / Fd)
                    </span>
                  </div>
                  <span className="telemetry-pill text-[0.65rem]">Cl INDEX</span>
                </div>

                <h3 className="heading-md text-white text-xl sm:text-2xl">
                  {lang === "th" ? "2. แรงกดและแรงยก (Downforce & Lift)" : "2. Downforce vs. Lift (Fl)"}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                  Principle: Bernoulli Pressure Gradient (&Delta;P)
                </p>

                <p className="body-md mt-4 text-[var(--text-secondary)] leading-relaxed text-sm">
                  {lang === "th"
                    ? "รถเก๋งทั่วไปตามธรรมชาติจะมีรูปทรงคล้าย 'ปีกเครื่องบิน' เมื่อวิ่งเร็ว อากาศที่ไหลบนหลังคาจะเร็วกว่าใต้ท้องรถ ทำให้เกิด 'แรงยก' (Positive Lift) ส่งผลให้รถเบาร่อนและพวงมาลัยโหวง ชิ้นส่วนแอโรพาร์ทจะกลับทิศทางนี้ สร้าง 'แรงกด' (Downforce) กดหน้ายางให้แน่นกับถนนโดยไม่ต้องเพิ่มน้ำหนักให้รถ!"
                    : "Standard passenger vehicles mimic asymmetrical airfoils, generating dangerous positive lift at highway speeds that unweights tires. Inverted airfoils and diffusers reverse this, generating negative lift (downforce) that mechanically plants tires without adding vehicle weight."}
                </p>

                {/* Sub-breakdown: Pitching Moment & Aerodynamic Balance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#1F1F1F]">
                  <div className="bg-[#181818] p-4 rounded border border-[#262626]">
                    <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] uppercase">
                      {lang === "th" ? "แรงกดหน้าเกินไป (Oversteer)" : "Front Bias (Oversteer)"}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                      {lang === "th"
                        ? "หากหน้ารถมีแรงกดมากเกินไป ท้ายจะเบาและมีโอกาสเกิดอาการท้ายปัดที่ความเร็วสูง"
                        : "Excessive front-axle downforce makes the rear skittish, inducing high-speed snap oversteer."}
                    </p>
                  </div>
                  <div className="bg-[#181818] p-4 rounded border border-[#262626]">
                    <span className="text-[0.65rem] font-heading font-bold text-white uppercase">
                      {lang === "th" ? "แรงกดท้ายเกินไป (Understeer)" : "Rear Bias (Understeer)"}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                      {lang === "th"
                        ? "การติดวิงหลังใหญ่โดยไม่มีสปลิตเตอร์หน้า จะทำให้หน้ารถลอยและเลี้ยวไม่เข้า (หน้าดื้อ)"
                        : "Massive rear wings without front splitters lift the front axle, causing severe high-speed understeer."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1F1F1F] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{lang === "th" ? "เป้าหมาย: สมดุลแรงกดหน้า-หลัง" : "Goal: Balanced Aero Pitching Center"}</span>
                <span className="text-[var(--accent-red)] font-bold">+150N to +500N Grip</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. SECTION 2: INTERACTIVE SPEED & POWER DEMAND LAB
          ══════════════════════════════════════════════════════════ */}
      <section id="interactive-lab" className="py-16 md:py-20 bg-[#0E0E0E] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="card p-6 md:p-10 bg-[#141414] border-[#2A2A2A] relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-[var(--accent-red)]" />
                  <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                    INTERACTIVE FLUID SIMULATOR &bull; v² &amp; v³ LAW
                  </span>
                </div>
                <h3 className="heading-md text-white mt-1 text-2xl">
                  {lang === "th"
                    ? "เครื่องคำนวณการสูญเสียพลังงานตามความเร็ว"
                    : "Interactive Velocity vs. Power Demand Simulator"}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {lang === "th"
                    ? "ลองเลื่อนความเร็วดูว่า ทำไมการขับเร็วขึ้นเพียงเล็กน้อย จึงสูญเสียพลังงานและน้ำมันอย่างก้าวกระโดด"
                    : "Slide speed to see why marginal cruising speed increases demand exponentially higher engine and battery load."}
                </p>
              </div>

              <div className="bg-[#1E1E1E] px-4 py-2.5 rounded-lg border border-[#333333] flex items-center gap-4">
                <div>
                  <span className="text-[0.65rem] text-[var(--text-muted)] uppercase font-heading block">
                    {lang === "th" ? "ความเร็วจำลอง (REAL-TIME)" : "SIMULATED VELOCITY"}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-heading text-[var(--accent-red)] tracking-tight">
                      {speedKmh}
                    </span>
                    <span className="text-xs font-heading font-bold text-white uppercase">
                      KM/H <span className="text-[var(--text-muted)] font-normal">({speedMph} MPH)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smooth Continuous Range Slider */}
            <div className="my-8">
              <div className="flex items-center justify-between text-xs font-heading text-[var(--text-muted)] mb-2 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                  {lang === "th" ? "เลื่อนเมาส์ปรับความเร็วได้อย่างอิสระ (40 - 200 กม./ชม.)" : "Freely drag slider (40 - 200 km/h continuous)"}
                </span>
                <span className="text-[var(--accent-red)] font-bold">{speedKmh} km/h</span>
              </div>

              <div className="relative flex items-center">
                <input
                  id="speed-slider"
                  type="range"
                  min={40}
                  max={200}
                  step={1}
                  value={speedKmh}
                  onChange={(e) => setSpeedKmh(Number(e.target.value))}
                  className="w-full accent-[var(--accent-red)] h-2.5 rounded-lg appearance-none cursor-ew-resize transition-all"
                  style={{
                    background: `linear-gradient(to right, #E51D24 ${sliderProgress}%, #282828 ${sliderProgress}%)`,
                  }}
                  aria-label="Adjust velocity in km/h"
                />
              </div>

              {/* Quick Preset Benchmark Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-[0.7rem] font-heading">
                {[
                  { speed: 60, label: lang === "th" ? "60 เมือง/Eco" : "60 City" },
                  { speed: 80, label: lang === "th" ? "80 ชานเมือง" : "80 Suburb" },
                  { speed: 100, label: lang === "th" ? "100 มาตรฐาน" : "100 Baseline" },
                  { speed: 120, label: lang === "th" ? "120 ทางหลวง" : "120 Highway" },
                  { speed: 140, label: lang === "th" ? "140 ขวาสุด" : "140 Fast Lane" },
                  { speed: 160, label: lang === "th" ? "160 ความเร็วสูง" : "160 Express" },
                  { speed: 200, label: lang === "th" ? "200 สนามแข่ง" : "200 Track" },
                ].map((preset) => (
                  <button
                    key={preset.speed}
                    type="button"
                    onClick={() => setSpeedKmh(preset.speed)}
                    className={`px-2.5 py-1 rounded transition-all border ${
                      speedKmh === preset.speed
                        ? "bg-[var(--accent-red)] text-white border-[var(--accent-red)] font-bold shadow-sm scale-105"
                        : "bg-[#1A1A1A] text-[var(--text-muted)] border-[#2D2D2D] hover:text-white hover:border-[#444]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Telemetry Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#222222]">
              {/* Metric 1: Drag Force */}
              <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#2B2B2B]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{lang === "th" ? "แรงต้านอากาศ (Fd)" : "Aerodynamic Drag"}</span>
                  <Wind size={15} className="text-[var(--accent-red)]" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
                  ~{dragForceN} <span className="text-xs text-[var(--text-secondary)] font-normal">N</span>
                </div>
                <div className="mt-1 text-[0.72rem] text-[var(--text-muted)] font-mono">
                  &asymp; {dragForceKgf} kgf &bull; Fd &prop; v&sup2;
                </div>
              </div>

              {/* Metric 2: Power Demand to Fight Wind */}
              <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#2B2B2B]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{lang === "th" ? "กำลังเครื่องยนต์ดันลม" : "Aero Power Demand"}</span>
                  <TrendingUp size={15} className="text-yellow-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black font-heading text-yellow-400 tracking-tight">
                  {powerHp} <span className="text-xs text-white font-normal">HP</span>
                </div>
                <div className="mt-1 text-[0.72rem] text-[var(--text-muted)] font-mono">
                  {powerMultiplierPct}% {lang === "th" ? "เทียบ 100 กม./ชม." : "vs. 100 km/h (v³)"}
                </div>
              </div>

              {/* Metric 3: Energy Lost to Wind */}
              <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#2B2B2B]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{lang === "th" ? "% พลังงานที่เสียไปกับลม" : "Energy Overcoming Drag"}</span>
                  <Activity size={15} className="text-[var(--accent-red)]" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black font-heading text-[var(--accent-red)] tracking-tight">
                  {energyPctOvercomingDrag}%
                </div>
                <div className="w-full bg-[#262626] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[var(--accent-red)] h-full transition-all duration-150"
                    style={{ width: `${energyPctOvercomingDrag}%` }}
                  />
                </div>
                <div className="mt-1 text-[0.72rem] text-[var(--text-muted)]">
                  {speedKmh >= 130
                    ? lang === "th"
                      ? "เกิน 50%! ลมกลายเป็นภาระหลัก"
                      : "Over 50%! Drag dominates total load"
                    : lang === "th"
                      ? "ความฝืดการกลิ้งของยางยังเป็นภาระร่วม"
                      : "Rolling friction shared load"}
                </div>
              </div>

              {/* Metric 4: EV Battery Range Impact */}
              <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#2B2B2B]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{lang === "th" ? "ผลกระทบต่อแบตเตอรี่ EV" : "EV Range Penalty"}</span>
                  <BatteryCharging size={15} className="text-green-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black font-heading text-green-400 tracking-tight">
                  -{evRangePenaltyPct}%{" "}
                  <span className="text-xs text-white font-normal">
                    {lang === "th" ? "ระยะทาง" : "Range"}
                  </span>
                </div>
                <div className="mt-1 text-[0.72rem] text-[var(--text-muted)]">
                  {lang === "th"
                    ? `เทียบกับความเร็วเดินทางประหยัด 60 กม./ชม.`
                    : `Compared to 60 km/h eco cruising baseline`}
                </div>
              </div>
            </div>

            {/* Dynamic Educational Insight Banner (Updates Live) */}
            <div className="mt-6 p-4 rounded-lg bg-[#181818] border-l-4 border-l-[var(--accent-red)] text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-3">
              <Info size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-heading uppercase tracking-wider block mb-1">
                  {lang === "th"
                    ? `การวิเคราะห์ฟิสิกส์ ณ ความเร็ว ${speedKmh} กม./ชม. (v² & v³ LAW):`
                    : `Dynamic Physics Analysis at ${speedKmh} km/h (v² & v³ Law):`}
                </strong>
                {lang === "th" ? (
                  <span>
                    ณ ความเร็ว <strong className="text-white font-bold">{speedKmh} กม./ชม.</strong> ตัวรถต้องแหวกมวลอากาศด้วยแรงต้าน{" "}
                    <strong className="text-[var(--accent-red)] font-bold">~{dragForceN} นิวตัน ({dragForceKgf} kgf)</strong>{" "}
                    เครื่องยนต์หรือมอเตอร์ไฟฟ้าต้องสูญเสียกำลังไปถึง{" "}
                    <strong className="text-yellow-400 font-bold">{powerHp} แรงม้า</strong>{" "}
                    เพียงเพื่อดันลม คิดเป็นสัดส่วนสูงถึง{" "}
                    <strong className="text-[var(--accent-red)] font-bold">{energyPctOvercomingDrag}%</strong> ของพลังงานการขับเคลื่อนทั้งหมด!{" "}
                    {speedKmh >= 130 ? (
                      <>
                        <strong className="text-white">คำแนะนำทางวิศวกรรม:</strong> เมื่อความเร็วเกิน 130 กม./ชม. กำลังที่ต้องใช้ต้านลมจะพุ่งสูงขึ้นเป็น{" "}
                        <strong className="text-yellow-400">{powerMultiplierPct}%</strong> เมื่อเทียบกับตอนวิ่ง 100 กม./ชม. การติดตั้งชิ้นส่วนแอโรพาร์ทที่ลดแรงต้าน (เช่น สปอยเลอร์จัดระเบียบลมท้าย, ดิฟฟิวเซอร์เรียบใต้ท้อง, ล้อแอโร) จะช่วยคืนระยะทางวิ่งและประหยัดน้ำมันได้อย่างเห็นผลชัดเจนที่สุด!
                      </>
                    ) : (
                      <>
                        <strong className="text-white">คำแนะนำทางวิศวกรรม:</strong> ที่ย่านความเร็วนี้ แรงต้านอากาศกำลังเริ่มไต่ระดับแบบยกกำลังสอง หากคุณเร่งความเร็วเพิ่มขึ้นเป็น 140 กม./ชม. ภาระแรงต้านลมจะเพิ่มขึ้นเกือบเท่าตัวในทันที
                      </>
                    )}
                  </span>
                ) : (
                  <span>
                    At <strong className="text-white font-bold">{speedKmh} km/h</strong> (~{speedMph} mph), the vehicle displaces air with{" "}
                    <strong className="text-[var(--accent-red)] font-bold">~{dragForceN} N ({dragForceKgf} kgf)</strong> of aerodynamic resistance, demanding{" "}
                    <strong className="text-yellow-400 font-bold">{powerHp} HP</strong> solely to push freestream air aside, accounting for{" "}
                    <strong className="text-[var(--accent-red)] font-bold">{energyPctOvercomingDrag}%</strong> of total vehicle tractive output.{" "}
                    {speedKmh >= 130 ? (
                      <>
                        <strong className="text-white">Engineering Takeaway:</strong> Above 130 km/h, the cubic power penalty escalates power demand to{" "}
                        <strong className="text-yellow-400">{powerMultiplierPct}%</strong> compared to 100 km/h. Aerodynamic optimization (rear spoilers, flat underbody diffusers, aero wheels) yields paramount fuel and EV battery savings.
                      </>
                    ) : (
                      <>
                        <strong className="text-white">Engineering Takeaway:</strong> In this moderate velocity zone, drag is compounding quadratically (v²). A marginal increase toward highway speeds will demand disproportionate powertrain effort.
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. SECTION 3: SPECIFIC AEROPARTS BREAKDOWN (INTERACTIVE INSPECTOR)
          ══════════════════════════════════════════════════════════ */}
      <section id="aeropart-anatomy" className="py-16 md:py-24 bg-[#0A0A0A] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              MODULE 02 &bull; COMPONENT MECHANICS
            </span>
            <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl uppercase">
              {lang === "th" ? (
                <>
                  ชำแหละกลไกการทำงานของ <span className="text-[var(--accent-red)]">ชิ้นส่วนแอโรพาร์ท</span>
                </>
              ) : (
                <>
                  Mechanics of Specific <span className="text-[var(--accent-red)]">Aeroparts</span>
                </>
              )}
            </h2>
            <p className="body-md mt-3 text-[var(--text-secondary)] text-sm sm:text-base">
              {lang === "th"
                ? "แต่ละชิ้นส่วนมีหน้าที่ทางฟิสิกส์เฉพาะจุดอย่างไร และทำไมการทำงานร่วมกันอย่างกลมกลืนจึงสร้างสมดุลที่ดีที่สุด?"
                : "Explore how each specialized aerodynamic component operates in fluid mechanics to enhance stability, reduce drag, or generate clean downforce."}
            </p>
          </div>

          {/* Interactive Part Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar justify-start lg:justify-center">
            {AEROPARTS_ANATOMY.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setActiveTab(part.id)}
                className={`px-4 py-2.5 rounded text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 border ${
                  activeTab === part.id
                    ? "bg-[var(--accent-red)] text-white border-[var(--accent-red)] shadow-lg"
                    : "bg-[#141414] text-[var(--text-secondary)] border-[#262626] hover:border-[#383838] hover:text-white"
                }`}
              >
                {part.id === "spoiler-vs-wing" && <Wind size={14} />}
                {part.id === "underbody-diffuser" && <Layers size={14} />}
                {part.id === "gurney-flap" && <Sparkles size={14} />}
                {part.id === "canards-dive-planes" && <Compass size={14} />}
                {part.id === "aero-wheels" && <Car size={14} />}
                <span>{part.title[lang].split(":")[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Part Detail Presentation */}
          <div className="card p-5 sm:p-6 md:p-8 lg:p-10 bg-[#121212] border-[#242424] grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
            {/* Left/Graphic Showcase */}
            <div className="md:col-span-5 lg:col-span-5 flex flex-col justify-between h-full">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#242424] bg-[#0A0A0A]">
                <Image
                  src={activePart.image}
                  alt={activePart.title[lang]}
                  fill
                  className="object-contain p-4 transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 450px"
                />
                <div className="absolute top-3 left-3">
                  <span className="telemetry-pill text-[0.65rem]">{activePart.category[lang]}</span>
                </div>
              </div>

              {/* Quick Telemetry Indicators */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-[#181818] rounded border border-[#262626]">
                  <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase block">
                    {lang === "th" ? "แรงกด (Downforce)" : "Downforce Impact"}
                  </span>
                  <span className="text-sm font-black font-heading text-[var(--accent-red)] mt-0.5 block">
                    {activePart.downforceImpact}
                  </span>
                </div>
                <div className="p-3 bg-[#181818] rounded border border-[#262626]">
                  <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase block">
                    {lang === "th" ? "แรงต้าน (Drag Impact)" : "Drag Impact"}
                  </span>
                  <span className="text-sm font-black font-heading text-white mt-0.5 block">
                    {activePart.dragImpact}
                  </span>
                </div>
              </div>
            </div>

            {/* Right/Engineering Deep Dive */}
            <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between">
              <div>
                <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                  {activePart.category[lang]}
                </span>
                <h3 className="heading-md text-white mt-1 text-2xl sm:text-3xl font-bold">
                  {activePart.title[lang]}
                </h3>
                <p className="text-sm font-heading font-semibold text-yellow-400/90 mt-2">
                  &ldquo;{activePart.tagline[lang]}&rdquo;
                </p>

                {/* Fluid Mechanics Principle */}
                <div className="mt-5 p-3.5 rounded bg-[#181818] border-l-2 border-l-[var(--accent-red)]">
                  <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider block">
                    {lang === "th" ? "หลักการกลศาสตร์ของไหล:" : "FLUID DYNAMICS PRINCIPLE:"}
                  </span>
                  <span className="text-xs text-white/90 mt-0.5 block font-mono">
                    {activePart.principle[lang]}
                  </span>
                </div>

                {/* Primary Function Explanation */}
                <div className="mt-5">
                  <h4 className="text-xs font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    {lang === "th" ? "กลไกการทำงาน:" : "HOW IT WORKS:"}
                  </h4>
                  <p className="body-md text-[var(--text-secondary)] text-sm leading-relaxed">
                    {activePart.primaryFunction[lang]}
                  </p>
                </div>

                {/* Historic Case or Deep Dive Box */}
                <div className="mt-5 p-4 rounded bg-[#1A1A1A] border border-[#2B2B2B]">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-yellow-400" />
                    <span className="text-[0.7rem] font-heading font-bold text-white uppercase tracking-wider">
                      {lang === "th" ? "เกร็ดความรู้ & กรณีศึกษาจริง:" : "REAL-WORLD CASE STUDY:"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {activePart.deepDive[lang]}
                  </p>
                </div>
              </div>

              {/* Key Fact Highlight Bottom */}
              <div className="mt-6 pt-4 border-t border-[#222222] flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="italic font-medium">{activePart.keyFact[lang]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. SECTION 4: ACTIVE AERODYNAMICS & THE EV REVOLUTION
          ══════════════════════════════════════════════════════════ */}
      <section id="active-aero" className="py-16 md:py-24 bg-[#0E0E0E] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                MODULE 03 &bull; FUTURE AERODYNAMICS
              </span>
              <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl uppercase">
                {lang === "th" ? (
                  <>
                    อากาศพลศาสตร์แบบแอคทีฟ &amp;{" "}
                    <span className="text-[var(--accent-red)]">การปฏิวัติรถยนต์ไฟฟ้า (EV)</span>
                  </>
                ) : (
                  <>
                    Active Aerodynamics &amp;{" "}
                    <span className="text-[var(--accent-red)]">The EV Revolution</span>
                  </>
                )}
              </h2>
              <p className="body-md mt-3 text-[var(--text-secondary)] text-sm sm:text-base">
                {lang === "th"
                  ? "ก้าวข้ามชิ้นส่วนแบบตายตัว (Passive) สู่ระบบอัจฉริยะที่เปลี่ยนรูปทรงแบบเรียลไทม์ และทำไมแอร์โรไดนามิกส์จึงกลายเป็นเครื่องมือยืดระยะทางที่ดีที่สุดของรถ EV"
                  : "How electromechanical surfaces break the drag-downforce compromise in real-time, and why aero optimization serves as a cost-free battery upgrade."}
              </p>
            </div>

            {/* EV Benchmark Metric Pill Card */}
            <div className="bg-[#141414] border border-[#2B2B2B] p-4 rounded-lg flex items-center gap-4 shrink-0">
              <div className="p-3 bg-[var(--accent-red)]/10 text-[var(--accent-red)] rounded-full">
                <Zap size={22} />
              </div>
              <div>
                <span className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase block">
                  EV AERODYNAMIC SUPREMACY
                </span>
                <span className="text-sm font-heading font-black text-white">
                  Mercedes EQS: Cd 0.20 &bull; Lucid Air: Cd 0.21
                </span>
                <span className="text-xs text-green-400 font-bold block mt-0.5">
                  {lang === "th" ? "ลด Drag 10% = ยืดระยะทาง +2-3%" : "10% Drag Cut = +2-3% Battery Range"}
                </span>
              </div>
            </div>
          </div>

          {/* Active Aero Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ACTIVE_AERO_TECHNOLOGY.map((tech) => (
              <div
                key={tech.id}
                className="card p-6 md:p-8 bg-[#141414] border-[#222222] hover:border-[var(--accent-red)]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider">
                      ACTIVE ELECTROMECHANICAL
                    </span>
                    <span className="telemetry-pill text-[0.65rem]">{tech.stat}</span>
                  </div>

                  <h3 className="heading-sm text-white text-lg font-bold">{tech.title[lang]}</h3>

                  <p className="body-sm mt-3 text-[var(--text-secondary)] leading-relaxed text-xs sm:text-sm">
                    {tech.mechanism[lang]}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#222222]">
                  <span className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase block">
                    {lang === "th" ? "ผลลัพธ์ที่ได้:" : "PERFORMANCE ADVANTAGE:"}
                  </span>
                  <p className="text-xs text-white font-medium mt-1 leading-normal">
                    {tech.impact[lang]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. SECTION 5: MOTORSPORT & EXTREME PHENOMENA
          ══════════════════════════════════════════════════════════ */}
      <section id="racing-phenomena" className="py-16 md:py-24 bg-[#0A0A0A] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="max-w-2xl mb-12">
            <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              MODULE 04 &bull; EXTREME PHENOMENA
            </span>
            <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl uppercase">
              {lang === "th" ? (
                <>
                  บทเรียนจากสนามแข่ง: <br />
                  <span className="text-[var(--accent-red)]">Porpoising</span> &amp;{" "}
                  <span className="text-[var(--accent-red)]">เสียงลม NVH</span>
                </>
              ) : (
                <>
                  Racing Lessons: <br />
                  <span className="text-[var(--accent-red)]">Porpoising Effect</span> &amp;{" "}
                  <span className="text-[var(--accent-red)]">Aeroacoustics NVH</span>
                </>
              )}
            </h2>
            <p className="body-md mt-3 text-[var(--text-secondary)] text-sm sm:text-base">
              {lang === "th"
                ? "เมื่อกระแสลมไม่ได้ทำตัวตามที่คิด ปรากฏการณ์ที่ท้าทายวิศวกรระดับโลกใน Formula 1 และการเดินทางในชีวิตประจำวัน"
                : "Discover how extreme fluid-structure interactions manifest on track and on the highway."}
            </p>
          </div>

          {/* Toggle Tab between Porpoising and Aeroacoustics */}
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActivePhenomenon("porpoising")}
              className={`px-4 py-2 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all border ${
                activePhenomenon === "porpoising"
                  ? "bg-[var(--accent-red)] text-white border-[var(--accent-red)] shadow"
                  : "bg-[#141414] text-[var(--text-muted)] border-[#262626] hover:text-white"
              }`}
            >
              01 &bull; {RACING_PHENOMENA.porpoising.title[lang].split("(")[0]}
            </button>
            <button
              type="button"
              onClick={() => setActivePhenomenon("aeroacoustics")}
              className={`px-4 py-2 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all border ${
                activePhenomenon === "aeroacoustics"
                  ? "bg-[var(--accent-red)] text-white border-[var(--accent-red)] shadow"
                  : "bg-[#141414] text-[var(--text-muted)] border-[#262626] hover:text-white"
              }`}
            >
              02 &bull; {RACING_PHENOMENA.aeroacoustics.title[lang].split("(")[0]}
            </button>
          </div>

          {/* Active Phenomenon Card */}
          <div className="card p-6 md:p-10 bg-[#121212] border-[#262626]">
            {activePhenomenon === "porpoising" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 text-xs font-heading font-bold text-yellow-400">
                    <AlertTriangle size={16} />
                    <span>FORMULA 1 GROUND-EFFECT CASE STUDY</span>
                  </div>
                  <span className="telemetry-pill text-[0.65rem]">10 Hz OSCILLATION</span>
                </div>

                <h3 className="heading-md text-white text-2xl font-bold">
                  {RACING_PHENOMENA.porpoising.title[lang]}
                </h3>
                <p className="text-xs font-heading text-[var(--accent-red)] mt-1 font-semibold">
                  {RACING_PHENOMENA.porpoising.subtitle[lang]}
                </p>

                <p className="body-md mt-4 text-[var(--text-secondary)] leading-relaxed text-sm">
                  {RACING_PHENOMENA.porpoising.story[lang]}
                </p>

                {/* 4-Step Physics Cycle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#222222]">
                  <div className="p-3 bg-[#181818] rounded border border-[#2B2B2B]">
                    <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] block">
                      STAGE 1
                    </span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {lang === "th" ? "ท่อเวนจูรีเร่งความเร็ว" : "Venturi Suction Spikes"}
                    </span>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-1">
                      {lang === "th"
                        ? "แรงกดเพิ่มขึ้นทวีคูณ ดึงตัวรถให้แนบชิดพื้นแทร็ก"
                        : "Extreme downforce compresses springs, pulling chassis downward."}
                    </p>
                  </div>
                  <div className="p-3 bg-[#181818] rounded border border-[#2B2B2B]">
                    <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] block">
                      STAGE 2
                    </span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {lang === "th" ? "อากาศเกิดอาการอั้น (Choke)" : "Flow Choke & Stall"}
                    </span>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-1">
                      {lang === "th"
                        ? "ช่องแคบเกินไป ลมแยกตัว สูญเสียแรงกดทันที"
                        : "Narrow throat chokes; boundary layer stalls and downforce collapses."}
                    </p>
                  </div>
                  <div className="p-3 bg-[#181818] rounded border border-[#2B2B2B]">
                    <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] block">
                      STAGE 3
                    </span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {lang === "th" ? "สปริงดีดตัวรถขึ้นฟ้า" : "Mechanical Rebound"}
                    </span>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-1">
                      {lang === "th"
                        ? "ไร้แรงกด สปริงช่วงล่างดีดแชสซีเด้งขึ้นอย่างรวดเร็ว"
                        : "Released from load, stiff springs violently launch the car upward."}
                    </p>
                  </div>
                  <div className="p-3 bg-[#181818] rounded border border-[#2B2B2B]">
                    <span className="text-[0.65rem] font-heading font-bold text-green-400 block">
                      STAGE 4
                    </span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {lang === "th" ? "ลมกลับมาดูดใหม่อีกครั้ง" : "Flow Reattachment"}
                    </span>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-1">
                      {lang === "th"
                        ? "เมื่อลอยขึ้น อากาศหายอั้นและดูดกลับลงมาซ้ำลูปเดิม"
                        : "Clearance opens, suction re-establishes, repeating the loop."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#222222] text-xs text-[var(--text-secondary)]">
                  <strong className="text-white font-heading uppercase mr-2">
                    {lang === "th" ? "วิธีการแก้ไขทางวิศวกรรม:" : "Engineering Solution:"}
                  </strong>
                  {RACING_PHENOMENA.porpoising.solution[lang]}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 text-xs font-heading font-bold text-blue-400">
                    <Wind size={16} />
                    <span>AEROACOUSTICS &amp; CABIN HARSHNESS</span>
                  </div>
                  <span className="telemetry-pill text-[0.65rem]">&gt; 100 KM/H CRITICAL</span>
                </div>

                <h3 className="heading-md text-white text-2xl font-bold">
                  {RACING_PHENOMENA.aeroacoustics.title[lang]}
                </h3>
                <p className="text-xs font-heading text-[var(--accent-red)] mt-1 font-semibold">
                  {RACING_PHENOMENA.aeroacoustics.subtitle[lang]}
                </p>

                <p className="body-md mt-4 text-[var(--text-secondary)] leading-relaxed text-sm">
                  {RACING_PHENOMENA.aeroacoustics.story[lang]}
                </p>

                <div className="mt-6 p-4 rounded bg-[#181818] border border-[#262626]">
                  <span className="text-xs font-heading font-bold text-yellow-400 uppercase tracking-wider block mb-1">
                    {lang === "th" ? "ปรากฏการณ์ Helmholtz Resonance คืออะไร?" : "What is Helmholtz Resonance?"}
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {lang === "th"
                      ? "เคยสงสัยไหมว่าทำไมการเปิดกระจกข้างรถเพียงบานเดียวตอนขับเร็วถึงเกิดเสียงลมทุ้มกระหน่ำจนหูอื้อ? นั่นเพราะกระแสลมที่แยกตัวออกจากเสารถเกิดจังหวะการหมุนวนตรงกับความถี่ธรรมชาติของห้องโดยสาร ก่อตัวเป็นลำโพงแรงดันเสียงขนาดยักษ์ เช่นเดียวกับการเป่าปากขวดน้ำ!"
                      : "Ever noticed the unbearable, rhythmic thrumming sound when cracking a single car window at highway speeds? Vortex shedding outside aligns precisely with the natural cavity frequency of the car cabin, acting like blowing across the mouth of an acoustic resonator bottle."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#222222] text-xs text-[var(--text-secondary)]">
                  <strong className="text-white font-heading uppercase mr-2">
                    {lang === "th" ? "วิธีการแก้ไขทางวิศวกรรม:" : "Engineering Solution:"}
                  </strong>
                  {RACING_PHENOMENA.aeroacoustics.solution[lang]}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. SECTION 6: SOUTH AERO VALIDATION & CFD
          ══════════════════════════════════════════════════════════ */}
      <section id="south-aero-standards" className="py-16 md:py-24 bg-[#0E0E0E] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Description */}
            <div className="lg:col-span-6">
              <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                MODULE 05 &bull; SOUTH AERO LAB
              </span>
              <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl uppercase">
                {SOUTH_AERO_VALIDATION.title[lang]}
              </h2>
              <p className="body-md mt-3 text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
                {SOUTH_AERO_VALIDATION.subtitle[lang]}
              </p>

              {/* 4 Pillars List */}
              <div className="space-y-4 mt-8">
                {SOUTH_AERO_VALIDATION.pillars.map((pillar) => (
                  <div key={pillar.step} className="flex gap-4 p-4 rounded bg-[#141414] border border-[#222222]">
                    <span className="text-xl font-black font-heading text-[var(--accent-red)] shrink-0">
                      {pillar.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold font-heading text-white uppercase">
                        {pillar.title[lang]}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {pillar.description[lang]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Graphic/CFD Simulation Display */}
            <div className="lg:col-span-6">
              <div className="card p-4 bg-[#141414] border-[#262626]">
                <div className="relative aspect-[16/10] rounded-sm overflow-hidden border border-[#262626] bg-[#0A0A0A]">
                  <Image
                    src="/images/G9/Artboard 8.png"
                    alt="South Aero CFD Aerodynamics Airflow Simulation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 550px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="telemetry-pill text-[0.65rem]">
                      CFD TURBULENCE STREAMLINES &bull; ACCORD G9
                    </span>
                    <span className="text-[0.65rem] font-mono text-[var(--accent-red)] font-bold">
                      DDES RESOLUTION
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded bg-[#181818] border border-[#242424] text-xs text-[var(--text-secondary)] leading-relaxed">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={14} className="text-[var(--accent-red)]" />
                    <span className="font-heading font-bold text-white uppercase tracking-wider text-[0.7rem]">
                      {lang === "th" ? "การทดสอบแบบ Moving Ground Wind Tunnel" : "Moving Ground Wind Tunnel Testing"}
                    </span>
                  </div>
                  {lang === "th"
                    ? "ในการทดสอบสมัยใหม่ การทดสอบรถที่จอดนิ่งบนพื้นอุโมงค์ลมจะสร้างชั้นลมหนาเตอะที่ผิดธรรมชาติ South Aeropart จึงอ้างอิงข้อมูลการจำลองแบบพื้นถนนสายพานเคลื่อนที่ (Moving Ground) พร้อมการหมุนของล้อจริง เพื่อให้ค่าแรงต้านและแรงกดตรงกับสภาพการวิ่งจริงบนท้องถนน 100%"
                    : "Traditional static wind tunnel floors create artificial thick boundary layers that choke underbody diffusers. Modern aerodynamic development relies on continuous rolling-road moving belt systems with rotating wheels to precisely calculate authentic wake recovery."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. SECTION 7: INTERACTIVE FAQ
          ══════════════════════════════════════════════════════════ */}
      <section id="faq-section" className="py-16 md:py-20 bg-[#0A0A0A] border-b border-[#1C1C1C]">
        <div className="container-main max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              MODULE 06 &bull; KNOWLEDGE BASE
            </span>
            <h2 className="heading-lg text-white mt-2 text-2xl sm:text-3xl md:text-4xl uppercase">
              {lang === "th" ? "คำถามที่พบบ่อยด้านอากาศพลศาสตร์" : "Frequently Asked Questions"}
            </h2>
            <p className="body-md mt-2 text-[var(--text-secondary)] text-sm">
              {lang === "th"
                ? "ข้อสงสัยยอดนิยมจากลูกค้าและความเชื่อที่ถูกต้องตามหลักวิศวกรรม"
                : "Clarifying common customer misconceptions with fluid dynamics principles."}
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="card bg-[#121212] border-[#242424] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#181818] transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold font-heading text-white">
                      {item.question[lang]}
                    </span>
                    <span className="p-1 rounded bg-[#1E1E1E] text-[var(--accent-red)] shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-5 pt-0 border-t border-[#1C1C1C] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed bg-[#0E0E0E]">
                      {item.answer[lang]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. BOTTOM CTA BANNER
          ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-t from-[#141414] to-[#0A0A0A] relative overflow-hidden">
        <div className="container-main text-center relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-[0.7rem] font-heading font-bold uppercase mb-4">
            <Sparkles size={14} />
            {lang === "th" ? "พร้อมสัมผัสประสบการณ์จริงหรือยัง?" : "READY FOR REAL AERODYNAMICS?"}
          </div>

          <h2 className="heading-xl text-white text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
            {lang === "th" ? (
              <>
                อัปเกรดความมั่นคง <br />
                ด้วยชิ้นส่วน <span className="text-[var(--accent-red)]">SOUTH AERO SPEC</span>
              </>
            ) : (
              <>
                ELEVATE YOUR STANCE &amp; GRIP <br />
                WITH <span className="text-[var(--accent-red)]">SOUTH AERO SPEC</span>
              </>
            )}
          </h2>

          <p className="body-lg mt-4 text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {lang === "th"
              ? "ชิ้นส่วนทุกชิ้นของ South Aeropart ผลิตจากคาร์บอนไฟเบอร์พรีเพร็กออโต้เคลฟ ผ่านการคำนวณสมดุลแรงกด CFD และทดสอบจริง เพื่อให้คุณมั่นใจในทุกโค้งและความเร็วบนท้องถนน"
              : "Precision-engineered dry carbon components calibrated via CFD for the Honda Accord G9, Civic FE/FD, FL5, and bespoke motorsport chassis."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/collection"
              className="btn-primary gap-2 text-xs py-3 px-6 shadow-lg shadow-red-600/20"
            >
              {lang === "th" ? "เลือกชมชุดแต่ง AERODYNAMIC PACKAGES" : "EXPLORE AERODYNAMIC PACKAGES"}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/products"
              className="btn-outline gap-2 text-xs py-3 px-6"
            >
              {lang === "th" ? "ดูชิ้นส่วนเดี่ยวทั้งหมด" : "BROWSE ALL PARTS"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
