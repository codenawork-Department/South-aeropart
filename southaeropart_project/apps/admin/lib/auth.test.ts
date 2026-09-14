import { describe, it, expect, beforeAll } from "vitest";
import {
  hashPassword,
  verifyPassword,
  verifySessionToken,
  isAccountLocked,
  hasRequiredRole,
} from "./auth";
import type { AdminUser } from "@repo/db";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test_admin_session_secret_at_least_32_chars_long!";
});

describe("Admin Auth & Security (CLAUDE.md §5.1)", () => {
  describe("Password Hashing & Verification (bcrypt >= 12 rounds)", () => {
    it("hashes password with salt and verifies successfully", async () => {
      const password = "StrongPassword@123456";
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);
      // Cost factor 12
      expect(hashed.includes("$12$")).toBe(true);

      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it("rejects incorrect password", async () => {
      const password = "CorrectPassword@123456";
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword("WrongPassword@123456", hashed);
      expect(isValid).toBe(false);
    });
  });

  describe("Session Token Verification (jose HS256 JWT)", () => {
    it("returns null for invalid or corrupted JWT token", async () => {
      const result = await verifySessionToken("invalid.jwt.token");
      expect(result).toBeNull();
    });

    it("returns null for empty token", async () => {
      const result = await verifySessionToken("");
      expect(result).toBeNull();
    });
  });

  describe("Account Lockout Protection (5 attempts / 15 minutes)", () => {
    const baseMockAdmin: AdminUser = {
      id: "admin-uuid-1",
      email: "staff@southaeropart.com",
      passwordHash: "hash",
      fullName: "Staff Member",
      role: "staff",
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaRecoveryCodesHash: null,
      passwordChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("returns false when failed attempts are under threshold (< 5)", () => {
      const admin = { ...baseMockAdmin, failedLoginAttempts: 4, lockedUntil: null };
      expect(isAccountLocked(admin)).toBe(false);
    });

    it("returns true when failed attempts >= 5 and lockedUntil is in the future", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      const admin = {
        ...baseMockAdmin,
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
      };
      expect(isAccountLocked(admin)).toBe(true);
    });

    it("returns false when lockedUntil has expired in the past", () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const admin = {
        ...baseMockAdmin,
        failedLoginAttempts: 5,
        lockedUntil: pastDate,
      };
      expect(isAccountLocked(admin)).toBe(false);
    });
  });

  describe("RBAC Role Enforcement (hasRequiredRole)", () => {
    const makeAdmin = (role: AdminUser["role"]): AdminUser => ({
      id: "admin-uuid-test",
      email: "test@southaero.com",
      passwordHash: "hash",
      fullName: "Test User",
      role,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaRecoveryCodesHash: null,
      passwordChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("denies access when admin is null or undefined (deny-by-default)", () => {
      expect(hasRequiredRole(null)).toBe(false);
      expect(hasRequiredRole(undefined)).toBe(false);
    });

    it("defaults allowed roles to ['admin', 'super_admin']", () => {
      const staffUser = makeAdmin("staff");
      const adminUser = makeAdmin("admin");
      const superAdminUser = makeAdmin("super_admin");

      expect(hasRequiredRole(staffUser)).toBe(false);
      expect(hasRequiredRole(adminUser)).toBe(true);
      expect(hasRequiredRole(superAdminUser)).toBe(true);
    });

    it("supports custom allowed roles list", () => {
      const staffUser = makeAdmin("staff");
      expect(hasRequiredRole(staffUser, ["staff", "admin"])).toBe(true);
      expect(hasRequiredRole(staffUser, ["super_admin"])).toBe(false);
    });
  });
});
