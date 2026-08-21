"use server";
//h
import { z } from "zod";

export async function addToWishlist(productId: string) {
  z.string().uuid().parse(productId);
  // TODO: Add to user_interests table with type "wishlist"
  return { success: true };
}

export async function removeFromWishlist(productId: string) {
  z.string().uuid().parse(productId);
  // TODO: Remove from user_interests table
  return { success: true };
}

export async function getWishlist() {
  // TODO: Fetch user's wishlist items from database
  return { items: [] };
}
