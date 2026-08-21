"use server";
//
import { z } from "zod";

const addressSchema = z.object({
  recipientName: z.string().min(1),
  phone: z.string().min(9),
  line1: z.string().min(1),
  line2: z.string().optional(),
  subDistrict: z.string().min(1),
  district: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().length(5),
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(["credit_card", "promptpay"]),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.string(),
  })).min(1),
});

export async function createOrder(input: z.infer<typeof checkoutSchema>) {
  const validated = checkoutSchema.parse(input);

  // TODO: When database + Omise are connected:
  // 1. Create order in database with "pending" status
  // 2. Calculate subtotal, tax, shipping
  // 3. Create Omise charge
  // 4. Return order ID and redirect URL

  return {
    success: true,
    orderId: "placeholder-order-id",
    redirectUrl: "/orders/placeholder-order-id",
  };
}
