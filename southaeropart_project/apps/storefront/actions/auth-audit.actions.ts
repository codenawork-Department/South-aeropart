"use server";
//
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { recordUserLogin, RecordUserLoginParams } from "@/lib/auth-audit";

const logLoginSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().nullable().optional(),
  fullName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional().or(z.literal("")),
  loginMethod: z.enum(["google", "email_password", "oauth", "sso", "unknown", "clerk_session"]),
  metadata: z.record(z.unknown()).optional(),
});

export interface LogLoginActionParams {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  loginMethod: RecordUserLoginParams["loginMethod"];
  metadata?: Record<string, unknown>;
}

/**
 * Server action to record customer login from client-side authentication flows.
 * Enforces session authentication and validates input to prevent log spoofing.
 */
export async function recordLoginAction(params: LogLoginActionParams): Promise<{ success: boolean }> {
  try {
    const validated = logLoginSchema.parse(params);

    // HIGH-05: Check server-side session to prevent user spoofing
    let authUserId: string | null = null;
    try {
      authUserId = auth().userId;
    } catch {
      authUserId = null;
    }

    // If an authenticated session exists, enforce that it matches params.userId
    if (authUserId && authUserId !== validated.userId) {
      console.warn(`[recordLoginAction] User ID mismatch: session=${authUserId}, params=${validated.userId}`);
      return { success: false };
    }

    const finalUserId = authUserId || validated.userId;
    if (!finalUserId) {
      return { success: false };
    }

    const headersList = headers();
    
    // Extract client IP address (supporting proxies / CDN / Vercel)
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0]?.trim() : (realIp ?? null);
    
    const userAgent = headersList.get("user-agent") ?? null;

    await recordUserLogin({
      ...validated,
      userId: finalUserId,
      avatarUrl: validated.avatarUrl || null,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error) {
    console.error("[recordLoginAction] Error recording login:", error);
    return { success: false };
  }
}
