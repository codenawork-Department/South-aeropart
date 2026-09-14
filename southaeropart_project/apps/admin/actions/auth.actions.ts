"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, adminUsers, eq, sql, rawSql } from "@repo/db";
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
import {
  createMfaChallengeToken,
  verifyMfaChallengeToken,
  decryptMfaSecret,
  verifyTotp,
  verifyAndConsumeRecoveryCode,
  generateMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  getTotpUri,
} from "@/lib/mfa";

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
    .min(1, "กรุณากรอก Password")
    .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร"),
});

const verifyMfaSchema = z.object({
  mfaToken: z.string().min(1, "MFA token is required"),
  code: z.string().min(1, "กรุณากรอกรหัส OTP หรือ Recovery Code").trim(),
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
    .max(72, "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร")
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
  requiresMfa?: boolean;
  mfaToken?: string;
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
      metadata: { reason: "email_not_found" },
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

  // 6) Check MFA requirement (OWASP ASVS §2.8)
  if (admin.mfaEnabled && admin.mfaSecretEncrypted) {
    const mfaToken = await createMfaChallengeToken(admin.id);
    await logAuditEvent({
      adminId: admin.id,
      action: "admin.login_mfa_challenge_issued",
      metadata: { role: admin.role },
    });
    return {
      success: true,
      requiresMfa: true,
      mfaToken,
    };
  }

  // 7) Reset failed login counter
  await resetFailedLogins(admin.id);

  // 8) Create session
  await createSession(admin.id);

  // 9) Audit log
  await logAuditEvent({
    adminId: admin.id,
    action: "admin.login_success",
    metadata: { role: admin.role },
  });

  // 10) Redirect to dashboard
  redirect("/");
}

// ─── Verify MFA Action ───

export async function verifyMfaAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    mfaToken: formData.get("mfaToken"),
    code: formData.get("code"),
  };

  const parsed = verifyMfaSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "กรุณากรอกรหัส OTP หรือ Recovery Code ให้ครบถ้วน",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { mfaToken, code } = parsed.data;

  // 1) Verify ephemeral challenge token
  const adminId = await verifyMfaChallengeToken(mfaToken);
  if (!adminId) {
    return {
      success: false,
      error: "เซสชัน MFA หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
    };
  }

  // 2) Get admin
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  if (!admin || !admin.isActive) {
    return { success: false, error: "บัญชีไม่ถูกต้องหรือถูกปิดใช้งาน" };
  }

  // 3) Check lockout
  if (isAccountLocked(admin)) {
    const remainingMs = admin.lockedUntil!.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      success: false,
      error: `บัญชีถูกล็อคชั่วคราว กรุณารออีก ${remainingMinutes} นาที`,
      lockoutMinutes: remainingMinutes,
    };
  }

  // 4) Check TOTP (if 6 digits)
  const normalizedCode = code.trim();
  let verified = false;
  let method: "totp" | "recovery_code" = "totp";

  if (/^\d{6}$/.test(normalizedCode) && admin.mfaSecretEncrypted) {
    try {
      const secret = decryptMfaSecret(admin.mfaSecretEncrypted);
      if (verifyTotp(normalizedCode, secret)) {
        verified = true;
      }
    } catch {
      verified = false;
    }
  }

  // 5) If not verified by TOTP, test recovery codes
  if (!verified && admin.mfaRecoveryCodesHash && admin.mfaRecoveryCodesHash.length > 0) {
    const recoveryResult = verifyAndConsumeRecoveryCode(normalizedCode, admin.mfaRecoveryCodesHash);
    if (recoveryResult.valid) {
      verified = true;
      method = "recovery_code";
      // Update consumed recovery code list in DB
      await db
        .update(adminUsers)
        .set({
          mfaRecoveryCodesHash: recoveryResult.remainingHashes,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, admin.id));
    }
  }

  // 6) Handle verification failure
  if (!verified) {
    await recordFailedLogin(admin.id);
    const attemptsLeft = 5 - (admin.failedLoginAttempts + 1);

    await logAuditEvent({
      adminId: admin.id,
      action: "admin.mfa_verification_failed",
      metadata: { attemptsBeforeLock: Math.max(0, attemptsLeft) },
    });

    if (attemptsLeft <= 0) {
      return {
        success: false,
        error: "ยืนยันตัวตนผิดพลาดครบ 5 ครั้ง บัญชีถูกล็อคเป็นเวลา 15 นาที",
        lockoutMinutes: 15,
      };
    }

    return {
      success: false,
      error: `รหัส OTP หรือ Recovery Code ไม่ถูกต้อง (เหลือโอกาสอีก ${attemptsLeft} ครั้ง)`,
    };
  }

  // 7) Handle verification success
  await resetFailedLogins(admin.id);
  await createSession(admin.id);

  await logAuditEvent({
    adminId: admin.id,
    action: "admin.login_success",
    metadata: { role: admin.role, mfaMethod: method },
  });

  redirect("/");
}

// ─── MFA Administration (Setup & Management) ───

export type MfaSetupData = {
  success: boolean;
  error?: string;
  secret?: string;
  uri?: string;
  rawRecoveryCodes?: string[];
  encryptedSecret?: string;
  recoveryCodesHash?: string[];
};

export async function initiateMfaSetupAction(): Promise<MfaSetupData> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
  }

  const secret = generateMfaSecret();
  const encryptedSecret = encryptMfaSecret(secret);
  const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
  const uri = getTotpUri(admin.email, secret);

  return {
    success: true,
    secret,
    uri,
    rawRecoveryCodes: rawCodes,
    encryptedSecret,
    recoveryCodesHash: hashedCodes,
  };
}

export async function confirmMfaSetupAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
  }

  const code = formData.get("code")?.toString().trim();
  const encryptedSecret = formData.get("encryptedSecret")?.toString().trim();
  const recoveryCodesHashRaw = formData.get("recoveryCodesHash")?.toString().trim();

  if (!code || !encryptedSecret || !recoveryCodesHashRaw) {
    return { success: false, error: "ข้อมูลการตั้งค่า MFA ไม่ครบถ้วน" };
  }

  let recoveryCodesHash: string[];
  try {
    recoveryCodesHash = JSON.parse(recoveryCodesHashRaw);
    if (!Array.isArray(recoveryCodesHash)) throw new Error();
  } catch {
    return { success: false, error: "รูปแบบ Recovery Codes ไม่ถูกต้อง" };
  }

  let secret: string;
  try {
    secret = decryptMfaSecret(encryptedSecret);
  } catch {
    return { success: false, error: "การถอดรหัส Secret ผิดพลาด" };
  }

  if (!verifyTotp(code, secret)) {
    return { success: false, error: "รหัส OTP 6 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
  }

  await db
    .update(adminUsers)
    .set({
      mfaEnabled: true,
      mfaSecretEncrypted: encryptedSecret,
      mfaRecoveryCodesHash: recoveryCodesHash,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, admin.id));

  await logAuditEvent({
    adminId: admin.id,
    action: "admin.mfa_enabled",
    metadata: { role: admin.role },
  });

  return { success: true };
}

export async function disableMfaAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
  }

  const password = formData.get("password")?.toString();
  if (!password) {
    return { success: false, error: "กรุณากรอกรหัสผ่านเพื่อยืนยันการปิด MFA" };
  }

  const isPasswordValid = await verifyPassword(password, admin.passwordHash);
  if (!isPasswordValid) {
    return { success: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }

  await db
    .update(adminUsers)
    .set({
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaRecoveryCodesHash: null,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, admin.id));

  await logAuditEvent({
    adminId: admin.id,
    action: "admin.mfa_disabled",
    metadata: { role: admin.role },
  });

  return { success: true };
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
  // 1) Validate input first (before touching the DB)
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

  // 2) Hash the password
  const passwordHash = await hashPassword(password);

  // 3) Audit #4: Atomic guard — INSERT only if admin_users table is empty.
  //    This eliminates the TOCTOU race between COUNT(*) and INSERT.
  const result = await rawSql`
    INSERT INTO admin_users (email, password_hash, full_name, role, is_active, password_changed_at)
    SELECT ${email}, ${passwordHash}, ${fullName}, 'super_admin', true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM admin_users)
    RETURNING id
  `;

  if (!result || result.length === 0) {
    return {
      success: false,
      error: "ระบบมี Admin อยู่แล้ว ไม่สามารถสร้างซ้ำได้",
    };
  }

  const superAdminId = (result[0] as { id: string }).id;

  // 4) Audit log
  await logAuditEvent({
    adminId: superAdminId,
    action: "admin.super_admin_created",
    entityType: "admin_user",
    entityId: superAdminId,
    metadata: { email, fullName },
  });

  return {
    success: true,
  };
}
