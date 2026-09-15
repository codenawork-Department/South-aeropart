import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { abuseBuckets } from "./schema/security";

/** Shared fixed-window limiter. Database failure rejects the operation. */
export async function takeRateLimit(identity: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const key = createHash("sha256").update(identity).digest("hex");
  const expires = sql`NOW() + (${windowMs} * INTERVAL '1 millisecond')`;
  const [bucket] = await db.insert(abuseBuckets).values({ key, count: 1, expiresAt: expires })
    .onConflictDoUpdate({ target: abuseBuckets.key, set: {
      count: sql`CASE WHEN ${abuseBuckets.expiresAt} <= NOW() THEN 1 ELSE LEAST(${abuseBuckets.count} + 1, ${maxRequests + 1}) END`,
      expiresAt: sql`CASE WHEN ${abuseBuckets.expiresAt} <= NOW() THEN ${expires} ELSE ${abuseBuckets.expiresAt} END`,
    } }).returning({ count: abuseBuckets.count });
  return Boolean(bucket && bucket.count <= maxRequests);
}
