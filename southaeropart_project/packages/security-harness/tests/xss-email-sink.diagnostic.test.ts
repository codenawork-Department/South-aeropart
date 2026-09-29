import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Requirement 12: XSS inspection in email sink (HTML rendered for Resend delivery)
// Ensure no unescaped <script>, <img> onerror, or executable event handlers are present.
// Invariant PLAIN_TEXT: stored strings must be treated as inert data and escaped in HTML sinks.

const mocks = vi.hoisted(() => {
  return {
    capturedStorefrontHtml: "",
    capturedAdminHtml: "",
    maliciousProductName:
      "<script>globalThis.__qaXss=1</script> Carbon Spoiler",
    maliciousRecipient: '<img src=x onerror=alert("hacked")> Somchai',
    unescapedAdminPayload: '<script>alert("admin_xss")</script>',
    trackingUrl: "https://tracking.carrier.test/?q=1&x=2",
  };
});

vi.mock("@repo/lib", () => ({
  sendEmail: vi.fn(async (params: { subject: string; html: string }) => {
    if (params.subject?.includes("ORD-QA-XSS-001")) {
      mocks.capturedStorefrontHtml = params.html;
    } else if (params.subject?.includes("ORD-ADMIN-001")) {
      mocks.capturedAdminHtml = params.html;
    }
    return { success: true, id: "msg_test_123" };
  }),
  getCarrierTrackingUrl: vi.fn(() => mocks.trackingUrl),
}));

vi.mock("@repo/db", () => {
  const storefrontOrder = {
    id: "20000000-0000-4000-8000-000000000002",
    orderNumber: "ORD-QA-XSS-001",
    userId: "guest_123",
    status: "confirmed",
    paymentMethod: "promptpay",
    paymentStatus: "paid",
    total: "100.00",
    subtotal: "100.00",
    shippingFee: "0.00",
    taxAmount: "0.00",
    currency: "thb",
    stripePaymentIntentId: null,
    shippingAddress: {
      recipientName: mocks.maliciousRecipient,
      phone: "0812345678",
      email: "customer@example.invalid",
      line1: "123 Test St",
      line2: null,
      subDistrict: "Bangrak",
      district: "Bangrak",
      province: "Bangkok",
      postalCode: "10500",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const storefrontOrderItem = {
    id: "item_001",
    orderId: storefrontOrder.id,
    productId: "prod_001",
    productNameSnapshot: mocks.maliciousProductName,
    quantity: 1,
    unitPrice: "100.00",
    lineTotal: "100.00",
  };

  const adminOrder = {
    id: "20000000-0000-4000-8000-000000000003",
    orderNumber: "ORD-ADMIN-001 <b>order</b>",
    userId: "user_123",
    status: "shipped",
    trackingNumber: "TH12345678",
    shippingCarrier: "Kerry",
    shippingAddress: {
      recipientName: mocks.unescapedAdminPayload,
      phone: "0812345678",
      email: 'qa+"<customer>"@example.invalid',
      line1: '<svg onload="address()">',
      line2: null,
      subDistrict: "Bangrak",
      district: "Bangrak",
      province: "Bangkok",
      postalCode: "10500",
    },
  };

  const adminOrderItem = {
    id: "item_admin_001",
    orderId: adminOrder.id,
    productId: "prod_001",
    productNameSnapshot: mocks.unescapedAdminPayload,
    quantity: 1,
  };

  const tables = {
    orders: { id: "id" },
    orderItems: { orderId: "orderId" },
    orderItemBundleParts: { orderItemId: "orderItemId" },
    users: { id: "userId" },
  };
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn((cond: unknown) => ({
            limit: vi.fn(() => {
              const condStr = JSON.stringify(cond || "");
              const isAdmin = condStr.includes("0003");
              return Promise.resolve([isAdmin ? adminOrder : storefrontOrder]);
            }),
            then: (resolve: (rows: unknown[]) => unknown) =>
              resolve(
                table === tables.orderItemBundleParts
                  ? [
                      {
                        childProductNameSnapshot:
                          '<img src=x onerror="part()">',
                        quantity: 2,
                      },
                    ]
                  : [storefrontOrderItem, adminOrderItem],
              ),
          })),
        })),
      })),
    },
    ...tables,
    eq: vi.fn((a, b) => ({ a, b })),
  };
});

afterEach(() => vi.unstubAllEnvs());
describe("XSS Email Sink Security Audit (Requirement 12, Invariant PLAIN_TEXT)", () => {
  beforeEach(() => {
    vi.stubEnv(
      "ORDER_TOKEN_SECRET",
      "order_token_secret_for_qa_security_harness_32bytes_long",
    );
    mocks.capturedStorefrontHtml = "";
    mocks.capturedAdminHtml = "";
  });

  it("enforces HTML escaping in customer confirmation email (Security Regression)", async () => {
    const { sendOrderConfirmationEmail } =
      await import("@storefront/lib/order-email");

    await sendOrderConfirmationEmail("20000000-0000-4000-8000-000000000002");

    // Storefront correctly escapes both item name and recipient in order-email.ts!
    expect(mocks.capturedStorefrontHtml).not.toContain(
      "<script>globalThis.__qaXss=1</script>",
    );
    expect(mocks.capturedStorefrontHtml).toContain(
      "&lt;script&gt;globalThis.__qaXss=1&lt;/script&gt;",
    );
    expect(mocks.capturedStorefrontHtml).not.toContain(
      '<img src=x onerror=alert("hacked")>',
    );
    expect(mocks.capturedStorefrontHtml).toContain(
      "&lt;img src=x onerror=alert(&quot;hacked&quot;)&gt;",
    );
  });
});

describe("Security Diagnostic Audit: Admin Shipment Email HTML Injection", () => {
  beforeEach(() => {
    mocks.capturedAdminHtml = "";
    mocks.trackingUrl = "https://tracking.carrier.test/?q=1&x=2";
    vi.stubEnv(
      "NEXT_PUBLIC_STOREFRONT_URL",
      "https://storefront.example.invalid",
    );
  });
  it("escapes product, bundle parts, address, order number and recipient text", async () => {
    const { sendShipmentNotificationEmail } =
      await import("@admin/lib/shipment-email");

    await sendShipmentNotificationEmail("20000000-0000-4000-8000-000000000003");

    // The security requirement: HTML tags must NOT appear unescaped in email HTML
    // A finding must fail this separate application-diagnostic command.
    expect(mocks.capturedAdminHtml.length).toBeGreaterThan(0);
    expect(
      mocks.capturedAdminHtml.includes('<script>alert("admin_xss")</script>'),
    ).toBe(false);
    expect(mocks.capturedAdminHtml).toContain("&lt;script&gt;");
    expect(mocks.capturedAdminHtml).toContain("&lt;b&gt;order&lt;/b&gt;");
    expect(mocks.capturedAdminHtml).toContain(
      "&lt;svg onload=&quot;address()&quot;&gt;",
    );
    expect(mocks.capturedAdminHtml).toContain(
      "&lt;img src=x onerror=&quot;part()&quot;&gt;",
    );
    expect(mocks.capturedAdminHtml).toContain(
      "&quot;&lt;customer&gt;&quot;@example.invalid",
    );
    expect(mocks.capturedAdminHtml).not.toContain('<svg onload="address()">');
    expect(mocks.capturedAdminHtml).not.toContain(
      '<img src=x onerror="part()">',
    );
    expect(mocks.capturedAdminHtml).toContain(
      'href="https://tracking.carrier.test/?q=1&amp;x=2"',
    );
  });
  it("escapes tracking and carrier display text and quoted link attributes", async () => {
    const { sendShipmentNotificationEmail } =
      await import("@admin/lib/shipment-email");
    mocks.trackingUrl =
      'https://tracking.carrier.test/?q=" onmouseover="marker';
    await sendShipmentNotificationEmail(
      "20000000-0000-4000-8000-000000000003",
      {
        trackingNumber: '<img src=x onerror="tracking()">',
        shippingCarrier: '<svg onload="carrier()">',
      },
    );
    expect(mocks.capturedAdminHtml).toContain(
      "&lt;img src=x onerror=&quot;tracking()&quot;&gt;",
    );
    expect(mocks.capturedAdminHtml).toContain(
      "&lt;svg onload=&quot;carrier()&quot;&gt;",
    );
    expect(mocks.capturedAdminHtml).not.toContain(
      '<img src=x onerror="tracking()">',
    );
    expect(mocks.capturedAdminHtml).toContain(
      'href="https://tracking.carrier.test/?q=&quot; onmouseover=&quot;marker"',
    );
  });
});
