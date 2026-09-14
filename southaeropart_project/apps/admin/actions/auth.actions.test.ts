import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginAction,
  verifyMfaAction,
  confirmMfaSetupAction,
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
        where: mockUpdate,
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
  sql: vi.fn(),
  rawSql: vi.fn(),
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
    process.env.ADMIN_SESSION_SECRET = "test_admin_session_secret_at_least_32_chars_long!";
  });

  describe("loginAction with MFA", () => {
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
          mfaRecoveryCodesHash: [],
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("mfaToken", mfaToken);
      formData.append("code", validCode);

      await verifyMfaAction(null, formData);

      expect(mockResetFailedLogins).toHaveBeenCalledWith(adminId);
      expect(mockCreateSession).toHaveBeenCalledWith(adminId);
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
          mfaRecoveryCodesHash: hashedCodes,
          role: "admin",
        },
      ]);

      const formData = new FormData();
      formData.append("mfaToken", mfaToken);
      formData.append("code", rawCodes[0]); // valid recovery code

      await verifyMfaAction(null, formData);

      expect(mockResetFailedLogins).toHaveBeenCalledWith(adminId);
      expect(mockCreateSession).toHaveBeenCalledWith(adminId);
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
    it("successfully enables MFA when valid TOTP code confirms setup", async () => {
      const secret = generateMfaSecret();
      const encryptedSecret = encryptMfaSecret(secret);
      const { hashedCodes } = generateRecoveryCodes(4);
      const validCode = generateTotp(secret);

      mockValidateSession.mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@southaero.com",
        role: "admin",
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
