"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { QUALITY_PROFILES, type QualityLevel } from "./adaptiveQuality";
import {
  isCustomQuality,
  qualityForLevel,
  type RenderingPreferences,
  type RenderingQuality,
} from "./renderingPreferences";

interface Props {
  preferences: RenderingPreferences;
  onChange: (preferences: RenderingPreferences) => void;
  onClose: () => void;
}

export function QualitySettingsPanel({
  preferences,
  onChange,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const outside = (event: PointerEvent) => {
      if (
        !panelRef.current?.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(
          '[aria-controls="car-quality-settings"]',
        )
      )
        onClose();
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      previousFocus?.focus();
    };
  }, [onClose]);

  const manual = preferences.manual;
  const update = (patch: Partial<RenderingQuality>) =>
    onChange({ ...preferences, manual: { ...manual, ...patch } });
  const selectClass =
    "w-full rounded-sm border border-white/20 bg-[#202226] px-2 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-40";

  return (
    <div
      ref={panelRef}
      id="car-quality-settings"
      role="dialog"
      aria-labelledby="car-quality-title"
      className="absolute z-40 inset-x-3 top-3 bottom-3 sm:left-auto sm:w-[350px] sm:top-4 sm:bottom-4 overflow-y-auto overscroll-contain rounded-sm border border-white/20 bg-[#111316]/95 text-white shadow-2xl backdrop-blur-xl font-sans p-4"
    >
      <div className="sticky -top-4 z-10 bg-[#111316] flex items-center justify-between gap-3 mb-4 py-2">
        <h3
          id="car-quality-title"
          className="font-heading text-lg tracking-wide"
        >
          RENDER QUALITY
        </h3>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close quality settings"
          className="p-2 hover:bg-white/10 rounded-sm"
        >
          <X size={18} />
        </button>
      </div>
      <div
        className="grid grid-cols-2 gap-1 rounded-sm bg-black/40 p-1 mb-3"
        role="group"
        aria-label="Quality mode"
      >
        {(["auto", "manual"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={preferences.mode === mode}
            onClick={() => onChange({ ...preferences, mode })}
            className={`py-2 text-sm font-semibold rounded-sm ${preferences.mode === mode ? "bg-[#e51d24] text-white" : "text-white/60 hover:bg-white/10"}`}
          >
            {mode === "auto" ? "Auto" : "Manual"}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-white/65 mb-4">
        {preferences.mode === "auto"
          ? "Adapts detail to your device, aiming for 30 FPS or more."
          : "Your settings stay fixed. Lower detail or switch to Auto if movement feels slow."}
      </p>
      {preferences.mode === "manual" && (
        <div className="space-y-4">
          <label className="block text-sm space-y-1.5">
            <span className="flex justify-between">
              Quality preset{" "}
              {isCustomQuality(manual) && (
                <span className="text-amber-300 text-xs">CUSTOM</span>
              )}
            </span>
            <select
              aria-label="Quality preset"
              className={selectClass}
              value={manual.level}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  manual: qualityForLevel(
                    Number(event.target.value) as QualityLevel,
                  ),
                })
              }
            >
              {QUALITY_PROFILES.map((profile) => (
                <option key={profile.level} value={profile.level}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm space-y-1.5">
              <span>Resolution</span>
              <select
                aria-label="Render resolution"
                className={selectClass}
                value={manual.dpr}
                onChange={(event) =>
                  update({ dpr: Number(event.target.value) })
                }
              >
                {[0.5, 0.75, 1, 1.5, 2].map((value) => (
                  <option key={value} value={value}>
                    {value * 100}%
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm space-y-1.5">
              <span>Reflections</span>
              <select
                aria-label="Floor reflections"
                className={selectClass}
                value={manual.reflections ? manual.reflectionResolution : 0}
                onChange={(event) =>
                  update({
                    reflections: Number(event.target.value) > 0,
                    reflectionResolution: Number(event.target.value) || 256,
                  })
                }
              >
                <option value={0}>Off</option>
                <option value={128}>Basic</option>
                <option value={256}>Medium</option>
                <option value={512}>High</option>
                <option value={1024}>Ultra</option>
              </select>
            </label>
            <label className="block text-sm space-y-1.5">
              <span>Cast shadows</span>
              <select
                aria-label="Cast shadows"
                className={selectClass}
                value={manual.shadowMapSize}
                onChange={(event) =>
                  update({ shadowMapSize: Number(event.target.value) })
                }
              >
                <option value={0}>Off</option>
                <option value={512}>Basic</option>
                <option value={1024}>Medium</option>
                <option value={2048}>High</option>
              </select>
            </label>
            <label className="block text-sm space-y-1.5">
              <span>Smooth edges</span>
              <select
                aria-label="Smooth edges"
                className={selectClass}
                disabled={!manual.postprocessing}
                value={manual.multisampling}
                onChange={(event) =>
                  update({ multisampling: Number(event.target.value) })
                }
              >
                <option value={0}>Basic</option>
                <option value={2}>High</option>
                <option value={4}>Ultra</option>
              </select>
            </label>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {(
              [
                ["postprocessing", "Post effects"],
                ["ambientOcclusion", "Contact detail (AO)"],
                ["glassRefraction", "Glass refraction"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex items-center justify-between py-3 gap-3 text-sm ${key === "ambientOcclusion" && !manual.postprocessing ? "opacity-40" : ""}`}
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#e51d24]"
                  checked={manual[key]}
                  disabled={
                    key === "ambientOcclusion" && !manual.postprocessing
                  }
                  onChange={(event) => update({ [key]: event.target.checked })}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Post effects and smooth edges use the selected studio filter. Raw
            WebGL bypasses them.
          </p>
        </div>
      )}
    </div>
  );
}
