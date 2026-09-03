"use client";

import React from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "navbar" | "mobile" | "compact";
  className?: string;
}

export function LanguageSwitcher({
  variant = "navbar",
  className = "",
}: LanguageSwitcherProps) {
  const { lang, setLanguage } = useLanguage();

  if (variant === "mobile") {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222] ${className}`}>
        <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-heading uppercase tracking-wider">
          <Globe size={16} className="text-[var(--accent-red)]" />
          <span>Language / ภาษา</span>
        </div>
        <div className="flex items-center p-1 rounded bg-[#1C1C1C] border border-[#2A2A2A]">
          <button
            type="button"
            onClick={() => setLanguage("th")}
            className={`px-3 py-1 text-xs font-heading font-bold rounded transition-all ${
              lang === "th"
                ? "bg-[var(--accent-red)] text-white shadow-md shadow-red-950/50"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            TH
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 text-xs font-heading font-bold rounded transition-all ${
              lang === "en"
                ? "bg-[var(--accent-red)] text-white shadow-md shadow-red-950/50"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            EN
          </button>
        </div>
      </div>
    );
  }

  // Navbar compact switcher
  return (
    <div
      className={`inline-flex items-center rounded bg-[#151515] border border-[#262626] p-0.5 shadow-inner transition-colors hover:border-[#383838] ${className}`}
      aria-label="Select language"
    >
      <button
        type="button"
        onClick={() => setLanguage("th")}
        className={`px-2 py-1 text-[11px] font-heading font-bold uppercase tracking-wider rounded-sm transition-all duration-200 ${
          lang === "th"
            ? "bg-[var(--accent-red)] text-white shadow-sm shadow-black/50"
            : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
        }`}
        title="เปลี่ยนเป็นภาษาไทย"
      >
        TH
      </button>
      <span className="text-[#333] text-[10px] select-none mx-0.5">/</span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 text-[11px] font-heading font-bold uppercase tracking-wider rounded-sm transition-all duration-200 ${
          lang === "en"
            ? "bg-[var(--accent-red)] text-white shadow-sm shadow-black/50"
            : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
