import { NextResponse } from "next/server";
import { Currency, DEFAULT_RATES, SUPPORTED_CURRENCIES } from "@/lib/currency";

// Revalidate every 12 hours (43200 seconds)
export const revalidate = 43200;

const OPEN_EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/THB";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    const response = await fetch(OPEN_EXCHANGE_API_URL, {
      signal: controller.signal,
      next: { revalidate: 43200 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstream API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.result === "success" && data.rates) {
      const liveRates: Record<Currency, number> = {
        THB: 1.0,
        USD: typeof data.rates.USD === "number" ? data.rates.USD : DEFAULT_RATES.USD,
        EUR: typeof data.rates.EUR === "number" ? data.rates.EUR : DEFAULT_RATES.EUR,
        JPY: typeof data.rates.JPY === "number" ? data.rates.JPY : DEFAULT_RATES.JPY,
        SGD: typeof data.rates.SGD === "number" ? data.rates.SGD : DEFAULT_RATES.SGD,
      };

      return NextResponse.json({
        success: true,
        base: "THB",
        rates: liveRates,
        lastUpdated: data.time_last_update_utc || new Date().toISOString(),
        cached: true,
      });
    }

    // Fallback if data format unexpected
    return NextResponse.json({
      success: true,
      base: "THB",
      rates: DEFAULT_RATES,
      lastUpdated: new Date().toISOString(),
      fallback: true,
    });
  } catch (error) {
    console.warn("[/api/currency/rates] Using default rates due to upstream error:", error);
    return NextResponse.json({
      success: true,
      base: "THB",
      rates: DEFAULT_RATES,
      lastUpdated: new Date().toISOString(),
      fallback: true,
    });
  }
}
