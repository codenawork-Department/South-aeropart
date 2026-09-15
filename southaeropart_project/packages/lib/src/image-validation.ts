/**
 * Image Upload Validation Helper
 *
 * Implements CLAUDE.md §5.2 and §5.5 security requirements:
 * - Reject spoofed MIME types by checking real magic bytes (file signatures)
 * - Restrict to safe image formats (JPEG, PNG, WebP, GIF) — no executable or scriptable formats (SVG)
 * - Enforce maximum byte size limits
 */

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ImageValidationResult {
  valid: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  error?: string;
  sizeBytes?: number;
}

/**
 * Detect image format from binary header buffer using magic bytes
 */
function detectMimeFromMagicBytes(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a (47 49 46 38)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  // [0..3] = "RIFF" (0x52, 0x49, 0x46, 0x46)
  // [8..11] = "WEBP" (0x57, 0x45, 0x42, 0x50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validate a Base64 string or Data URI before uploading to Cloudinary
 */
export function validateBase64Image(
  dataUrlOrBase64: string,
  options: { maxSizeBytes?: number } = {}
): ImageValidationResult {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== "string") {
    return { valid: false, error: "ไม่มีข้อมูลรูปภาพหรือรูปแบบไม่ถูกต้อง" };
  }

  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  // Extract base64 payload if it's a data URL
  let base64Data = dataUrlOrBase64;
  let declaredMime: string | null = null;

  if (dataUrlOrBase64.startsWith("data:")) {
    const match = dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { valid: false, error: "รูปแบบ Data URI ไม่ถูกต้อง" };
    }
    declaredMime = match[1]?.toLowerCase() ?? null;
    base64Data = match[2];
  }

  // Fast estimate of byte size
  const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
  if (estimatedBytes > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `ขนาดรูปภาพใหญ่เกินกำหนด (สูงสุดไม่เกิน ${maxMb} MB)`,
      sizeBytes: estimatedBytes,
    };
  }

  // Read header bytes (first 32 bytes are enough for magic bytes)
  let headerBuffer: Buffer;
  try {
    // Only decode the first 64 base64 chars to avoid full buffer allocation if not needed
    const headerSlice = base64Data.slice(0, 64);
    headerBuffer = Buffer.from(headerSlice, "base64");
  } catch {
    return { valid: false, error: "ไม่สามารถแปลงข้อมูล Base64 ได้" };
  }

  const detectedMime = detectMimeFromMagicBytes(headerBuffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: "ประเภทไฟล์ไม่ได้รับอนุญาต (รองรับเฉพาะ JPEG, PNG, WebP, GIF เท่านั้น)",
    };
  }

  // Check declared MIME against real magic bytes if declared
  if (declaredMime && declaredMime !== detectedMime) {
    return {
      valid: false,
      error: `เนื้อหาไฟล์ไม่ตรงกับชนิดที่ระบุ (ตรวจพบ ${detectedMime})`,
    };
  }

  return {
    valid: true,
    mimeType: detectedMime,
    sizeBytes: estimatedBytes,
  };
}
