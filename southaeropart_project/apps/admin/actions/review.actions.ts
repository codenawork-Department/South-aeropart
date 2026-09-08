"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, reviews, products, users, adminUsers, eq, desc, and } from "@repo/db";
import { validateSession, logAuditEvent } from "@/lib/auth";

const getReviewsSchema = z.object({
  status: z.enum(["all", "pending", "approved", "rejected"]).optional().default("all"),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const updateReviewSchema = z.object({
  reviewId: z.string().uuid("รหัสรีวิวไม่ถูกต้อง"),
  status: z.enum(["approved", "rejected", "pending"]),
  reason: z.string().max(500).optional(),
});

export type GetReviewsInput = z.infer<typeof getReviewsSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Fetch reviews for admin moderation
 */
export async function getAdminReviewsAction(params?: Partial<GetReviewsInput>) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized", data: [], total: 0 };
    }

    const { status, page, limit } = getReviewsSchema.parse(params || {});
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(reviews.moderationStatus, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const reviewList = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSku: products.sku,
        userId: reviews.userId,
        userName: users.fullName,
        userEmail: users.email,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        imageUrls: reviews.imageUrls,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        moderationStatus: reviews.moderationStatus,
        moderationReason: reviews.moderationReason,
        moderatedByAdminId: reviews.moderatedByAdminId,
        moderatedAt: reviews.moderatedAt,
        moderatorName: adminUsers.fullName,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(adminUsers, eq(reviews.moderatedByAdminId, adminUsers.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: reviewList,
      page,
      limit,
    };
  } catch (error) {
    console.error("[getAdminReviewsAction] Error:", error);
    return { success: false, error: "Failed to load reviews", data: [], total: 0 };
  }
}

/**
 * Moderate customer review (approve or reject)
 */
export async function updateReviewModerationAction(input: UpdateReviewInput) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const { reviewId, status, reason } = updateReviewSchema.parse(input);

    const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    if (!existing) {
      return { success: false, error: "Review not found" };
    }

    await db
      .update(reviews)
      .set({
        moderationStatus: status,
        moderationReason: reason || null,
        moderatedByAdminId: admin.id,
        moderatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId));

    await logAuditEvent({
      adminId: admin.id,
      action: "review.moderated",
      entityType: "review",
      entityId: reviewId,
      metadata: {
        previousStatus: existing.moderationStatus,
        newStatus: status,
        reason,
      },
    });

    revalidatePath("/reviews");

    return {
      success: true,
      message: `อัปเดตสถานะรีวิวเป็น ${status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"} เรียบร้อยแล้ว`,
    };
  } catch (error) {
    console.error("[updateReviewModerationAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update review status",
    };
  }
}
