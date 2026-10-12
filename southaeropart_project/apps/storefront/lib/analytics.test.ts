import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendGAEvent,
  updateGAConsent,
  trackPageView,
  trackViewItemList,
  trackSelectItem,
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  sanitizeParamValue,
  sanitizePagePath,
  isDoNotTrackEnabled,
} from "./analytics";

describe("analytics.ts - GA4 Tracking Utility with Compliance Guards", () => {
  const originalGtag = window.gtag;
  let mockGtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGtag = vi.fn();
    window.gtag = mockGtag as any;
    // Default navigator.doNotTrack to undefined in tests
    Object.defineProperty(navigator, "doNotTrack", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    window.gtag = originalGtag;
    vi.restoreAllMocks();
  });

  describe("Compliance: PII Restrictions (Requirement 1)", () => {
    it("sanitizes prohibited PII keys like email, phone, and tokens", () => {
      const payloadWithPII = {
        transaction_id: "ORD-999",
        value: 1200,
        email: "customer@example.com",
        phone: "0812345678",
        recipient: "John Doe",
        token: "secret_token_abc",
        safe_param: "regular_value",
      };

      const sanitized = sanitizeParamValue(payloadWithPII) as Record<string, unknown>;
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.recipient).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.transaction_id).toBe("ORD-999");
      expect(sanitized.value).toBe(1200);
      expect(sanitized.safe_param).toBe("regular_value");
    });

    it("redacts string values matching email or phone formats inside nested parameters", () => {
      const nested = {
        user_info: {
          contact: "test.user@domain.co.th",
          mobile: "0891234567",
        },
      };

      const sanitized = sanitizeParamValue(nested) as any;
      expect(sanitized.user_info.contact).toBe("[REDACTED_PII]");
    });

    it("sanitizes URL query strings in page views to avoid PII leakage in page paths", () => {
      const rawUrl = "/orders/ord_123?paid=true&token=guest_secret&email=user@test.com&ref=catalog";
      const cleanPath = sanitizePagePath(rawUrl);

      expect(cleanPath).not.toContain("token=guest_secret");
      expect(cleanPath).not.toContain("email=user@test.com");
      expect(cleanPath).toContain("paid=true");
      expect(cleanPath).toContain("ref=catalog");
    });
  });

  describe("Compliance: Do Not Track (DNT) & Opt-out (Requirement 2)", () => {
    it("blocks sendGAEvent completely when Do Not Track is enabled by client", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: "1",
        configurable: true,
      });

      expect(isDoNotTrackEnabled()).toBe(true);
      sendGAEvent("view_item", { value: 100 });
      expect(mockGtag).not.toHaveBeenCalled();
    });

    it("enforces denied consent mode when DNT is active even if updateGAConsent(true) is invoked", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: "1",
        configurable: true,
      });

      updateGAConsent(true);
      expect(mockGtag).toHaveBeenCalledWith("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    });
  });

  describe("GA4 Recommended E-commerce Events (Requirement 4)", () => {
    it("tracks view_item_list with indexed items", () => {
      trackViewItemList(
        [
          { id: "p1", name: "Front Lip", price: "5000", category: "Lip" },
          { id: "p2", name: "Side Skirt", price: "7000", category: "Skirt" },
        ],
        "Honda Accord G10 Catalog",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "view_item_list", {
        item_list_name: "Honda Accord G10 Catalog",
        currency: "THB",
        items: [
          {
            item_id: "p1",
            item_name: "Front Lip",
            item_category: "Lip",
            item_variant: undefined,
            brand: "South Aero",
            price: 5000,
            index: 1,
          },
          {
            item_id: "p2",
            item_name: "Side Skirt",
            item_category: "Skirt",
            item_variant: undefined,
            brand: "South Aero",
            price: 7000,
            index: 2,
          },
        ],
      });
    });

    it("tracks select_item event", () => {
      trackSelectItem(
        { id: "p1", name: "Front Lip", price: 5000 },
        "Featured Section",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "select_item", {
        item_list_name: "Featured Section",
        currency: "THB",
        items: [
          {
            item_id: "p1",
            item_name: "Front Lip",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 5000,
          },
        ],
      });
    });

    it("tracks view_item event", () => {
      trackViewItem(
        {
          id: "prod-1",
          name: "Accord Carbon Front Lip",
          price: "15,500.00",
          category: "Front Lip",
          variant: "Gloss Black",
        },
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "view_item", {
        currency: "THB",
        value: 15500,
        items: [
          {
            item_id: "prod-1",
            item_name: "Accord Carbon Front Lip",
            item_category: "Front Lip",
            item_variant: "Gloss Black",
            brand: "South Aero",
            price: 15500,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks add_to_cart event with multiplied total value", () => {
      trackAddToCart(
        {
          id: "prod-2",
          name: "Civic FL5 GT Wing",
          price: 25000,
          variant: "Dry Carbon",
        },
        2,
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "add_to_cart", {
        currency: "THB",
        value: 50000,
        items: [
          {
            item_id: "prod-2",
            item_name: "Civic FL5 GT Wing",
            item_category: "Aerodynamics",
            item_variant: "Dry Carbon",
            brand: "South Aero",
            price: 25000,
            quantity: 2,
          },
        ],
      });
    });

    it("tracks remove_from_cart event", () => {
      trackRemoveFromCart(
        {
          id: "prod-2",
          name: "Civic FL5 GT Wing",
          price: 25000,
        },
        1,
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "remove_from_cart", {
        currency: "THB",
        value: 25000,
        items: [
          {
            item_id: "prod-2",
            item_name: "Civic FL5 GT Wing",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 25000,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks view_cart event", () => {
      trackViewCart(
        [
          { id: "p1", name: "Wing", price: 10000, quantity: 1 },
        ],
        "10000",
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "view_cart", {
        currency: "THB",
        value: 10000,
        items: [
          {
            item_id: "p1",
            item_name: "Wing",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 10000,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks begin_checkout event", () => {
      trackBeginCheckout(
        [
          { id: "p1", name: "Lip", price: 10000, quantity: 1 },
          { id: "p2", name: "Diffuser", price: 15000, quantity: 1 },
        ],
        "25000",
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "begin_checkout", {
        currency: "THB",
        value: 25000,
        items: [
          {
            item_id: "p1",
            item_name: "Lip",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 10000,
            quantity: 1,
          },
          {
            item_id: "p2",
            item_name: "Diffuser",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 15000,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks add_shipping_info event", () => {
      trackAddShippingInfo(
        [{ id: "p1", name: "Lip", price: 10000, quantity: 1 }],
        "Express Kerry",
        "10500",
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "add_shipping_info", {
        currency: "THB",
        value: 10500,
        shipping_tier: "Express Kerry",
        items: [
          {
            item_id: "p1",
            item_name: "Lip",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 10000,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks add_payment_info event", () => {
      trackAddPaymentInfo(
        [{ id: "p1", name: "Lip", price: 10000, quantity: 1 }],
        "promptpay",
        "10500",
        "THB",
      );

      expect(mockGtag).toHaveBeenCalledWith("event", "add_payment_info", {
        currency: "THB",
        value: 10500,
        payment_type: "promptpay",
        items: [
          {
            item_id: "p1",
            item_name: "Lip",
            item_category: "Aerodynamics",
            item_variant: undefined,
            brand: "South Aero",
            price: 10000,
            quantity: 1,
          },
        ],
      });
    });

    it("tracks purchase event strictly without customer identity or address details", () => {
      trackPurchase({
        orderId: "ord_123",
        orderNumber: "SA-2026-0001",
        total: "28000.00",
        currency: "THB",
        shipping: "3000",
        tax: 0,
        items: [
          {
            id: "p1",
            name: "Full Aero Kit",
            price: "25000.00",
            quantity: 1,
            variant: "Gloss Carbon",
          },
        ],
      });

      expect(mockGtag).toHaveBeenCalledWith("event", "purchase", {
        transaction_id: "SA-2026-0001",
        value: 28000,
        currency: "THB",
        shipping: 3000,
        tax: 0,
        items: [
          {
            item_id: "p1",
            item_name: "Full Aero Kit",
            item_category: "Aerodynamics",
            item_variant: "Gloss Carbon",
            brand: "South Aero",
            price: 25000,
            quantity: 1,
          },
        ],
      });
    });
  });
});
