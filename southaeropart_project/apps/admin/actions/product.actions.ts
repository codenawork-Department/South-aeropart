"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  products,
  productImages,
  categories,
  brands,
  carModels,
  materials,
  installations,
  productCompatibility,
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
  count,
  inArray,
} from "@repo/db";
import {
  uploadImage,
  deleteMultipleImages,
  deleteImage,
  renameImage,
} from "@repo/lib/cloudinary";
import { validateSession, logAuditEvent } from "@/lib/auth";
import {
  BRAND_CODE_MAP,
  MODEL_CODE_MAP,
  CATEGORY_CODE_MAP,
  getCodeFromSlug,
} from "@/lib/sku-helper";
import { notifyStorefrontCatalogChange } from "@/lib/realtime-notifier";

// ─── Types & Schemas ──────────────────────────────────────────────────────────

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

const featureItemSchema = z.object({
  title: z.string().min(1, "กรุณากรอกหัวข้อจุดเด่น").max(200).trim(),
  description: z.string().min(1, "กรุณากรอกคำอธิบายจุดเด่น").max(1000).trim(),
  iconSlug: z.string().optional().nullable(),
  iconId: z.string().optional().nullable(),
});

const productInputSchema = z.object({
  sku: z.string().min(1, "กรุณากรอกรหัสสินค้า (SKU)").max(100).trim(),
  name: z.string().min(1, "กรุณากรอกชื่อสินค้า").max(255).trim(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  price: z
    .string()
    .min(1, "กรุณากรอกราคา")
    .regex(/^\d+(\.\d{1,2})?$/, "รูปแบบราคาไม่ถูกต้อง เช่น 1500 หรือ 1500.50"),
  compareAtPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "รูปแบบราคาไม่ถูกต้อง")
    .optional()
    .nullable(),
  stockQuantity: z.number().int().min(0, "จำนวนสต็อกต้องไม่ติดลบ").default(0),
  status: z.enum(["draft", "active", "archived", "out_of_stock"]).default("draft"),
  isFeatured: z.boolean().default(false),
  weightKg: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "รูปแบบน้ำหนักไม่ถูกต้อง")
    .optional()
    .nullable(),
  installation: z.string().max(500).optional().nullable(),
  installationId: z.string().uuid("วิธีการติดตั้งไม่ถูกต้อง").optional().nullable(),
  categoryId: z.string().uuid("หมวดหมู่ไม่ถูกต้อง").optional().nullable(),
  brandId: z.string().uuid("แบรนด์ไม่ถูกต้อง").optional().nullable(),
  carModelId: z.string().uuid("รุ่นรถไม่ถูกต้อง").optional().nullable(),
  materialId: z.string().uuid("วัสดุไม่ถูกต้อง").optional().nullable(),
  // CFD Aerodynamic Telemetry
  downforceN: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  dragN: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  downforceBefore: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  downforceAfter: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  dragBefore: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  dragAfter: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  images: z
    .array(imageItemSchema)
    .max(20, "สามารถเพิ่มรูปภาพสินค้าได้สูงสุดไม่เกิน 20 รูป")
    .default([]),
  compatibility: z.array(compatibilityItemSchema).optional().default([]),
  features: z.array(featureItemSchema).optional().default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Query Actions ────────────────────────────────────────────────────────────

/**
 * Fetch all categories, brands, and car models for dropdown selectors
 */
export async function getCategoriesAndBrandsAction() {
  const [allCategories, allBrands, allModels, allMaterials, allInstallations] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.position), asc(categories.name)),

    db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        logoUrl: brands.logoUrl,
      })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name)),

    db
      .select({
        id: carModels.id,
        brandId: carModels.brandId,
        name: carModels.name,
        slug: carModels.slug,
        generation: carModels.generation,
        yearFrom: carModels.yearFrom,
        yearTo: carModels.yearTo,
      })
      .from(carModels)
      .where(eq(carModels.isActive, true))
      .orderBy(asc(carModels.name)),

    db
      .select({
        id: materials.id,
        name: materials.name,
        slug: materials.slug,
        description: materials.description,
      })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(asc(materials.name)),

    db
      .select({
        id: installations.id,
        name: installations.name,
        slug: installations.slug,
        description: installations.description,
      })
      .from(installations)
      .where(eq(installations.isActive, true))
      .orderBy(asc(installations.name)),
  ]);

  return {
    categories: allCategories,
    brands: allBrands,
    carModels: allModels,
    materials: allMaterials,
    installations: allInstallations,
  };
}

/**
 * Get paginated list of products with their primary image and relations
 */
export async function getProductsAction(params?: {
  search?: string;
  status?: string;
  categoryId?: string;
  brandId?: string;
  carModelId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(products.productType, "single")];

  if (params?.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    const searchCondition = or(
      ilike(products.name, q),
      ilike(products.sku, q),
      ilike(products.slug, q)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (
    params?.status &&
    ["draft", "active", "archived", "out_of_stock"].includes(params.status)
  ) {
    conditions.push(
      eq(
        products.status,
        params.status as "draft" | "active" | "archived" | "out_of_stock"
      )
    );
  }

  if (params?.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId));
  }

  if (params?.brandId) {
    conditions.push(eq(products.brandId, params.brandId));
  }

  if (params?.carModelId) {
    conditions.push(eq(products.carModelId, params.carModelId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalCountResult] = await db
    .select({ count: count() })
    .from(products)
    .where(whereClause);

  const total = Number(totalCountResult?.count || 0);

  const productRows = await db
    .select({
      id: products.id,
      sku: products.sku,
      slug: products.slug,
      name: products.name,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      stockQuantity: products.stockQuantity,
      status: products.status,
      isFeatured: products.isFeatured,
      weightKg: products.weightKg,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      brandName: brands.name,
      brandSlug: brands.slug,
      carModelName: carModels.name,
      carModelSlug: carModels.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(carModels, eq(products.carModelId, carModels.id))
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch primary images for these products
  const productIds = productRows.map((p) => p.id);
  const images =
    productIds.length > 0
      ? await db
          .select({
            id: productImages.id,
            productId: productImages.productId,
            cloudinaryPublicId: productImages.cloudinaryPublicId,
            secureUrl: productImages.secureUrl,
            isPrimary: productImages.isPrimary,
            position: productImages.position,
          })
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(asc(productImages.position))
      : [];

  const items = productRows.map((p) => {
    const pImages = images.filter((img) => img.productId === p.id);
    const primaryImg = pImages.find((img) => img.isPrimary) || pImages[0];
    return {
      ...p,
      primaryImage: primaryImg || null,
      imagesCount: pImages.length,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get product by ID with all relations, images, compatibility items, and carModel
 */
export async function getProductByIdAction(id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) return null;

  const [images, compatibility, brand, carModel, category, material, installationMethod] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productCompatibility)
      .where(eq(productCompatibility.productId, id)),
    product.brandId
      ? db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1)
      : Promise.resolve([]),
    product.carModelId
      ? db.select().from(carModels).where(eq(carModels.id, product.carModelId)).limit(1)
      : Promise.resolve([]),
    product.categoryId
      ? db
          .select()
          .from(categories)
          .where(eq(categories.id, product.categoryId))
          .limit(1)
      : Promise.resolve([]),
    product.materialId
      ? db.select({ id: materials.id, name: materials.name, slug: materials.slug }).from(materials).where(eq(materials.id, product.materialId)).limit(1)
      : Promise.resolve([]),
    product.installationId
      ? db.select({ id: installations.id, name: installations.name, slug: installations.slug }).from(installations).where(eq(installations.id, product.installationId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...product,
    images,
    compatibility,
    brand: brand[0] || null,
    carModel: carModel[0] || null,
    category: category[0] || null,
    material: material[0] || null,
    installationMethod: installationMethod[0] || null,
  };
}

// ─── Mutation Actions ─────────────────────────────────────────────────────────

/**
 * Create a new product with Cloudinary images organized in structured hierarchy:
 * south-aero/products/[brand]/[model]/[category]/[product-slug]
 */
export async function createProductAction(
  input: ProductInput
): Promise<ActionResult<{ productId: string }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Auto-generate slug if not provided
  let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
  if (!slug) {
    slug = `part-${data.sku.toLowerCase()}-${Date.now().toString(36)}`;
  }

  // Check unique SKU and Slug
  const existingProduct = await db
    .select({ id: products.id, sku: products.sku, slug: products.slug })
    .from(products)
    .where(or(eq(products.sku, data.sku), eq(products.slug, slug)))
    .limit(1);

  if (existingProduct.length > 0) {
    if (existingProduct[0].sku.toLowerCase() === data.sku.toLowerCase()) {
      return {
        success: false,
        message: `รหัสสินค้า SKU '${data.sku}' นี้มีอยู่ในระบบแล้ว`,
      };
    }
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Resolve hierarchical folder slugs for Cloudinary
  let brandSlug = "general";
  let modelSlug = "universal";
  let categorySlug = "aeropart";

  if (data.brandId) {
    const [b] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, data.brandId)).limit(1);
    if (b) brandSlug = b.slug;
  }

  if (data.carModelId) {
    const [m] = await db.select({ slug: carModels.slug }).from(carModels).where(eq(carModels.id, data.carModelId)).limit(1);
    if (m) modelSlug = m.slug;
  }

  if (data.categoryId) {
    const [c] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, data.categoryId)).limit(1);
    if (c) categorySlug = c.slug;
  }

  // Target Cloudinary Folder Path: south-aero/products/[brand]/[model]/[category]/[slug]
  const cloudinaryFolder = `south-aero/products/${brandSlug}/${modelSlug}/${categorySlug}/${slug}`;

  // 1. Upload new images to Cloudinary
  const validImagesToUpload = data.images.filter((img) => img.data && !img.isDeleted);

  const uploadedCloudinaryImages: Array<{
    publicId: string;
    secureUrl: string;
    position: number;
    isPrimary: boolean;
  }> = [];

  try {
    for (let i = 0; i < validImagesToUpload.length; i++) {
      const img = validImagesToUpload[i];
      if (img.data) {
        const uploaded = await uploadImage(img.data, {
          folder: cloudinaryFolder,
          tags: ["south-aero", "product", brandSlug, modelSlug, categorySlug, data.sku],
        });
        uploadedCloudinaryImages.push({
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          position: img.position ?? i,
          isPrimary: img.isPrimary ?? i === 0,
        });
      }
    }

    // Ensure at least one image is primary if there are images
    if (
      uploadedCloudinaryImages.length > 0 &&
      !uploadedCloudinaryImages.some((img) => img.isPrimary)
    ) {
      uploadedCloudinaryImages[0].isPrimary = true;
    }

    // 2. Insert into products table
    const [newProduct] = await db
      .insert(products)
      .values({
        sku: data.sku,
        slug,
        name: data.name,
        description: data.description ?? null,
        shortDescription: data.shortDescription ?? null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        stockQuantity: data.stockQuantity,
        status: data.status,
        isFeatured: data.isFeatured ?? false,
        weightKg: data.weightKg ?? null,
        installation: data.installation ?? null,
        installationId: data.installationId ?? null,
        categoryId: data.categoryId ?? null,
        brandId: data.brandId ?? null,
        carModelId: data.carModelId ?? null,
        materialId: data.materialId ?? null,
        downforceN: data.downforceN ?? null,
        dragN: data.dragN ?? null,
        downforceBefore: data.downforceBefore ?? null,
        downforceAfter: data.downforceAfter ?? null,
        dragBefore: data.dragBefore ?? null,
        dragAfter: data.dragAfter ?? null,
        features: data.features || [],
      })
      .returning({ id: products.id });

    // 3. Insert product_images
    if (uploadedCloudinaryImages.length > 0) {
      await db.insert(productImages).values(
        uploadedCloudinaryImages.map((img) => ({
          productId: newProduct.id,
          cloudinaryPublicId: img.publicId,
          secureUrl: img.secureUrl,
          position: img.position,
          isPrimary: img.isPrimary,
        }))
      );
    }

    // 4. Insert product_compatibility
    if (data.compatibility && data.compatibility.length > 0) {
      await db.insert(productCompatibility).values(
        data.compatibility.map((c) => ({
          productId: newProduct.id,
          make: c.make,
          model: c.model,
          yearFrom: c.yearFrom,
          yearTo: c.yearTo,
        }))
      );
    }

    // 5. Audit Log
    await logAuditEvent({
      adminId: admin.id,
      action: "product.created",
      entityType: "product",
      entityId: newProduct.id,
      metadata: {
        sku: data.sku,
        name: data.name,
        cloudinaryFolder,
        imagesCount: uploadedCloudinaryImages.length,
      },
    });

    revalidatePath("/products");
    notifyStorefrontCatalogChange("product.created", { id: newProduct.id });
    return {
      success: true,
      message: "สร้างสินค้าใหม่พร้อมจัดเก็บรูปภาพตามหมวดหมู่สำเร็จ",
      data: { productId: newProduct.id },
    };
  } catch (error) {
    console.error("[CreateProductAction] Error:", error);
    // Cleanup any uploaded images if creation failed
    if (uploadedCloudinaryImages.length > 0) {
      await deleteMultipleImages(
        uploadedCloudinaryImages.map((img) => img.publicId)
      );
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างสินค้า",
    };
  }
}

/**
 * Update existing product, manage Cloudinary images & compatibility
 */
export async function updateProductAction(
  productId: string,
  input: ProductInput
): Promise<ActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Check product exists
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existingProduct) {
    return { success: false, message: "ไม่พบสินค้าในระบบ" };
  }

  // Resolve hierarchical folder slugs for Cloudinary
  let brandSlug = "general";
  let modelSlug = "universal";
  let categorySlug = "aeropart";

  if (data.brandId) {
    const [b] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, data.brandId)).limit(1);
    if (b) brandSlug = b.slug;
  }

  if (data.carModelId) {
    const [m] = await db.select({ slug: carModels.slug }).from(carModels).where(eq(carModels.id, data.carModelId)).limit(1);
    if (m) modelSlug = m.slug;
  }

  if (data.categoryId) {
    const [c] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, data.categoryId)).limit(1);
    if (c) categorySlug = c.slug;
  }

  const cloudinaryFolder = `south-aero/products/${brandSlug}/${modelSlug}/${categorySlug}/${existingProduct.slug}`;

  // Fetch current database images for this product
  const currentDbImages = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId));

  // Determine images to delete from Cloudinary
  const removedImages = data.images.filter(
    (img) => img.isDeleted && img.publicId
  );
  const publicIdsToDelete = removedImages
    .map((img) => img.publicId!)
    .filter(Boolean);

  // New images to upload to Cloudinary
  const newImagesToUpload = data.images.filter(
    (img) => img.data && !img.isDeleted
  );

  const newlyUploadedImages: Array<{
    publicId: string;
    secureUrl: string;
    position: number;
    isPrimary: boolean;
  }> = [];

  try {
    // 1. Delete removed images from Cloudinary and database
    if (publicIdsToDelete.length > 0) {
      await deleteMultipleImages(publicIdsToDelete);
      await db
        .delete(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            inArray(productImages.cloudinaryPublicId, publicIdsToDelete)
          )
        );
    }

    // 2. Upload new images to Cloudinary in the structured folder
    for (let i = 0; i < newImagesToUpload.length; i++) {
      const img = newImagesToUpload[i];
      if (img.data) {
        const uploaded = await uploadImage(img.data, {
          folder: cloudinaryFolder,
          tags: ["south-aero", "product", brandSlug, modelSlug, categorySlug, data.sku],
        });
        newlyUploadedImages.push({
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          position: img.position ?? (currentDbImages.length + i),
          isPrimary: img.isPrimary ?? false,
        });
      }
    }

    // 3. Insert newly uploaded images into product_images
    if (newlyUploadedImages.length > 0) {
      await db.insert(productImages).values(
        newlyUploadedImages.map((img) => ({
          productId,
          cloudinaryPublicId: img.publicId,
          secureUrl: img.secureUrl,
          position: img.position,
          isPrimary: img.isPrimary,
        }))
      );
    }

    // 4. Update existing image positions, isPrimary flags, and auto-relocate to new folder hierarchy
    const existingRetainedImages = data.images.filter(
      (img) => !img.isDeleted && !img.data && img.id
    );

    for (const img of existingRetainedImages) {
      if (img.id) {
        let currentPublicId = img.publicId;
        let currentSecureUrl = img.secureUrl;

        // If the asset is currently in an old folder path, relocate it on Cloudinary
        if (currentPublicId) {
          const lastSlash = currentPublicId.lastIndexOf("/");
          const currentFolder = lastSlash !== -1 ? currentPublicId.substring(0, lastSlash) : "";
          if (currentFolder && currentFolder !== cloudinaryFolder) {
            const fileName = currentPublicId.substring(lastSlash + 1);
            const targetPublicId = `${cloudinaryFolder}/${fileName}`;
            const renamed = await renameImage(currentPublicId, targetPublicId);
            if (renamed) {
              currentPublicId = renamed.publicId;
              currentSecureUrl = renamed.secureUrl;
            }
          }
        }

        await db
          .update(productImages)
          .set({
            position: img.position,
            isPrimary: img.isPrimary,
            cloudinaryPublicId: currentPublicId,
            secureUrl: currentSecureUrl,
          })
          .where(eq(productImages.id, img.id));
      }
    }

    // 5. Update main product info (including slug if name changed)
    let newSlug = existingProduct.slug;
    if (data.name !== existingProduct.name) {
      newSlug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
      if (!newSlug) newSlug = existingProduct.slug;

      // If slug conflicts with another product, append timestamp
      const [anyConflict] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, newSlug))
        .limit(1);
      if (anyConflict && anyConflict.id !== productId) {
        newSlug = `${newSlug}-${Date.now().toString(36)}`;
      }
    }

    await db
      .update(products)
      .set({
        sku: data.sku,
        slug: newSlug,
        name: data.name,
        description: data.description ?? null,
        shortDescription: data.shortDescription ?? null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        stockQuantity: data.stockQuantity,
        status: data.status,
        isFeatured: data.isFeatured ?? false,
        weightKg: data.weightKg ?? null,
        installation: data.installation ?? null,
        installationId: data.installationId ?? null,
        categoryId: data.categoryId ?? null,
        brandId: data.brandId ?? null,
        carModelId: data.carModelId ?? null,
        materialId: data.materialId ?? null,
        downforceN: data.downforceN ?? null,
        dragN: data.dragN ?? null,
        downforceBefore: data.downforceBefore ?? null,
        downforceAfter: data.downforceAfter ?? null,
        dragBefore: data.dragBefore ?? null,
        dragAfter: data.dragAfter ?? null,
        features: data.features || [],
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // 6. Update product_compatibility (replace with new list)
    await db
      .delete(productCompatibility)
      .where(eq(productCompatibility.productId, productId));

    if (data.compatibility && data.compatibility.length > 0) {
      await db.insert(productCompatibility).values(
        data.compatibility.map((c) => ({
          productId,
          make: c.make,
          model: c.model,
          yearFrom: c.yearFrom,
          yearTo: c.yearTo,
        }))
      );
    }

    // 7. Audit Log
    await logAuditEvent({
      adminId: admin.id,
      action: "product.updated",
      entityType: "product",
      entityId: productId,
      metadata: { sku: data.sku, name: data.name, cloudinaryFolder },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}/edit`);
    notifyStorefrontCatalogChange("product.updated", { id: productId });

    return { success: true, message: "อัปเดตข้อมูลสินค้าสำเร็จ" };
  } catch (error) {
    console.error("[UpdateProductAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตสินค้า",
    };
  }
}

/**
 * Delete a product and completely cleanup its images on Cloudinary
 */
export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const [product] = await db
    .select({ id: products.id, sku: products.sku, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { success: false, message: "ไม่พบสินค้าในระบบ" };
  }

  try {
    // 1. Find all images on Cloudinary
    const images = await db
      .select({ publicId: productImages.cloudinaryPublicId })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    const publicIds = images
      .map((img) => img.publicId)
      .filter((id): id is string => Boolean(id));

    // 2. Destroy from Cloudinary
    if (publicIds.length > 0) {
      await deleteMultipleImages(publicIds);
    }

    // 3. Delete product (Postgres foreign keys with CASCADE will remove product_images & product_compatibility)
    await db.delete(products).where(eq(products.id, productId));

    // 4. Audit Log
    await logAuditEvent({
      adminId: admin.id,
      action: "product.deleted",
      entityType: "product",
      entityId: productId,
      metadata: {
        sku: product.sku,
        name: product.name,
        deletedImagesCount: publicIds.length,
      },
    });

    revalidatePath("/products");
    notifyStorefrontCatalogChange("product.deleted", { id: productId });
    return { success: true, message: "ลบสินค้าและรูปภาพสำเร็จ" };
  } catch (error) {
    console.error("[DeleteProductAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบสินค้า",
    };
  }
}

// ─── SKU Helpers & Auto-Generation Actions ───────────────────────────────────

export interface SkuSuggestionResult {
  sku: string;
  brandCode: string;
  brandName: string;
  modelCode: string;
  modelName: string;
  categoryCode: string;
  categoryName: string;
  sequence: string;
  prefix: string;
  existingCount: number;
}

/**
 * Generate a smart standardized SKU: [BrandCode][ModelCode]-[CategoryCode][Sequence]
 * Example: Honda + Accord + Ducktail => "HDAC-DT01"
 */
export async function generateSuggestedSkuAction(params: {
  brandId?: string | null;
  carModelId?: string | null;
  categoryId?: string | null;
}): Promise<ActionResult<SkuSuggestionResult>> {
  try {
    let brandSlug = "universal";
    let brandName = "Universal";
    let modelSlug = "universal";
    let modelName = "Universal";
    let categorySlug = "aeropart";
    let categoryName = "Aeropart";

    if (params.brandId) {
      const [b] = await db
        .select({ slug: brands.slug, name: brands.name })
        .from(brands)
        .where(eq(brands.id, params.brandId))
        .limit(1);
      if (b) {
        brandSlug = b.slug;
        brandName = b.name;
      }
    }

    if (params.carModelId) {
      const [m] = await db
        .select({ slug: carModels.slug, name: carModels.name })
        .from(carModels)
        .where(eq(carModels.id, params.carModelId))
        .limit(1);
      if (m) {
        modelSlug = m.slug;
        modelName = m.name;
      }
    }

    if (params.categoryId) {
      const [c] = await db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .where(eq(categories.id, params.categoryId))
        .limit(1);
      if (c) {
        categorySlug = c.slug;
        categoryName = c.name;
      }
    }

    const brandCode = getCodeFromSlug(brandSlug, BRAND_CODE_MAP, "UN");
    const modelCode = getCodeFromSlug(modelSlug, MODEL_CODE_MAP, "UN");
    const categoryCode = getCodeFromSlug(categorySlug, CATEGORY_CODE_MAP, "AP");

    const prefix = `${brandCode}${modelCode}-${categoryCode}`;

    // Find all existing SKUs matching this prefix
    const matchingProducts = await db
      .select({ sku: products.sku })
      .from(products)
      .where(ilike(products.sku, `${prefix}%`));

    // Find the highest sequence number
    let maxSequence = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

    for (const item of matchingProducts) {
      const match = item.sku.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSequence) {
          maxSequence = num;
        }
      }
    }

    const nextSeq = maxSequence + 1;
    const sequenceStr = String(nextSeq).padStart(2, "0");
    const suggestedSku = `${prefix}${sequenceStr}`;

    return {
      success: true,
      data: {
        sku: suggestedSku,
        brandCode,
        brandName,
        modelCode,
        modelName,
        categoryCode,
        categoryName,
        sequence: sequenceStr,
        prefix,
        existingCount: matchingProducts.length,
      },
    };
  } catch (error) {
    console.error("[generateSuggestedSkuAction] Error:", error);
    return {
      success: false,
      message: "ไม่สามารถคำนวณรหัส SKU อัตโนมัติได้",
    };
  }
}

/**
 * Check if an SKU is available or already used
 */
export async function checkSkuAvailabilityAction(
  sku: string,
  excludeProductId?: string
): Promise<{ isAvailable: boolean; message: string; existingName?: string }> {
  try {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) {
      return { isAvailable: true, message: "" };
    }

    const existing = await db
      .select({ id: products.id, sku: products.sku, name: products.name })
      .from(products)
      .where(ilike(products.sku, trimmed))
      .limit(1);

    if (existing.length === 0) {
      return { isAvailable: true, message: "รหัส SKU นี้พร้อมใช้งาน (ไม่ซ้ำ)" };
    }

    if (excludeProductId && existing[0].id === excludeProductId) {
      return { isAvailable: true, message: "รหัส SKU ของสินค้านี้" };
    }

    return {
      isAvailable: false,
      message: `รหัส SKU นี้ถูกใช้งานแล้ว โดยสินค้า "${existing[0].name}"`,
      existingName: existing[0].name,
    };
  } catch {
    return { isAvailable: true, message: "" };
  }
}

/**
 * Toggle featured status for single product (สินค้าแนะนำ)
 */
export async function toggleProductFeaturedAction(
  productId: string,
  isFeatured: boolean
): Promise<ActionResult<{ isFeatured: boolean; count: number }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  try {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        productType: products.productType,
        isFeatured: products.isFeatured,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.productType, "single")))
      .limit(1);

    if (!product) {
      return { success: false, message: "ไม่พบสินค้าเดี่ยวนี้ในระบบ หรือสินค้านี้เป็นประเภทชุดเซ็ต" };
    }

    // Update isFeatured
    await db
      .update(products)
      .set({
        isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Get current total featured single products count
    const [countRes] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.productType, "single"),
          eq(products.isFeatured, true)
        )
      );

    const totalFeatured = Number(countRes?.count || 0);

    await logAuditEvent({
      adminId: admin.id,
      action: isFeatured ? "feature_product" : "unfeature_product",
      entityId: productId,
      entityType: "product",
      metadata: {
        name: product.name,
        isFeatured,
        totalFeatured,
      },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}/edit`);
    revalidatePath("/");
    notifyStorefrontCatalogChange("product.featured_toggled", { id: productId, isFeatured });

    return {
      success: true,
      message: isFeatured
        ? `ตั้ง '${product.name}' เป็นสินค้าแนะนำเรียบร้อยแล้ว (รวมแนะนำ ${totalFeatured} ชิ้น)`
        : `ยกเลิกสินค้าแนะนำสำหรับ '${product.name}' แล้ว (คงเหลือแนะนำ ${totalFeatured} ชิ้น)`,
      data: { isFeatured, count: totalFeatured },
    };
  } catch (error: any) {
    console.error("Error toggling product featured:", error);
    return {
      success: false,
      message: error?.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะสินค้าแนะนำ",
    };
  }
}

/**
 * Quick update status for single products from the table list
 */
export async function updateProductStatusAction(
  productId: string,
  status: "draft" | "active" | "archived" | "out_of_stock"
): Promise<ActionResult<{ status: string }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  try {
    const [product] = await db
      .select({ id: products.id, name: products.name, status: products.status })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.productType, "single")))
      .limit(1);

    if (!product) {
      return { success: false, message: "ไม่พบสินค้าในระบบ" };
    }

    await db
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    const statusLabels: Record<string, string> = {
      active: "วางขาย (Active)",
      draft: "ร่าง (Draft)",
      out_of_stock: "สินค้าหมด (Out of Stock)",
      archived: "เก็บเข้ากรุ (Archived)",
    };

    await logAuditEvent({
      adminId: admin.id,
      action: "product.status_changed",
      entityId: productId,
      entityType: "product",
      metadata: {
        name: product.name,
        previousStatus: product.status,
        newStatus: status,
      },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}/edit`);
    revalidatePath("/");
    notifyStorefrontCatalogChange("product.status_changed", { id: productId, status });

    return {
      success: true,
      message: `เปลี่ยนสถานะ '${product.name}' เป็น "${statusLabels[status] || status}" สำเร็จ`,
      data: { status },
    };
  } catch (error: any) {
    console.error("Error updating product status:", error);
    return {
      success: false,
      message: error?.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะสินค้า",
    };
  }
}


