/**
 * Carrier tracking helpers for South Aero logistics
 */

export interface CarrierInfo {
  name: string;
  trackingUrl: string | null;
  slug: string;
}

export function getCarrierTrackingUrl(
  carrierName?: string | null,
  trackingNumber?: string | null
): string | null {
  if (!trackingNumber) return null;
  const cleanTrack = trackingNumber.trim();
  const c = (carrierName || "").toLowerCase().trim();

  if (c.includes("kerry")) {
    return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("flash")) {
    return `https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(cleanTrack)}`;
  }
  if (
    c.includes("ems") ||
    c.includes("thailand post") ||
    c.includes("ไปรษณีย์") ||
    c.includes("thai post")
  ) {
    return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("j&t") || c.includes("jt")) {
    return `https://www.jtexpress.co.th/trajectoryQuery?bills=${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("dhl")) {
    return `https://www.dhl.com/th-th/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("scg")) {
    return `https://www.scgexpress.co.th/tracking/detail/${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("ninja")) {
    return `https://www.ninjavan.co/th-th/tracking?id=${encodeURIComponent(cleanTrack)}`;
  }
  if (c.includes("best")) {
    return `https://www.best-inc.co.th/track?bills=${encodeURIComponent(cleanTrack)}`;
  }

  // Fallback to Google Search query with tracking number & carrier name
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrierName || "เช็คพัสดุ"} ${cleanTrack}`)}`;
}
