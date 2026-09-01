"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  db,
  users,
  userInterests,
  products,
  brands,
  carModels,
  categories,
  materials,
  productImages,
  eq,
  and,
  desc,
  asc,
  inArray,
} from "@repo/db";

export interface WishlistItem {
  id: string; // userInterests ID
  productId: string;
  name: string;
  slug: string;
  sku: string;
  productType: "single" | "bundle";
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  status: string;
  brandName: string | null;
  carModelName: string | null;
  categoryName: string | null;
  materialName: string | null;
  primaryImage: string | null;
  downforceN: number | null;
  dragN: number | null;
  createdAt: Date;
}

/**
 * Helper to ensure the authenticated Clerk user is synchronized in Neon DB `users` table
 * so that foreign keys in `user_interests` don't fail.
 */
async function ensureUserInDb(userId: string) {
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const fullName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        null;
      await db
        .insert(users)
        .values({
          id: userId,
          email,
          fullName,
          avatarUrl: clerkUser.imageUrl || null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            fullName: fullName || undefined,
            avatarUrl: clerkUser.imageUrl || undefined,
            updatedAt: new Date(),
          },
        });
    }
  }
}

/**
 * Fetch all items in user's wishlist
 */
export async function getWishlist(): Promise<{
  success: boolean;
  items: WishlistItem[];
  error?: string;
}> {
  const { userId } = auth();
  if (!userId) {
    return { success: false, items: [], error: "Unauthorized" };
  }

  try {
    await ensureUserInDb(userId);

    const rows = await db
      .select({
        id: userInterests.id,
        productId: userInterests.productId,
        createdAt: userInterests.createdAt,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        productType: products.productType,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stockQuantity: products.stockQuantity,
        status: products.status,
        brandName: brands.name,
        carModelName: carModels.name,
        categoryName: categories.name,
        materialName: materials.name,
        downforceN: products.downforceN,
        dragN: products.dragN,
      })
      .from(userInterests)
      .innerJoin(products, eq(userInterests.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(materials, eq(products.materialId, materials.id))
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.interactionType, "wishlist")
        )
      )
      .orderBy(desc(userInterests.createdAt));

    if (rows.length === 0) {
      return { success: true, items: [] };
    }

    const productIds = rows.map((r) => r.productId);
    const images = await db
      .select({
        productId: productImages.productId,
        secureUrl: productImages.secureUrl,
        isPrimary: productImages.isPrimary,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position));

    const imageMap = new Map<string, string>();
    for (const img of images) {
      if (!imageMap.has(img.productId) || img.isPrimary) {
        imageMap.set(img.productId, img.secureUrl);
      }
    }

    const items: WishlistItem[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      name: r.name,
      slug: r.slug,
      sku: r.sku,
      productType: r.productType,
      price: r.price,
      compareAtPrice: r.compareAtPrice,
      stockQuantity: r.stockQuantity,
      status: r.status,
      brandName: r.brandName,
      carModelName: r.carModelName,
      categoryName: r.categoryName,
      materialName: r.materialName,
      primaryImage: imageMap.get(r.productId) || null,
      downforceN: r.downforceN ? Number(r.downforceN) : null,
      dragN: r.dragN ? Number(r.dragN) : null,
      createdAt: r.createdAt,
    }));

    return { success: true, items };
  } catch (error) {
    console.error("[getWishlist] Error:", error);
    return { success: false, items: [], error: "Failed to load wishlist" };
  }
}

/**
 * Check if a product is in the user's wishlist
 */
export async function checkIsWishlisted(productId: string): Promise<{
  isWishlisted: boolean;
}> {
  const { userId } = auth();
  if (!userId) {
    return { isWishlisted: false };
  }

  const parseResult = z.string().uuid().safeParse(productId);
  if (!parseResult.success) {
    return { isWishlisted: false };
  }

  try {
    const [existing] = await db
      .select({ id: userInterests.id })
      .from(userInterests)
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.productId, productId),
          eq(userInterests.interactionType, "wishlist")
        )
      )
      .limit(1);

    return { isWishlisted: !!existing };
  } catch (error) {
    console.error("[checkIsWishlisted] Error:", error);
    return { isWishlisted: false };
  }
}

/**
 * Toggle a product in/out of the user's wishlist
 */
export async function toggleWishlist(productId: string): Promise<{
  success: boolean;
  isWishlisted: boolean;
  error?: string;
}> {
  const { userId } = auth();
  if (!userId) {
    return { success: false, isWishlisted: false, error: "Unauthorized" };
  }

  const parseResult = z.string().uuid().safeParse(productId);
  if (!parseResult.success) {
    return {
      success: false,
      isWishlisted: false,
      error: "Product does not exist in the database or invalid UUID",
    };
  }

  try {
    await ensureUserInDb(userId);

    const [existing] = await db
      .select({ id: userInterests.id })
      .from(userInterests)
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.productId, productId),
          eq(userInterests.interactionType, "wishlist")
        )
      )
      .limit(1);

    if (existing) {
      await db.delete(userInterests).where(eq(userInterests.id, existing.id));
      revalidatePath("/wishlist");
      revalidatePath("/products");
      return { success: true, isWishlisted: false };
    } else {
      await db.insert(userInterests).values({
        userId,
        productId,
        interactionType: "wishlist",
      });
      revalidatePath("/wishlist");
      revalidatePath("/products");
      return { success: true, isWishlisted: true };
    }
  } catch (error) {
    console.error("[toggleWishlist] Error:", error);
    return {
      success: false,
      isWishlisted: false,
      error: "Failed to update wishlist",
    };
  }
}

/**
 * Add a product to the user's wishlist
 */
export async function addToWishlist(productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parseResult = z.string().uuid().safeParse(productId);
  if (!parseResult.success) {
    return { success: false, error: "Invalid product ID" };
  }

  try {
    await ensureUserInDb(userId);

    const [existing] = await db
      .select({ id: userInterests.id })
      .from(userInterests)
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.productId, productId),
          eq(userInterests.interactionType, "wishlist")
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(userInterests).values({
        userId,
        productId,
        interactionType: "wishlist",
      });
    }

    revalidatePath("/wishlist");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("[addToWishlist] Error:", error);
    return { success: false, error: "Failed to add to wishlist" };
  }
}

/**
 * Remove a product from the user's wishlist
 */
export async function removeFromWishlist(productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parseResult = z.string().uuid().safeParse(productId);
  if (!parseResult.success) {
    return { success: false, error: "Invalid product ID" };
  }

  try {
    await db
      .delete(userInterests)
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.productId, productId),
          eq(userInterests.interactionType, "wishlist")
        )
      );

    revalidatePath("/wishlist");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("[removeFromWishlist] Error:", error);
    return { success: false, error: "Failed to remove from wishlist" };
  }
}
