import { db, users, userLoginLogs, eq } from "@repo/db";

export interface RecordUserLoginParams {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  loginMethod: "google" | "email_password" | "oauth" | "sso" | "unknown" | "clerk_session";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records a customer login event into Neon.tech PostgreSQL.
 *
 * 1. Upserts the `users` record to ensure user profile exists in Neon.
 * 2. Updates `last_login_at`, `last_login_ip`, `last_login_method` on `users`.
 * 3. Appends a new immutable audit record into `user_login_logs`.
 */
export async function recordUserLogin(params: RecordUserLoginParams): Promise<void> {
  const {
    userId,
    email,
    fullName,
    avatarUrl,
    loginMethod,
    ipAddress,
    userAgent,
    metadata = {},
  } = params;

  try {
    const now = new Date();

    // 1. Ensure user exists or upsert user profile
    if (email) {
      await db
        .insert(users)
        .values({
          id: userId,
          email,
          fullName: fullName || null,
          avatarUrl: avatarUrl || null,
          lastLoginAt: now,
          lastLoginIp: ipAddress || null,
          lastLoginMethod: loginMethod,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email,
            ...(fullName ? { fullName } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
            lastLoginAt: now,
            ...(ipAddress ? { lastLoginIp: ipAddress } : {}),
            lastLoginMethod: loginMethod,
            updatedAt: now,
          },
        });
    } else {
      // If email is not provided, update existing user record
      await db
        .update(users)
        .set({
          lastLoginAt: now,
          ...(ipAddress ? { lastLoginIp: ipAddress } : {}),
          lastLoginMethod: loginMethod,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    }

    // 2. Insert immutable login log
    await db.insert(userLoginLogs).values({
      userId,
      loginMethod,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: {
        ...metadata,
        timestamp: now.toISOString(),
      },
      createdAt: now,
    });

    console.log(`[AuthAudit] Recorded login for user ${userId} via ${loginMethod} (IP: ${ipAddress || "unknown"})`);
  } catch (error) {
    // Log error but do not break customer login flow
    console.error("[AuthAudit] Failed to record user login history:", error);
  }
}
