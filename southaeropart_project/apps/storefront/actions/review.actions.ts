"use server";

import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, reviews, orders, orderItems, users, eq, and, or, inArray, desc } from "@repo/db";
import { moderateText } from "@repo/lib";
import { syncUserWithClerk } from "@/lib/user-sync";

const reviewSchema = z.object({
  reviewId: z.string().uuid().optional(),
  productId: z.string().uuid("รหัสสินค้าไม่ถูกต้อง"),
  rating: z.number().int().min(1, "กรุณาให้คะแนนอย่างน้อย 1 ดาว").max(5, "คะแนนสูงสุดคือ 5 ดาว"),
  title: z.string().max(200).optional(),
  content: z.string().min(5, "เนื้อหารีวิวต้องมีความยาวอย่างน้อย 5 ตัวอักษร").max(2000),
  imageUrls: z.array(z.string().url()).optional(),
});

export type SubmitReviewInput = z.input<typeof reviewSchema>;

/**
 * Submits a new customer product review with automated text moderation and verified purchase check.
 * Supports both creating new reviews and updating existing ones.
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
          or(
            eq(orders.paymentStatus, "paid"),
            eq(orders.status, "paid"),
            eq(orders.status, "processing"),
            eq(orders.status, "shipped"),
            eq(orders.status, "delivered")
          ),
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

    // Check for existing review by ID or for the same product
    let targetReviewId = validated.reviewId;
    if (!targetReviewId) {
      const [existingForProduct] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.productId, validated.productId), eq(reviews.userId, userId)))
        .limit(1);
      if (existingForProduct) {
        targetReviewId = existingForProduct.id;
      }
    }

    if (targetReviewId) {
      // Update existing review
      const [updated] = await db
        .update(reviews)
        .set({
          rating: validated.rating,
          title: validated.title || null,
          content: validated.content,
          imageUrls: validated.imageUrls || [],
          isVerifiedPurchase,
          moderationStatus,
          moderationReason,
          moderatedByAdminId: null,
          moderatedAt: null,
          createdAt: new Date(),
        })
        .where(and(eq(reviews.id, targetReviewId), eq(reviews.userId, userId)))
        .returning();

      return {
        success: true,
        reviewId: updated?.id || targetReviewId,
        moderationStatus,
        message:
          moderationStatus === "rejected"
            ? "รีวิวที่แก้ไขไม่ผ่านการตรวจสอบข้อความอัตโนมัติเนื่องจากมีถ้อยคำที่ไม่เหมาะสม"
            : "อัปเดตรีวิวสินค้าของคุณเรียบร้อยแล้ว!",
      };
    }

    // Insert new review
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

/**
 * Fetches reviews written by the current user for specified products.
 * Used by OrderDetail and OrdersList to display review status and edit existing reviews.
 */
export async function getUserProductReviewsAction(productIds: string[]) {
  try {
    const { userId } = auth();
    const validIds = (productIds || []).filter(Boolean);
    if (!userId || validIds.length === 0) {
      return { success: true, data: {} };
    }

    const userReviews = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        imageUrls: reviews.imageUrls,
        moderationStatus: reviews.moderationStatus,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), inArray(reviews.productId, validIds)));

    const reviewMap: Record<string, {
      id: string;
      productId: string;
      rating: number;
      title: string | null;
      content: string;
      imageUrls: string[] | null;
      moderationStatus: "pending" | "approved" | "rejected";
      createdAt: Date;
    }> = {};

    for (const rev of userReviews) {
      reviewMap[rev.productId] = rev;
    }

    return { success: true, data: reviewMap };
  } catch (error) {
    console.error("[getUserProductReviewsAction] Error:", error);
    return { success: false, data: {} };
  }
}

/**
 * Uploads an image for a customer review to Cloudinary with automated AI moderation.
 * Saves into: south-aero/reviews/{productName}
 */
export async function uploadReviewImageAction(dataUrl: string, productName?: string) {
  try {
    const { userId } = auth();
    if (!userId) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ" };
    }

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return { success: false, error: "รูปแบบไฟล์รูปภาพไม่ถูกต้อง (ต้องเป็น Data URI รูปภาพ)" };
    }

    if (dataUrl.length > 7 * 1024 * 1024) {
      return { success: false, error: "ขนาดรูปภาพต้องไม่เกิน 5MB" };
    }

    // Sanitize product name for Cloudinary folder path
    // Remove slashes/backslashes to avoid nested subdirectories
    // Strip control characters, quotes, and unsafe characters
    const cleanName = (productName || "general")
      .trim()
      .replace(/[\\/]+/g, "-")
      .replace(/["'<>|:*?]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80);

    const folderPath = `south-aero/reviews/${cleanName || "general"}`;

    const { uploadImage } = await import("@repo/lib");
    const result = await uploadImage(dataUrl, {
      folder: folderPath,
      tags: ["review", userId, cleanName || "general"],
      moderation: true,
    });

    return { success: true, secureUrl: result.secureUrl };
  } catch (error) {
    console.error("[uploadReviewImageAction] Error:", error);
    const msg =
      error instanceof Error && error.message === "IMAGE_MODERATION_REJECTED"
        ? "รูปภาพไม่ผ่านการตรวจสอบความปลอดภัยทาง AI (ตรวจพบเนื้อหาที่ไม่เหมาะสม)"
        : "ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง";
    return { success: false, error: msg };
  }
}
