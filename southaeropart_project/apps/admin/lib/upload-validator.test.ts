import { describe, it, expect } from "vitest";
import { validateBase64Image } from "./upload-validator";

describe("validateBase64Image (Upload Security & Magic Bytes)", () => {
  // Helpers to create valid mock image data with real magic bytes
  const makeJpegBase64 = () => {
    // FF D8 FF E0 + padding
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    return buf.toString("base64");
  };

  const makePngBase64 = () => {
    // 89 50 4E 47 0D 0A 1A 0A + padding
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    return buf.toString("base64");
  };

  const makeGifBase64 = () => {
    // GIF89a (47 49 46 38 39 61)
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    return buf.toString("base64");
  };

  const makeWebpBase64 = () => {
    // RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
    ]);
    return buf.toString("base64");
  };

  it("validates authentic JPEG image successfully", () => {
    const raw = makeJpegBase64();
    const result = validateBase64Image(`data:image/jpeg;base64,${raw}`);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.error).toBeUndefined();
  });

  it("validates authentic PNG image successfully", () => {
    const raw = makePngBase64();
    const result = validateBase64Image(`data:image/png;base64,${raw}`);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("validates authentic WebP image successfully", () => {
    const raw = makeWebpBase64();
    const result = validateBase64Image(`data:image/webp;base64,${raw}`);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/webp");
  });

  it("validates authentic GIF image successfully", () => {
    const raw = makeGifBase64();
    const result = validateBase64Image(`data:image/gif;base64,${raw}`);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/gif");
  });

  it("supports raw base64 strings without data URI prefix", () => {
    const raw = makeJpegBase64();
    const result = validateBase64Image(raw);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("rejects malicious or disallowed formats (SVG, HTML, scripts)", () => {
    // SVG header: <svg ...
    const svgBase64 = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>").toString("base64");
    const result = validateBase64Image(`data:image/svg+xml;base64,${svgBase64}`);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("ประเภทไฟล์ไม่ได้รับอนุญาต");
  });

  it("detects and rejects MIME type spoofing (e.g. declared JPEG but binary is PNG)", () => {
    const pngRaw = makePngBase64();
    // Deliberately declared as image/jpeg in Data URI header
    const spoofed = `data:image/jpeg;base64,${pngRaw}`;
    const result = validateBase64Image(spoofed);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("เนื้อหาไฟล์ไม่ตรงกับชนิดที่ระบุ");
    expect(result.error).toContain("image/png");
  });

  it("rejects files exceeding maxSizeBytes", () => {
    const raw = makeJpegBase64();
    // Set an artificially low maxSizeBytes
    const result = validateBase64Image(`data:image/jpeg;base64,${raw}`, {
      maxSizeBytes: 5, // 5 bytes limit
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("ขนาดรูปภาพใหญ่เกินกำหนด");
  });

  it("rejects empty or non-string inputs", () => {
    expect(validateBase64Image("").valid).toBe(false);
    expect(validateBase64Image(null as unknown as string).valid).toBe(false);
    expect(validateBase64Image(undefined as unknown as string).valid).toBe(false);
  });

  it("rejects malformed Data URI strings", () => {
    const result = validateBase64Image("data:image/jpeg;invalid_format_string");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("รูปแบบ Data URI ไม่ถูกต้อง");
  });
});
