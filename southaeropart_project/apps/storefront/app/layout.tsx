import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthSessionTracker } from "@/components/auth/AuthSessionTracker";
import { RealtimeLiveProvider } from "@/components/providers/RealtimeLiveProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { getUserLanguagePreference, getUserCurrencyPreference } from "@/actions/profile.actions";
import { Language, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME, sanitizeLanguage } from "@/i18n/config";
import { Currency, DEFAULT_CURRENCY, CURRENCY_COOKIE_NAME, sanitizeCurrency } from "@/lib/currency";
import { CustomerShipmentAlertToast } from "@/components/orders/CustomerShipmentAlertToast";
import "./globals.css";

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
  const cookieStore = await cookies();
  const cookieRawLang = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const cookieRawCurr = cookieStore.get(CURRENCY_COOKIE_NAME)?.value;

  // Sanitize cookie value through central guard — prevents locale injection
  let initialLang: Language = sanitizeLanguage(cookieRawLang);
  let initialCurrency: Currency = sanitizeCurrency(cookieRawCurr);

  // If cookie held no language, try the user's DB preference
  if (!cookieRawLang) {
    try {
      const userPref = await getUserLanguagePreference();
      initialLang = sanitizeLanguage(userPref);
    } catch {
      // fallback stays at DEFAULT_LANGUAGE
    }
  }

  // If cookie held no currency, try the user's DB preference
  if (!cookieRawCurr) {
    try {
      const userCurrPref = await getUserCurrencyPreference();
      initialCurrency = sanitizeCurrency(userCurrPref);
    } catch {
      // fallback stays at DEFAULT_CURRENCY
    }
  }

  return (
    <ClerkProvider dynamic
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang={initialLang}>
        <body className="min-h-screen flex flex-col font-sans">
          <AuthSessionTracker />
          <LanguageProvider initialLang={initialLang}>
            <CurrencyProvider initialCurrency={initialCurrency}>
              <RealtimeLiveProvider>
                <CustomerShipmentAlertToast />
                {children}
              </RealtimeLiveProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
