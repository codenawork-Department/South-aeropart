import { z } from "zod";

// Prose retains Unicode and markup as data; rendering must escape it separately.
const safeProse = (value: string) =>
  !/[\u0000\u202a-\u202e\u2066-\u2069\ud800-\udfff]/u.test(value);
const boundedText = (maximum: number) =>
  z.string().refine((value) => {
    let count = 0;
    for (const _character of value) if (++count > maximum) return false;
    return safeProse(value);
  }, "Invalid text");
const descriptionSchema = z
  .string()
  .refine(
    (value) =>
      value.length <= 16384 &&
      Buffer.byteLength(value, "utf8") <= 16384 &&
      safeProse(value),
    "Invalid text",
  );
const catalogPriceSchema = z
  .string()
  .max(64)
  .refine((value) => {
    if (value.length > 64 || !/^\d+(\.\d{1,2})?$/.test(value)) return false;
    const [major, fraction = ""] = value.split(".");
    return (
      BigInt(major) * 100n + BigInt(fraction.padEnd(2, "0")) <= 999999999999n
    );
  }, "Invalid price");

const imageItemSchema = z.object({
  id: z.string().optional(),
  data: z.string().optional(), // base64 / data URL for new uploads
  publicId: z.string().optional(), // existing Cloudinary public_id
  secureUrl: z.string().optional(), // existing secure URL
  position: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
  isDeleted: z.boolean().optional(),
});

const compatibilityItemSchema = z.object({
  make: z.string().min(1, "กรุณากรอกยี่ห้อรถ (Make)"),
  model: z.string().min(1, "กรุณากรอกรุ่นรถ (Model)"),
  yearFrom: z.number().int().min(1900).max(2100),
  yearTo: z.number().int().min(1900).max(2100),
});

const featureItemSchema = z
  .object({
    title: z.string().max(200).optional().nullable(),
    titleEn: z.string().max(200).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    descriptionEn: z.string().max(1000).optional().nullable(),
    iconSlug: z.string().optional().nullable(),
    iconId: z.string().optional().nullable(),
  })
  .refine(
    (f) =>
      (f.titleEn && f.titleEn.trim().length > 0) ||
      (f.title && f.title.trim().length > 0),
    {
      message: "กรุณากรอกหัวข้อจุดเด่น (Feature Title)",
      path: ["titleEn"],
    },
  );

export const productInputSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[\x21-\x7e]+$/),
    name: boundedText(255).optional().nullable(),
    nameEn: boundedText(255).optional().nullable(),
    slug: z.string().optional(),
    description: descriptionSchema.optional().nullable(),
    descriptionEn: descriptionSchema.optional().nullable(),
    shortDescription: z.string().max(500).optional().nullable(),
    shortDescriptionEn: z.string().max(500).optional().nullable(),
    price: catalogPriceSchema,
    compareAtPrice: catalogPriceSchema.optional().nullable(),
    stockQuantity: z.number().int().min(0).max(2147483647).default(0),
    status: z
      .enum(["draft", "active", "archived", "out_of_stock"])
      .default("draft"),
    isFeatured: z.boolean().default(false),
    weightKg: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "รูปแบบน้ำหนักไม่ถูกต้อง")
      .optional()
      .nullable(),
    installation: z.string().max(500).optional().nullable(),
    installationEn: z.string().max(500).optional().nullable(),
    installationId: z
      .string()
      .uuid("วิธีการติดตั้งไม่ถูกต้อง")
      .optional()
      .nullable(),
    categoryId: z.string().uuid("หมวดหมู่ไม่ถูกต้อง").optional().nullable(),
    brandId: z.string().uuid("แบรนด์ไม่ถูกต้อง").optional().nullable(),
    carModelId: z.string().uuid("รุ่นรถไม่ถูกต้อง").optional().nullable(),
    materialId: z.string().uuid("วัสดุไม่ถูกต้อง").optional().nullable(),
    // CFD Aerodynamic Telemetry
    downforceN: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    dragN: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    downforceBefore: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    downforceAfter: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    dragBefore: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    dragAfter: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง")
      .optional()
      .nullable(),
    images: z
      .array(imageItemSchema)
      .max(20, "สามารถเพิ่มรูปภาพสินค้าได้สูงสุดไม่เกิน 20 รูป")
      .default([]),
    compatibility: z.array(compatibilityItemSchema).optional().default([]),
    features: z.array(featureItemSchema).optional().default([]),
  })
  .strict()
  .refine(
    (data) =>
      (data.nameEn && data.nameEn.trim().length > 0) ||
      (data.name && data.name.trim().length > 0),
    {
      message: "กรุณากรอกชื่อสินค้า (Product Name)",
      path: ["nameEn"],
    },
  );

export type ProductInput = z.infer<typeof productInputSchema>;
