import { Language } from "@/i18n/config";

/**
 * Helper to get the localized string with graceful fallback to base (Thai) if English is empty.
 */
export function getLocalizedField(
  baseText: string | null | undefined,
  enText: string | null | undefined,
  lang: Language
): string {
  if (lang === "en" && enText && enText.trim().length > 0) {
    return enText.trim();
  }
  return baseText?.trim() || "";
}

/**
 * Localize product attributes (name, description, shortDescription, installation) based on active language.
 */
export function getLocalizedProduct<T extends {
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  installation?: string | null;
  installationEn?: string | null;
}>(product: T, lang: Language): T {
  return {
    ...product,
    name: getLocalizedField(product.name, product.nameEn, lang),
    description: getLocalizedField(product.description, product.descriptionEn, lang),
    shortDescription: getLocalizedField(product.shortDescription, product.shortDescriptionEn, lang),
    installation: getLocalizedField(product.installation, product.installationEn, lang),
  };
}

/**
 * Localize product feature items.
 */
export function getLocalizedFeatureItem(
  feature: {
    title: string;
    titleEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    iconSlug?: string | null;
    iconId?: string | null;
  },
  lang: Language
) {
  return {
    ...feature,
    title: getLocalizedField(feature.title, feature.titleEn, lang),
    description: getLocalizedField(feature.description, feature.descriptionEn, lang),
  };
}
