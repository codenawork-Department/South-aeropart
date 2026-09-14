import { describe, it, expect, beforeAll } from "vitest";
import {
  generateGuestOrderToken,
  verifyGuestOrderToken,
} from "./guest-order-token";

beforeAll(() => {
  process.env.ORDER_TOKEN_SECRET = "test_guest_order_hmac_secret_key_12345";
});

describe("guest-order-token (IDOR & Cryptographic Signature Defense)", () => {
  const mockOrderId = "order-550e8400-e29b-41d4-a716-446655440000";
  const mockUserId = "guest_user_12345";
  const mockDate = new Date("2026-09-14T10:00:00.000Z");

  it("generates deterministic HMAC SHA-256 token for identical inputs", () => {
    const token1 = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const token2 = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);

    expect(token1).toBeTruthy();
    expect(token1).toHaveLength(64); // SHA-256 hex string length
    expect(token1).toBe(token2);
  });

  it("verifies valid token returns true", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const isValid = verifyGuestOrderToken(token, mockOrderId, mockUserId, mockDate);

    expect(isValid).toBe(true);
  });

  it("accepts string createdAt format equivalent to ISO string", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const isValid = verifyGuestOrderToken(
      token,
      mockOrderId,
      mockUserId,
      mockDate.toISOString()
    );

    expect(isValid).toBe(true);
  });

  it("rejects tampered token (single character change)", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    // Tamper the first character
    const tamperedToken = (token[0] === "a" ? "b" : "a") + token.slice(1);

    const isValid = verifyGuestOrderToken(
      tamperedToken,
      mockOrderId,
      mockUserId,
      mockDate
    );
    expect(isValid).toBe(false);
  });

  it("prevents IDOR: rejects token if attacker changes orderId", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const differentOrderId = "order-attacker-target-id-99999";

    const isValid = verifyGuestOrderToken(
      token,
      differentOrderId,
      mockUserId,
      mockDate
    );
    expect(isValid).toBe(false);
  });

  it("prevents cross-user hijacking: rejects token if userId differs", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const differentUserId = "victim_user_99999";

    const isValid = verifyGuestOrderToken(
      token,
      mockOrderId,
      differentUserId,
      mockDate
    );
    expect(isValid).toBe(false);
  });

  it("rejects token if createdAt timestamp differs", () => {
    const token = generateGuestOrderToken(mockOrderId, mockUserId, mockDate);
    const differentDate = new Date("2026-09-14T11:00:00.000Z");

    const isValid = verifyGuestOrderToken(
      token,
      mockOrderId,
      mockUserId,
      differentDate
    );
    expect(isValid).toBe(false);
  });

  it("handles null, undefined, empty, or wrong-length tokens gracefully", () => {
    expect(verifyGuestOrderToken(null, mockOrderId, mockUserId, mockDate)).toBe(false);
    expect(verifyGuestOrderToken(undefined, mockOrderId, mockUserId, mockDate)).toBe(false);
    expect(verifyGuestOrderToken("", mockOrderId, mockUserId, mockDate)).toBe(false);
    expect(verifyGuestOrderToken("short_token", mockOrderId, mockUserId, mockDate)).toBe(false);
  });
});
