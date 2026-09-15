import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryRateLimiter,
  getClientIp,
  getRateLimitForPath,
  RATE_LIMIT_PRESETS,
} from "./rate-limiter";

describe("Storefront Rate Limiter (CLAUDE.md §5.1, OWASP ASVS §14.4)", () => {
  let limiter: MemoryRateLimiter;

  beforeEach(() => {
    limiter = new MemoryRateLimiter(100);
  });

  describe("MemoryRateLimiter Bucket Operations", () => {
    const config = { windowMs: 60 * 1000, maxRequests: 3 };

    it("allows requests up to the max limit within the window", () => {
      const now = 1000000;
      const r1 = limiter.check("user-ip-1", config, now);
      expect(r1.success).toBe(true);
      expect(r1.count).toBe(1);
      expect(r1.remaining).toBe(2);

      const r2 = limiter.check("user-ip-1", config, now + 100);
      expect(r2.success).toBe(true);
      expect(r2.count).toBe(2);
      expect(r2.remaining).toBe(1);

      const r3 = limiter.check("user-ip-1", config, now + 200);
      expect(r3.success).toBe(true);
      expect(r3.count).toBe(3);
      expect(r3.remaining).toBe(0);
    });

    it("blocks requests that exceed the limit and returns retryAfter", () => {
      const now = 1000000;
      limiter.check("user-ip-1", config, now);
      limiter.check("user-ip-1", config, now);
      limiter.check("user-ip-1", config, now);

      // 4th request: must be blocked
      const r4 = limiter.check("user-ip-1", config, now + 5000);
      expect(r4.success).toBe(false);
      expect(r4.count).toBe(3);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfter).toBe(55); // (60000 - 5000) / 1000 = 55s
    });

    it("automatically resets the count when window has elapsed", () => {
      const now = 1000000;
      limiter.check("user-ip-1", config, now);
      limiter.check("user-ip-1", config, now);
      limiter.check("user-ip-1", config, now);

      // Next window
      const nextWindowTime = now + config.windowMs + 1;
      const resetReq = limiter.check("user-ip-1", config, nextWindowTime);
      expect(resetReq.success).toBe(true);
      expect(resetReq.count).toBe(1);
      expect(resetReq.remaining).toBe(2);
    });

    it("maintains isolated rate limit buckets for different client IPs", () => {
      const now = 1000000;
      // Exhaust IP A
      limiter.check("ip-A", config, now);
      limiter.check("ip-A", config, now);
      limiter.check("ip-A", config, now);
      expect(limiter.check("ip-A", config, now).success).toBe(false);

      // IP B should be completely unaffected
      const rB = limiter.check("ip-B", config, now);
      expect(rB.success).toBe(true);
      expect(rB.count).toBe(1);
    });

    it("prunes expired entries to prevent memory leaks", () => {
      const now = 1000000;
      limiter.check("active-ip", { windowMs: 10000, maxRequests: 5 }, now);
      limiter.check("expired-ip", { windowMs: 2000, maxRequests: 5 }, now);

      expect(limiter.size()).toBe(2);

      // Prune after 3 seconds: expired-ip should be dropped, active-ip remains
      limiter.prune(now + 3000);
      expect(limiter.size()).toBe(1);
    });
  });

  describe("getClientIp Resolution & Proxy Security", () => {
    it("ignores spoofable x-forwarded-for without a trusted proxy", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.195, 70.41.3.18, 150.172.238.178");
      const ip = getClientIp({ headers });
      expect(ip).toBe("unknown");
    });

    it("ignores spoofable x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-real-ip", "198.51.100.22");
      const ip = getClientIp({ headers });
      expect(ip).toBe("unknown");
    });

    it("falls back to request.ip when headers are empty", () => {
      const headers = new Headers();
      const ip = getClientIp({ headers, ip: "192.0.2.1" });
      expect(ip).toBe("192.0.2.1");
    });

    it("uses a shared unknown bucket without a verified source", () => {
      const headers = new Headers();
      const ip = getClientIp({ headers });
      expect(ip).toBe("unknown");
    });
  });

  describe("Path-specific Rate Limit Policy", () => {
    it("rejects new identifiers at capacity without evicting active restrictions", () => {
      const bounded = new MemoryRateLimiter(2);
      const config = { windowMs: 1000, maxRequests: 1 };
      expect(bounded.check("one", config, 0).success).toBe(true);
      expect(bounded.check("two", config, 0).success).toBe(true);
      expect(bounded.check("three", config, 0).success).toBe(false);
      expect(bounded.size()).toBe(2);
      expect(bounded.check("one", config, 0).success).toBe(false);
      expect(bounded.check("three", config, 1000).success).toBe(true);
    });
    it("exempts Stripe and Clerk webhooks from rate limiting", () => {
      expect(getRateLimitForPath("/api/webhooks/stripe")).toBeNull();
      expect(getRateLimitForPath("/api/webhooks/clerk")).toBeNull();
    });

    it("applies API preset (60 reqs/min) to API routes", () => {
      const policy = getRateLimitForPath("/api/currency/rates");
      expect(policy).toEqual(RATE_LIMIT_PRESETS.API);
      expect(policy?.maxRequests).toBe(60);
    });

    it("applies Page preset (180 reqs/min) to general pages", () => {
      const policy = getRateLimitForPath("/products/bmw-m3-g80-carbon-front-lip");
      expect(policy).toEqual(RATE_LIMIT_PRESETS.PAGE);
      expect(policy?.maxRequests).toBe(180);
    });
  });
});
