"use client";

import React, { useMemo } from "react";
import * as LucideIcons from "lucide-react";

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

export function normalizeLucideName(input?: string | null): string {
  if (!input) return "";
  const cleaned = input.trim();
  if (!cleaned) return "";

  if (cleaned in LucideIcons && typeof (LucideIcons as Record<string, any>)[cleaned] !== "undefined") {
    return cleaned;
  }

  const parts = cleaned.split(/[-_\s]+/);
  const pascal = parts
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join("");

  if (pascal in LucideIcons) return pascal;

  const strippedKey = cleaned.replace(/[-_\s]/g, "").toLowerCase();
  const matchedKey = LUCIDE_KEYS_MAP.get(strippedKey);
  if (matchedKey) return matchedKey;

  return pascal || cleaned;
}

export interface DynamicIconProps {
  name?: string | null;
  fallback?: string;
  size?: number;
  className?: string;
}

export function DynamicIcon({
  name,
  fallback = "Sparkles",
  size = 14,
  className,
}: DynamicIconProps) {
  const IconComponent = useMemo(() => {
    const normalized = normalizeLucideName(name);
    const Comp = normalized ? (LucideIcons as Record<string, any>)[normalized] : null;
    if (Comp) return Comp;
    const fallbackNormalized = normalizeLucideName(fallback);
    return (LucideIcons as Record<string, any>)[fallbackNormalized] || LucideIcons.Sparkles;
  }, [name, fallback]);

  return <IconComponent size={size} className={className} />;
}
