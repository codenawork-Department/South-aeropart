import { describe, it, expect } from "vitest";
import { moderateText } from "./text-moderation";

/**
 * Unit tests for moderateText() — CLAUDE.md §5.5 / Rule 4
 *
 * Validates that the profanity filter correctly catches Thai and English
 * profanity while allowing normal text. Pure function — no DB or network.
 */
describe("moderateText", () => {
  // --- Clean text ---

  it("returns clean: true for normal Thai text", async () => {
    const result = await moderateText("สินค้าดีมาก คุณภาพเยี่ยม ส่งเร็ว");
    expect(result.clean).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns clean: true for normal English text", async () => {
    const result = await moderateText("Great product, fast shipping!");
    expect(result.clean).toBe(true);
  });

  it("returns clean: true for empty string", async () => {
    const result = await moderateText("");
    expect(result.clean).toBe(true);
  });

  // --- English profanity ---

  it("detects English profanity (case-insensitive)", async () => {
    const result = await moderateText("This is SHIT quality");
    expect(result.clean).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("detects English profanity embedded in sentence", async () => {
    const result = await moderateText("What the fuck is this product");
    expect(result.clean).toBe(false);
  });

  // --- Thai profanity ---

  it("detects Thai profanity: ควย", async () => {
    const result = await moderateText("ของห่วยควยมาก");
    expect(result.clean).toBe(false);
  });

  it("detects Thai profanity: เหี้ย", async () => {
    const result = await moderateText("พ่อค้าเหี้ย โกงลูกค้า");
    expect(result.clean).toBe(false);
  });

  it("detects Thai profanity: เย็ด", async () => {
    const result = await moderateText("เย็ดแม่มึง");
    expect(result.clean).toBe(false);
  });

  it("detects Thai profanity: ระยำ", async () => {
    const result = await moderateText("ไอ้ระยำ");
    expect(result.clean).toBe(false);
  });

  // --- Edge cases ---

  it("handles null-ish input gracefully", async () => {
    // The function checks `if (!text || typeof text !== "string")`
    const result = await moderateText(null as unknown as string);
    expect(result.clean).toBe(true);
  });

  it("handles undefined input gracefully", async () => {
    const result = await moderateText(undefined as unknown as string);
    expect(result.clean).toBe(true);
  });

  it("detects scam keyword", async () => {
    const result = await moderateText("This shop is a scam, avoid it!");
    expect(result.clean).toBe(false);
  });
});
