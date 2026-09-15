import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginAction,
  verifyMfaAction,
  confirmMfaSetupAction,
  initiateMfaSetupAction,
} from "./auth.actions";
import {
  generateMfaSecret,
  encryptMfaSecret,
  generateTotp,
  generateRecoveryCodes,
  createMfaChallengeToken,
} from "@/lib/mfa";

// Mock next/navigation redirect
const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock @repo/db
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockReturning = vi.fn();

vi.mock("@repo/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelect,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => { mockUpdate(...args); return { returning: mockReturning }; },
      }),
    }),
    insert: () => ({
      values: mockInsert,
    }),
  },
  adminUsers: { id: "id", email: "email" },
  adminSessions: {},
  adminAuditLogs: {},
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
  rawSql: vi.fn(),
  takeRateLimit: vi.fn().mockResolvedValue(true),
}));

// Mock lib/auth
const mockValidateSession = vi.fn();
const mockCreateSession = vi.fn();
const mockResetFailedLogins = vi.fn();
const mockRecordFailedLogin = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_pwd"),
  verifyPassword: vi.fn().mockImplementation((pwd) => Promise.resolve(pwd === "ValidPassword@123")),
  isAccountLocked: vi.fn().mockReturnValue(false),
  recordFailedLogin: (...args: unknown[]) => mockRecordFailedLogin(...args),
  resetFailedLogins: (...args: unknown[]) => mockResetFailedLogins(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  clearSessionCookie: vi.fn(),
  revokeAllSessions: vi.fn(),
  validateSession: () => mockValidateSession(),
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

describe("Admin MFA Authentication Actions (CLAUDE.md §5.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: "admin-1" }]);
    process.env.ADMIN_SESSION_SECRET = "test_admin_session_secret_at_least_32_chars_long!";
  });

  describe("loginAction with MFA", () => {
    it("fails closed when enabled MFA has no stored secret", async () => {
      mockSelect.mockResolvedValueOnce([{ id: "admin-1", isActive: true, mfaEnabled: true, mfaSecretEncrypted: null, passwordHash: "hash" }]);
      const form = new FormData();
      form.set("email", "admin@example.invalid");
      form.set("password", "ValidPassword@123");
      expect((await loginAction(null, form)).success).toBe(false);
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
    });
    it("returns requiresMfa: true and an ephemeral mfaToken when MFA is enabled", async () => {
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);

      mockSelect.mockResolvedValueOnce([
        {
          id: "admin-1",
          email: "admin@southaero.com",
          passwordHash: "valid_hash",
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mfaEnabled: true,
          mfaSecretEncrypted: encryptedSecret,
          mfaRecoveryCodesHash: [],
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("email", "admin@southaero.com");
      formData.append("password", "ValidPassword@123");

      const result = await loginAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(true);
      expect(typeof result.mfaToken).toBe("string");
      // Session MUST NOT be created yet
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
    });
  });

  describe("verifyMfaAction", () => {
    it("successfully logs in with a valid TOTP code", async () => {
      const adminId = "admin-1";
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const validCode = generateTotp(secret);
      const mfaToken = await createMfaChallengeToken(adminId);

      mockSelect.mockResolvedValueOnce([
        {
          id: adminId,
          email: "admin@southaero.com",
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mfaEnabled: true,
          mfaSecretEncrypted: encryptedSecret,
          mfaChallengeHash: createHash("sha256").update(mfaToken).digest("hex"),
          mfaLastUsedStep: null,
          mfaRecoveryCodesHash: [],
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("mfaToken", mfaToken);
      formData.append("code", validCode);

      await verifyMfaAction(null, formData);

      expect(mockResetFailedLogins).toHaveBeenCalledWith(adminId);
      expect(mockCreateSession).toHaveBeenCalledWith(adminId, undefined, undefined, true);
      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("successfully logs in and consumes single-use recovery code", async () => {
      const adminId = "admin-1";
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const { rawCodes, hashedCodes } = generateRecoveryCodes(4);
      const mfaToken = await createMfaChallengeToken(adminId);

      mockSelect.mockResolvedValueOnce([
        {
          id: adminId,
          email: "admin@southaero.com",
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mfaEnabled: true,
          mfaSecretEncrypted: encryptedSecret,
          mfaChallengeHash: createHash("sha256").update(mfaToken).digest("hex"),
          mfaLastUsedStep: null,
          mfaRecoveryCodesHash: hashedCodes,
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("mfaToken", mfaToken);
      formData.append("code", rawCodes[0]); // valid recovery code

      await verifyMfaAction(null, formData);

      expect(mockResetFailedLogins).toHaveBeenCalledWith(adminId);
      expect(mockCreateSession).toHaveBeenCalledWith(adminId, undefined, undefined, true);
      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("rejects invalid OTP code and records failed attempt", async () => {
      const adminId = "admin-1";
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const mfaToken = await createMfaChallengeToken(adminId);

      mockSelect.mockResolvedValueOnce([
        {
          id: adminId,
          email: "admin@southaero.com",
          isActive: true,
          failedLoginAttempts: 2,
          lockedUntil: null,
          mfaEnabled: true,
          mfaSecretEncrypted: encryptedSecret,
          mfaChallengeHash: createHash("sha256").update(mfaToken).digest("hex"),
          mfaLastUsedStep: null,
          mfaRecoveryCodesHash: [],
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("mfaToken", mfaToken);
      formData.append("code", "000000"); // wrong code

      const result = await verifyMfaAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("ไม่ถูกต้อง");
      expect(mockRecordFailedLogin).toHaveBeenCalledWith(adminId);
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it("rejects expired or forged MFA challenge token", async () => {
      const formData = new FormData();
      formData.append("mfaToken", "invalid_forged_token");
      formData.append("code", "123456");

      const result = await verifyMfaAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("หมดอายุหรือไม่ถูกต้อง");
      expect(mockCreateSession).not.toHaveBeenCalled();
    });
  });

  describe("confirmMfaSetupAction", () => {
    it("rejects client-supplied setup credentials without server pending state", async () => {
      const secret = generateMfaSecret();
      mockValidateSession.mockResolvedValueOnce({ id: "admin-1", mfaEnabled: false });
      const form = new FormData();
      form.set("encryptedSecret", encryptMfaSecret(secret));
      form.set("recoveryCodesHash", JSON.stringify(generateRecoveryCodes(4).hashedCodes));
      form.set("code", generateTotp(secret));
      expect((await confirmMfaSetupAction(null, form)).success).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it("cannot replace an already enabled MFA enrollment", async () => {
      mockValidateSession.mockResolvedValueOnce({ id: "admin-1", mfaEnabled: true });
      expect((await initiateMfaSetupAction("ValidPassword@123")).success).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects expired pending setup and a concurrent consumed setup", async () => {
      const secret = generateMfaSecret();
      const pending = { id: "admin-1", mfaEnabled: false, mfaPendingSetup: encryptMfaSecret(JSON.stringify({ secret, hashedCodes: [] })) };
      const form = new FormData();
      form.set("code", generateTotp(secret));
      mockValidateSession.mockResolvedValueOnce({ ...pending, mfaPendingSetupExpiresAt: new Date(0) });
      expect((await confirmMfaSetupAction(null, form)).success).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
      mockValidateSession.mockResolvedValueOnce({ ...pending, mfaPendingSetupExpiresAt: new Date(Date.now() + 60000) });
      mockReturning.mockResolvedValueOnce([]);
      expect((await confirmMfaSetupAction(null, form)).success).toBe(false);
      expect(mockCreateSession).not.toHaveBeenCalled();
    });
    it("successfully enables MFA when valid TOTP code confirms setup", async () => {
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const { hashedCodes } = generateRecoveryCodes(4);
      const validCode = generateTotp(secret);

      mockValidateSession.mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@southaero.com",
        role: "admin",
        mfaEnabled: false,
        mfaPendingSetup: encryptMfaSecret(JSON.stringify({ secret, hashedCodes })),
        mfaPendingSetupExpiresAt: new Date(Date.now() + 60000),
      });

      const formData = new FormData();
      formData.append("code", validCode);
      formData.append("encryptedSecret", encryptedSecret);
      formData.append("recoveryCodesHash", JSON.stringify(hashedCodes));

      const result = await confirmMfaSetupAction(null, formData);

      expect(result.success).toBe(true);
    });

    it("rejects MFA setup when confirmation code is invalid", async () => {
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const { hashedCodes } = generateRecoveryCodes(4);

      mockValidateSession.mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@southaero.com",
        role: "admin",
        mfaEnabled: false,
        mfaPendingSetup: encryptMfaSecret(JSON.stringify({ secret, hashedCodes })),
        mfaPendingSetupExpiresAt: new Date(Date.now() + 60000),
      });

      const formData = new FormData();
      formData.append("code", "999999"); // wrong code
      formData.append("encryptedSecret", encryptedSecret);
      formData.append("recoveryCodesHash", JSON.stringify(hashedCodes));

      const result = await confirmMfaSetupAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("ไม่ถูกต้อง");
    });
  });
});
