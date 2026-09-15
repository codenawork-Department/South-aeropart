import { randomUUID } from "node:crypto";
import { db, orderEmailJobs, and, eq, isNull, lte, or, sql } from "@repo/db";
import { sendOrderConfirmationEmail } from "./order-email";

export async function dispatchOrderEmailJob(orderId: string) {
  const leaseId = randomUUID();
  const now = new Date();
  const [job] = await db.update(orderEmailJobs).set({
    leaseId, leaseExpiresAt: new Date(Date.now() + 5 * 60000),
    attempts: sql`${orderEmailJobs.attempts} + 1`,
  }).where(and(eq(orderEmailJobs.orderId, orderId), isNull(orderEmailJobs.sentAt),
    lte(orderEmailJobs.nextAttemptAt, now),
    or(isNull(orderEmailJobs.leaseExpiresAt), lte(orderEmailJobs.leaseExpiresAt, now))))
    .returning({ attempts: orderEmailJobs.attempts });
  if (!job) return;
  const result = await sendOrderConfirmationEmail(orderId);
  await db.update(orderEmailJobs).set({
    leaseId: null, leaseExpiresAt: null,
    ...(result.success ? { sentAt: new Date() } : { nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7)) * 1000) }),
  }).where(and(eq(orderEmailJobs.orderId, orderId), eq(orderEmailJobs.leaseId, leaseId)));
}
