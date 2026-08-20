import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  db,
  adminUsers,
  adminSessions,
  adminAuditLogs,
  type AdminUser,
  eq,
  and,
  isNull,
  gt,
} from "@repo/db";

// ─── Constants ───

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Password Hashing ───

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}

// ─── Session Token Management (jose) ───

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a signed session token (JWT) containing the session ID.
 * The actual session data lives in the `admin_sessions` DB table;
 * the JWT is just a signed pointer to that row.
 */
async function signSessionToken(sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_MS / 1000}s`)
    .sign(getSessionSecret());
}

/**
 * Verify and decode a session token. Returns the session ID
 * or null if the token is invalid/expired.
 */
export async function verifySessionToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return (payload.sid as string) ?? null;
  } catch {
    return null;
  }
}

// ─── Session CRUD ───

/**
 * Create a new server-side session for the given admin user.
 * Stores a hash of the token in the DB so sessions can be listed
 * and revoked individually. Sets the session cookie.
 */
export async function createSession(
  adminId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Create session row first to get the ID
  const [session] = await db
    .insert(adminSessions)
    .values({
      adminId,
      tokenHash: "pending", // placeholder, updated below
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    })
    .returning({ id: adminSessions.id });

  // Sign a JWT containing the session ID
  const token = await signSessionToken(session.id);

  // Store a hash of the token so we can verify it server-side
  const tokenHash = await hash(token, 10);
  await db
    .update(adminSessions)
    .set({ tokenHash })
    .where(eq(adminSessions.id, session.id));

  // Set the HTTP-only, secure cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return session.id;
}

/**
 * Validate the current request's session cookie.
 * Returns the admin user if the session is valid, null otherwise.
 */
export async function validateSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionId = await verifySessionToken(token);
  if (!sessionId) return null;

  // Look up the session — must not be revoked and not expired
  const [session] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.id, sessionId),
        isNull(adminSessions.revokedAt),
        gt(adminSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;

  // Fetch the admin user — must be active
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.id, session.adminId), eq(adminUsers.isActive, true)))
    .limit(1);

  return admin ?? null;
}

/**
 * Revoke a specific session (log out one device).
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(eq(adminSessions.id, sessionId));
}

/**
 * Revoke all sessions for a given admin (log out everywhere).
 */
export async function revokeAllSessions(adminId: string): Promise<void> {
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.adminId, adminId), isNull(adminSessions.revokedAt)));
}

/**
 * Destroy the session cookie (client-side sign-out).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ─── Account Lockout ───

/**
 * Check if an admin account is currently locked out due to
 * too many failed login attempts.
 */
export function isAccountLocked(admin: AdminUser): boolean {
  if (admin.failedLoginAttempts < MAX_FAILED_ATTEMPTS) return false;
  if (!admin.lockedUntil) return false;
  return admin.lockedUntil > new Date();
}

/**
 * Record a failed login attempt. If the threshold is reached,
 * lock the account for LOCKOUT_DURATION_MS.
 */
export async function recordFailedLogin(adminId: string): Promise<void> {
  const [admin] = await db
    .select({ attempts: adminUsers.failedLoginAttempts })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  const newAttempts = (admin?.attempts ?? 0) + 1;
  const lockedUntil =
    newAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : null;

  await db
    .update(adminUsers)
    .set({
      failedLoginAttempts: newAttempts,
      lockedUntil,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, adminId));
}

/**
 * Reset failed login counter after a successful login.
 */
export async function resetFailedLogins(
  adminId: string,
  ip?: string
): Promise<void> {
  await db
    .update(adminUsers)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip ?? null,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, adminId));
}

// ─── Audit Logging ───

export async function logAuditEvent(params: {
  adminId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await db.insert(adminAuditLogs).values({
    adminId: params.adminId,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}
