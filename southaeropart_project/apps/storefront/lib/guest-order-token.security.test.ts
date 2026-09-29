import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateGuestOrderToken,
  verifyGuestOrderToken,
} from "./guest-order-token";

const now = Date.parse("2026-09-27T12:00:00.000Z");
const orderId = "10000000-0000-4000-8000-000000000001";
const userId = "guest_security_fixture";
const originalSecret = process.env.ORDER_TOKEN_SECRET;
beforeEach(() => {
  process.env.ORDER_TOKEN_SECRET =
    "guest-security-regression-secret-32-characters";
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => {
  vi.restoreAllMocks();
  if (originalSecret === undefined) delete process.env.ORDER_TOKEN_SECRET;
  else process.env.ORDER_TOKEN_SECRET = originalSecret;
});

describe("Guest server-side expiry and canonical token validation", () => {
  it.each([
    [-1, false],
    [0, true],
    [604800000 - 1, true],
    [604800000, false],
    [604800000 + 1, false],
  ])("valid signature at age %i ms has validity %s", (age, expected) => {
    const created = new Date(now - age);
    const token = generateGuestOrderToken(orderId, userId, created);
    expect(verifyGuestOrderToken(token, orderId, userId, created)).toBe(
      expected,
    );
  });
  it.each(["invalid_date", "999999-12-31T00:00:00Z"])(
    "rejects a correctly signed invalid timestamp: %s",
    (created) => {
      const token = generateGuestOrderToken(orderId, userId, created);
      expect(verifyGuestOrderToken(token, orderId, userId, created)).toBe(
        false,
      );
    },
  );
  it("rejects seconds mistaken for milliseconds even with a matching signature", () => {
    const created = new Date(Math.floor(now / 1000));
    expect(
      verifyGuestOrderToken(
        generateGuestOrderToken(orderId, userId, created),
        orderId,
        userId,
        created,
      ),
    ).toBe(false);
  });
  it("fails closed for an invalid Date and a non-finite clock", () => {
    expect(
      verifyGuestOrderToken("a".repeat(64), orderId, userId, new Date(NaN)),
    ).toBe(false);
    const created = new Date(now - 1000);
    const token = generateGuestOrderToken(orderId, userId, created);
    vi.mocked(Date.now).mockReturnValue(NaN);
    expect(verifyGuestOrderToken(token, orderId, userId, created)).toBe(false);
  });
  it.each([
    null,
    undefined,
    [],
    {},
    "a".repeat(1024 * 1024),
    "A".repeat(64),
    "g".repeat(64),
  ])("rejects malformed token %# without coercion", (token) => {
    expect(
      verifyGuestOrderToken(
        token as string,
        orderId,
        userId,
        new Date(now - 1000),
      ),
    ).toBe(false);
  });
  it("does not accept a token signed for another order or owner", () => {
    const created = new Date(now - 1000),
      token = generateGuestOrderToken(orderId, userId, created);
    expect(
      verifyGuestOrderToken(
        token,
        "20000000-0000-4000-8000-000000000002",
        userId,
        created,
      ),
    ).toBe(false);
    expect(verifyGuestOrderToken(token, orderId, "guest_other", created)).toBe(
      false,
    );
  });
});
