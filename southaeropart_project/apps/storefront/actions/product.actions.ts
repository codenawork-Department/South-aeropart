"use server";

import {
  db,
  products,
  productImages,
  categories,
  brands,
  carModels,
  materials,
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  inArray,
  count,
  sql,
} from "@repo/db";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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

/** Shared product item shape used by the storefront products grid & cart */
export interface ShopProductItem {
  id: string;
  slug: string;
  sku: string;
  name: string;
  productType: "single" | "bundle";
  brandName: string;
  carModelName: string | null;
  categoryName: string;
  categorySlug: string | null;
  materialName: string | null;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  downforceN: number | null;
  dragN: number | null;
  primaryImage: string;
  isFeatured: boolean;
}

export interface ShopProductsResult {
  products: ShopProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActiveCategory {
  id: string;
  slug: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const sortColumnSchema = z.enum(["name", "price", "newest"]).default("newest");
const sortDirSchema = z.enum(["asc", "desc"]).default("desc");

const shopProductsInputSchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  brandSlug: z.string().max(100).optional(),
  modelSlug: z.string().max(100).optional(),
  sortBy: sortColumnSchema,
  sortDir: sortDirSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export type ShopProductsInput = z.infer<typeof shopProductsInputSchema>;

// ---------------------------------------------------------------------------
// getActiveCategories — dynamic filter pills
// ---------------------------------------------------------------------------

export async function getActiveCategories(): Promise<ActiveCategory[]> {
  try {
    const rows = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.position), asc(categories.name));

    return rows;
  } catch (error) {
    console.error("[getActiveCategories] Error:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getShopProducts — paginated, filterable, searchable product listing
// ---------------------------------------------------------------------------

export async function getShopProducts(
  rawInput: ShopProductsInput
): Promise<ShopProductsResult> {
  const input = shopProductsInputSchema.parse(rawInput);

  const { search, category, brandSlug, modelSlug, sortBy, sortDir, page, pageSize } =
    input;

  try {
    // Build WHERE conditions — only active products shown on storefront
    const conditions: ReturnType<typeof eq>[] = [
      eq(products.status, "active"),
    ];

    // Category filter (by slug)
    if (category && category !== "all") {
      conditions.push(eq(categories.slug, category));
    }

    // Brand filter (by slug from VehicleSelector)
    if (brandSlug) {
      conditions.push(eq(brands.slug, brandSlug));
    }

    // Car model filter (by slug from VehicleSelector)
    if (modelSlug) {
      conditions.push(eq(carModels.slug, modelSlug));
    }

    // Search (case-insensitive against name + sku + short description)
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.sku, term),
          ilike(products.shortDescription, term)
        )!
      );
    }

    const whereClause = and(...conditions);

    // ---- Count total for pagination ----
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause);

    const total = Number(totalCount);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    // ---- Determine ORDER BY ----
    const orderClauses = (() => {
      switch (sortBy) {
        case "name":
          return sortDir === "asc" ? [asc(products.name)] : [desc(products.name)];
        case "price":
          return sortDir === "asc" ? [asc(products.price)] : [desc(products.price)];
        case "newest":
        default:
          return [desc(products.createdAt), desc(products.updatedAt)];
      }
    })();

    // ---- Fetch products page ----
    const rawProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        productType: products.productType,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stockQuantity: products.stockQuantity,
        downforceN: products.downforceN,
        dragN: products.dragN,
        isFeatured: products.isFeatured,
        brandName: brands.name,
        carModelName: carModels.name,
        categoryName: categories.name,
        categorySlug: categories.slug,
        materialName: materials.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(materials, eq(products.materialId, materials.id))
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(pageSize)
      .offset(offset);

    if (rawProducts.length === 0) {
      return { products: [], total, page: safePage, pageSize, totalPages };
    }

    // ---- Fetch primary images for this batch ----
    const productIds = rawProducts.map((p) => p.id);
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

    // Map images by productId
    const imageMap = new Map<string, string>();
    for (const img of images) {
      // Prefer isPrimary, fallback to first by position
      if (!imageMap.has(img.productId) || img.isPrimary) {
        imageMap.set(img.productId, img.secureUrl);
      }
    }

    const mappedProducts: ShopProductItem[] = rawProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      productType: p.productType,
      brandName: p.brandName || "South Aero",
      carModelName: p.carModelName,
      categoryName: p.categoryName || "Aeropart",
      categorySlug: p.categorySlug,
      materialName: p.materialName,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stockQuantity: p.stockQuantity,
      downforceN: p.downforceN ? Number(p.downforceN) : null,
      dragN: p.dragN ? Number(p.dragN) : null,
      primaryImage: imageMap.get(p.id) || "/images/FRONT.png",
      isFeatured: p.isFeatured,
    }));

    return {
      products: mappedProducts,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("[getShopProducts] Error:", error);
    return { products: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }
}

// ---------------------------------------------------------------------------
// getFeaturedProducts — homepage featured singles
// ---------------------------------------------------------------------------

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

