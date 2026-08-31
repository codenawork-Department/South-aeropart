"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  brands,
  carModels,
  categories,
  materials,
  installations,
  products,
  eq,
  and,
  asc,
  desc,
  count,
  sql,
} from "@repo/db";
import { validateSession, logAuditEvent } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Schemas & Types ──────────────────────────────────────────────────────────

const brandSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อแบรนด์").max(100).trim(),
  slug: z.string().optional(),
  logoUrl: z.string().url("รูปแบบ URL ไม่ถูกต้อง").optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

const carModelSchema = z.object({
  brandId: z.string().uuid("กรุณาเลือกแบรนด์รถยนต์"),
  name: z.string().min(1, "กรุณากรอกชื่อโมเดลรถ").max(100).trim(),
  slug: z.string().optional(),
  generation: z.string().max(100).optional().nullable().or(z.literal("")),
  yearFrom: z.number().int().min(1950).max(2100).optional().nullable(),
  yearTo: z.number().int().min(1950).max(2100).optional().nullable(),
  isActive: z.boolean().default(true),
});

const categorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อประเภทชิ้นส่วน").max(100).trim(),
  slug: z.string().optional(),
  parentId: z.string().uuid().optional().nullable().or(z.literal("")),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const materialSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อวัสดุ").max(150).trim(),
  slug: z.string().optional(),
  description: z.string().max(500).optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

const installationSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อวิธีการติดตั้ง").max(150).trim(),
  slug: z.string().optional(),
  description: z.string().max(500).optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type BrandInput = z.infer<typeof brandSchema>;
export type CarModelInput = z.infer<typeof carModelSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type InstallationInput = z.infer<typeof installationSchema>;

export interface CatalogActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ─── Car Brands Actions ───────────────────────────────────────────────────────

export async function getBrandsAction() {
  const admin = await validateSession();
  if (!admin) return [];

  const brandRows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      logoUrl: brands.logoUrl,
      isActive: brands.isActive,
      createdAt: brands.createdAt,
    })
    .from(brands)
    .orderBy(asc(brands.name));

  // Get model counts and product counts per brand — single query each, no N+1
  const [modelCounts, productCounts] = await Promise.all([
    db
      .select({
        brandId: carModels.brandId,
        count: count(),
      })
      .from(carModels)
      .groupBy(carModels.brandId),

    db
      .select({
        brandId: products.brandId,
        count: count(),
      })
      .from(products)
      .groupBy(products.brandId),
  ]);

  const modelMap = new Map(modelCounts.map((m) => [m.brandId, Number(m.count)]));
  const productMap = new Map(
    productCounts
      .filter((p): p is { brandId: string; count: number } => Boolean(p.brandId))
      .map((p) => [p.brandId, Number(p.count)])
  );

  return brandRows.map((b) => ({
    ...b,
    modelsCount: modelMap.get(b.id) || 0,
    productsCount: productMap.get(b.id) || 0,
  }));
}

export async function createBrandAction(input: BrandInput): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { name, logoUrl, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug
  const [existing] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  if (existing) {
    return { success: false, message: `Slug หรือ แบรนด์ '${name}' มีอยู่ในระบบแล้ว` };
  }

  const [newBrand] = await db
    .insert(brands)
    .values({
      name,
      slug,
      logoUrl: logoUrl || null,
      isActive,
    })
    .returning({ id: brands.id });

  await logAuditEvent({
    adminId: admin.id,
    action: "brand.created",
    entityType: "brand",
    entityId: newBrand.id,
    metadata: { name, slug },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `เพิ่มแบรนด์ ${name} สำเร็จ` };
}

export async function updateBrandAction(
  id: string,
  input: BrandInput
): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { name, logoUrl, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug (excluding self)
  const [existing] = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, slug)).limit(1);
  if (existing && existing.id !== id) {
    return { success: false, message: `Slug '${slug}' ถูกใช้โดยแบรนด์อื่นแล้ว` };
  }

  await db
    .update(brands)
    .set({
      name,
      slug,
      logoUrl: logoUrl || null,
      isActive,
    })
    .where(eq(brands.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "brand.updated",
    entityType: "brand",
    entityId: id,
    metadata: { name, slug },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: "อัปเดตแบรนด์สำเร็จ" };
}

export async function deleteBrandAction(id: string): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) return { success: false, message: "ไม่พบแบรนด์ในระบบ" };

  // Delete brand (cascades to carModels in Postgres)
  await db.delete(brands).where(eq(brands.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "brand.deleted",
    entityType: "brand",
    entityId: id,
    metadata: { name: brand.name },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `ลบแบรนด์ ${brand.name} เรียบร้อยแล้ว` };
}

// ─── Car Models Actions ───────────────────────────────────────────────────────

export async function getCarModelsAction(brandId?: string) {
  const admin = await validateSession();
  if (!admin) return [];

  const query = db
    .select({
      id: carModels.id,
      brandId: carModels.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      name: carModels.name,
      slug: carModels.slug,
      generation: carModels.generation,
      yearFrom: carModels.yearFrom,
      yearTo: carModels.yearTo,
      isActive: carModels.isActive,
      createdAt: carModels.createdAt,
    })
    .from(carModels)
    .innerJoin(brands, eq(carModels.brandId, brands.id))
    .orderBy(asc(brands.name), asc(carModels.name));

  const modelRows = brandId ? await query.where(eq(carModels.brandId, brandId)) : await query;

  // Get products count per car model — single aggregation, no N+1
  const productCounts = await db
    .select({
      carModelId: products.carModelId,
      count: count(),
    })
    .from(products)
    .groupBy(products.carModelId);

  const productMap = new Map(
    productCounts
      .filter((p): p is { carModelId: string; count: number } => Boolean(p.carModelId))
      .map((p) => [p.carModelId, Number(p.count)])
  );

  return modelRows.map((m) => ({
    ...m,
    productsCount: productMap.get(m.id) || 0,
  }));
}

export async function createCarModelAction(input: CarModelInput): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = carModelSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { brandId, name, generation, yearFrom, yearTo, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug within brand
  const [existing] = await db
    .select()
    .from(carModels)
    .where(and(eq(carModels.brandId, brandId), eq(carModels.slug, slug)))
    .limit(1);

  if (existing) {
    return { success: false, message: `รุ่นรถ '${name}' ในแบรนด์นี้มีอยู่ในระบบแล้ว` };
  }

  const [newModel] = await db
    .insert(carModels)
    .values({
      brandId,
      name,
      slug,
      generation: generation || null,
      yearFrom: yearFrom ?? null,
      yearTo: yearTo ?? null,
      isActive,
    })
    .returning({ id: carModels.id });

  await logAuditEvent({
    adminId: admin.id,
    action: "car_model.created",
    entityType: "car_model",
    entityId: newModel.id,
    metadata: { name, slug, brandId },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `เพิ่มรุ่นรถ ${name} สำเร็จ` };
}

export async function updateCarModelAction(
  id: string,
  input: CarModelInput
): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = carModelSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { brandId, name, generation, yearFrom, yearTo, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug within brand (excluding self)
  const [existing] = await db
    .select({ id: carModels.id })
    .from(carModels)
    .where(and(eq(carModels.brandId, brandId), eq(carModels.slug, slug)))
    .limit(1);
  if (existing && existing.id !== id) {
    return { success: false, message: `รุ่นรถที่มี slug '${slug}' ในแบรนด์นี้มีอยู่แล้ว` };
  }

  await db
    .update(carModels)
    .set({
      brandId,
      name,
      slug,
      generation: generation || null,
      yearFrom: yearFrom ?? null,
      yearTo: yearTo ?? null,
      isActive,
    })
    .where(eq(carModels.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "car_model.updated",
    entityType: "car_model",
    entityId: id,
    metadata: { name, slug },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: "อัปเดตโมเดลรถสำเร็จ" };
}

export async function deleteCarModelAction(id: string): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const [model] = await db.select().from(carModels).where(eq(carModels.id, id)).limit(1);
  if (!model) return { success: false, message: "ไม่พบรุ่นรถในระบบ" };

  await db.delete(carModels).where(eq(carModels.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "car_model.deleted",
    entityType: "car_model",
    entityId: id,
    metadata: { name: model.name },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `ลบรุ่นรถ ${model.name} เรียบร้อยแล้ว` };
}

// ─── Aeropart Categories Actions ──────────────────────────────────────────────

export async function getCategoriesAction() {
  const admin = await validateSession();
  if (!admin) return [];

  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      position: categories.position,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));

  // Get products count per category — single aggregation, no N+1
  const productCounts = await db
    .select({
      categoryId: products.categoryId,
      count: count(),
    })
    .from(products)
    .groupBy(products.categoryId);

  const productMap = new Map(
    productCounts
      .filter((p): p is { categoryId: string; count: number } => Boolean(p.categoryId))
      .map((p) => [p.categoryId, Number(p.count)])
  );

  return categoryRows.map((c) => ({
    ...c,
    productsCount: productMap.get(c.id) || 0,
  }));
}

export async function createCategoryAction(input: CategoryInput): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { name, parentId, position, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug
  const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) {
    return { success: false, message: `หมวดหมู่ '${name}' หรือ Slug '${slug}' มีอยู่ในระบบแล้ว` };
  }

  const [newCat] = await db
    .insert(categories)
    .values({
      name,
      slug,
      parentId: parentId || null,
      position,
      isActive,
    })
    .returning({ id: categories.id });

  await logAuditEvent({
    adminId: admin.id,
    action: "category.created",
    entityType: "category",
    entityId: newCat.id,
    metadata: { name, slug },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `เพิ่มหมวดหมู่ ${name} สำเร็จ` };
}

export async function updateCategoryAction(
  id: string,
  input: CategoryInput
): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors };
  }

  const { name, parentId, position, isActive } = parsed.data;
  const slug = parsed.data.slug?.trim() ? slugify(parsed.data.slug) : slugify(name);

  // Check unique slug (excluding self)
  const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing && existing.id !== id) {
    return { success: false, message: `หมวดหมู่ที่มี slug '${slug}' มีอยู่ในระบบแล้ว` };
  }

  await db
    .update(categories)
    .set({
      name,
      slug,
      parentId: parentId || null,
      position,
      isActive,
    })
    .where(eq(categories.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "category.updated",
    entityType: "category",
    entityId: id,
    metadata: { name, slug },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: "อัปเดตหมวดหมู่สำเร็จ" };
}

export async function deleteCategoryAction(id: string): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return { success: false, message: "ไม่พบหมวดหมู่ในระบบ" };

  await db.delete(categories).where(eq(categories.id, id));

  await logAuditEvent({
    adminId: admin.id,
    action: "category.deleted",
    entityType: "category",
    entityId: id,
    metadata: { name: cat.name },
  });

  revalidatePath("/catalog");
  revalidatePath("/products/new");
  return { success: true, message: `ลบหมวดหมู่ ${cat.name} เรียบร้อยแล้ว` };
}

// ─── Default Catalog Seeder ───────────────────────────────────────────────────

export async function seedInitialCatalogAction(): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  try {
    // 1. Aeropart Categories — batch check instead of per-slug N+1
    const defaultCategories = [
      { name: "Ducktail Spoiler", slug: "ducktail-spoiler", position: 1 },
      { name: "Front Lip Spoiler", slug: "front-lip", position: 2 },
      { name: "Rear Diffuser", slug: "rear-diffuser", position: 3 },
      { name: "Side Skirts", slug: "side-skirts", position: 4 },
      { name: "GT Wing", slug: "gt-wing", position: 5 },
      { name: "Canards", slug: "canards", position: 6 },
      { name: "Bonnet / Vented Hood", slug: "bonnet-hood", position: 7 },
      { name: "Widebody Fender Kit", slug: "widebody-fenders", position: 8 },
      { name: "Roof Spoiler", slug: "roof-spoiler", position: 9 },
      { name: "Carbon Mirror Covers", slug: "mirror-covers", position: 10 },
    ];

    const catSlugs = defaultCategories.map((c) => c.slug);
    const existingCats = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(sql`${categories.slug} = ANY(${catSlugs})`);
    const existingCatSlugs = new Set(existingCats.map((c) => c.slug));

    const catsToInsert = defaultCategories.filter((c) => !existingCatSlugs.has(c.slug));
    if (catsToInsert.length > 0) {
      await db.insert(categories).values(
        catsToInsert.map((c) => ({ name: c.name, slug: c.slug, position: c.position, isActive: true }))
      );
    }

    // 2. Car Brands & Iconic Models
    const brandModelData: Array<{
      brand: { name: string; slug: string; logoUrl?: string };
      models: Array<{ name: string; slug: string; generation?: string; yearFrom?: number; yearTo?: number }>;
    }> = [
      {
        brand: { name: "Toyota", slug: "toyota" },
        models: [
          { name: "GR86", slug: "gr86", generation: "ZN8", yearFrom: 2022, yearTo: 2025 },
          { name: "GR Yaris", slug: "gr-yaris", generation: "GXPA16", yearFrom: 2020, yearTo: 2025 },
          { name: "GR Supra A90", slug: "gr-supra-a90", generation: "DB42 / A90", yearFrom: 2019, yearTo: 2025 },
          { name: "GR Corolla", slug: "gr-corolla", generation: "GZEA14", yearFrom: 2023, yearTo: 2025 },
        ],
      },
      {
        brand: { name: "Subaru", slug: "subaru" },
        models: [
          { name: "BRZ", slug: "brz", generation: "ZD8 (Gen 2)", yearFrom: 2022, yearTo: 2025 },
          { name: "WRX STI", slug: "wrx-sti", generation: "VA / VB", yearFrom: 2015, yearTo: 2024 },
        ],
      },
      {
        brand: { name: "Honda", slug: "honda" },
        models: [
          { name: "Civic Type R FL5", slug: "civic-type-r-fl5", generation: "FL5", yearFrom: 2022, yearTo: 2025 },
          { name: "Civic Type R FK8", slug: "civic-type-r-fk8", generation: "FK8", yearFrom: 2017, yearTo: 2021 },
          { name: "S2000", slug: "s2000", generation: "AP1 / AP2", yearFrom: 1999, yearTo: 2009 },
        ],
      },
      {
        brand: { name: "Nissan", slug: "nissan" },
        models: [
          { name: "GT-R R35", slug: "gtr-r35", generation: "CBA / DBA / 4BA", yearFrom: 2008, yearTo: 2024 },
          { name: "Fairlady Z RZ34", slug: "fairlady-z-rz34", generation: "RZ34 (400Z)", yearFrom: 2022, yearTo: 2025 },
          { name: "370Z", slug: "370z", generation: "Z34", yearFrom: 2009, yearTo: 2020 },
        ],
      },
      {
        brand: { name: "BMW", slug: "bmw" },
        models: [
          { name: "M2 (G87)", slug: "m2-g87", generation: "G87", yearFrom: 2023, yearTo: 2025 },
          { name: "M3 / M4 (G80/G82)", slug: "m3-m4-g80-g82", generation: "G80 / G82", yearFrom: 2021, yearTo: 2025 },
          { name: "M2 Competition (F87)", slug: "m2-f87", generation: "F87", yearFrom: 2016, yearTo: 2021 },
        ],
      },
      {
        brand: { name: "Porsche", slug: "porsche" },
        models: [
          { name: "911 GT3 (992)", slug: "911-gt3-992", generation: "992.1 / 992.2", yearFrom: 2021, yearTo: 2025 },
          { name: "718 Cayman GT4", slug: "718-cayman-gt4", generation: "982", yearFrom: 2019, yearTo: 2024 },
        ],
      },
      {
        brand: { name: "Mazda", slug: "mazda" },
        models: [
          { name: "MX-5 Miata (ND)", slug: "mx5-nd", generation: "ND / ND2 / ND3", yearFrom: 2015, yearTo: 2025 },
          { name: "RX-7", slug: "rx7-fd", generation: "FD3S", yearFrom: 1992, yearTo: 2002 },
        ],
      },
    ];

    // Batch-fetch all existing brands in one query
    const brandSlugs = brandModelData.map((b) => b.brand.slug);
    const existingBrands = await db
      .select()
      .from(brands)
      .where(sql`${brands.slug} = ANY(${brandSlugs})`);
    const brandMap = new Map(existingBrands.map((b) => [b.slug, b]));

    for (const item of brandModelData) {
      let brand = brandMap.get(item.brand.slug);
      if (!brand) {
        const [inserted] = await db
          .insert(brands)
          .values({ name: item.brand.name, slug: item.brand.slug, isActive: true })
          .returning();
        brand = inserted;
        brandMap.set(brand.slug, brand);
      }

      // Batch-fetch existing models for this brand in one query
      const modelSlugs = item.models.map((m) => m.slug);
      const existingModels = await db
        .select({ slug: carModels.slug })
        .from(carModels)
        .where(and(eq(carModels.brandId, brand.id), sql`${carModels.slug} = ANY(${modelSlugs})`));
      const existingModelSlugs = new Set(existingModels.map((m) => m.slug));

      const modelsToInsert = item.models.filter((m) => !existingModelSlugs.has(m.slug));
      if (modelsToInsert.length > 0) {
        await db.insert(carModels).values(
          modelsToInsert.map((m) => ({
            brandId: brand!.id,
            name: m.name,
            slug: m.slug,
            generation: m.generation || null,
            yearFrom: m.yearFrom || null,
            yearTo: m.yearTo || null,
            isActive: true,
          }))
        );
      }
    }

    revalidatePath("/catalog");
    revalidatePath("/products/new");
    return { success: true, message: "เริ่มต้นชุดข้อมูลแบรนด์ รุ่นรถ และประเภท Aeropart สำเร็จ" };
  } catch (error) {
    console.error("[seedInitialCatalogAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งต้น",
    };
  }
}

// ─── Material Actions ─────────────────────────────────────────────────────────


export async function getMaterialsAction() {
  const admin = await validateSession();
  if (!admin) return [];

  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      slug: materials.slug,
      description: materials.description,
      isActive: materials.isActive,
      createdAt: materials.createdAt,
      updatedAt: materials.updatedAt,
    })
    .from(materials)
    .orderBy(asc(materials.name));

  // Batch count — single query instead of N+1 per material
  const productCounts = await db
    .select({ materialId: products.materialId, total: count() })
    .from(products)
    .groupBy(products.materialId);

  const countMap = new Map(
    productCounts
      .filter((r): r is { materialId: string; total: number } => Boolean(r.materialId))
      .map((r) => [r.materialId, Number(r.total)])
  );

  return rows.map((mat) => ({ ...mat, productsCount: countMap.get(mat.id) ?? 0 }));
}

export async function createMaterialAction(
  input: MaterialInput
): Promise<CatalogActionResult<{ id: string }>> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const slug = data.slug?.trim()
    ? data.slug.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")
    : data.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

  try {
    const [existing] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.slug, slug))
      .limit(1);

    if (existing) {
      return { success: false, message: `ชื่อวัสดุ slug "${slug}" นี้มีอยู่แล้ว` };
    }

    const [newMat] = await db
      .insert(materials)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        isActive: data.isActive,
      })
      .returning({ id: materials.id });

    await logAuditEvent({
      adminId: admin.id,
      action: "material.created",
      entityType: "material",
      entityId: newMat.id,
      metadata: { name: data.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: "เพิ่มวัสดุสำเร็จ", data: { id: newMat.id } };
  } catch (error) {
    console.error("[createMaterialAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเพิ่มวัสดุ",
    };
  }
}

export async function updateMaterialAction(
  id: string,
  input: MaterialInput
): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const [existing] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.id, id))
      .limit(1);

    if (!existing) return { success: false, message: "ไม่พบวัสดุในระบบ" };

    await db
      .update(materials)
      .set({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(materials.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "material.updated",
      entityType: "material",
      entityId: id,
      metadata: { name: data.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: "แก้ไขวัสดุสำเร็จ" };
  } catch (error) {
    console.error("[updateMaterialAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขวัสดุ",
    };
  }
}

export async function deleteMaterialAction(id: string): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  try {
    const [existing] = await db
      .select({ id: materials.id, name: materials.name })
      .from(materials)
      .where(eq(materials.id, id))
      .limit(1);

    if (!existing) return { success: false, message: "ไม่พบวัสดุในระบบ" };

    // เช็คว่ามีสินค้าที่ใช้วัสดุนี้อยู่หรือไม่
    const [{ usageCount }] = await db
      .select({ usageCount: count() })
      .from(products)
      .where(eq(products.materialId, id));

    if (Number(usageCount) > 0) {
      return {
        success: false,
        message: `ไม่สามารถลบวัสดุ "${existing.name}" ได้ เนื่องจากมีสินค้า ${usageCount} รายการที่ใช้วัสดุนี้อยู่ กรุณาเปลี่ยนวัสดุของสินค้าก่อน`,
      };
    }

    await db.delete(materials).where(eq(materials.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "material.deleted",
      entityType: "material",
      entityId: id,
      metadata: { name: existing.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: `ลบวัสดุ "${existing.name}" สำเร็จ` };
  } catch (error) {
    console.error("[deleteMaterialAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบวัสดุ",
    };
  }
}

// ─── Installation Actions ───────────────────────────────────────────────────

export async function getInstallationsAction() {
  const admin = await validateSession();
  if (!admin) return [];

  const rows = await db
    .select({
      id: installations.id,
      name: installations.name,
      slug: installations.slug,
      description: installations.description,
      isActive: installations.isActive,
      createdAt: installations.createdAt,
      updatedAt: installations.updatedAt,
    })
    .from(installations)
    .orderBy(asc(installations.name));

  // Batch count — single query instead of N+1 per installation
  const productCounts = await db
    .select({ installationId: products.installationId, total: count() })
    .from(products)
    .groupBy(products.installationId);

  const countMap = new Map(
    productCounts
      .filter((r): r is { installationId: string; total: number } => Boolean(r.installationId))
      .map((r) => [r.installationId, Number(r.total)])
  );

  return rows.map((inst) => ({ ...inst, productsCount: countMap.get(inst.id) ?? 0 }));
}

export async function createInstallationAction(
  input: InstallationInput
): Promise<CatalogActionResult<{ id: string }>> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = installationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const slug = data.slug?.trim()
    ? slugify(data.slug)
    : slugify(data.name);

  try {
    const [existing] = await db
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.slug, slug))
      .limit(1);

    if (existing) {
      return { success: false, message: `ชื่อวิธีการติดตั้ง slug "${slug}" นี้มีอยู่แล้ว` };
    }

    const [newInst] = await db
      .insert(installations)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        isActive: data.isActive,
      })
      .returning({ id: installations.id });

    await logAuditEvent({
      adminId: admin.id,
      action: "installation.created",
      entityType: "installation",
      entityId: newInst.id,
      metadata: { name: data.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: "เพิ่มวิธีการติดตั้งสำเร็จ", data: { id: newInst.id } };
  } catch (error) {
    console.error("[createInstallationAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเพิ่มวิธีการติดตั้ง",
    };
  }
}

export async function updateInstallationAction(
  id: string,
  input: InstallationInput
): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  const parsed = installationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const [existing] = await db
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.id, id))
      .limit(1);

    if (!existing) return { success: false, message: "ไม่พบวิธีการติดตั้งในระบบ" };

    await db
      .update(installations)
      .set({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(installations.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "installation.updated",
      entityType: "installation",
      entityId: id,
      metadata: { name: data.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: "แก้ไขวิธีการติดตั้งสำเร็จ" };
  } catch (error) {
    console.error("[updateInstallationAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขวิธีการติดตั้ง",
    };
  }
}

export async function deleteInstallationAction(id: string): Promise<CatalogActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized" };

  try {
    const [existing] = await db
      .select({ id: installations.id, name: installations.name })
      .from(installations)
      .where(eq(installations.id, id))
      .limit(1);

    if (!existing) return { success: false, message: "ไม่พบวิธีการติดตั้งในระบบ" };

    // เช็คว่ามีสินค้าที่ใช้วิธีการติดตั้งนี้อยู่หรือไม่
    const [{ usageCount }] = await db
      .select({ usageCount: count() })
      .from(products)
      .where(eq(products.installationId, id));

    if (Number(usageCount) > 0) {
      return {
        success: false,
        message: `ไม่สามารถลบวิธีการติดตั้ง "${existing.name}" ได้ เนื่องจากมีสินค้า ${usageCount} รายการที่ใช้วิธีการติดตั้งนี้อยู่ กรุณาเปลี่ยนวิธีการติดตั้งของสินค้าก่อน`,
      };
    }

    await db.delete(installations).where(eq(installations.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "installation.deleted",
      entityType: "installation",
      entityId: id,
      metadata: { name: existing.name },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");
    return { success: true, message: `ลบวิธีการติดตั้ง "${existing.name}" สำเร็จ` };
  } catch (error) {
    console.error("[deleteInstallationAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบวิธีการติดตั้ง",
    };
  }
}

