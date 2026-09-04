"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Currency,
  DEFAULT_CURRENCY,
  CURRENCY_COOKIE_NAME,
  DEFAULT_RATES,
  CURRENCY_METADATA,
  SUPPORTED_CURRENCIES,
  CurrencyMetadata,
  sanitizeCurrency,
  convertPrice as convertPriceUtil,
  formatPrice as formatPriceUtil,
  FormatPriceOptions,
} from "@/lib/currency";
import { updateUserCurrencyPreference } from "@/actions/profile.actions";

interface CurrencyContextType {
  currency: Currency;
  rates: Record<Currency, number>;
  ratesUpdated: string | null;
  currencyMeta: CurrencyMetadata;
  currencySymbol: string;
  isReady: boolean;
  setCurrency: (newCurrency: Currency) => void;
  convertPrice: (amountInTHB: number | string) => number;
  formatPrice: (amountInTHB: number | string, options?: FormatPriceOptions) => string;
  supportedCurrencies: readonly Currency[];
  allMetadata: Record<Currency, CurrencyMetadata>;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

interface CurrencyProviderProps {
  initialCurrency?: Currency;
  children: React.ReactNode;
}

export function CurrencyProvider({
  initialCurrency = DEFAULT_CURRENCY,
  children,
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(() =>
    sanitizeCurrency(initialCurrency)
  );
  const [rates, setRates] = useState<Record<Currency, number>>(DEFAULT_RATES);
  const [ratesUpdated, setRatesUpdated] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Sync with client-side localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_COOKIE_NAME);
      const validated = sanitizeCurrency(stored);
      if (stored && validated !== currency) {
        setCurrencyState(validated);
      }
    } catch {
      // Ignore localStorage unavailable
    } finally {
      setIsReady(true);
    }

    // Background fetch of latest exchange rates via cached API route
    const fetchLiveRates = async () => {
      try {
        const res = await fetch("/api/currency/rates", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            setRates(data.rates);
            if (data.lastUpdated) {
              setRatesUpdated(data.lastUpdated);
            }
          }
        }
      } catch (err) {
        console.warn("[CurrencyProvider] Live rates fetch failed, using fallback:", err);
      }
    };

    fetchLiveRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetCurrency = useCallback(
    (newCurrency: Currency) => {
      const validated = sanitizeCurrency(newCurrency);
      if (validated === currency) return;
      setCurrencyState(validated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CURRENCY_COOKIE_NAME, validated);
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `${CURRENCY_COOKIE_NAME}=${validated}; path=/; max-age=31536000; SameSite=Lax${secure}`;
          window.dispatchEvent(
            new CustomEvent("south_aero_currency_change", {
              detail: { currency: validated },
            })
          );
        } catch {
          // Ignore storage errors
        }

        // Background sync to user's DB profile if logged in
        updateUserCurrencyPreference(validated).catch(() => {
          // Silently catch unauthenticated or network errors
        });
      }
    },
    [currency]
  );

  const convertPrice = useCallback(
    (amountInTHB: number | string) => {
      return convertPriceUtil(amountInTHB, currency, rates);
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (amountInTHB: number | string, options?: FormatPriceOptions) => {
      return formatPriceUtil(amountInTHB, currency, rates, options);
    },
    [currency, rates]
  );

  const currencyMeta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.THB;
  const currencySymbol = currencyMeta.symbol;

  const value = useMemo<CurrencyContextType>(
    () => ({
      currency,
      rates,
      ratesUpdated,
      currencyMeta,
      currencySymbol,
      isReady,
      setCurrency: handleSetCurrency,
      convertPrice,
      formatPrice,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      allMetadata: CURRENCY_METADATA,
    }),
    [
      currency,
      rates,
      ratesUpdated,
      currencyMeta,
      currencySymbol,
      isReady,
      handleSetCurrency,
      convertPrice,
      formatPrice,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
