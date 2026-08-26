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
} from "lucide-react";
import { CameraPreset } from "./CarScene";
import { CarLoadingFallback } from "./CarLoadingFallback";

const DynamicCarScene = dynamic(
  () => import("./CarScene").then((mod) => mod.CarScene),
  {
    ssr: false,
    loading: () => <CarLoadingFallback />,
  }
);

export function CarModelViewer() {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("hero");
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleLoaded = () => {
    setIsLoading(false);
  };

  const handleProgress = (pct: number) => {
    setLoadProgress(pct);
    if (pct >= 100) {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-sm overflow-hidden border border-[#222222] bg-[#0A0A0A] shadow-2xl shadow-black/90 transition-all duration-300 group ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none aspect-auto h-screen"
          : "aspect-[21/10] sm:aspect-[2.2/1] min-h-[420px] md:min-h-[520px]"
      }`}
      onPointerDown={() => setHasInteracted(true)}
    >
      {/* 3D Scene */}
      <DynamicCarScene
        cameraPreset={cameraPreset}
        autoRotate={autoRotate}
        onProgress={handleProgress}
        onLoaded={handleLoaded}
      />

      {/* Loading Screen Overlay */}
      {isLoading && <CarLoadingFallback progress={loadProgress} />}

      {/* Subtle Studio Radial Background & Gradients (pointer-events-none) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[65%] bg-[radial-gradient(ellipse_at_center,rgba(229,29,36,0.05)_0%,transparent_70%)] pointer-events-none blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40 pointer-events-none" />

      {/* TOP BAR OVERLAYS */}
      <div className="absolute top-3 left-3 right-3 md:top-5 md:left-5 md:right-5 flex justify-between items-start pointer-events-none z-20">
        {/* Left Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="telemetry-pill backdrop-blur-md bg-[#121212]/80 border-[#2A2A2A]">
            <span className="text-[var(--accent-red)] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
              3D LIVE AERO
            </span>
            <span className="text-white font-bold tracking-wider">MUSTANG GT3</span>
          </div>

          <div className="telemetry-pill hidden sm:inline-flex backdrop-blur-md bg-[#121212]/80 border-[#2A2A2A]">
            <span className="text-[var(--success)] font-bold">+185 N</span>
            <span className="text-[var(--text-secondary)]">DOWNFORCE (200 KM/H)</span>
          </div>
        </div>

        {/* Right Action Icons (Auto Rotate, Fullscreen) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
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
      <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pointer-events-none z-20">
        {/* Bottom Left: Camera Angle Presets */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#101010]/90 backdrop-blur-md border border-[#262626] rounded-sm shadow-xl pointer-events-auto">
          <span className="text-[0.6rem] font-heading font-bold text-white/40 px-1.5 hidden sm:inline uppercase">
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
              className={`px-2.5 py-1 text-[0.62rem] md:text-[0.65rem] font-heading font-bold rounded-sm transition-all ${
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
            className="btn-primary py-2 px-4 text-xs gap-2 shadow-xl whitespace-nowrap w-full sm:w-auto justify-center"
          >
            CUSTOMIZE BUILD <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
