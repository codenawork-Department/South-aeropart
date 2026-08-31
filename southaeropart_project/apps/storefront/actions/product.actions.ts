"use server";

import {
  db,
  products,
  productImages,
  categories,
  brands,
  carModels,
  eq,
  and,
  desc,
  asc,
  inArray,
} from "@repo/db";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export interface FeaturedProductItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brandName?: string | null;
  carModelName?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  price: string;
  compareAtPrice?: string | null;
  downforceN?: number | null;
  dragN?: number | null;
  primaryImage: string;
  isFeatured: boolean;
}

/**
 * ดึงข้อมูลสินค้าเดี่ยวแนะนำ (isFeatured = true และ status = 'active' และ productType = 'single') สำหรับหน้าแรก
 */
export async function getFeaturedProducts(): Promise<FeaturedProductItem[]> {
  try {
    const rawProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        productType: products.productType,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        downforceN: products.downforceN,
        dragN: products.dragN,
        isFeatured: products.isFeatured,
        status: products.status,
        brandName: brands.name,
        carModelName: carModels.name,
        categoryName: categories.name,
        categorySlug: categories.slug,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.productType, "single"),
          eq(products.isFeatured, true),
          eq(products.status, "active")
        )
      )
      .orderBy(desc(products.updatedAt), desc(products.createdAt))
      .limit(8);

    if (rawProducts && rawProducts.length > 0) {
      const productIds = rawProducts.map((p) => p.id);

      const images = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          position: productImages.position,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.position));

      return rawProducts.map((p) => {
        const pImages = images.filter((img) => img.productId === p.id);
        const primaryImg = pImages.find((img) => img.isPrimary) || pImages[0];
        const primaryImage = primaryImg?.secureUrl || "/images/FRONT.png";

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          brandName: p.brandName || "South Aero",
          carModelName: p.carModelName,
          categoryName: p.categoryName || "Aeropart",
          categorySlug: p.categorySlug,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          downforceN: p.downforceN ? Number(p.downforceN) : null,
          dragN: p.dragN ? Number(p.dragN) : null,
          primaryImage,
          isFeatured: p.isFeatured,
        };
      });
    }

    return [];
  } catch (error) {
    console.error("[getFeaturedProducts] Error fetching from DB:", error);
    return [];
  }
}

