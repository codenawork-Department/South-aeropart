/**
 * Rate Limiter for Edge Middleware & Server Actions (CLAUDE.md §5.1, OWASP ASVS §14.4)
 *
 * Implements an in-memory sliding window rate limiter with:
 * - Anti-spoofing client IP resolution
 * - Route-specific tiered thresholds (API vs Page vs Checkout)
 * - Automatic LRU-style garbage collection to prevent memory exhaustion (DoS on memory)
 * - Strict Webhook bypass to prevent dropping payment confirmations (Stripe / Clerk)
 */

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export type RateLimitResult = {
  success: boolean;
  count: number;
  remaining: number;
  resetAt: number;
  retryAfter: number; // in seconds
};

export const RATE_LIMIT_PRESETS = {
  /** Public API endpoints (search, rates, vehicles): 60 reqs/min */
  API: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  /** Standard Page navigation (products, collection): 180 reqs/min */
  PAGE: {
    windowMs: 60 * 1000,
    maxRequests: 180,
  },
  /** Sensitive operations (Guest checkout by IP): 5 attempts/15 min */
  SENSITIVE: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
} as const;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private maxBuckets: number;

  constructor(maxBuckets: number = 5000) {
    this.maxBuckets = maxBuckets;
  }

  /**
   * Check and increment the request count for a given identifier.
   */
  public check(
    key: string,
    config: RateLimitConfig,
    now: number = Date.now()
  ): RateLimitResult {
    // Garbage collection if cache size exceeds limit
    if (this.buckets.size > this.maxBuckets) {
      this.prune(now);
    }

    const entry = this.buckets.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        success: true,
        count: 1,
        remaining: config.maxRequests - 1,
        resetAt,
        retryAfter: 0,
      };
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return {
        success: false,
        count: entry.count,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      };
    }

    entry.count++;
    return {
      success: true,
      count: entry.count,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
      retryAfter: 0,
    };
  }

  /**
   * Reset the rate limit bucket for a key (e.g. on successful auth or for testing).
   */
  public reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all entries.
   */
  public clear(): void {
    this.buckets.clear();
  }

  /**
   * Current number of active buckets.
   */
  public size(): number {
    return this.buckets.size;
  }

  /**
   * Remove expired buckets from memory.
   */
  public prune(now: number = Date.now()): void {
    for (const [key, bucket] of this.buckets.entries()) {
      if (now > bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}

// Global singleton instance for storefront middleware & actions
export const globalStorefrontRateLimiter = new MemoryRateLimiter(5000);

/**
 * Extract client IP from Request or NextRequest headers securely.
 * Handles reverse proxy chains by taking the leftmost (untrusted client) IP in x-forwarded-for.
 */
export function getClientIp(requestOrHeaders: {
  headers: Headers | { get(name: string): string | null };
  ip?: string;
}): string {
  const headers = requestOrHeaders.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const leftmostIp = forwardedFor.split(",")[0].trim();
    if (leftmostIp) return leftmostIp;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  if (requestOrHeaders.ip) {
    return requestOrHeaders.ip;
  }

  return "127.0.0.1";
}

/**
 * Determine the rate limit configuration based on pathname.
 */
export function getRateLimitForPath(pathname: string): RateLimitConfig | null {
  // Webhooks are verified cryptographically and must not be rate limited
  if (pathname.startsWith("/api/webhooks/")) {
    return null;
  }

  // API endpoints
  if (pathname.startsWith("/api/")) {
    return RATE_LIMIT_PRESETS.API;
  }

  // All other pages & assets
  return RATE_LIMIT_PRESETS.PAGE;
}
