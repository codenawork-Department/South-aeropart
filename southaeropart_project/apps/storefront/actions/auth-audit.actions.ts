"use server";
//
import { headers } from "next/headers";
import { recordUserLogin, RecordUserLoginParams } from "@/lib/auth-audit";

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
 * Automatically inspects incoming request headers for client IP and User-Agent.
 */
export async function recordLoginAction(params: LogLoginActionParams): Promise<{ success: boolean }> {
  try {
    const headersList = headers();
    
    // Extract client IP address (supporting proxies / CDN / Vercel)
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0]?.trim() : (realIp ?? null);
    
    const userAgent = headersList.get("user-agent") ?? null;

    await recordUserLogin({
      ...params,
      ipAddress,
      userAgent,
    });

    return { success: true };
  } catch (error) {
    console.error("[recordLoginAction] Error recording login:", error);
    return { success: false };
  }
}
