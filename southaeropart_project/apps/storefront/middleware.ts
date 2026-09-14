import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  globalStorefrontRateLimiter,
  getClientIp,
  getRateLimitForPath,
} from "@/lib/rate-limiter";

/**
 * Clerk middleware with integrated Anti-DoS Rate Limiting for Storefront (CLAUDE.md §5.1).
 *
 * 1. Enforces tiered rate limits (60 reqs/min for API, 180 reqs/min for pages).
 * 2. Exempts cryptographically verified webhooks (Stripe & Clerk).
 * 3. Protected routes require sign-in: account, wishlist, profile, orders.
 */
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/wishlist(.*)",
  "/profile(.*)",
  "/orders$",
]);

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. Edge-level Anti-DoS Rate Limiting
  const rateLimitConfig = getRateLimitForPath(pathname);
  if (rateLimitConfig) {
    const ip = getClientIp(req);
    const result = globalStorefrontRateLimiter.check(ip, rateLimitConfig);

    if (!result.success) {
      const isApi = pathname.startsWith("/api/");
      const responseBody = isApi
        ? JSON.stringify({
            error: "Too Many Requests",
            message: "คำขอเกินอัตราที่กำหนด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
            retryAfter: result.retryAfter,
          })
        : "Too Many Requests. Please slow down.";

      return new NextResponse(responseBody, {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "Content-Type": isApi
            ? "application/json; charset=utf-8"
            : "text/plain; charset=utf-8",
        },
      });
    }
  }

  // 2. Auth Route Protection
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
