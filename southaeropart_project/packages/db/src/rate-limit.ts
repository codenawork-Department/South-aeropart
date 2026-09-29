import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { abuseBuckets } from "./schema/security";

/** Shared fixed-window limiter. Database failure rejects the operation. */
export async function takeRateLimitWithRetryAfter(
  identity: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const key = createHash("sha256").update(identity).digest("hex");
  const expires = sql`NOW() + (${windowMs} * INTERVAL '1 millisecond')`;
  const [bucket] = await db
    .insert(abuseBuckets)
    .values({ key, count: 1, expiresAt: expires })
    .onConflictDoUpdate({
      target: abuseBuckets.key,
      set: {
        count: sql`CASE WHEN ${abuseBuckets.expiresAt} <= NOW() THEN 1 ELSE LEAST(${abuseBuckets.count} + 1, ${maxRequests + 1}) END`,
        expiresAt: sql`CASE WHEN ${abuseBuckets.expiresAt} <= NOW() THEN ${expires} ELSE ${abuseBuckets.expiresAt} END`,
      },
    })
    .returning({
      count: abuseBuckets.count,
      retryAfter: sql<number>`GREATEST(1, CEIL(EXTRACT(EPOCH FROM (${abuseBuckets.expiresAt} - NOW()))))::int`,
    });
  const allowed = Boolean(bucket && bucket.count <= maxRequests);
  return {
    allowed,
    retryAfter: allowed
      ? 0
      : (bucket?.retryAfter ?? Math.ceil(windowMs / 1000)),
  };
}

export async function takeRateLimit(
  identity: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  return (await takeRateLimitWithRetryAfter(identity, maxRequests, windowMs))
    .allowed;
}
