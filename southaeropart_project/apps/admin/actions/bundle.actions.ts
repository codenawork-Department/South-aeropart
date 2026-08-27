"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  products,
  productImages,
  productBundleItems,
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
  sql,
} from "@repo/db";
import {
  uploadImage,
  deleteMultipleImages,
  deleteImage,
  renameImage,
} from "@repo/lib/cloudinary";
import { validateSession, logAuditEvent } from "@/lib/auth";

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

const bundleInputSchema = z.object({
  sku: z.string().min(1, "กรุณากรอกรหัสชุดเซ็ต (SKU)").max(100).trim(),
  name: z.string().min(1, "กรุณากรอกชื่อชุดเซ็ต").max(255).trim(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  brandId: z.string().uuid("กรุณาเลือกแบรนด์รถ"),
  carModelId: z.string().uuid("กรุณาเลือกรุ่นรถ"),
  materialId: z.string().uuid("วัสดุไม่ถูกต้อง").optional().nullable(),
  installationId: z.string().uuid("วิธีการติดตั้งไม่ถูกต้อง").optional().nullable(),
  status: z.enum(["draft", "active", "archived", "out_of_stock"]).default("active"),
  isFeatured: z.boolean().default(false),
  // CFD Aerodynamic Telemetry (Override)
  isCustomCfd: z.boolean().default(false),
  customDownforceN: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  customDragN: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "รูปแบบตัวเลขไม่ถูกต้อง").optional().nullable(),
  // Child Parts in Bundle (Min 2 parts)
  childProductIds: z
    .array(z.string().uuid("รหัสชิ้นส่วนไม่ถูกต้อง"))
    .min(2, "ชุดเซ็ตต้องประกอบด้วยชิ้นส่วนอย่างน้อย 2 ชิ้น"),
  images: z
    .array(imageItemSchema)
    .max(20, "สามารถเพิ่มรูปภาพสินค้าได้สูงสุดไม่เกิน 20 รูป")
    .default([]),
});

export type BundleInput = z.infer<typeof bundleInputSchema>;

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

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
 * Get single parts available for a specific Car Model, grouped by Category
 */
export async function getAvailablePartsForModelAction(carModelId: string) {
  try {
    const parts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stockQuantity: products.stockQuantity,
        status: products.status,
        downforceN: products.downforceN,
        dragN: products.dragN,
        weightKg: products.weightKg,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        materialId: products.materialId,
        materialName: materials.name,
        carModelId: products.carModelId,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(materials, eq(products.materialId, materials.id))
      .where(
        and(
          eq(products.carModelId, carModelId),
          eq(products.productType, "single")
        )
      )
      .orderBy(asc(categories.name), asc(products.name));

    // Fetch primary images for these parts
    const partIds = parts.map((p) => p.id);
    let imagesMap: Record<string, string> = {};

    if (partIds.length > 0) {
      const images = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, partIds));

      images.forEach((img) => {
        if (!imagesMap[img.productId] || img.isPrimary) {
          imagesMap[img.productId] = img.secureUrl;
        }
      });
    }

    const enrichedParts = parts.map((p) => ({
      ...p,
      primaryImage: imagesMap[p.id] || null,
    }));

    return {
      success: true,
      parts: enrichedParts,
    };
  } catch (error) {
    console.error("Error in getAvailablePartsForModelAction:", error);
    return {
      success: false,
      parts: [],
      message: "ไม่สามารถดึงข้อมูลชิ้นส่วนได้",
    };
  }
}

/**
 * List all Aero Kits / Bundles with pagination & search
 */
export async function getBundlesAction(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  carModelId?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(products.productType, "bundle")];

  if (params?.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(ilike(products.name, term), ilike(products.sku, term))!
    );
  }

  if (params?.status && params.status !== "all") {
    conditions.push(eq(products.status, params.status as any));
  }

  if (params?.carModelId && params.carModelId !== "all") {
    conditions.push(eq(products.carModelId, params.carModelId));
  }

  const whereClause = and(...conditions);

  try {
    const [totalRes] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalRes?.count || 0);

    const rawBundles = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        price: products.price,
        stockQuantity: products.stockQuantity,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        downforceN: products.downforceN,
        customDownforceN: products.customDownforceN,
        dragN: products.dragN,
        customDragN: products.customDragN,
        brandId: products.brandId,
        brandName: brands.name,
        carModelId: products.carModelId,
        carModelName: carModels.name,
        carModelGen: carModels.generation,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch primary images and bundle child items count for each bundle
    const bundleIds = rawBundles.map((b) => b.id);
    let imagesMap: Record<string, string> = {};
    let childPartsMap: Record<string, Array<{ id: string; name: string; price: string; categoryName: string; secureUrl?: string }>> = {};

    if (bundleIds.length > 0) {
      const [images, childItems] = await Promise.all([
        db
          .select({
            productId: productImages.productId,
            secureUrl: productImages.secureUrl,
            isPrimary: productImages.isPrimary,
          })
          .from(productImages)
          .where(inArray(productImages.productId, bundleIds)),
        db
          .select({
            bundleProductId: productBundleItems.bundleProductId,
            childProductId: productBundleItems.childProductId,
            position: productBundleItems.position,
            childName: products.name,
            childPrice: products.price,
            categoryName: categories.name,
          })
          .from(productBundleItems)
          .innerJoin(products, eq(productBundleItems.childProductId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(inArray(productBundleItems.bundleProductId, bundleIds))
          .orderBy(asc(productBundleItems.position)),
      ]);

      images.forEach((img) => {
        if (!imagesMap[img.productId] || img.isPrimary) {
          imagesMap[img.productId] = img.secureUrl;
        }
      });

      childItems.forEach((item) => {
        if (!childPartsMap[item.bundleProductId]) {
          childPartsMap[item.bundleProductId] = [];
        }
        childPartsMap[item.bundleProductId].push({
          id: item.childProductId,
          name: item.childName,
          price: item.childPrice,
          categoryName: item.categoryName || "-",
        });
      });
    }

    const items = rawBundles.map((b) => {
      const childParts = childPartsMap[b.id] || [];
      // Calculate dynamic price sum based on current child parts
      const dynamicPriceSum = childParts.reduce((acc, part) => acc + Number(part.price || 0), 0);
      const effectivePrice = dynamicPriceSum > 0 ? dynamicPriceSum.toFixed(2) : b.price;

      return {
        ...b,
        price: effectivePrice,
        childPartsCount: childParts.length,
        childParts,
        primaryImage: imagesMap[b.id] || null,
        effectiveDownforce: b.isCustomCfd && b.customDownforceN ? Number(b.customDownforceN) : Number(b.downforceN || 0),
        effectiveDrag: b.isCustomCfd && b.customDragN ? Number(b.customDragN) : Number(b.dragN || 0),
      };
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error in getBundlesAction:", error);
    return {
      items: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    };
  }
}

/**
 * Get detailed bundle info by ID for editing
 */
export async function getBundleDetailAction(id: string) {
  try {
    const [bundle] = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        description: products.description,
        shortDescription: products.shortDescription,
        price: products.price,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        customDownforceN: products.customDownforceN,
        customDragN: products.customDragN,
        downforceN: products.downforceN,
        dragN: products.dragN,
        brandId: products.brandId,
        carModelId: products.carModelId,
        materialId: products.materialId,
        installationId: products.installationId,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.productType, "bundle")))
      .limit(1);

    if (!bundle) {
      return { success: false, message: "ไม่พบข้อมูลชุดเซ็ตนี้ในระบบ" };
    }

    // Fetch child parts
    const bundleItems = await db
      .select({
        id: productBundleItems.id,
        childProductId: productBundleItems.childProductId,
        quantity: productBundleItems.quantity,
        position: productBundleItems.position,
        childName: products.name,
        childSku: products.sku,
        childPrice: products.price,
        childStock: products.stockQuantity,
        childDownforce: products.downforceN,
        childDrag: products.dragN,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(productBundleItems)
      .innerJoin(products, eq(productBundleItems.childProductId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(productBundleItems.bundleProductId, id))
      .orderBy(asc(productBundleItems.position));

    // Fetch images
    const images = await db
      .select({
        id: productImages.id,
        secureUrl: productImages.secureUrl,
        cloudinaryPublicId: productImages.cloudinaryPublicId,
        position: productImages.position,
        isPrimary: productImages.isPrimary,
      })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position));

    return {
      success: true,
      bundle: {
        ...bundle,
        items: bundleItems,
        images,
      },
    };
  } catch (error) {
    console.error("Error in getBundleDetailAction:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลชุดเซ็ต" };
  }
}

// ─── Mutation Actions ─────────────────────────────────────────────────────────

/**
 * Create a new Aero Kit / Bundle
 */
export async function createBundleAction(
  input: BundleInput
): Promise<ActionResult<{ bundleId: string }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const parsed = bundleInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // 1. Fetch and Validate Child Products
  const childParts = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stockQuantity: products.stockQuantity,
      downforceN: products.downforceN,
      dragN: products.dragN,
      weightKg: products.weightKg,
      carModelId: products.carModelId,
      categoryId: products.categoryId,
      productType: products.productType,
    })
    .from(products)
    .where(inArray(products.id, data.childProductIds));

  if (childParts.length !== data.childProductIds.length) {
    return { success: false, message: "มีชิ้นส่วนบางชิ้นไม่พบในระบบ" };
  }

  // Validate: All child parts must be 'single' parts
  const nonSinglePart = childParts.find((p) => p.productType !== "single");
  if (nonSinglePart) {
    return { success: false, message: `ชิ้นส่วน '${nonSinglePart.name}' เป็นชุดเซ็ตอยู่แล้ว ไม่สามารถนำมาซ้อนในชุดเซ็ตได้` };
  }

  // Validate Rule 1: Same Car Model
  const wrongModelPart = childParts.find((p) => p.carModelId !== data.carModelId);
  if (wrongModelPart) {
    return { success: false, message: `ชิ้นส่วน '${wrongModelPart.name}' ไม่ได้เป็นของรถรุ่นที่เลือก` };
  }

  // Validate Rule 2: Different Categories (No duplicates)
  const categoryIds = childParts.map((p) => p.categoryId).filter(Boolean);
  const uniqueCategoryIds = new Set(categoryIds);
  if (uniqueCategoryIds.size !== categoryIds.length) {
    return {
      success: false,
      message: "ชุดเซ็ตต้องประกอบด้วยชิ้นส่วนต่างประเภทกัน ไม่สามารถเลือกชิ้นส่วนในหมวดหมู่เดียวกันซ้ำได้",
    };
  }

  // Validate Rule 3: Minimum 2 parts
  if (childParts.length < 2) {
    return { success: false, message: "ชุดเซ็ตต้องมีชิ้นส่วนอย่างน้อย 2 ชิ้นขึ้นไป" };
  }

  // 2. Compute dynamic price sum & default CFD values
  const totalPrice = childParts.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const totalDownforce = childParts.reduce((sum, p) => sum + Number(p.downforceN || 0), 0);
  const totalDrag = childParts.reduce((sum, p) => sum + Number(p.dragN || 0), 0);
  const minStock = Math.min(...childParts.map((p) => p.stockQuantity || 0));

  // Auto-generate slug
  let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
  if (!slug) {
    slug = `kit-${data.sku.toLowerCase()}-${Date.now().toString(36)}`;
  }

  // Check unique SKU and Slug
  const existing = await db
    .select({ id: products.id, sku: products.sku, slug: products.slug })
    .from(products)
    .where(or(eq(products.sku, data.sku), eq(products.slug, slug)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].sku.toLowerCase() === data.sku.toLowerCase()) {
      return { success: false, message: `รหัส SKU '${data.sku}' นี้มีอยู่ในระบบแล้ว` };
    }
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // 3. Resolve Folder & Upload Images
  const [modelRow] = await db
    .select({ name: carModels.name, slug: carModels.slug, brandSlug: brands.slug })
    .from(carModels)
    .leftJoin(brands, eq(carModels.brandId, brands.id))
    .where(eq(carModels.id, data.carModelId))
    .limit(1);

  const brandSlug = modelRow?.brandSlug || "brand";
  const modelSlug = modelRow?.slug || "model";
  const cloudinaryFolder = `south-aero/bundles/${brandSlug}/${modelSlug}/${slug}`;

  const uploadedImages: Array<{
    publicId: string;
    secureUrl: string;
    position: number;
    isPrimary: boolean;
  }> = [];

  for (let i = 0; i < data.images.length; i++) {
    const img = data.images[i];
    if (img.isDeleted) continue;

    if (img.data) {
      const uploadRes = await uploadImage(img.data, {
        folder: cloudinaryFolder,
        tags: ["south-aero", "bundle", brandSlug, modelSlug, slug],
      });
      uploadedImages.push({
        publicId: uploadRes.publicId,
        secureUrl: uploadRes.secureUrl,
        position: img.position ?? i,
        isPrimary: img.isPrimary ?? i === 0,
      });
    } else if (img.publicId && img.secureUrl) {
      uploadedImages.push({
        publicId: img.publicId,
        secureUrl: img.secureUrl,
        position: img.position ?? i,
        isPrimary: img.isPrimary ?? i === 0,
      });
    }
  }

  // 4. Save to Database
  try {
    const [newBundle] = await db
      .insert(products)
      .values({
        sku: data.sku,
        slug,
        name: data.name,
        productType: "bundle",
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        brandId: data.brandId,
        carModelId: data.carModelId,
        materialId: data.materialId || null,
        installationId: data.installationId || null,
        price: totalPrice.toFixed(2),
        stockQuantity: minStock,
        status: data.status,
        isFeatured: data.isFeatured,
        downforceN: totalDownforce.toFixed(2),
        dragN: totalDrag.toFixed(2),
        isCustomCfd: data.isCustomCfd,
        customDownforceN: data.isCustomCfd && data.customDownforceN ? data.customDownforceN : null,
        customDragN: data.isCustomCfd && data.customDragN ? data.customDragN : null,
      })
      .returning({ id: products.id });

    // Insert bundle items
    if (data.childProductIds.length > 0) {
      await db.insert(productBundleItems).values(
        data.childProductIds.map((childId, idx) => ({
          bundleProductId: newBundle.id,
          childProductId: childId,
          quantity: 1,
          position: idx,
        }))
      );
    }

    // Insert bundle images
    if (uploadedImages.length > 0) {
      await db.insert(productImages).values(
        uploadedImages.map((img) => ({
          productId: newBundle.id,
          cloudinaryPublicId: img.publicId,
          secureUrl: img.secureUrl,
          position: img.position,
          isPrimary: img.isPrimary,
        }))
      );
    }

    // Add compatibility
    if (modelRow) {
      await db.insert(productCompatibility).values({
        productId: newBundle.id,
        make: brandSlug,
        model: modelRow.name,
        yearFrom: 2013,
        yearTo: 2025,
      });
    }

    await logAuditEvent({
      adminId: admin.id,
      action: "create_bundle",
      entityId: newBundle.id,
      entityType: "product",
      metadata: {
        name: data.name,
        sku: data.sku,
        childPartsCount: data.childProductIds.length,
        totalPrice,
      },
    });

    revalidatePath("/bundles");
    revalidatePath("/products");
    revalidatePath("/");

    return {
      success: true,
      message: `สร้างชุดเซ็ต '${data.name}' เรียบร้อยแล้ว`,
      data: { bundleId: newBundle.id },
    };
  } catch (error: any) {
    console.error("Error inserting bundle:", error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการบันทึกชุดเซ็ต: ${error?.message || "Internal Server Error"}`,
    };
  }
}

/**
 * Update an existing Aero Kit / Bundle
 */
export async function updateBundleAction(
  id: string,
  input: BundleInput
): Promise<ActionResult<{ bundleId: string }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const parsed = bundleInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Validate Child Products
  const childParts = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stockQuantity: products.stockQuantity,
      downforceN: products.downforceN,
      dragN: products.dragN,
      carModelId: products.carModelId,
      categoryId: products.categoryId,
      productType: products.productType,
    })
    .from(products)
    .where(inArray(products.id, data.childProductIds));

  if (childParts.length !== data.childProductIds.length) {
    return { success: false, message: "มีชิ้นส่วนบางชิ้นไม่พบในระบบ" };
  }

  const wrongModelPart = childParts.find((p) => p.carModelId !== data.carModelId);
  if (wrongModelPart) {
    return { success: false, message: `ชิ้นส่วน '${wrongModelPart.name}' ไม่ได้เป็นของรถรุ่นที่เลือก` };
  }

  const categoryIds = childParts.map((p) => p.categoryId).filter(Boolean);
  const uniqueCategoryIds = new Set(categoryIds);
  if (uniqueCategoryIds.size !== categoryIds.length) {
    return {
      success: false,
      message: "ชุดเซ็ตต้องประกอบด้วยชิ้นส่วนต่างประเภทกัน ไม่สามารถเลือกชิ้นส่วนในหมวดหมู่เดียวกันซ้ำได้",
    };
  }

  if (childParts.length < 2) {
    return { success: false, message: "ชุดเซ็ตต้องมีชิ้นส่วนอย่างน้อย 2 ชิ้นขึ้นไป" };
  }

  const totalPrice = childParts.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const totalDownforce = childParts.reduce((sum, p) => sum + Number(p.downforceN || 0), 0);
  const totalDrag = childParts.reduce((sum, p) => sum + Number(p.dragN || 0), 0);
  const minStock = Math.min(...childParts.map((p) => p.stockQuantity || 0));

  let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);

  // Check unique SKU and Slug (excluding current bundle)
  const existing = await db
    .select({ id: products.id, sku: products.sku, slug: products.slug })
    .from(products)
    .where(
      and(
        sql`${products.id} != ${id}`,
        or(eq(products.sku, data.sku), eq(products.slug, slug))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].sku.toLowerCase() === data.sku.toLowerCase()) {
      return { success: false, message: `รหัส SKU '${data.sku}' นี้ถูกใช้งานแล้ว` };
    }
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Handle Images
  const existingImages = await db
    .select({ id: productImages.id, cloudinaryPublicId: productImages.cloudinaryPublicId })
    .from(productImages)
    .where(eq(productImages.productId, id));

  const toDelete = data.images.filter((img) => img.isDeleted && img.publicId);
  if (toDelete.length > 0) {
    await deleteMultipleImages(toDelete.map((img) => img.publicId!));
  }

  const [modelRow] = await db
    .select({ name: carModels.name, slug: carModels.slug, brandSlug: brands.slug })
    .from(carModels)
    .leftJoin(brands, eq(carModels.brandId, brands.id))
    .where(eq(carModels.id, data.carModelId))
    .limit(1);

  const brandSlug = modelRow?.brandSlug || "brand";
  const modelSlug = modelRow?.slug || "model";
  const cloudinaryFolder = `south-aero/bundles/${brandSlug}/${modelSlug}/${slug}`;

  const finalImages: Array<{
    publicId: string;
    secureUrl: string;
    position: number;
    isPrimary: boolean;
  }> = [];

  for (let i = 0; i < data.images.length; i++) {
    const img = data.images[i];
    if (img.isDeleted) continue;

    if (img.data) {
      const uploadRes = await uploadImage(img.data, {
        folder: cloudinaryFolder,
        tags: ["south-aero", "bundle", brandSlug, modelSlug, slug],
      });
      finalImages.push({
        publicId: uploadRes.publicId,
        secureUrl: uploadRes.secureUrl,
        position: img.position ?? i,
        isPrimary: img.isPrimary ?? i === 0,
      });
    } else if (img.publicId && img.secureUrl) {
      finalImages.push({
        publicId: img.publicId,
        secureUrl: img.secureUrl,
        position: img.position ?? i,
        isPrimary: img.isPrimary ?? i === 0,
      });
    }
  }

  try {
    // Update bundle product master
    await db
      .update(products)
      .set({
        sku: data.sku,
        slug,
        name: data.name,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        brandId: data.brandId,
        carModelId: data.carModelId,
        materialId: data.materialId || null,
        installationId: data.installationId || null,
        price: totalPrice.toFixed(2),
        stockQuantity: minStock,
        status: data.status,
        isFeatured: data.isFeatured,
        downforceN: totalDownforce.toFixed(2),
        dragN: totalDrag.toFixed(2),
        isCustomCfd: data.isCustomCfd,
        customDownforceN: data.isCustomCfd && data.customDownforceN ? data.customDownforceN : null,
        customDragN: data.isCustomCfd && data.customDragN ? data.customDragN : null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // Replace bundle items
    await db.delete(productBundleItems).where(eq(productBundleItems.bundleProductId, id));
    await db.insert(productBundleItems).values(
      data.childProductIds.map((childId, idx) => ({
        bundleProductId: id,
        childProductId: childId,
        quantity: 1,
        position: idx,
      }))
    );

    // Replace images
    await db.delete(productImages).where(eq(productImages.productId, id));
    if (finalImages.length > 0) {
      await db.insert(productImages).values(
        finalImages.map((img) => ({
          productId: id,
          cloudinaryPublicId: img.publicId,
          secureUrl: img.secureUrl,
          position: img.position,
          isPrimary: img.isPrimary,
        }))
      );
    }

    await logAuditEvent({
      adminId: admin.id,
      action: "update_bundle",
      entityId: id,
      entityType: "product",
      metadata: {
        name: data.name,
        sku: data.sku,
        childPartsCount: data.childProductIds.length,
        totalPrice,
      },
    });

    revalidatePath("/bundles");
    revalidatePath(`/bundles/${id}`);
    revalidatePath("/products");
    revalidatePath("/");

    return {
      success: true,
      message: `อัปเดตชุดเซ็ต '${data.name}' เรียบร้อยแล้ว`,
      data: { bundleId: id },
    };
  } catch (error: any) {
    console.error("Error updating bundle:", error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการอัปเดตชุดเซ็ต: ${error?.message || "Internal Server Error"}`,
    };
  }
}

/**
 * Delete a bundle
 */
export async function deleteBundleAction(id: string): Promise<ActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, message: "Unauthorized — กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  try {
    const [bundle] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.id, id), eq(products.productType, "bundle")))
      .limit(1);

    if (!bundle) {
      return { success: false, message: "ไม่พบชุดเซ็ตนี้ในระบบ" };
    }

    // Delete images from Cloudinary
    const images = await db
      .select({ publicId: productImages.cloudinaryPublicId })
      .from(productImages)
      .where(eq(productImages.productId, id));

    if (images.length > 0) {
      await deleteMultipleImages(images.map((img) => img.publicId));
    }

    // Delete product (cascade will delete bundle items & images)
    await db.delete(products).where(eq(products.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "delete_bundle",
      entityId: id,
      entityType: "product",
      metadata: { name: bundle.name },
    });

    revalidatePath("/bundles");
    revalidatePath("/products");

    return {
      success: true,
      message: `ลบชุดเซ็ต '${bundle.name}' สำเร็จ`,
    };
  } catch (error: any) {
    console.error("Error deleting bundle:", error);
    return {
      success: false,
      message: `ไม่สามารถลบชุดเซ็ตได้: ${error?.message || "Internal Server Error"}`,
    };
  }
}
