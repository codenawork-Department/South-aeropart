import { describe, it, expect } from "vitest";
import { getCarrierTrackingUrl } from "./carrier";

/**
 * Unit tests for getCarrierTrackingUrl()
 *
 * Validates that each Thai carrier produces the correct tracking URL
 * and that tracking numbers are properly encoded. Pure function — no network.
 */
describe("getCarrierTrackingUrl", () => {
  const TRACK_NUM = "TH123456789";

  // --- Known carriers ---

  it("returns Kerry Express tracking URL", () => {
    const url = getCarrierTrackingUrl("Kerry Express", TRACK_NUM);
    expect(url).toContain("kerryexpress.com");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns Flash Express tracking URL", () => {
    const url = getCarrierTrackingUrl("Flash Express", TRACK_NUM);
    expect(url).toContain("flashexpress.co.th");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns Thailand Post tracking URL for 'ems'", () => {
    const url = getCarrierTrackingUrl("EMS", TRACK_NUM);
    expect(url).toContain("thailandpost.co.th");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns Thailand Post tracking URL for 'ไปรษณีย์'", () => {
    const url = getCarrierTrackingUrl("ไปรษณีย์ไทย", TRACK_NUM);
    expect(url).toContain("thailandpost.co.th");
  });

  it("returns J&T Express tracking URL", () => {
    const url = getCarrierTrackingUrl("J&T Express", TRACK_NUM);
    expect(url).toContain("jtexpress.co.th");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns DHL tracking URL", () => {
    const url = getCarrierTrackingUrl("DHL Express", TRACK_NUM);
    expect(url).toContain("dhl.com");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns SCG Express tracking URL", () => {
    const url = getCarrierTrackingUrl("SCG Express", TRACK_NUM);
    expect(url).toContain("scgexpress.co.th");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns Ninja Van tracking URL", () => {
    const url = getCarrierTrackingUrl("Ninja Van", TRACK_NUM);
    expect(url).toContain("ninjavan.co");
    expect(url).toContain(TRACK_NUM);
  });

  it("returns Best Express tracking URL", () => {
    const url = getCarrierTrackingUrl("Best Express", TRACK_NUM);
    expect(url).toContain("best-inc.co.th");
    expect(url).toContain(TRACK_NUM);
  });

  // --- Fallback ---

  it("returns Google search URL for unknown carrier", () => {
    const url = getCarrierTrackingUrl("Unknown Carrier", TRACK_NUM);
    expect(url).toContain("google.com/search");
    expect(url).toContain(TRACK_NUM);
  });

  // --- Edge cases ---

  it("returns null when tracking number is not provided", () => {
    expect(getCarrierTrackingUrl("Kerry Express", null)).toBeNull();
    expect(getCarrierTrackingUrl("Kerry Express", undefined)).toBeNull();
    expect(getCarrierTrackingUrl("Kerry Express", "")).toBeNull();
  });

  it("encodes special characters in tracking number", () => {
    const specialTrack = "TH 123/456+789";
    const url = getCarrierTrackingUrl("Kerry Express", specialTrack);
    // Should contain encoded version, not raw special characters in query
    expect(url).toBeDefined();
    expect(url).not.toBeNull();
    // The raw slash should be encoded
    expect(url).toContain(encodeURIComponent(specialTrack.trim()));
  });

  it("handles case-insensitive carrier names", () => {
    const url = getCarrierTrackingUrl("KERRY EXPRESS", TRACK_NUM);
    expect(url).toContain("kerryexpress.com");
  });
});
