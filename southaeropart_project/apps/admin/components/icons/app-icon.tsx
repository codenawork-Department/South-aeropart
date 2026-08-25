"use client";

import React, { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

export interface IconData {
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  type?: "lucide" | "svg_code" | "image_url" | string;
  svgContent?: string | null;
  imageUrl?: string | null;
  lucideName?: string | null;
  isActive?: boolean;
}

interface AppIconProps {
  icon?: IconData | string | null;
  className?: string;
  size?: number;
  fallbackIcon?: string;
}

// Build a cache of case-insensitive Lucide icon keys for ultra-fast lookup
const LUCIDE_KEYS_MAP: Map<string, string> = new Map();
for (const key of Object.keys(LucideIcons)) {
  if (
    typeof (LucideIcons as Record<string, any>)[key] === "function" ||
    typeof (LucideIcons as Record<string, any>)[key] === "object"
  ) {
    LUCIDE_KEYS_MAP.set(key.toLowerCase(), key);
  }
}

/**
 * Normalizes any icon name (e.g. "shield-check", "shield_check", "shieldCheck", "ShieldCheck")
 * into the exact PascalCase name exported by lucide-react (e.g. "ShieldCheck").
 */
export function normalizeLucideName(input?: string | null): string {
  if (!input) return "";
  const cleaned = input.trim();
  if (!cleaned) return "";

  // 1. Direct match in LucideIcons
  if (
    cleaned in LucideIcons &&
    typeof (LucideIcons as Record<string, any>)[cleaned] !== "undefined"
  ) {
    return cleaned;
  }

  // 2. Convert kebab-case, snake_case, spaces to PascalCase (e.g. shield-check-2 -> ShieldCheck2)
  const parts = cleaned.split(/[-_\s]+/);
  const pascal = parts
    .map((part) => {
      if (!part) return "";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");

  if (pascal in LucideIcons) {
    return pascal;
  }

  // 3. Normalized case-insensitive lookup
  const strippedKey = cleaned.replace(/[-_\s]/g, "").toLowerCase();
  const matchedKey = LUCIDE_KEYS_MAP.get(strippedKey);
  if (matchedKey) {
    return matchedKey;
  }

  return pascal || cleaned;
}

/**
 * Retrieves the Lucide React component for a given name or slug
 */
export function getLucideComponent(nameOrSlug?: string | null) {
  if (!nameOrSlug) return null;
  const normalized = normalizeLucideName(nameOrSlug);
  const Comp = (LucideIcons as Record<string, any>)[normalized];
  if (typeof Comp === "function" || (Comp && typeof Comp === "object")) {
    return Comp;
  }
  return null;
}

/**
 * Sanitizes and normalizes SVG code to ensure it scales cleanly,
 * inherits colors (currentColor), and works even if copied as minified/unformatted text.
 */
export function sanitizeAndFormatSvg(rawSvg?: string | null): string {
  if (!rawSvg) return "";

  let svg = rawSvg.trim();

  // 1. Strip XML declarations, doctypes, comments, scripts, inline event handlers
  svg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");

  // 2. Extract <svg>...</svg> if embedded inside wrapper markup
  const svgTagMatch = svg.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgTagMatch) {
    svg = svgTagMatch[0];
  } else if (!svg.toLowerCase().startsWith("<svg")) {
    // If only paths were pasted: wrap in a clean SVG container
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`;
  }

  // 3. Extract or synthesize viewBox from width/height if missing
  if (!/viewBox=/i.test(svg)) {
    const widthMatch = svg.match(/width=["']?([0-9.]+)(px)?["']?/i);
    const heightMatch = svg.match(/height=["']?([0-9.]+)(px)?["']?/i);
    if (widthMatch && heightMatch) {
      const w = widthMatch[1];
      const h = heightMatch[1];
      svg = svg.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
    } else {
      svg = svg.replace(/<svg/i, `<svg viewBox="0 0 24 24"`);
    }
  }

  // 4. Remove fixed width/height on root <svg> and enforce responsive 100% sizing
  svg = svg.replace(/<svg([^>]*?)\s+width=["'][^"']*["']/i, "<svg$1");
  svg = svg.replace(/<svg([^>]*?)\s+height=["'][^"']*["']/i, "<svg$1");
  svg = svg.replace(/<svg/i, '<svg width="100%" height="100%"');

  // 5. Replace hardcoded dark colors (#000, #000000, black, #111, #222) with currentColor
  svg = svg.replace(
    /fill=["']#(?:000000|000|111111|111|222222|222|333333|333|000000ff|black)["']/gi,
    'fill="currentColor"'
  );
  svg = svg.replace(
    /stroke=["']#(?:000000|000|111111|111|222222|222|333333|333|000000ff|black)["']/gi,
    'stroke="currentColor"'
  );

  // 6. If neither fill nor stroke is defined in SVG, add stroke or fill currentColor fallback
  if (!/fill=/i.test(svg) && !/stroke=/i.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg fill="currentColor"');
  }

  return svg.trim();
}

export function AppIcon({
  icon,
  className = "w-5 h-5",
  size = 20,
  fallbackIcon = "Sparkles",
}: AppIconProps) {
  // If icon is passed as string (e.g. "shield-check" or "aero-downforce")
  const iconObject: IconData | null = useMemo(() => {
    if (!icon) return null;
    if (typeof icon === "string") {
      const normalized = normalizeLucideName(icon);
      if (normalized in LucideIcons) {
        return { type: "lucide", lucideName: normalized };
      }
      return { type: "lucide", slug: icon, lucideName: icon };
    }
    return icon;
  }, [icon]);

  if (!iconObject) {
    const Fallback = getLucideComponent(fallbackIcon) || Sparkles;
    return <Fallback size={size} className={className} />;
  }

  // 1. SVG Code renderer
  if (iconObject.type === "svg_code" && iconObject.svgContent) {
    const formattedSvg = sanitizeAndFormatSvg(iconObject.svgContent);
    return (
      <span
        style={{ width: size, height: size, display: "inline-flex" }}
        className={`items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full ${className}`}
        dangerouslySetInnerHTML={{ __html: formattedSvg }}
      />
    );
  }

  // 2. Image URL renderer (Cloudinary / WebP / PNG)
  if (iconObject.type === "image_url" && iconObject.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconObject.imageUrl}
        alt={iconObject.name || "Icon"}
        className={`object-contain shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // 3. Lucide Icon renderer with smart name normalization
  if (iconObject.type === "lucide" || iconObject.lucideName) {
    const candidate =
      iconObject.lucideName || iconObject.name || iconObject.slug || fallbackIcon;
    const LucideComp =
      getLucideComponent(candidate) ||
      getLucideComponent(fallbackIcon) ||
      Sparkles;
    return <LucideComp size={size} className={className} />;
  }

  const Fallback = getLucideComponent(fallbackIcon) || Sparkles;
  return <Fallback size={size} className={className} />;
}
