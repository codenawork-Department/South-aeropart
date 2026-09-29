/**
 * Clock controller and time boundary evaluation (Requirement 8).
 *
 * Implements deterministic frozen clock for guest token expiry,
 * Stripe webhook signature timestamp age checks, and future skew tolerance.
 */

export const DEFAULT_FROZEN_ISO = "2026-09-24T00:00:00.000Z";
export const DEFAULT_FROZEN_SECONDS = 1790208000;
export const GUEST_TOKEN_TTL_SECONDS = 604800; // 7 days server token expiry
export const STRIPE_PAST_TOLERANCE_SECONDS = 300; // 5 minutes
export const STRIPE_FUTURE_SKEW_SECONDS = 30; // Proposed future skew tolerance

export class ClockController {
  private currentSeconds: number;

  constructor(initialSeconds: number = DEFAULT_FROZEN_SECONDS) {
    this.currentSeconds = initialSeconds;
  }

  getNowSeconds(): number {
    return this.currentSeconds;
  }

  getNowDate(): Date {
    return new Date(this.currentSeconds * 1000);
  }

  getNowIso(): string {
    return this.getNowDate().toISOString();
  }

  setSeconds(seconds: number): void {
    this.currentSeconds = seconds;
  }

  advanceSeconds(delta: number): void {
    this.currentSeconds += delta;
  }

  /**
   * Evaluates server guest token expiry.
   * A token is expired iff now >= createdAt + TTL.
   * Client-side cookie maxAge does NOT substitute for server verification.
   */
  isGuestTokenExpired(
    createdAt: string | Date | number,
    ttlSeconds = GUEST_TOKEN_TTL_SECONDS,
  ): boolean {
    let createdSeconds: number;
    if (typeof createdAt === "number") {
      createdSeconds =
        createdAt > 1e11 ? Math.floor(createdAt / 1000) : createdAt;
    } else if (typeof createdAt === "string") {
      createdSeconds = Math.floor(new Date(createdAt).getTime() / 1000);
    } else {
      createdSeconds = Math.floor(createdAt.getTime() / 1000);
    }

    if (isNaN(createdSeconds)) return true;
    return this.currentSeconds >= createdSeconds + ttlSeconds;
  }

  /**
   * Evaluates Stripe webhook signature timestamp against past tolerance (300s)
   * and proposed future skew (30s).
   */
  isStripeTimestampValid(headerTimestampSeconds: number): {
    valid: boolean;
    reason?: "expired_past" | "exceeds_future_skew" | "invalid_number";
  } {
    if (!Number.isFinite(headerTimestampSeconds)) {
      return { valid: false, reason: "invalid_number" };
    }

    const age = this.currentSeconds - headerTimestampSeconds;
    if (age > STRIPE_PAST_TOLERANCE_SECONDS) {
      return { valid: false, reason: "expired_past" };
    }
    if (
      headerTimestampSeconds - this.currentSeconds >
      STRIPE_FUTURE_SKEW_SECONDS
    ) {
      return { valid: false, reason: "exceeds_future_skew" };
    }

    return { valid: true };
  }
}
