"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, adminUsers, eq, and, sql, takeRateLimit } from "@repo/db";
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
  generateTotp,
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
  if (!await takeRateLimit(`admin-login:${email}`, 20, 15 * 60000)) {
    return { success: false, error: "Too many sign-in attempts; try again later" };
  }

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
  if (admin.mfaEnabled) {
    if (!admin.mfaSecretEncrypted) return { success: false, error: "MFA configuration requires administrator recovery" };
    const mfaToken = await createMfaChallengeToken(admin.id);
    await db.update(adminUsers).set({ mfaChallengeHash: createHash("sha256").update(mfaToken).digest("hex") }).where(eq(adminUsers.id, admin.id));
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

  // Unenrolled production sessions can only access the MFA enrollment flow.
  redirect(process.env.NODE_ENV === "production" ? "/security/enroll" : "/");
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

  if (!admin || !admin.isActive || !admin.mfaEnabled || !admin.mfaSecretEncrypted || admin.mfaChallengeHash !== createHash("sha256").update(mfaToken).digest("hex")) {
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
  let acceptedStep: number | null = null;
  let remainingHashes = admin.mfaRecoveryCodesHash;
  let method: "totp" | "recovery_code" = "totp";

  if (/^\d{6}$/.test(normalizedCode) && admin.mfaSecretEncrypted) {
    try {
      const secret = decryptMfaSecret(admin.mfaSecretEncrypted);
      const currentStep = Math.floor(Date.now() / 30000);
      for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
        if (step > (admin.mfaLastUsedStep ?? -1) && generateTotp(secret, step * 30000) === normalizedCode) {
          verified = true;
          acceptedStep = step;
          break;
        }
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
      remainingHashes = recoveryResult.remainingHashes;
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

  // Compare-and-swap consumes the challenge and factor together. Concurrent
  // requests cannot reuse a recovery code or a TOTP from another challenge.
  const [consumed] = await db.update(adminUsers).set({
    mfaChallengeHash: null,
    mfaRecoveryCodesHash: remainingHashes,
    ...(acceptedStep === null ? {} : { mfaLastUsedStep: acceptedStep }),
    updatedAt: new Date(),
  }).where(and(
    eq(adminUsers.id, admin.id), eq(adminUsers.isActive, true), eq(adminUsers.mfaEnabled, true),
    eq(adminUsers.mfaSecretEncrypted, admin.mfaSecretEncrypted),
    eq(adminUsers.mfaChallengeHash, admin.mfaChallengeHash),
    sql`${adminUsers.mfaRecoveryCodesHash} IS NOT DISTINCT FROM ${JSON.stringify(admin.mfaRecoveryCodesHash)}::jsonb`,
    sql`${adminUsers.mfaLastUsedStep} IS NOT DISTINCT FROM ${admin.mfaLastUsedStep}`,
  )).returning({ id: adminUsers.id });
  if (!consumed) return { success: false, error: "MFA challenge already used; sign in again" };
  // 7) Handle verification success
  await resetFailedLogins(admin.id);
  await createSession(admin.id, undefined, undefined, true);

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

export async function initiateMfaSetupAction(password: string = ""): Promise<MfaSetupData> {
  const admin = await validateSession(true);
  if (!admin) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
  }

  if (!await takeRateLimit(`mfa-setup:${admin.id}`, 5, 15 * 60000) || admin.mfaEnabled || isAccountLocked(admin) || !await verifyPassword(password, admin.passwordHash)) {
    return { success: false, error: "ยืนยันรหัสผ่านก่อนตั้งค่า และไม่สามารถแทนที่ MFA ที่เปิดอยู่" };
  }
  const secret = generateMfaSecret();
  const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
  const uri = getTotpUri(admin.email, secret);
  const pending = encryptMfaSecret(JSON.stringify({ secret, hashedCodes }));
  await db.update(adminUsers).set({ mfaPendingSetup: pending, mfaPendingSetupExpiresAt: new Date(Date.now() + 5 * 60000) })
    .where(and(eq(adminUsers.id, admin.id), eq(adminUsers.mfaEnabled, false)));

  return {
    success: true,
    secret,
    uri,
    rawRecoveryCodes: rawCodes,

  };
}

export async function confirmMfaSetupAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const admin = await validateSession(true);
  if (!admin) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
  }

  const code = formData.get("code")?.toString().trim();
  if (!await takeRateLimit(`mfa-confirm:${admin.id}`, 5, 15 * 60000)) {
    return { success: false, error: "Too many verification attempts; try again later" };
  }
  if (admin.mfaEnabled || !code || !admin.mfaPendingSetup || !admin.mfaPendingSetupExpiresAt || admin.mfaPendingSetupExpiresAt <= new Date()) {
    return { success: false, error: "เริ่มตั้งค่า MFA ใหม่และยืนยันรหัสผ่านก่อน" };
  }
  let secret: string;
  let recoveryCodesHash: string[];
  try {
    const pending = JSON.parse(decryptMfaSecret(admin.mfaPendingSetup));
    secret = pending.secret;
    recoveryCodesHash = pending.hashedCodes;
  } catch {
    return { success: false, error: "Invalid pending MFA setup" };
  }
  const encryptedSecret = encryptMfaSecret(secret);

  if (!verifyTotp(code, secret)) {
    return { success: false, error: "รหัส OTP 6 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
  }

  const [enabled] = await db.update(adminUsers).set({
    mfaEnabled: true, mfaSecretEncrypted: encryptedSecret, mfaRecoveryCodesHash: recoveryCodesHash,
    mfaPendingSetup: null, mfaPendingSetupExpiresAt: null, mfaChallengeHash: null,
    mfaLastUsedStep: Math.floor(Date.now() / 30000), updatedAt: new Date(),
  }).where(and(eq(adminUsers.id, admin.id), eq(adminUsers.mfaEnabled, false), eq(adminUsers.mfaPendingSetup, admin.mfaPendingSetup)))
    .returning({ id: adminUsers.id });
  if (!enabled) return { success: false, error: "MFA setup already consumed" };
  await revokeAllSessions(admin.id);
  await createSession(admin.id, undefined, undefined, true);

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

  if (process.env.NODE_ENV === "production") return { success: false, error: "MFA is required in production" };
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
      mfaChallengeHash: null,
      mfaPendingSetup: null,
      mfaPendingSetupExpiresAt: null,
      mfaLastUsedStep: null,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, admin.id));

  await revokeAllSessions(admin.id);
  await clearSessionCookie();
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
  const bootstrap = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const provided = formData.get("bootstrapToken");
  if (!bootstrap || bootstrap.length < 32 || typeof provided !== "string" ||
      !timingSafeEqual(createHash("sha256").update(bootstrap).digest(), createHash("sha256").update(provided).digest())) {
    return { success: false, error: "Setup is disabled or bootstrap token is invalid" };
  }
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

  // Serialize initial provisioning inside the transaction.
  const result = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(741852963)`);
    const existing = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1);
    if (existing.length) return [];
    return tx.insert(adminUsers).values({ email, passwordHash, fullName, role: "super_admin", isActive: true, passwordChangedAt: new Date() }).returning({ id: adminUsers.id });
  });

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
