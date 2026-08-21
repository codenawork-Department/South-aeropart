"use server";
//h
// Cart Server Actions
// Currently cart state is managed client-side via React Context
// These server actions will be used when we integrate with the database

import { z } from "zod";

const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  variant: z.string().optional(),
});

export async function addToCart(input: z.infer<typeof addToCartSchema>) {
  const validated = addToCartSchema.parse(input);

  // TODO: When database is connected:
  // 1. Verify product exists and is active
  // 2. Check stock availability
  // 3. Add to user's cart in database (if authenticated)
  // 4. Return updated cart

  return { success: true, item: validated };
}

export async function removeFromCart(itemId: string) {
  z.string().parse(itemId);
  // TODO: Remove from database cart
  return { success: true };
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  z.string().parse(itemId);
  z.number().int().positive().max(10).parse(quantity);
  // TODO: Update quantity in database cart
  return { success: true };
}
