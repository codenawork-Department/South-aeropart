// Test-only loading boundary for mocked email-template probes.
// This is NOT a typecheck of the applications; run their own typechecks separately.
declare module "@admin/lib/shipment-email" {
  export function sendShipmentNotificationEmail(
    orderId: string,
    options?: { trackingNumber?: string; shippingCarrier?: string },
  ): Promise<unknown>;
}
declare module "@storefront/lib/order-email" {
  export function sendOrderConfirmationEmail(orderId: string): Promise<unknown>;
}
