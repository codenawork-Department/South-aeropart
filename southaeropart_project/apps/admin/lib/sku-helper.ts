// ─── SKU Constants & Synchronous Helper Functions ─────────────────────────

export const BRAND_CODE_MAP: Record<string, string> = {
  honda: "HD",
  toyota: "TY",
  mazda: "MZ",
  nissan: "NS",
  mitsubishi: "MT",
  subaru: "SB",
  isuzu: "IS",
  suzuki: "SZ",
  ford: "FD",
  bmw: "BM",
  "mercedes-benz": "MB",
  mercedes: "MB",
  audi: "AD",
  porsche: "PC",
  volkswagen: "VW",
  hyundai: "HY",
  kia: "KA",
  lexus: "LX",
  mg: "MG",
  byd: "BY",
  tesla: "TS",
  universal: "UN",
};

export const MODEL_CODE_MAP: Record<string, string> = {
  accord: "AC",
  civic: "CV",
  city: "CT",
  "cr-v": "CR",
  crv: "CR",
  "hr-v": "HR",
  hrv: "HR",
  jazz: "JZ",
  brio: "BR",
  brv: "BV",
  yaris: "YR",
  "gr-yaris": "GY",
  "gr-corolla": "GC",
  corolla: "CL",
  altis: "AL",
  camry: "CM",
  gr86: "86",
  "gt-86": "86",
  "86": "86",
  supra: "SP",
  "supra-a90": "90",
  fortuner: "FT",
  hilux: "HL",
  revo: "RV",
  vios: "VS",
  cross: "CS",
  "mazda-2": "M2",
  "mazda-3": "M3",
  "cx-3": "C3",
  "cx-30": "30",
  "cx-5": "C5",
  "cx-8": "C8",
  mx5: "M5",
  "mx-5": "M5",
  miata: "M5",
  gtr: "35",
  "gtr-r35": "35",
  "r35": "35",
  almera: "AM",
  march: "MC",
  kicks: "KK",
  navara: "NV",
  "d-max": "DM",
  dmax: "DM",
  mu_x: "MX",
  mux: "MX",
  swift: "SW",
  ranger: "RG",
  everest: "EV",
  mustang: "MT",
  universal: "UN",
};

export const CATEGORY_CODE_MAP: Record<string, string> = {
  ducktail: "DT",
  "ducktail-spoiler": "DT",
  spoiler: "SP",
  "gt-wing": "GW",
  wing: "WG",
  "front-lip": "FL",
  "rear-diffuser": "RD",
  diffuser: "DF",
  "side-skirts": "SS",
  canards: "CN",
  hood: "HD",
  bonnet: "HD",
  trunk: "TR",
  "mirror-covers": "MC",
  "roof-spoiler": "RS",
  fender: "FD",
  "wide-body": "WB",
  splitter: "SL",
  grille: "GL",
  eyebrows: "EB",
  vent: "VT",
  aeropart: "AP",
};

export function getCodeFromSlug(
  slug: string | null | undefined,
  map: Record<string, string>,
  fallback: string
): string {
  if (!slug) return fallback;
  const clean = slug.toLowerCase().trim();
  if (map[clean]) return map[clean];

  // Match partial key
  for (const [k, code] of Object.entries(map)) {
    if (clean.includes(k) || k.includes(clean)) return code;
  }

  // Fallback: extract first 2 alphanumeric characters
  const alphanumeric = clean.replace(/[^a-z0-9]/g, "");
  if (alphanumeric.length >= 2) {
    return alphanumeric.slice(0, 2).toUpperCase();
  }
  return fallback;
}

export interface ParsedSkuBreakdown {
  isValid: boolean;
  brandCode?: string;
  brandLabel?: string;
  modelCode?: string;
  modelLabel?: string;
  partCode?: string;
  partLabel?: string;
  sequence?: string;
}

export function parseSku(
  sku: string,
  selectedBrandName?: string,
  selectedModelName?: string,
  selectedCategoryName?: string
): ParsedSkuBreakdown {
  const clean = sku.trim().toUpperCase();
  const match = clean.match(/^([A-Z0-9]{2})([A-Z0-9]{2})-([A-Z0-9]{2})(\d{2,})$/);
  if (match) {
    const [, bCode, mCode, pCode, seq] = match;

    const brandEntry = Object.entries(BRAND_CODE_MAP).find(([, code]) => code === bCode);
    const modelEntry = Object.entries(MODEL_CODE_MAP).find(([, code]) => code === mCode);
    const partEntry = Object.entries(CATEGORY_CODE_MAP).find(([, code]) => code === pCode);

    return {
      isValid: true,
      brandCode: bCode,
      brandLabel: selectedBrandName && getCodeFromSlug(selectedBrandName, BRAND_CODE_MAP, "") === bCode
        ? selectedBrandName
        : (brandEntry ? brandEntry[0].toUpperCase() : selectedBrandName || bCode),
      modelCode: mCode,
      modelLabel: selectedModelName && getCodeFromSlug(selectedModelName, MODEL_CODE_MAP, "") === mCode
        ? selectedModelName
        : (modelEntry ? modelEntry[0].toUpperCase() : selectedModelName || mCode),
      partCode: pCode,
      partLabel: selectedCategoryName && getCodeFromSlug(selectedCategoryName, CATEGORY_CODE_MAP, "") === pCode
        ? selectedCategoryName
        : (partEntry ? partEntry[0].toUpperCase() : selectedCategoryName || pCode),
      sequence: seq,
    };
  }
  return { isValid: false };
}
