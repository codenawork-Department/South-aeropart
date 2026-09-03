import { Metadata } from "next";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getUserLanguagePreference } from "@/actions/profile.actions";
import { AerodynamicsGuideClient } from "@/components/aerodynamics/AerodynamicsGuideClient";
import { AeroLanguage } from "@/data/aerodynamics-content";
import { sanitizeLanguage, LANGUAGE_COOKIE_NAME, DEFAULT_LANGUAGE } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aerodynamics Knowledge & Engineering Guide | South Aeropart",
  description:
    "Comprehensive guide to automotive aerodynamics, fluid mechanics, downforce vs drag, aeropart mechanics, and EV range optimization. Engineered by South Aeropart.",
  keywords: [
    "aerodynamics",
    "automotive aerodynamics",
    "downforce",
    "drag coefficient",
    "spoilers vs wings",
    "diffuser ground effect",
    "Gurney flap",
    "South Aeropart",
    "CFD testing",
    "อากาศพลศาสตร์ยานยนต์",
  ],
};

export default async function AerodynamicsPage() {
  let lang: AeroLanguage = DEFAULT_LANGUAGE as AeroLanguage;

  // 1. Check if user is authenticated and has a saved profile language
  const { userId } = auth();
  if (userId) {
    try {
      const profileLang = await getUserLanguagePreference();
      lang = sanitizeLanguage(profileLang) as AeroLanguage;
    } catch {
      // fallback
    }
  } else {
    // 2. Fallback to cookie if unauthenticated — sanitized against injection
    const cookieStore = cookies();
    const cookieLang = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
    lang = sanitizeLanguage(cookieLang) as AeroLanguage;
  }

  return <AerodynamicsGuideClient initialLanguage={lang} />;
}

