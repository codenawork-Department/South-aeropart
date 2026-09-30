import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  isActionOriginAllowed,
  inspectActionBody,
} from "@repo/lib/action-ingress";
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
  "/orders(.*)",
  "/checkout(.*)",
  "/shipping-quotes(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    if (
      req.method === "POST" &&
      req.headers.has("next-action") &&
      !isActionOriginAllowed(req.headers, req.url)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Request not permitted" },
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const bodyError = await inspectActionBody(req);
    if (bodyError)
      return NextResponse.json(
        {
          success: false,
          error: { code: bodyError.code, message: bodyError.message },
        },
        {
          status: bodyError.status,
          headers: { "Cache-Control": "no-store" },
        },
      );

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
              message:
                "คำขอเกินอัตราที่กำหนด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
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
      await auth.protect();
    }
  },
  {
    contentSecurityPolicy: {
      strict: true,
      directives: {
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://img.clerk.com",
          "https://images.clerk.dev",
          "https://lh3.googleusercontent.com",
          "https://avatars.githubusercontent.com",
        ],
        "connect-src": [
          "'self'",
          "https://api.cloudinary.com",
          "https://res.cloudinary.com",
          "https://api.stripe.com",
          "https://*.protect.clerk.com:*",
          "https://open.er-api.com",
        ],
        "frame-src": [
          "https://upload-widget.cloudinary.com",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
          "https://*.protect.clerk.com",
        ],
        "script-src": [
          "'self'",
          "https://js.stripe.com",
          "https://*.protect.clerk.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "media-src": ["'self'", "blob:", "https://res.cloudinary.com"],
        "worker-src": ["'self'", "blob:"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
      },
    },
  },
);

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
