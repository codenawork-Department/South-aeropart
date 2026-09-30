import { z } from "zod";
import { orderNoteSchema } from "@repo/lib/order-note";
import { shippingAddressSchema } from "@repo/lib/shipping";

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
    shippingAddress: shippingAddressSchema,
    billingAddress: shippingAddressSchema.optional(),
    shippingMethod: z.enum(["standard", "express"]).default("standard"),
    paymentMethod: z.enum(["credit_card", "promptpay"]).default("promptpay"),
    items: z.array(checkoutItemSchema).min(1, "ตะกร้าสินค้าว่างเปล่า").max(100),
    saveAddress: z.boolean().optional().default(false),
    customerNote: orderNoteSchema.optional(),
    shippingPreviewKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    shippingQuote: z.object({ id: z.string().uuid(), version: z.number().int().nonnegative() }).strict().optional(),
  })
  .strict();

export type CheckoutInput = z.input<typeof checkoutSchema>;
