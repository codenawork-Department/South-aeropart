"use client";

import { Box, Gauge, Loader2, Sparkles } from "lucide-react";

interface CarLoadingFallbackProps {
  progress?: number;
}

export function CarLoadingFallback({ progress }: CarLoadingFallbackProps) {
  const displayProgress = progress !== undefined ? Math.round(progress) : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A]/95 backdrop-blur-md z-30 select-none">
      {/* Background Subtle Radar Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ff2a2a 1px, transparent 1px), linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)",
          backgroundSize: "24px 24px, 48px 48px, 48px 48px",
        }}
      />

      {/* Center Radar / Holo Ring */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-24 h-24 rounded-full border border-white/10 animate-[spin_8s_linear_infinite]" />
        <div className="absolute w-20 h-20 rounded-full border border-dashed border-[var(--accent-red)]/40 animate-[spin_4s_linear_infinite_reverse]" />
        <div className="absolute w-14 h-14 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center border border-[var(--accent-red)]/30">
          <Loader2 className="w-6 h-6 text-[var(--accent-red)] animate-spin" />
        </div>
      </div>

      {/* Telemetry Loading Header */}
      <div className="text-center space-y-2 z-10 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#141414] border border-[#262626] rounded-full text-[0.65rem] font-heading tracking-widest text-white/80 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-ping" />
          SOUTH AERO 3D TELEMETRY
        </div>

        <h3 className="font-heading font-black text-sm md:text-base text-white tracking-wider uppercase">
          LOADING MUSTANG GT3 AERO BUILD
        </h3>

        {/* Progress Bar & Numeric Indicator */}
        <div className="w-64 max-w-full mx-auto mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-[0.65rem] font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Gauge size={12} className="text-[var(--accent-red)]" />
              STREAMING ASSETS
            </span>
            <span className="text-white font-bold">
              {displayProgress !== null ? `${displayProgress}%` : "INITIALIZING..."}
            </span>
          </div>

          <div className="h-1.5 w-full bg-[#181818] border border-[#2a2a2a] rounded-full overflow-hidden p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-[#990000] via-[var(--accent-red)] to-[#ff6666] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(229,29,36,0.6)]"
              style={{
                width: displayProgress !== null ? `${Math.max(5, displayProgress)}%` : "40%",
              }}
            />
          </div>
        </div>

        <p className="text-[0.65rem] font-mono text-[var(--text-muted)] tracking-wider mt-3">
          STANDBY &bull; 360° INTERACTIVE AERO SIMULATION
        </p>
      </div>
    </div>
  );
}
