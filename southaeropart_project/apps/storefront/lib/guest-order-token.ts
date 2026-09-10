import crypto from "crypto";
import { cookies } from "next/headers";

function getSecretKey(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing server secret key for guest order token generation");
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
 * Validates whether the provided token matches the order's cryptographic signature.
 */
export function verifyGuestOrderToken(
  token: string | null | undefined,
  orderId: string,
  userId: string,
  createdAt: Date | string
): boolean {
  if (!token || typeof token !== "string") return false;
  try {
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
export function getGuestTokenFromCookie(orderId: string): string | null {
  try {
    const cookieStore = cookies();
    return cookieStore.get(`guest_order_${orderId}`)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Sets guest order token as an HttpOnly, SameSite=Lax cookie for seamless access during session.
 */
export function setGuestTokenCookie(orderId: string, token: string): void {
  try {
    const cookieStore = cookies();
    cookieStore.set(`guest_order_${orderId}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Gracefully ignore when invoked outside request context
  }
}
