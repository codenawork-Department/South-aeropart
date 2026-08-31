/**
 * Realtime Live Notifier
 * ส่งสัญญาณแจ้งเตือนไปยัง Storefront API (/api/realtime)
 * เมื่อมีการอัปเดตข้อมูลสินค้า, ชุดเซ็ต, หรือสถานะการมองเห็น (Visibility / Featured)
 */
export async function notifyStorefrontCatalogChange(action: string, payload?: Record<string, unknown>) {
  try {
    const storefrontUrl =
      process.env.NEXT_PUBLIC_STOREFRONT_URL ||
      process.env.STOREFRONT_URL ||
      "http://localhost:3000";

    // Non-blocking fetch with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`${storefrontUrl}/api/realtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        payload,
        timestamp: Date.now(),
      }),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch(() => {
        // Silently ignore if storefront dev server is down
        clearTimeout(timeoutId);
      });
  } catch {
    // Fail-safe
  }
}
