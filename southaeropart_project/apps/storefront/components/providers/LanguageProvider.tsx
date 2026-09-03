"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Language, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME, SUPPORTED_LANGUAGES, sanitizeLanguage } from "@/i18n/config";
import { th, Dictionary } from "@/i18n/dictionaries/th";
import { en } from "@/i18n/dictionaries/en";
import { updateUserLanguagePreference } from "@/actions/profile.actions";

const dictionaries: Record<Language, Dictionary> = { th, en };

interface LanguageContextType {
  lang: Language;
  t: Dictionary;
  setLanguage: (newLang: Language) => void;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  initialLang?: Language;
  children: React.ReactNode;
}

export function LanguageProvider({
  initialLang = DEFAULT_LANGUAGE,
  children,
}: LanguageProviderProps) {
  // Sanitize the server-supplied value so an invalid cookie can never seed state
  const [lang, setLang] = useState<Language>(() => sanitizeLanguage(initialLang));
  const [isReady, setIsReady] = useState(false);

  // Sync with client-side localStorage on mount (runs only once)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_COOKIE_NAME);
      const validated = sanitizeLanguage(stored);
      if (validated !== lang) {
        setLang(validated);
      }
    } catch {
      // Ignore — localStorage may be unavailable (private browsing, SSR, etc.)
    } finally {
      setIsReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetLanguage = useCallback(
    (newLang: Language) => {
      // Validate incoming value — prevents injection of arbitrary locale strings
      const validated = sanitizeLanguage(newLang);
      if (validated === lang) return;
      setLang(validated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LANGUAGE_COOKIE_NAME, validated);
          // Set cookie with Secure flag when on HTTPS, HttpOnly cannot be set from
          // JS but SameSite=Lax + Secure covers CSRF / cookie-tossing vectors.
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `${LANGUAGE_COOKIE_NAME}=${validated}; path=/; max-age=31536000; SameSite=Lax${secure}`;
          window.dispatchEvent(
            new CustomEvent("south_aero_language_change", { detail: { lang: validated } })
          );
        } catch {
          // Ignore storage errors
        }

        // Background sync to user's DB profile if logged in
        updateUserLanguagePreference(validated).catch(() => {
          // Silently catch unauthenticated or network errors
        });
      }
    },
    [lang]
  );

  const currentDict = dictionaries[lang] ?? dictionaries[DEFAULT_LANGUAGE];

  const value = useMemo(
    () => ({
      lang,
      t: currentDict,
      setLanguage: handleSetLanguage,
      isReady,
    }),
    [lang, currentDict, handleSetLanguage, isReady]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
