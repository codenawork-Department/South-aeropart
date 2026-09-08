"use server";

import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, reviews, orders, orderItems, users, eq, and, desc } from "@repo/db";
import { moderateText } from "@repo/lib";
import { syncUserWithClerk } from "@/lib/user-sync";

const reviewSchema = z.object({
  productId: z.string().uuid("รหัสสินค้าไม่ถูกต้อง"),
  rating: z.number().int().min(1, "กรุณาให้คะแนนอย่างน้อย 1 ดาว").max(5, "คะแนนสูงสุดคือ 5 ดาว"),
  title: z.string().max(200).optional(),
  content: z.string().min(5, "เนื้อหารีวิวต้องมีความยาวอย่างน้อย 5 ตัวอักษร").max(2000),
  imageUrls: z.array(z.string().url()).optional(),
});

export type SubmitReviewInput = z.input<typeof reviewSchema>;

/**
 * Submits a new customer product review with automated text moderation and verified purchase check.
 */
export async function submitReview(input: SubmitReviewInput) {
  try {
    const validated = reviewSchema.parse(input);

    const { userId } = auth();
    if (!userId) {
      return {
        success: false,
        error: "กรุณาเข้าสู่ระบบก่อนเขียนรีวิวสินค้า",
      };
    }

    // Ensure user profile exists in database
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existingUser) {
      let clerkUser = null;
      try {
        clerkUser = await currentUser();
      } catch {
        clerkUser = null;
      }
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `user_${userId}@example.com`;
      const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "Customer";
      
      await syncUserWithClerk({
        userId,
        email,
        fullName,
        phone: null,
        avatarUrl: clerkUser?.imageUrl || null,
      });
    }

    // Check if user has purchased this product (Verified Purchase)
    const [purchaseRecord] = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.paymentStatus, "paid"),
          eq(orderItems.productId, validated.productId)
        )
      )
      .limit(1);

    const isVerifiedPurchase = Boolean(purchaseRecord);

    // Automated Profanity & Inappropriate Language Moderation
    const contentMod = await moderateText(validated.content);
    const titleMod = validated.title ? await moderateText(validated.title) : { clean: true };

    let moderationStatus: "pending" | "rejected" | "approved" = "pending";
    let moderationReason: string | null = null;

    if (!contentMod.clean || !titleMod.clean) {
      moderationStatus = "rejected";
      moderationReason = contentMod.reason || titleMod.reason || "ข้อความมีเนื้อหาที่ไม่เหมาะสม";
    }

    const [createdReview] = await db
      .insert(reviews)
      .values({
        productId: validated.productId,
        userId,
        rating: validated.rating,
        title: validated.title || null,
        content: validated.content,
        imageUrls: validated.imageUrls || [],
        isVerifiedPurchase,
        moderationStatus,
        moderationReason,
      })
      .returning();

    return {
      success: true,
      reviewId: createdReview.id,
      moderationStatus,
      message:
        moderationStatus === "rejected"
          ? "รีวิวของคุณไม่ผ่านการตรวจสอบข้อความอัตโนมัติเนื่องจากมีถ้อยคำที่ไม่เหมาะสม"
          : "ขอบคุณสำหรับรีวิว! ระบบได้รับความคิดเห็นของคุณแล้ว และจะแสดงผลหลังจากผ่านการตรวจสอบจากทีมงาน",
    };
  } catch (error) {
    console.error("[submitReview] Error:", error);
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors[0]?.message : "เกิดข้อผิดพลาดในการส่งรีวิว",
    };
  }
}

/**
 * Retrieves approved customer reviews for a given product.
 */
export async function getProductReviews(productId: string) {
  try {
    z.string().uuid().parse(productId);

    const productReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        imageUrls: reviews.imageUrls,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        createdAt: reviews.createdAt,
        userFullName: users.fullName,
        userAvatarUrl: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.productId, productId),
          eq(reviews.moderationStatus, "approved")
        )
      )
      .orderBy(desc(reviews.createdAt));

    return {
      success: true,
      data: productReviews,
    };
  } catch (error) {
    console.error("[getProductReviews] Error:", error);
    return { success: false, error: "Failed to fetch reviews", data: [] };
  }
}
