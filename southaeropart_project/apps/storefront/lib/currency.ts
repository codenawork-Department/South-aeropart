/**
 * Currency configuration, types, and formatting utilities for South Aero Storefront.
 * Base store currency is always THB (Thai Baht).
 */

export type Currency = "THB" | "USD" | "EUR" | "JPY" | "SGD";

export const SUPPORTED_CURRENCIES: readonly Currency[] = [
  "THB",
  "USD",
  "EUR",
  "JPY",
  "SGD",
] as const;

export const DEFAULT_CURRENCY: Currency = "THB";
export const CURRENCY_COOKIE_NAME = "south_aero_currency";

export interface CurrencyMetadata {
  code: Currency;
  symbol: string;
  nameEn: string;
  nameTh: string;
  decimals: number;
}

export const CURRENCY_METADATA: Record<Currency, CurrencyMetadata> = {
  THB: {
    code: "THB",
    symbol: "฿",
    nameEn: "Thai Baht",
    nameTh: "บาทไทย",
    decimals: 0,
  },
  USD: {
    code: "USD",
    symbol: "$",
    nameEn: "US Dollar",
    nameTh: "ดอลลาร์สหรัฐ",
    decimals: 2,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    nameEn: "Euro",
    nameTh: "ยูโร",
    decimals: 2,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    nameEn: "Japanese Yen",
    nameTh: "เยนญี่ปุ่น",
    decimals: 0,
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    nameEn: "Singapore Dollar",
    nameTh: "ดอลลาร์สิงคโปร์",
    decimals: 2,
  },
};

/**
 * Fallback exchange rates (relative to 1 THB)
 * Used if offline or during initial server render before API sync.
 */
export const DEFAULT_RATES: Record<Currency, number> = {
  THB: 1.0,
  USD: 0.030356,
  EUR: 0.026122,
  JPY: 4.731155,
  SGD: 0.038465,
};

/**
 * Sanitize currency value to prevent injection of invalid codes.
 */
export function sanitizeCurrency(value: unknown): Currency {
  if (typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as Currency)) {
    return value as Currency;
  }
  return DEFAULT_CURRENCY;
}

/**
 * Convert an amount in THB to the target currency.
 */
export function convertPrice(
  amountInTHB: number | string,
  targetCurrency: Currency = DEFAULT_CURRENCY,
  rates: Record<Currency, number> = DEFAULT_RATES
): number {
  const numericAmount = typeof amountInTHB === "string" ? parseFloat(amountInTHB) || 0 : amountInTHB;
  if (targetCurrency === "THB") {
    return numericAmount;
  }

  const rate = rates[targetCurrency] || DEFAULT_RATES[targetCurrency] || 1;
  return numericAmount * rate;
}

export interface FormatPriceOptions {
  showCode?: boolean;
  decimals?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format an amount in THB into the target currency representation with proper symbols and commas.
 * e.g.
 * - THB: ฿15,000 (or ฿15,000 THB)
 * - USD: $455.34 (or $455.34 USD)
 * - JPY: ¥70,967 (or ¥70,967 JPY)
 */
export function formatPrice(
  amountInTHB: number | string,
  currency: Currency = DEFAULT_CURRENCY,
  rates: Record<Currency, number> = DEFAULT_RATES,
  options?: FormatPriceOptions
): string {
  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.THB;
  const converted = convertPrice(amountInTHB, currency, rates);

  const defaultDecimals = meta.decimals;
  const minDigits =
    options?.minimumFractionDigits !== undefined
      ? options.minimumFractionDigits
      : options?.decimals !== undefined
      ? options.decimals
      : defaultDecimals;
  const maxDigits =
    options?.maximumFractionDigits !== undefined
      ? options.maximumFractionDigits
      : options?.decimals !== undefined
      ? options.decimals
      : defaultDecimals;

  const formattedNumber = converted.toLocaleString("en-US", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });

  const withSymbol = `${meta.symbol}${formattedNumber}`;

  if (options?.showCode) {
    return `${withSymbol} ${currency}`;
  }

  return withSymbol;
}
