import { z } from "zod";
import { orderNoteSchema } from "@repo/lib/order-note";

const addressSchema = z
  .object({
    recipientName: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับ"),
    phone: z.string().trim().min(8, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง"),
    email: z
      .string()
      .trim()
      .email("กรุณากรอกอีเมลที่ถูกต้อง")
      .optional()
      .or(z.literal("")),
    line1: z.string().trim().min(1, "กรุณากรอกที่อยู่ (บ้านเลขที่, ถนน/ซอย)"),
    line2: z.string().trim().optional(),
    subDistrict: z.string().trim().min(1, "กรุณากรอกตำบล/แขวง"),
    district: z.string().trim().min(1, "กรุณากรอกอำเภอ/เขต"),
    province: z.string().trim().min(1, "กรุณากรอกจังหวัด"),
    postalCode: z.string().trim().length(5, "รหัสไปรษณีย์ต้องเป็น 5 หลัก"),
  })
  .strict();

const checkoutItemSchema = z
  .object({
    productId: z.string().uuid("รหัสสินค้าไม่ถูกต้อง"),
    productName: z.string().min(1),
    quantity: z.number().int().positive().max(100),
    unitPrice: z.string(),
    variant: z.string().optional(),
  })
  .strict();

export const checkoutSchema = z
  .object({
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional(),
    shippingMethod: z.enum(["standard", "express"]).default("standard"),
    paymentMethod: z.enum(["credit_card", "promptpay"]).default("promptpay"),
    items: z.array(checkoutItemSchema).min(1, "ตะกร้าสินค้าว่างเปล่า").max(100),
    saveAddress: z.boolean().optional().default(false),
    customerNote: orderNoteSchema.optional(),
  })
  .strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
