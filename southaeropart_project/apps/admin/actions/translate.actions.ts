"use server";

/**
 * Translate a single text string from English to Thai using Google Translate engine
 */
export async function translateText(
  text: string,
  from: string = "en",
  to: string = "th"
): Promise<string> {
  const clean = text?.trim();
  if (!clean) return "";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Translation API error HTTP ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ""))
        .filter(Boolean)
        .join("")
        .trim();
      if (translated) return translated;
    }

    return clean;
  } catch (err) {
    console.error("[Translate Engine Error]:", err);
    return clean;
  }
}

/**
 * Server Action: Translate Product details (Name, Short Description, Full Description, Features)
 * from English to Thai in a single batch operation.
 */
export async function translateProductAction(payload: {
  nameEn?: string | null;
  shortDescriptionEn?: string | null;
  descriptionEn?: string | null;
  features?: Array<{ titleEn?: string | null; descriptionEn?: string | null }>;
}): Promise<{
  success: boolean;
  data?: {
    name: string;
    shortDescription: string;
    description: string;
    features: Array<{ title: string; description: string }>;
  };
  error?: string;
}> {
  try {
    const { nameEn, shortDescriptionEn, descriptionEn, features = [] } = payload;

    const [translatedName, translatedShortDesc, translatedDesc] = await Promise.all([
      nameEn ? translateText(nameEn) : Promise.resolve(""),
      shortDescriptionEn ? translateText(shortDescriptionEn) : Promise.resolve(""),
      descriptionEn ? translateText(descriptionEn) : Promise.resolve(""),
    ]);

    const translatedFeatures = await Promise.all(
      features.map(async (feat) => {
        const [title, description] = await Promise.all([
          feat.titleEn ? translateText(feat.titleEn) : Promise.resolve(""),
          feat.descriptionEn ? translateText(feat.descriptionEn) : Promise.resolve(""),
        ]);
        return { title, description };
      })
    );

    return {
      success: true,
      data: {
        name: translatedName,
        shortDescription: translatedShortDesc,
        description: translatedDesc,
        features: translatedFeatures,
      },
    };
  } catch (err: any) {
    console.error("[translateProductAction Error]:", err);
    return {
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการแปลภาษา",
    };
  }
}

/**
 * Server Action: Translate Bundle details (Name, Short Description, Full Description)
 * from English to Thai in a single batch operation.
 */
export async function translateBundleAction(payload: {
  nameEn?: string | null;
  shortDescriptionEn?: string | null;
  descriptionEn?: string | null;
}): Promise<{
  success: boolean;
  data?: {
    name: string;
    shortDescription: string;
    description: string;
  };
  error?: string;
}> {
  try {
    const { nameEn, shortDescriptionEn, descriptionEn } = payload;

    const [translatedName, translatedShortDesc, translatedDesc] = await Promise.all([
      nameEn ? translateText(nameEn) : Promise.resolve(""),
      shortDescriptionEn ? translateText(shortDescriptionEn) : Promise.resolve(""),
      descriptionEn ? translateText(descriptionEn) : Promise.resolve(""),
    ]);

    return {
      success: true,
      data: {
        name: translatedName,
        shortDescription: translatedShortDesc,
        description: translatedDesc,
      },
    };
  } catch (err: any) {
    console.error("[translateBundleAction Error]:", err);
    return {
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการแปลภาษา",
    };
  }
}
