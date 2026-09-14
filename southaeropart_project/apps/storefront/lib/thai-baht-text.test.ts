import { describe, it, expect } from "vitest";
import { thaiBahtText } from "./thai-baht-text";

describe("thaiBahtText (Legal Revenue Department Currency Text)", () => {
  it("converts zero to 'ศูนย์บาทถ้วน'", () => {
    expect(thaiBahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(thaiBahtText("0")).toBe("ศูนย์บาทถ้วน");
    expect(thaiBahtText("0.00")).toBe("ศูนย์บาทถ้วน");
  });

  it("converts simple round integer amounts with 'ถ้วน'", () => {
    expect(thaiBahtText(1)).toBe("หนึ่งบาทถ้วน");
    expect(thaiBahtText(10)).toBe("สิบบาทถ้วน");
    expect(thaiBahtText(20)).toBe("ยี่สิบบาทถ้วน");
    expect(thaiBahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(thaiBahtText(100)).toBe("หนึ่งร้อยบาทถ้วน");
    expect(thaiBahtText(1000)).toBe("หนึ่งพันบาทถ้วน");
    expect(thaiBahtText(10000)).toBe("หนึ่งหมื่นบาทถ้วน");
    expect(thaiBahtText(100000)).toBe("หนึ่งแสนบาทถ้วน");
    expect(thaiBahtText(1000000)).toBe("หนึ่งล้านบาทถ้วน");
  });

  it("converts complex amounts with tens and 'เอ็ด'", () => {
    // When tens digit is 0, 101 is "หนึ่งร้อยหนึ่งบาทถ้วน"
    expect(thaiBahtText(101)).toBe("หนึ่งร้อยหนึ่งบาทถ้วน");
    // When tens digit is non-zero, it ends with "เอ็ด"
    expect(thaiBahtText(111)).toBe("หนึ่งร้อยสิบเอ็ดบาทถ้วน");
    expect(thaiBahtText(121)).toBe("หนึ่งร้อยยี่สิบเอ็ดบาทถ้วน");
    expect(thaiBahtText(22999)).toBe("สองหมื่นสองพันเก้าร้อยเก้าสิบเก้าบาทถ้วน");
  });

  it("converts satang decimals accurately", () => {
    expect(thaiBahtText("100.50")).toBe("หนึ่งร้อยบาทห้าสิบสตางค์");
    expect(thaiBahtText("100.25")).toBe("หนึ่งร้อยบาทยี่สิบห้าสตางค์");
    expect(thaiBahtText("0.75")).toBe("ศูนย์บาทเจ็ดสิบห้าสตางค์");
    expect(thaiBahtText("107268.50")).toBe("หนึ่งแสนเจ็ดพันสองร้อยหกสิบแปดบาทห้าสิบสตางค์");
  });

  it("handles negative numbers with 'ลบ' prefix", () => {
    expect(thaiBahtText(-500)).toBe("ลบห้าร้อยบาทถ้วน");
  });

  it("handles invalid or NaN values gracefully", () => {
    expect(thaiBahtText("invalid")).toBe("ศูนย์บาทถ้วน");
  });
});
