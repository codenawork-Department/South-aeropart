import crypto from "crypto";
import { cookies } from "next/headers";
import { orderTokenNowMs } from "./order-token-clock";

export const GUEST_ORDER_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey(): string {
  const secret = process.env.ORDER_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ORDER_TOKEN_SECRET must be configured and at least 32 characters");
  }
  return secret;
}

/**
 * Generates an unguessable HMAC SHA-256 token binding orderId, userId, and createdAt.
 */
export function generateGuestOrderToken(
  orderId: string,
  userId: string,
  createdAt: Date | string
): string {
  const secret = getSecretKey();
  const timeStr = typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  const payload = `guest_order:${orderId}:${userId}:${timeStr}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify the canonical signature and the signed creation time's server-side lifetime.
 */
export function verifyGuestOrderToken(
  token: string | null | undefined,
  orderId: string,
  userId: string,
  createdAt: Date | string
): boolean {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const createdMs = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
    const nowMs = orderTokenNowMs();
    const ageMs = nowMs - createdMs;
    if (!Number.isFinite(createdMs) || !Number.isFinite(nowMs) || ageMs < 0 ||
      ageMs >= GUEST_ORDER_TOKEN_TTL_SECONDS * 1000) return false;
    const expected = generateGuestOrderToken(orderId, userId, createdAt);
    const bufA = Buffer.from(token, "utf8");
    const bufB = Buffer.from(expected, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Reads guest order token from HttpOnly cookies if available in current request context.
 */
export async function getGuestTokenFromCookie(orderId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(`guest_order_${orderId}`)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Sets guest order token as an HttpOnly, SameSite=Lax cookie for seamless access during session.
 */
export async function setGuestTokenCookie(orderId: string, token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(`guest_order_${orderId}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_ORDER_TOKEN_TTL_SECONDS,
    });
  } catch {
    // Gracefully ignore when invoked outside request context
  }
}
