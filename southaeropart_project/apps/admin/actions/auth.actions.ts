"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, adminUsers, eq, sql } from "@repo/db";
import {
  hashPassword,
  verifyPassword,
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogins,
  createSession,
  clearSessionCookie,
  revokeAllSessions,
  validateSession,
  logAuditEvent,
} from "@/lib/auth";

// ─── Validation Schemas ───

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "กรุณากรอก Email")
    .email("รูปแบบ Email ไม่ถูกต้อง")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "กรุณากรอก Password"),
});

const setupSchema = z.object({
  fullName: z
    .string()
    .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(100, "ชื่อยาวเกินไป")
    .trim(),
  email: z
    .string()
    .min(1, "กรุณากรอก Email")
    .email("รูปแบบ Email ไม่ถูกต้อง")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(12, "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร")
    .regex(/[A-Z]/, "ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว")
    .regex(/[a-z]/, "ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว")
    .regex(/[0-9]/, "ต้องมีตัวเลขอย่างน้อย 1 ตัว")
    .regex(/[^A-Za-z0-9]/, "ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว"),
  confirmPassword: z
    .string()
    .min(1, "กรุณายืนยันรหัสผ่าน"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});

// ─── Types ───

export type AuthActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  lockoutMinutes?: number;
};

// ─── Login Action ───

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  // 1) Validate input
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "กรุณากรอกข้อมูลให้ถูกต้อง",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;

  // 2) Find admin by email
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (!admin) {
    // Generic error — don't reveal whether email exists
    await logAuditEvent({
      adminId: null,
      action: "admin.login_failed",
      metadata: { reason: "email_not_found", email },
    });
    return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // 3) Check if account is active
  if (!admin.isActive) {
    await logAuditEvent({
      adminId: admin.id,
      action: "admin.login_failed",
      metadata: { reason: "account_disabled" },
    });
    return { success: false, error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  // 4) Check lockout
  if (isAccountLocked(admin)) {
    const remainingMs = admin.lockedUntil!.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    await logAuditEvent({
      adminId: admin.id,
      action: "admin.login_failed",
      metadata: { reason: "account_locked", remainingMinutes },
    });
    return {
      success: false,
      error: `บัญชีถูกล็อคชั่วคราว กรุณารออีก ${remainingMinutes} นาที`,
      lockoutMinutes: remainingMinutes,
    };
  }

  // 5) Verify password
  const isValid = await verifyPassword(password, admin.passwordHash);
  if (!isValid) {
    await recordFailedLogin(admin.id);
    const attemptsLeft = 5 - (admin.failedLoginAttempts + 1);

    await logAuditEvent({
      adminId: admin.id,
      action: "admin.login_failed",
      metadata: { reason: "wrong_password", attemptsBeforeLock: Math.max(0, attemptsLeft) },
    });

    if (attemptsLeft <= 0) {
      return {
        success: false,
        error: "เข้าสู่ระบบผิดพลาดครบ 5 ครั้ง บัญชีถูกล็อคเป็นเวลา 15 นาที",
        lockoutMinutes: 15,
      };
    }

    return {
      success: false,
      error: `อีเมลหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${attemptsLeft} ครั้ง)`,
    };
  }

  // 6) Reset failed login counter
  await resetFailedLogins(admin.id);

  // 7) Create session
  await createSession(admin.id);

  // 8) Audit log
  await logAuditEvent({
    adminId: admin.id,
    action: "admin.login_success",
    metadata: { role: admin.role },
  });

  // 9) Redirect to dashboard
  redirect("/");
}

// ─── Logout Action ───

export async function logoutAction(): Promise<void> {
  const admin = await validateSession();

  if (admin) {
    // Revoke all sessions for safety
    await revokeAllSessions(admin.id);

    await logAuditEvent({
      adminId: admin.id,
      action: "admin.logout",
    });
  }

  await clearSessionCookie();
  redirect("/login");
}

// ─── Setup Super Admin Action ───

export async function setupSuperAdminAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  // 1) Guard: Check if any admin already exists
  const [existingCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(adminUsers);

  if (existingCount.count > 0) {
    return {
      success: false,
      error: "ระบบมี Admin อยู่แล้ว ไม่สามารถสร้างซ้ำได้",
    };
  }

  // 2) Validate input
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "กรุณากรอกข้อมูลให้ถูกต้อง",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { fullName, email, password } = parsed.data;

  // 3) Hash the password
  const passwordHash = await hashPassword(password);

  // 4) Insert the super admin
  const [superAdmin] = await db
    .insert(adminUsers)
    .values({
      email,
      passwordHash,
      fullName,
      role: "super_admin",
      isActive: true,
      passwordChangedAt: new Date(),
    })
    .returning({ id: adminUsers.id });

  // 5) Audit log
  await logAuditEvent({
    adminId: superAdmin.id,
    action: "admin.super_admin_created",
    entityType: "admin_user",
    entityId: superAdmin.id,
    metadata: { email, fullName },
  });

  return {
    success: true,
  };
}
