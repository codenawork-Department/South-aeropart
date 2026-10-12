"use client";

import { useEffect } from "react";
import Script from "next/script";
import { updateGAConsent, isDoNotTrackEnabled } from "@/lib/analytics";

interface GoogleAnalyticsProps {
  measurementId?: string;
  nonce?: string;
}

export const CONSENT_STORAGE_KEY = "south_aero_consent_preferences";

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

/**
 * Checks client-side stored consent preference.
 */
export function getStoredConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  if (isDoNotTrackEnabled()) {
    return { analytics: false, marketing: false, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Sets client-side stored consent preference and dispatches update event.
 */
export function setStoredConsent(prefs: Omit<ConsentPreferences, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const isDnt = isDoNotTrackEnabled();
    const effectiveAnalytics = isDnt ? false : prefs.analytics;
    const effectiveMarketing = isDnt ? false : prefs.marketing;

    const payload: ConsentPreferences = {
      analytics: effectiveAnalytics,
      marketing: effectiveMarketing,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent("south_aero_consent_changed", { detail: payload }),
    );
  } catch (err) {
    console.warn("[GA4] Failed to persist consent preferences:", err);
  }
}

export function GoogleAnalytics({ measurementId, nonce }: GoogleAnalyticsProps) {
  const gaId = measurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    // 1. If user enabled Do Not Track, force denied immediately
    if (isDoNotTrackEnabled()) {
      updateGAConsent(false);
      return;
    }

    // 2. Check initial stored consent on hydration
    const stored = getStoredConsent();
    if (stored?.analytics) {
      updateGAConsent(true);
    }

    // 3. Listen for consent changes triggered by CookieConsentBanner or ProfileTabs
    const handleConsentChange = (e: Event) => {
      if (isDoNotTrackEnabled()) {
        updateGAConsent(false);
        return;
      }
      const customEvent = e as CustomEvent<ConsentPreferences>;
      if (customEvent.detail) {
        updateGAConsent(Boolean(customEvent.detail.analytics));
      }
    };

    window.addEventListener("south_aero_consent_changed", handleConsentChange);
    return () => {
      window.removeEventListener("south_aero_consent_changed", handleConsentChange);
    };
  }, []);

  if (!gaId || gaId.trim() === "") {
    return null;
  }

  return (
    <>
      {/* 1. Google Consent Mode v2 Default Settings + GA4 Initial Setup */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'wait_for_update': 500
            });
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              send_page_view: true,
              anonymize_ip: true
            });
          `,
        }}
      />

      {/* 2. Load gtag.js from Google Tag Manager */}
      <Script
        id="google-analytics-tag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        nonce={nonce}
      />
    </>
  );
}
