export type Language = "th" | "en";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["th", "en"] as const;
export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_COOKIE_NAME = "south_aero_lang";

/**
 * Validate and sanitize a language value. Returns DEFAULT_LANGUAGE for any
 * input that is not in SUPPORTED_LANGUAGES, preventing locale-injection.
 */
export function sanitizeLanguage(value: unknown): Language {
  if (typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as Language)) {
    return value as Language;
  }
  return DEFAULT_LANGUAGE;
}
