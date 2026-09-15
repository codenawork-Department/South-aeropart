import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

// ─── Base32 RFC 4648 Encoding / Decoding ───

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[\s=-]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ─── AES-256-GCM Encryption for MFA Secrets ───

function getEncryptionKey(): Buffer {
  const secret = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("ADMIN_MFA_ENCRYPTION_KEY must be configured (32+ characters)");
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a secret string using AES-256-GCM.
 * Output format: `ivHex:authTagHex:ciphertextHex`
 */
export function encryptMfaSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `v2:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted secret.
 */
export function decryptMfaSecret(payload: string): string {
  const versioned = payload.startsWith("v2:");
  const parts = (versioned ? payload.slice(3) : payload).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted MFA payload format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  // Read legacy records with their original key; new writes use a dedicated key.
  const legacySecret = process.env.ADMIN_SESSION_SECRET;
  if (!versioned && (!legacySecret || legacySecret.length < 32)) throw new Error("Legacy MFA key is unavailable");
  const key = versioned ? getEncryptionKey() : createHash("sha256").update(legacySecret!).digest();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── RFC 6238 TOTP Generation & Verification ───

export const TOTP_TIME_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * Generate a 6-digit TOTP code for a given base32 secret and timestamp.
 */
export function generateTotp(
  base32Secret: string,
  timestampMs: number = Date.now()
): string {
  const key = base32Decode(base32Secret);
  const counter = Math.floor(timestampMs / 1000 / TOTP_TIME_STEP_SECONDS);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);

  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode = (hmac.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, TOTP_DIGITS);

  return String(binaryCode).padStart(TOTP_DIGITS, "0");
}

/**
 * Verify a user-provided 6-digit TOTP token against the secret.
 * Allows a +/- 1 step window (30s past and 30s future) to account for clock skew.
 * Uses timingSafeEqual to guard against timing attacks.
 */
export function verifyTotp(
  token: string,
  base32Secret: string,
  timestampMs: number = Date.now(),
  windowSteps: number = 1
): boolean {
  if (!token || token.length !== TOTP_DIGITS || !/^\d+$/.test(token)) {
    return false;
  }

  const currentCounter = Math.floor(timestampMs / 1000 / TOTP_TIME_STEP_SECONDS);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const stepTime = (currentCounter + i) * TOTP_TIME_STEP_SECONDS * 1000;
    const expected = generateTotp(base32Secret, stepTime);

    if (timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a new random TOTP base32 secret (20 bytes = 160 bits).
 */
export function generateMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Construct standard otpauth:// URL for authenticator apps (Google Authenticator, 1Password).
 */
export function getTotpUri(
  email: string,
  secret: string,
  issuer: string = "South Aero"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_TIME_STEP_SECONDS}`;
}

// ─── Recovery Codes (RFC & NIST SP 800-63B) ───

export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generate a set of single-use recovery codes.
 * Returns both raw codes (displayed to user once) and hashed codes (persisted in DB).
 */
export function generateRecoveryCodes(count: number = 8): {
  rawCodes: string[];
  hashedCodes: string[];
} {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const rawPart1 = randomBytes(3).toString("hex").toUpperCase();
    const rawPart2 = randomBytes(3).toString("hex").toUpperCase();
    const formatted = `${rawPart1}-${rawPart2}`;
    rawCodes.push(formatted);
    hashedCodes.push(hashRecoveryCode(formatted));
  }

  return { rawCodes, hashedCodes };
}

/**
 * Verify if input code matches any stored recovery code hash.
 * If valid, returns { valid: true, remainingHashes: string[] }.
 */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  storedHashes: string[] | null | undefined
): { valid: boolean; remainingHashes: string[] } {
  if (!storedHashes || storedHashes.length === 0 || !inputCode) {
    return { valid: false, remainingHashes: storedHashes || [] };
  }

  const inputHash = hashRecoveryCode(inputCode);
  const inputBuf = Buffer.from(inputHash, "hex");

  let matchIndex = -1;

  for (let i = 0; i < storedHashes.length; i++) {
    const storedBuf = Buffer.from(storedHashes[i], "hex");
    if (storedBuf.length === inputBuf.length && timingSafeEqual(inputBuf, storedBuf)) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    return { valid: false, remainingHashes: storedHashes };
  }

  const remaining = [...storedHashes];
  remaining.splice(matchIndex, 1);
  return { valid: true, remainingHashes: remaining };
}

// ─── Ephemeral MFA Challenge Tokens ───

const MFA_CHALLENGE_EXPIRY = "5m"; // 5 minutes

function getMfaJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be configured (32+ characters)");
  return new TextEncoder().encode(secret);
}

export async function createMfaChallengeToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId, type: "mfa_challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomBytes(24).toString("hex"))
    .setExpirationTime(MFA_CHALLENGE_EXPIRY)
    .sign(getMfaJwtSecret());
}

export async function verifyMfaChallengeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getMfaJwtSecret(), { algorithms: ["HS256"] });
    if (payload.type !== "mfa_challenge" || typeof payload.adminId !== "string") {
      return null;
    }
    return payload.adminId;
  } catch {
    return null;
  }
}
