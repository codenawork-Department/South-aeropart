"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  db,
  users,
  newsletterSubscribers,
  eq,
  or,
  UserMetadata,
} from "@repo/db";

const subscribeEmailSchema = z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง");

export interface SubscriptionStatusResult {
  isLoggedIn: boolean;
  isSubscribed: boolean;
  userEmail: string | null;
}

export interface SubscribeActionResult {
  success: boolean;
  message?: string;
  error?: string;
  isSubscribed?: boolean;
}

/**
 * Check subscription status for the currently authenticated user
 */
export async function getSubscriptionStatusAction(): Promise<SubscriptionStatusResult> {
  try {
    const { userId } = auth();
    if (!userId) {
      return { isLoggedIn: false, isSubscribed: false, userEmail: null };
    }

    // 1. Check user row in DB
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const email = userRow?.email || (await currentUser())?.emailAddresses[0]?.emailAddress || null;
    const marketingConsent = userRow?.metadata?.privacyConsents?.marketingEmail ?? false;

    // 2. Also check newsletter_subscribers table
    if (email) {
      const [subscriber] = await db
        .select()
        .from(newsletterSubscribers)
        .where(
          or(
            eq(newsletterSubscribers.userId, userId),
            eq(newsletterSubscribers.email, email.toLowerCase())
          )
        )
        .limit(1);

      if (subscriber) {
        return {
          isLoggedIn: true,
          isSubscribed: subscriber.isSubscribed || marketingConsent,
          userEmail: email,
        };
      }
    }

    return {
      isLoggedIn: true,
      isSubscribed: marketingConsent,
      userEmail: email,
    };
  } catch (error) {
    console.error("[getSubscriptionStatusAction] Error:", error);
    return { isLoggedIn: false, isSubscribed: false, userEmail: null };
  }
}

/**
 * Subscribe to newsletter (Supports both Guest with input email, and Logged-in 1-Click)
 */
export async function subscribeNewsletterAction(input?: {
  email?: string;
  source?: "footer" | "homepage_banner" | "signup" | "profile" | "1click_banner";
}): Promise<SubscribeActionResult> {
  try {
    const { userId } = auth();
    const source = input?.source || (userId ? "1click_banner" : "homepage_banner");
    let targetEmail = input?.email?.trim().toLowerCase();

    // If user is logged in, prioritize user's verified email from DB/Clerk
    if (userId) {
      let [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetEmail) {
        if (!userRow) {
          const clerkUser = await currentUser();
          targetEmail = clerkUser?.emailAddresses[0]?.emailAddress?.toLowerCase();
        } else {
          targetEmail = userRow.email?.toLowerCase();
        }
      }

      if (!targetEmail) {
        return { success: false, error: "ไม่พบข้อมูลอีเมลของคุณ กรุณาลองใหม่อีกครั้ง" };
      }

      // 1. Update user metadata privacy consents
      if (userRow) {
        const existingMetadata: UserMetadata = userRow.metadata || {};
        const updatedMetadata: UserMetadata = {
          ...existingMetadata,
          privacyConsents: {
            ...existingMetadata.privacyConsents,
            marketingEmail: true,
            consentTimestamp: new Date().toISOString(),
          },
        };

        await db
          .update(users)
          .set({
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      // 2. Upsert newsletter subscriber record
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(
          or(
            eq(newsletterSubscribers.userId, userId),
            eq(newsletterSubscribers.email, targetEmail)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(newsletterSubscribers)
          .set({
            userId,
            email: targetEmail,
            isSubscribed: true,
            source,
            subscribedAt: new Date(),
            unsubscribedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(newsletterSubscribers.id, existing.id));
      } else {
        await db.insert(newsletterSubscribers).values({
          email: targetEmail,
          userId,
          isSubscribed: true,
          source,
          subscribedAt: new Date(),
        });
      }

      revalidatePath("/");
      revalidatePath("/profile");
      return {
        success: true,
        message: "ติดตามข่าวสารเรียบร้อยแล้ว",
        isSubscribed: true,
      };
    }

    // Guest Flow: validate email
    if (!targetEmail) {
      return { success: false, error: "กรุณาระบุอีเมล" };
    }

    const emailValidation = subscribeEmailSchema.safeParse(targetEmail);
    if (!emailValidation.success) {
      return {
        success: false,
        error: emailValidation.error.errors[0]?.message || "รูปแบบอีเมลไม่ถูกต้อง",
      };
    }

    const validEmail = emailValidation.data.toLowerCase();

    // Check if subscriber exists
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, validEmail))
      .limit(1);

    if (existing) {
      await db
        .update(newsletterSubscribers)
        .set({
          isSubscribed: true,
          source,
          subscribedAt: new Date(),
          unsubscribedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(newsletterSubscribers.id, existing.id));
    } else {
      await db.insert(newsletterSubscribers).values({
        email: validEmail,
        isSubscribed: true,
        source,
        subscribedAt: new Date(),
      });
    }

    revalidatePath("/");
    return {
      success: true,
      message: "ติดตามข่าวสารเรียบร้อยแล้ว",
      isSubscribed: true,
    };
  } catch (error) {
    console.error("[subscribeNewsletterAction] Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * 1-Click Unsubscribe via email link token
 */
export async function unsubscribeByTokenAction(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!token) {
      return { success: false, error: "Token ไม่ถูกต้อง" };
    }

    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.unsubscribeToken, token))
      .limit(1);

    if (!subscriber) {
      return { success: false, error: "ไม่พบข้อมูลผู้ติดตาม" };
    }

    await db
      .update(newsletterSubscribers)
      .set({
        isSubscribed: false,
        unsubscribedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));

    // If linked to user, sync marketingEmail = false
    if (subscriber.userId) {
      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, subscriber.userId))
        .limit(1);

      if (userRow) {
        const existingMetadata: UserMetadata = userRow.metadata || {};
        const updatedMetadata: UserMetadata = {
          ...existingMetadata,
          privacyConsents: {
            ...existingMetadata.privacyConsents,
            marketingEmail: false,
          },
        };

        await db
          .update(users)
          .set({
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(users.id, subscriber.userId));
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[unsubscribeByTokenAction] Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการยกเลิกการติดตาม" };
  }
}
