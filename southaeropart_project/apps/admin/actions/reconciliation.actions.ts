"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  orders,
  adminUsers,
  paymentReconciliationJobs,
  orderStatusHistory,
  releaseOrderStock,
  eq,
  desc,
  and,
  or,
  ilike,
  sql,
} from "@repo/db";
import { getStripe } from "@repo/lib/stripe";
import { validateSession, isAccountLocked, hasRequiredRole, verifyPassword, logAuditEvent } from "@/lib/auth";

/* =========================================================================
   ZOD SCHEMAS & TYPES
   ========================================================================= */

const listReconciliationJobsSchema = z.object({
  search: z.string().optional().default(""),
  state: z
    .enum(["all", "pending_review", "refunded", "fulfilled_manually", "dismissed"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

const resolveReconciliationJobSchema = z.object({
  paymentIntentId: z.string().trim().min(1, "ระบุ Payment Intent ID"),
  action: z.enum(["refund", "fulfill_manually", "dismiss"], {
    errorMap: () => ({
      message: "การดำเนินการไม่ถูกต้อง (ต้องเป็น refund, fulfill_manually หรือ dismiss)",
    }),
  }),
  resolutionNote: z
    .string()
    .trim()
    .min(5, "กรุณาระบุบันทึกเหตุผลอย่างน้อย 5 ตัวอักษร")
    .max(2000, "บันทึกเหตุผลต้องไม่เกิน 2,000 ตัวอักษร"),
  adminPassword: z.string().optional(),
});

export type ListReconciliationJobsParams = z.infer<typeof listReconciliationJobsSchema>;
export type ResolveReconciliationJobInput = z.infer<typeof resolveReconciliationJobSchema>;

export interface ReconciliationJobItem {
  paymentIntentId: string;
  orderId: string;
  reason: string;
  state: "pending_review" | "refunded" | "fulfilled_manually" | "dismissed";
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  stripeRefundId: string | null;
  alertedAt: Date | null;
  orderNumber: string | null;
  orderTotal: string | null;
  orderCurrency: string | null;
  orderStatus: string | null;
  orderPaymentStatus: string | null;
  orderInventoryState: string | null;
  resolvedByName: string | null;
  resolvedByEmail: string | null;
}

export interface ReconciliationStateCounts {
  all: number;
  pendingReview: number;
  refunded: number;
  fulfilledManually: number;
  dismissed: number;
}

/* =========================================================================
   SERVER ACTIONS
   ========================================================================= */

/**
 * Get count of pending reconciliation jobs for sidebar badge and top alerts.
 */
export async function getPendingReconciliationCountAction(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const admin = await validateSession();
    if (!admin || isAccountLocked(admin)) {
      return { success: false, count: 0 };
    }

    const [result] = await db
      .select({
        count: sql<number>`count(*) filter (where ${paymentReconciliationJobs.state} = 'pending_review')::int`,
      })
      .from(paymentReconciliationJobs);

    return { success: true, count: result?.count || 0 };
  } catch (error) {
    console.error("[getPendingReconciliationCountAction] Error:", error);
    return { success: false, count: 0 };
  }
}

/**
 * List payment reconciliation jobs with pagination, status filtering, and search.
 * Accessible to all valid staff/admin sessions for visibility.
 */
export async function listReconciliationJobsAction(
  params?: Partial<ListReconciliationJobsParams>
): Promise<{
  success: boolean;
  error?: string;
  data: {
    items: ReconciliationJobItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    counts: ReconciliationStateCounts;
  } | null;
}> {
  try {
    const admin = await validateSession();
    if (!admin || isAccountLocked(admin)) {
      return { success: false, error: "Unauthorized หรือบัญชีถูกระงับชั่วคราว", data: null };
    }

    const { search, state, page, limit } = listReconciliationJobsSchema.parse(params || {});
    const offset = (page - 1) * limit;

    const conditions = [];

    if (state && state !== "all") {
      conditions.push(eq(paymentReconciliationJobs.state, state));
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(paymentReconciliationJobs.paymentIntentId, s),
          ilike(paymentReconciliationJobs.reason, s),
          ilike(paymentReconciliationJobs.resolutionNote, s),
          ilike(orders.orderNumber, s)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch aggregate state counts
    const [countsResult] = await db
      .select({
        all: sql<number>`count(*)::int`,
        pendingReview: sql<number>`count(*) filter (where ${paymentReconciliationJobs.state} = 'pending_review')::int`,
        refunded: sql<number>`count(*) filter (where ${paymentReconciliationJobs.state} = 'refunded')::int`,
        fulfilledManually: sql<number>`count(*) filter (where ${paymentReconciliationJobs.state} = 'fulfilled_manually')::int`,
        dismissed: sql<number>`count(*) filter (where ${paymentReconciliationJobs.state} = 'dismissed')::int`,
      })
      .from(paymentReconciliationJobs);

    const counts: ReconciliationStateCounts = {
      all: countsResult?.all || 0,
      pendingReview: countsResult?.pendingReview || 0,
      refunded: countsResult?.refunded || 0,
      fulfilledManually: countsResult?.fulfilledManually || 0,
      dismissed: countsResult?.dismissed || 0,
    };

    // Filtered count query for current view
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentReconciliationJobs)
      .leftJoin(orders, eq(paymentReconciliationJobs.orderId, orders.id))
      .where(whereClause);

    const total = countRow?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch data rows
    const rows = await db
      .select({
        paymentIntentId: paymentReconciliationJobs.paymentIntentId,
        orderId: paymentReconciliationJobs.orderId,
        reason: paymentReconciliationJobs.reason,
        state: paymentReconciliationJobs.state,
        createdAt: paymentReconciliationJobs.createdAt,
        resolvedAt: paymentReconciliationJobs.resolvedAt,
        resolvedBy: paymentReconciliationJobs.resolvedBy,
        resolutionNote: paymentReconciliationJobs.resolutionNote,
        stripeRefundId: paymentReconciliationJobs.stripeRefundId,
        alertedAt: paymentReconciliationJobs.alertedAt,
        orderNumber: orders.orderNumber,
        orderTotal: orders.total,
        orderCurrency: orders.currency,
        orderStatus: orders.status,
        orderPaymentStatus: orders.paymentStatus,
        orderInventoryState: orders.inventoryState,
        resolvedByName: adminUsers.fullName,
        resolvedByEmail: adminUsers.email,
      })
      .from(paymentReconciliationJobs)
      .leftJoin(orders, eq(paymentReconciliationJobs.orderId, orders.id))
      .leftJoin(adminUsers, eq(paymentReconciliationJobs.resolvedBy, adminUsers.id))
      .where(whereClause)
      .orderBy(desc(paymentReconciliationJobs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: {
        items: rows as ReconciliationJobItem[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        counts,
      },
    };
  } catch (error) {
    console.error("[listReconciliationJobsAction] Error:", error);
    return { success: false, error: "Failed to load reconciliation jobs", data: null };
  }
}

/**
 * Resolve a payment reconciliation job.
 * RBAC: Restricted to 'admin' and 'super_admin' roles only.
 * Actions:
 * - 'refund': Re-authenticates admin password, calls Stripe refund API, updates job & order, records audit log.
 * - 'fulfill_manually': Confirms manual fulfillment, updates job & order to processing, records audit log.
 * - 'dismiss': Dismisses anomaly as false positive / resolved externally, records audit log.
 */
export async function resolveReconciliationJobAction(
  input: ResolveReconciliationJobInput
): Promise<{ success: boolean; error?: string; refundId?: string }> {
  try {
    const admin = await validateSession();
    if (!admin || isAccountLocked(admin)) {
      return { success: false, error: "Unauthorized หรือบัญชีถูกระงับชั่วคราว" };
    }

    // RBAC: Staff role cannot execute resolutions
    if (!hasRequiredRole(admin, ["admin", "super_admin"])) {
      return {
        success: false,
        error: "สิทธิ์การใช้งานไม่เพียงพอ (เฉพาะ Admin หรือ Super Admin เท่านั้น)",
      };
    }

    const parsed = resolveReconciliationJobSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "ข้อมูลที่ส่งมาไม่ถูกต้อง",
      };
    }

    const { paymentIntentId, action, resolutionNote, adminPassword } = parsed.data;

    // Verify existing job state before taking action
    const [job] = await db
      .select()
      .from(paymentReconciliationJobs)
      .where(eq(paymentReconciliationJobs.paymentIntentId, paymentIntentId))
      .limit(1);

    if (!job) {
      return { success: false, error: "ไม่พบรายการ Reconciliation Job นี้" };
    }

    if (job.state !== "pending_review") {
      return {
        success: false,
        error: `รายการนี้ได้รับการจัดการแล้ว (สถานะปัจจุบัน: ${job.state})`,
      };
    }

    // Fetch corresponding order
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        inventoryState: orders.inventoryState,
        stripePaymentIntentId: orders.stripePaymentIntentId,
      })
      .from(orders)
      .where(eq(orders.id, job.orderId))
      .limit(1);

    // =========================================================================
    // ACTION: REFUND
    // =========================================================================
    if (action === "refund") {
      if (!adminPassword) {
        return { success: false, error: "กรุณาระบุรหัสผ่านแอดมินเพื่อยืนยันการคืนเงิน" };
      }

      const isPasswordValid = await verifyPassword(adminPassword, admin.passwordHash);
      if (!isPasswordValid) {
        return { success: false, error: "รหัสผ่านแอดมินไม่ถูกต้อง ไม่อนุญาตให้ทำรายการคืนเงิน" };
      }

      // Execute Stripe refund with static idempotency key per job
      const stripe = getStripe();
      const idempotencyKey = `reconcile_refund_${paymentIntentId}`;
      let stripeRefundId: string;

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            reason: "requested_by_customer",
            metadata: {
              reconciledByAdminId: admin.id,
              reconciledByEmail: admin.email,
              reconciliationNote: resolutionNote.substring(0, 500),
            },
          },
          { idempotencyKey }
        );
        stripeRefundId = refund.id;
      } catch (err: any) {
        console.error("[resolveReconciliationJobAction:refund] Stripe refund error:", err);
        return {
          success: false,
          error: `การคืนเงินผ่าน Stripe ล้มเหลว: ${err?.message || "Stripe API Error"}`,
        };
      }

      // Atomic DB transaction
      await db.transaction(async (tx) => {
        const [updatedJob] = await tx
          .update(paymentReconciliationJobs)
          .set({
            state: "refunded",
            resolvedAt: new Date(),
            resolvedBy: admin.id,
            resolutionNote,
            stripeRefundId,
          })
          .where(
            and(
              eq(paymentReconciliationJobs.paymentIntentId, paymentIntentId),
              eq(paymentReconciliationJobs.state, "pending_review")
            )
          )
          .returning();

        if (!updatedJob) {
          throw new Error("Job was already resolved concurrently");
        }

        if (order) {
          await tx
            .update(orders)
            .set({
              status: "refunded",
              paymentStatus: "refunded",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          // Release stock if still reserved (INV-02 Guard)
          if (order.inventoryState === "reserved") {
            await releaseOrderStock(tx, order.id);
          }

          await tx.insert(orderStatusHistory).values({
            orderId: order.id,
            status: "refunded",
            note: `คืนเงินผ่าน Stripe (${stripeRefundId}) โดย ${admin.fullName}: ${resolutionNote}`,
            changedByAdminId: admin.id,
          });
        }

        await logAuditEvent(
          {
            adminId: admin.id,
            action: "reconciliation.refunded",
            entityType: "payment_reconciliation_job",
            entityId: paymentIntentId,
            metadata: {
              orderId: job.orderId,
              orderNumber: order?.orderNumber,
              stripeRefundId,
              resolutionNote,
            },
          },
          tx
        );
      });

      revalidatePath("/orders/reconciliation");
      revalidatePath("/orders");
      if (job.orderId) revalidatePath(`/orders/${job.orderId}`);

      return { success: true, refundId: stripeRefundId };
    }

    // =========================================================================
    // ACTION: FULFILL MANUALLY
    // =========================================================================
    if (action === "fulfill_manually") {
      await db.transaction(async (tx) => {
        const [updatedJob] = await tx
          .update(paymentReconciliationJobs)
          .set({
            state: "fulfilled_manually",
            resolvedAt: new Date(),
            resolvedBy: admin.id,
            resolutionNote,
          })
          .where(
            and(
              eq(paymentReconciliationJobs.paymentIntentId, paymentIntentId),
              eq(paymentReconciliationJobs.state, "pending_review")
            )
          )
          .returning();

        if (!updatedJob) {
          throw new Error("Job was already resolved concurrently");
        }

        if (order) {
          await tx
            .update(orders)
            .set({
              status: "processing",
              paymentStatus: "paid",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          await tx.insert(orderStatusHistory).values({
            orderId: order.id,
            status: "processing",
            note: `อนุมัติส่งมอบด้วยตนเอง (Manual Fulfillment) โดย ${admin.fullName}: ${resolutionNote}`,
            changedByAdminId: admin.id,
          });
        }

        await logAuditEvent(
          {
            adminId: admin.id,
            action: "reconciliation.fulfilled_manually",
            entityType: "payment_reconciliation_job",
            entityId: paymentIntentId,
            metadata: {
              orderId: job.orderId,
              orderNumber: order?.orderNumber,
              resolutionNote,
            },
          },
          tx
        );
      });

      revalidatePath("/orders/reconciliation");
      revalidatePath("/orders");
      if (job.orderId) revalidatePath(`/orders/${job.orderId}`);

      return { success: true };
    }

    // =========================================================================
    // ACTION: DISMISS
    // =========================================================================
    if (action === "dismiss") {
      await db.transaction(async (tx) => {
        const [updatedJob] = await tx
          .update(paymentReconciliationJobs)
          .set({
            state: "dismissed",
            resolvedAt: new Date(),
            resolvedBy: admin.id,
            resolutionNote,
          })
          .where(
            and(
              eq(paymentReconciliationJobs.paymentIntentId, paymentIntentId),
              eq(paymentReconciliationJobs.state, "pending_review")
            )
          )
          .returning();

        if (!updatedJob) {
          throw new Error("Job was already resolved concurrently");
        }

        await logAuditEvent(
          {
            adminId: admin.id,
            action: "reconciliation.dismissed",
            entityType: "payment_reconciliation_job",
            entityId: paymentIntentId,
            metadata: {
              orderId: job.orderId,
              orderNumber: order?.orderNumber,
              resolutionNote,
            },
          },
          tx
        );
      });

      revalidatePath("/orders/reconciliation");
      revalidatePath("/orders");
      if (job.orderId) revalidatePath(`/orders/${job.orderId}`);

      return { success: true };
    }

    return { success: false, error: "ไม่พบการดำเนินการที่ระบุ" };
  } catch (error: any) {
    console.error("[resolveReconciliationJobAction] Error:", error);
    return {
      success: false,
      error: error?.message || "เกิดข้อผิดพลาดในการจัดการรายการ Reconciliation",
    };
  }
}
