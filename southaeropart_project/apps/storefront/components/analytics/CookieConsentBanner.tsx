"use client";

import { useState, useEffect } from "react";
import { Cookie, Shield, Check, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStoredConsent, setStoredConsent } from "./GoogleAnalytics";

export function CookieConsentBanner() {
  const { lang } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only display if user has not previously recorded a preference
    const stored = getStoredConsent();
    if (!stored) {
      // Small timeout to prevent layout shift during initial paint
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    setStoredConsent({ analytics: true, marketing: true });
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    setStoredConsent({ analytics: false, marketing: false });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const isTh = lang === "th";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isTh ? "การตั้งค่าคุกกี้และความเป็นส่วนตัว" : "Cookie and Privacy Preferences"}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#121212]/95 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/80 text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-red)]/10 text-[var(--accent-red)] shrink-0 mt-0.5">
            <Cookie size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              {isTh ? "การยินยอมใช้คุกกี้ (PDPA)" : "Cookie Preferences"}
              <Shield size={13} className="text-[var(--accent-red)]" />
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {isTh
                ? "South Aero ใช้คุกกี้และเครื่องมือวิเคราะห์ (Google Analytics) เพื่อพัฒนาประสบการณ์ ข้อมูลของคุณจะไม่มีการจัดเก็บข้อมูลระบุตัวบุคคล (Zero PII) ตามมาตรฐาน PDPA "
                : "South Aero uses cookies and Google Analytics to improve your experience. Strictly no personal identifiers (Zero PII) are collected. "}
              <a
                href="https://www.google.com/policies/privacy/partners/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-red)] underline hover:text-white transition-colors"
              >
                {isTh ? "วิธีที่ Google นำข้อมูลไปใช้" : "How Google uses data"}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-3 rounded-lg bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90 text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[var(--accent-red)]/20"
          >
            <Check size={14} />
            {isTh ? "ยอมรับทั้งหมด" : "Accept All"}
          </button>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/10"
          >
            <X size={14} />
            {isTh ? "เฉพาะที่จำเป็น" : "Essential Only"}
          </button>
        </div>
      </div>
    </div>
  );
}
