import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthSessionTracker } from "@/components/auth/AuthSessionTracker";
import { RealtimeLiveProvider } from "@/components/providers/RealtimeLiveProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { getUserLanguagePreference } from "@/actions/profile.actions";
import { Language, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME, sanitizeLanguage } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "South Aero Performance — Not Loud, Just Different",
  description:
    "Premium aerodynamic body kits and accessories for Honda Accord, Civic, and more. Precision-engineered for performance and style. South Aero Performance — Not Loud, Just Different.",
  keywords: [
    "South Aero",
    "body kit",
    "aerodynamic",
    "Honda Accord",
    "car parts",
    "performance",
    "Thailand",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const cookieRawLang = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;

  // Sanitize cookie value through central guard — prevents locale injection
  let initialLang: Language = sanitizeLanguage(cookieRawLang);

  // If cookie held no language, try the user's DB preference
  if (!cookieRawLang) {
    try {
      const userPref = await getUserLanguagePreference();
      initialLang = sanitizeLanguage(userPref);
    } catch {
      // fallback stays at DEFAULT_LANGUAGE
    }
  }

  return (
    <ClerkProvider>
      <html lang={initialLang} className={`${inter.variable} ${oswald.variable}`}>
        <body className="min-h-screen flex flex-col">
          <AuthSessionTracker />
          <LanguageProvider initialLang={initialLang}>
            <RealtimeLiveProvider>{children}</RealtimeLiveProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
