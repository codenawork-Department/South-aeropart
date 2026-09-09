"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Rotate3d,
  Maximize2,
  Minimize2,
  Compass,
  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react";
import { CameraPreset, PostFilterPreset } from "./CarScene";
import { CarLoadingFallback } from "./CarLoadingFallback";

const DynamicCarScene = dynamic(
  () => import("./CarScene").then((mod) => mod.CarScene),
  {
    ssr: false,
    loading: () => <CarLoadingFallback />,
  }
);

const FILTER_OPTIONS: {
  id: PostFilterPreset;
  label: string;
  badge: string;
  description: string;
}[] = [
  {
    id: "studio",
    label: "Studio Real",
    badge: "RECOMMENDED",
    description: "Photorealistic white showroom with soft specular highlights and clean reflection",
  },
  {
    id: "cinematic",
    label: "Cinematic HDR",
    badge: "FILMIC ACES",
    description: "Punchy film lighting with smooth ACES filmic roll-off and aerodynamic highlights",
  },
  {
    id: "midnight",
    label: "Midnight Cyber",
    badge: "NEON GLOW",
    description: "High-glow aesthetic with vibrant LED illumination on DRLs & taillights",
  },
  {
    id: "off",
    label: "Raw WebGL",
    badge: "NO POST-FX",
    description: "Standard 3D render without post-processing filters",
  },
];

export function CarModelViewer() {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("hero");
  const [filterPreset, setFilterPreset] = useState<PostFilterPreset>("studio");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoaded = () => {
    setIsLoading(false);
  };

  const handleProgress = (pct: number) => {
    setLoadProgress(pct);
    if (pct >= 100) {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const currentFilter = FILTER_OPTIONS.find((f) => f.id === filterPreset) || FILTER_OPTIONS[0];

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-sm overflow-hidden border border-[#222222] bg-[#0A0A0A] shadow-2xl shadow-black/90 transition-all duration-300 group ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none aspect-auto h-screen"
          : "aspect-[16/10] sm:aspect-[16/9] md:aspect-[2/1] lg:aspect-[2.2/1] min-h-[280px] sm:min-h-[340px] md:min-h-[400px] lg:min-h-[480px]"
      }`}
      onPointerDown={() => setHasInteracted(true)}
    >
      {/* 3D Scene with Post-Processing Filters */}
      <DynamicCarScene
        cameraPreset={cameraPreset}
        autoRotate={autoRotate}
        filterPreset={filterPreset}
        onProgress={handleProgress}
        onLoaded={handleLoaded}
      />

      {/* Loading Screen Overlay */}
      {isLoading && <CarLoadingFallback progress={loadProgress} />}

      {/* Subtle Showroom Edge Vignette (pointer-events-none) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/20 pointer-events-none" />

      {/* TOP BAR OVERLAYS */}
      <div className="absolute top-3 left-3 right-3 md:top-5 md:left-5 md:right-5 flex justify-between items-start pointer-events-none z-20">
        {/* Left Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="telemetry-pill backdrop-blur-md bg-[#121212]/80 border-[#2A2A2A]">
            <span className="text-[var(--accent-red)] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
              3D LIVE AERO
            </span>
            <span className="text-white font-bold tracking-wider">FERRARI 296 SPECIALE A</span>
          </div>

          <div className="telemetry-pill hidden sm:inline-flex backdrop-blur-md bg-[#121212]/80 border-[#2A2A2A]">
            <span className="text-[var(--success)] font-bold">+185 N</span>
            <span className="text-[var(--text-secondary)]">DOWNFORCE (200 KM/H)</span>
          </div>
        </div>

        {/* Right Action Icons (Post Filter Preset, Auto Rotate, Fullscreen) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Post Filter Preset Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowFilterMenu((prev) => !prev);
                setHasInteracted(true);
              }}
              className={`p-2 sm:px-2.5 rounded-sm border text-xs font-heading font-semibold transition-all backdrop-blur-md shadow-md flex items-center gap-1.5 ${
                filterPreset !== "off"
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-300 hover:bg-amber-500/25"
                  : "bg-[#121212]/80 border-[#2A2A2A] text-white/60 hover:text-white hover:border-[#3E3E3E]"
              }`}
              title="Select Post-Processing Filter"
            >
              <Sparkles
                size={13}
                className={filterPreset !== "off" ? "text-amber-400 animate-pulse" : "text-white/40"}
              />
              <span className="text-[0.65rem] tracking-wider uppercase font-bold hidden xs:inline sm:inline">
                {currentFilter.label}
              </span>
              <ChevronDown
                size={11}
                className={`transition-transform duration-200 text-white/60 ${
                  showFilterMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 p-1.5 rounded-sm bg-[#101010]/95 border border-[#2E2E2E] shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[0.6rem] font-heading font-bold text-white/40 uppercase tracking-wider border-b border-[#222] mb-1 flex items-center justify-between">
                  <span>POST FILTER PRESETS</span>
                  <span className="text-amber-400 font-mono text-[0.55rem]">REAL-TIME FX</span>
                </div>
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFilterPreset(opt.id);
                      setShowFilterMenu(false);
                      setHasInteracted(true);
                    }}
                    className={`w-full text-left p-2 rounded-sm transition-all flex items-start justify-between gap-2 group mb-0.5 ${
                      filterPreset === opt.id
                        ? "bg-[#1C1C1C] text-white border border-[#3E3E3E]"
                        : "hover:bg-[#161616] text-white/70 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-heading font-bold transition-colors ${
                            filterPreset === opt.id
                              ? "text-amber-300"
                              : "text-white group-hover:text-[var(--accent-red)]"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={`text-[0.52rem] px-1 py-0.2 rounded font-mono font-semibold ${
                            opt.id === "studio"
                              ? "bg-amber-500/20 text-amber-300"
                              : opt.id === "cinematic"
                              ? "bg-red-500/20 text-red-300"
                              : opt.id === "midnight"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[0.62rem] text-white/50 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                    {filterPreset === opt.id && (
                      <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`p-2 rounded-sm border text-xs font-heading font-semibold transition-all backdrop-blur-md shadow-md flex items-center gap-1.5 ${
              autoRotate
                ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60 text-white"
                : "bg-[#121212]/80 border-[#2A2A2A] text-white/60 hover:text-white hover:border-[#3E3E3E]"
            }`}
            title="Toggle Auto 360° Rotation"
          >
            <Rotate3d size={14} className={autoRotate ? "animate-spin text-[var(--accent-red)]" : ""} />
            <span className="hidden md:inline text-[0.65rem]">AUTO SPIN</span>
          </button>

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-sm border border-[#2A2A2A] bg-[#121212]/80 hover:bg-[#1A1A1A] hover:border-[var(--accent-red)] text-white/80 hover:text-white transition-colors backdrop-blur-md shadow-md"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Showcase"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* INTERACTIVE INSTRUCTION HINT (Fades after interaction) */}
      {!hasInteracted && !isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 animate-pulse">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-white/15 backdrop-blur-md text-[0.7rem] font-heading font-medium text-white/90 flex items-center gap-2 shadow-2xl">
            <Compass size={14} className="text-[var(--accent-red)] animate-spin" />
            <span>DRAG TO ROTATE 360° &bull; SCROLL / PINCH TO ZOOM</span>
          </div>
        </div>
      )}

      {/* BOTTOM BAR OVERLAYS */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 md:bottom-5 md:left-5 md:right-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 sm:gap-3 pointer-events-none z-20">
        {/* Bottom Left: Camera Angle Presets */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-[#101010]/90 backdrop-blur-md border border-[#262626] rounded-sm shadow-xl pointer-events-auto max-w-full overflow-x-auto">
          <span className="text-[0.55rem] sm:text-[0.6rem] font-heading font-bold text-white/40 px-1 hidden sm:inline uppercase">
            VIEW:
          </span>
          {(
            [
              { id: "hero", label: "HERO 3/4" },
              { id: "front", label: "FRONT" },
              { id: "side", label: "SIDE" },
              { id: "rear", label: "GT WING" },
              { id: "top", label: "TOP CFD" },
            ] as { id: CameraPreset; label: string }[]
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => {
                setCameraPreset(cam.id);
                setHasInteracted(true);
              }}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[0.58rem] sm:text-[0.62rem] md:text-[0.65rem] font-heading font-bold rounded-sm transition-all whitespace-nowrap ${
                cameraPreset === cam.id
                  ? "bg-[var(--accent-red)] text-white shadow-[0_0_10px_rgba(229,29,36,0.4)]"
                  : "text-white/70 hover:text-white hover:bg-[#1E1E1E]"
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        {/* Bottom Right: Direct CTA */}
        <div className="pointer-events-auto w-full sm:w-auto">
          <Link
            href="/products/ford-mustang-gt3-aero-package"
            className="btn-primary py-1.5 sm:py-2 px-3 sm:px-4 text-[0.7rem] sm:text-xs gap-1.5 sm:gap-2 shadow-xl whitespace-nowrap w-full sm:w-auto justify-center"
          >
            CUSTOMIZE BUILD <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

