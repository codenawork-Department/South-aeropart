/**
 * Google Analytics 4 (GA4) Client Tracking Utility & E-commerce Helpers
 * Compliant with Google Analytics Terms of Service, Google Consent Mode v2,
 * PDPA/GDPR regulations, and South Aero Security Guidelines (CLAUDE.md §5.6 - Strict No PII).
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export interface GAItem {
  id: string;
  name: string;
  price: number | string;
  variant?: string;
  category?: string;
  brand?: string;
}

export interface GAPurchaseOrder {
  orderId: string;
  orderNumber: string;
  total: number | string;
  currency: string;
  tax?: number | string;
  shipping?: number | string;
  items: Array<GAItem & { quantity: number }>;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    doNotTrack?: string;
  }
}

/**
 * Checks if the browser has Do Not Track (DNT) or Global Privacy Control enabled.
 * Respecting opt-out signals without bypass is strictly required by GA4 Terms & PDPA.
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack === "1" ||
    (window as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

/**
 * Safely parse price representation to a finite positive number.
 */
function parsePrice(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 0;
  if (!value) return 0;
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * PII Detection & Sanitization Guard:
 * Blocks any key or value containing emails, phone numbers, or identity tokens.
 */
const PII_KEY_REGEX = /^(email|phone|mobile|tel|telephone|address|street|zip|postal|name|recipient|token|secret|password|pwd|ssn|id_card)$/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const THAI_PHONE_REGEX = /(?:\+?66|0)[0-9]{8,10}/;

export function sanitizeParamValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (EMAIL_REGEX.test(value) || THAI_PHONE_REGEX.test(value)) {
      return "[REDACTED_PII]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeParamValue(item));
  }
  if (value && typeof value === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEY_REGEX.test(k)) {
        continue; // Discard prohibited PII keys completely
      }
      cleanObj[k] = sanitizeParamValue(v);
    }
    return cleanObj;
  }
  return value;
}

/**
 * Sanitize URL to ensure query tokens or email params never leak into GA4 pageview dimensions.
 */
export function sanitizePagePath(url: string): string {
  if (!url) return "/";
  try {
    const parsed = new URL(url, "https://southaero.com");
    // Strip sensitive query parameters
    const searchParams = new URLSearchParams(parsed.search);
    const forbiddenQueryParams = ["token", "email", "name", "phone", "guest_order", "secret", "auth"];
    for (const param of forbiddenQueryParams) {
      searchParams.delete(param);
    }
    const cleanSearch = searchParams.toString();
    return cleanSearch ? `${parsed.pathname}?${cleanSearch}` : parsed.pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}

/**
 * Dispatch raw GA4 event if gtag is initialized, GA_MEASUREMENT_ID is present,
 * and user has not enabled Do Not Track (DNT).
 */
export function sendGAEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isDoNotTrackEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.info("[GA4] Skipped event because Do Not Track is enabled by client:", eventName);
    }
    return;
  }

  try {
    const sanitizedParams = sanitizeParamValue(params) as Record<string, unknown>;
    window.gtag("event", eventName, sanitizedParams);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA4] Failed to send event:", eventName, err);
    }
  }
}

/**
 * Update Google Consent Mode v2 status.
 * Used when the user explicitly accepts or revokes analytics consent.
 */
export function updateGAConsent(granted: boolean): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const status = granted && !isDoNotTrackEnabled() ? "granted" : "denied";
  try {
    window.gtag("consent", "update", {
      analytics_storage: status,
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA4] Failed to update consent:", err);
    }
  }
}

/**
 * Track page view with query-string sanitization (Zero PII).
 */
export function trackPageView(url: string, title?: string): void {
  if (!GA_MEASUREMENT_ID) return;
  const cleanPath = sanitizePagePath(url);
  sendGAEvent("page_view", {
    page_path: cleanPath,
    page_title: title || (typeof document !== "undefined" ? document.title : undefined),
    send_to: GA_MEASUREMENT_ID,
  });
}

/**
 * E-commerce: Track View Item List (view_item_list)
 */
export function trackViewItemList(
  items: GAItem[],
  listName: string = "Product Catalog",
  currency: string = "THB",
): void {
  sendGAEvent("view_item_list", {
    item_list_name: listName,
    currency,
    items: items.map((it, idx) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      index: idx + 1,
    })),
  });
}

/**
 * E-commerce: Track Select Item (select_item)
 */
export function trackSelectItem(
  item: GAItem,
  listName: string = "Product Catalog",
  currency: string = "THB",
): void {
  sendGAEvent("select_item", {
    item_list_name: listName,
    currency,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Aerodynamics",
        item_variant: item.variant,
        brand: item.brand || "South Aero",
        price: parsePrice(item.price),
      },
    ],
  });
}

/**
 * E-commerce: Track View Item (view_item)
 */
export function trackViewItem(item: GAItem, currency: string = "THB"): void {
  const price = parsePrice(item.price);
  sendGAEvent("view_item", {
    currency,
    value: price,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Aerodynamics",
        item_variant: item.variant,
        brand: item.brand || "South Aero",
        price,
        quantity: 1,
      },
    ],
  });
}

/**
 * E-commerce: Track Add to Cart (add_to_cart)
 */
export function trackAddToCart(
  item: GAItem,
  quantity: number = 1,
  currency: string = "THB",
): void {
  const price = parsePrice(item.price);
  sendGAEvent("add_to_cart", {
    currency,
    value: price * quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Aerodynamics",
        item_variant: item.variant,
        brand: item.brand || "South Aero",
        price,
        quantity,
      },
    ],
  });
}

/**
 * E-commerce: Track Remove from Cart (remove_from_cart)
 */
export function trackRemoveFromCart(
  item: GAItem,
  quantity: number = 1,
  currency: string = "THB",
): void {
  const price = parsePrice(item.price);
  sendGAEvent("remove_from_cart", {
    currency,
    value: price * quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Aerodynamics",
        item_variant: item.variant,
        brand: item.brand || "South Aero",
        price,
        quantity,
      },
    ],
  });
}

/**
 * E-commerce: Track View Cart (view_cart)
 */
export function trackViewCart(
  items: Array<GAItem & { quantity: number }>,
  total: number | string,
  currency: string = "THB",
): void {
  sendGAEvent("view_cart", {
    currency,
    value: parsePrice(total),
    items: items.map((it) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      quantity: it.quantity,
    })),
  });
}

/**
 * E-commerce: Track Begin Checkout (begin_checkout)
 */
export function trackBeginCheckout(
  items: Array<GAItem & { quantity: number }>,
  total: number | string,
  currency: string = "THB",
): void {
  sendGAEvent("begin_checkout", {
    currency,
    value: parsePrice(total),
    items: items.map((it) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      quantity: it.quantity,
    })),
  });
}

/**
 * E-commerce: Track Add Shipping Info (add_shipping_info)
 */
export function trackAddShippingInfo(
  items: Array<GAItem & { quantity: number }>,
  shippingTier: string,
  total: number | string,
  currency: string = "THB",
): void {
  sendGAEvent("add_shipping_info", {
    currency,
    value: parsePrice(total),
    shipping_tier: shippingTier,
    items: items.map((it) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      quantity: it.quantity,
    })),
  });
}

/**
 * E-commerce: Track Add Payment Info (add_payment_info)
 */
export function trackAddPaymentInfo(
  items: Array<GAItem & { quantity: number }>,
  paymentType: string,
  total: number | string,
  currency: string = "THB",
): void {
  sendGAEvent("add_payment_info", {
    currency,
    value: parsePrice(total),
    payment_type: paymentType,
    items: items.map((it) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      quantity: it.quantity,
    })),
  });
}

/**
 * E-commerce: Track Purchase (purchase)
 * Exclusively passes non-identifiable financial totals and anonymous item lists.
 * Never passes customer email, phone, physical address, or names.
 */
export function trackPurchase(order: GAPurchaseOrder): void {
  sendGAEvent("purchase", {
    transaction_id: order.orderNumber || order.orderId,
    value: parsePrice(order.total),
    currency: order.currency || "THB",
    tax: order.tax !== undefined ? parsePrice(order.tax) : 0,
    shipping: order.shipping !== undefined ? parsePrice(order.shipping) : 0,
    items: order.items.map((it) => ({
      item_id: it.id,
      item_name: it.name,
      item_category: it.category || "Aerodynamics",
      item_variant: it.variant,
      brand: it.brand || "South Aero",
      price: parsePrice(it.price),
      quantity: it.quantity,
    })),
  });
}
