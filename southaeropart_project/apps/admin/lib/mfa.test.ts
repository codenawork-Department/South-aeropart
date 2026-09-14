import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  encryptMfaSecret,
  decryptMfaSecret,
  generateTotp,
  verifyTotp,
  generateMfaSecret,
  getTotpUri,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  createMfaChallengeToken,
  verifyMfaChallengeToken,
  TOTP_TIME_STEP_SECONDS,
} from "./mfa";

describe("Admin MFA Utilities (RFC 6238 & OWASP ASVS §2.8 / §2.9)", () => {
  describe("Base32 Encoding / Decoding", () => {
    it("should round-trip encode and decode arbitrary buffers", () => {
      const original = Buffer.from("Hello South Aero Performance!");
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      expect(decoded.toString("utf8")).toBe("Hello South Aero Performance!");
    });

    it("should throw an error on invalid base32 characters", () => {
      expect(() => base32Decode("INVALID!89")).toThrow();
    });
  });

  describe("AES-256-GCM Encryption for MFA Secrets", () => {
    it("should encrypt and decrypt secrets cleanly", () => {
      const secret = generateMfaSecret();
      const encrypted = encryptMfaSecret(secret);

      expect(encrypted).not.toBe(secret);
      expect(encrypted.split(":").length).toBe(3); // iv:tag:ciphertext

      const decrypted = decryptMfaSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("should fail decryption if payload is corrupted or tampered", () => {
      const secret = generateMfaSecret();
      const encrypted = encryptMfaSecret(secret);
      const parts = encrypted.split(":");
      const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

      expect(() => decryptMfaSecret(tampered)).toThrow();
    });
  });

  describe("RFC 6238 TOTP Verification", () => {
    it("should generate a 6-digit numeric token", () => {
      const secret = generateMfaSecret();
      const code = generateTotp(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it("should successfully verify a valid current TOTP code", () => {
      const secret = generateMfaSecret();
      const now = Date.now();
      const code = generateTotp(secret, now);

      expect(verifyTotp(code, secret, now)).toBe(true);
    });

    it("should reject an incorrect TOTP code", () => {
      const secret = generateMfaSecret();
      const now = Date.now();
      const code = generateTotp(secret, now);
      const wrongCode = code === "123456" ? "654321" : "123456";

      expect(verifyTotp(wrongCode, secret, now)).toBe(false);
    });

    it("should allow a +/- 30s clock skew window", () => {
      const secret = generateMfaSecret();
      const now = Date.now();

      // 25s ago (same or previous window)
      const pastCode = generateTotp(secret, now - 25000);
      expect(verifyTotp(pastCode, secret, now, 1)).toBe(true);

      // 25s in future (next window)
      const futureCode = generateTotp(secret, now + 25000);
      expect(verifyTotp(futureCode, secret, now, 1)).toBe(true);

      // 90s ago (beyond window of 1)
      const expiredCode = generateTotp(secret, now - (TOTP_TIME_STEP_SECONDS * 3 * 1000));
      expect(verifyTotp(expiredCode, secret, now, 1)).toBe(false);
    });

    it("should format a valid otpauth:// URI", () => {
      const secret = generateMfaSecret();
      const uri = getTotpUri("admin@southaero.com", secret);
      expect(uri).toContain("otpauth://totp/South%20Aero:admin%40southaero.com");
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain("issuer=South%20Aero");
    });
  });

  describe("Recovery Codes (Single-Use Hashed Codes)", () => {
    it("should generate formatted recovery codes and hashes", () => {
      const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
      expect(rawCodes.length).toBe(8);
      expect(hashedCodes.length).toBe(8);
      expect(rawCodes[0]).toMatch(/^[0-9A-F]{6}-[0-9A-F]{6}$/);
    });

    it("should verify and consume a valid recovery code, preventing reuse", () => {
      const { rawCodes, hashedCodes } = generateRecoveryCodes(4);
      const targetCode = rawCodes[1];

      // First redemption: valid
      const result1 = verifyAndConsumeRecoveryCode(targetCode, hashedCodes);
      expect(result1.valid).toBe(true);
      expect(result1.remainingHashes.length).toBe(3);

      // Second redemption with remaining hashes: must fail (prevent replay)
      const result2 = verifyAndConsumeRecoveryCode(targetCode, result1.remainingHashes);
      expect(result2.valid).toBe(false);
      expect(result2.remainingHashes.length).toBe(3);
    });

    it("should reject invalid recovery codes", () => {
      const { hashedCodes } = generateRecoveryCodes(4);
      const result = verifyAndConsumeRecoveryCode("FAKE-CODE-9999", hashedCodes);
      expect(result.valid).toBe(false);
      expect(result.remainingHashes.length).toBe(4);
    });
  });

  describe("Ephemeral MFA Challenge Tokens", () => {
    it("should issue and verify an ephemeral challenge token", async () => {
      const adminId = "e57c6b54-1b1e-4ec6-b371-558eefb2049e";
      const token = await createMfaChallengeToken(adminId);
      expect(typeof token).toBe("string");

      const verifiedAdminId = await verifyMfaChallengeToken(token);
      expect(verifiedAdminId).toBe(adminId);
    });

    it("should reject tampered challenge tokens", async () => {
      const adminId = "e57c6b54-1b1e-4ec6-b371-558eefb2049e";
      const token = await createMfaChallengeToken(adminId);
      const tampered = token.slice(0, -5) + "abcde";

      const verified = await verifyMfaChallengeToken(tampered);
      expect(verified).toBeNull();
    });
  });
});
