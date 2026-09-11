import {
  QUALITY_PROFILES,
  type QualityLevel,
  type QualityProfile,
} from "./adaptiveQuality";

export interface RenderingQuality extends QualityProfile {
  readonly glassRefraction: boolean;
}

export interface RenderingPreferences {
  mode: "auto" | "manual";
  manual: RenderingQuality;
}

export function qualityForLevel(level: QualityLevel): RenderingQuality {
  return { ...QUALITY_PROFILES[level], glassRefraction: level >= 3 };
}

export const DEFAULT_RENDERING_PREFERENCES: RenderingPreferences = {
  mode: "auto",
  manual: qualityForLevel(3),
};

export function isCustomQuality(quality: RenderingQuality): boolean {
  const preset = qualityForLevel(quality.level);
  return (Object.keys(preset) as (keyof RenderingQuality)[]).some(
    (key) => quality[key] !== preset[key],
  );
}
