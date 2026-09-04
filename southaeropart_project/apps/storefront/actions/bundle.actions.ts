"use server";

import {
  db,
  products,
  productImages,
  productBundleItems,
  productCompatibility,
  materials,
  installations,
  categories,
  brands,
  carModels,
  orders,
  orderItems,
  eq,
  and,
  or,
  desc,
  asc,
  inArray,
  sql,
} from "@repo/db";
import { MockProduct, MOCK_PRODUCTS } from "@/lib/mock-data";

export interface FeaturedBundleItem {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  sku: string;
  price: string;
  categoryName: string;
  categoryNameEn?: string | null;
  material?: string;
  image?: string;
  downforceN?: number;
  dragN?: number;
}

export interface FeaturedBundleSlide {
  id: number | string;
  title: string;
  image: string;
  caption: string;
}

export interface FeaturedBundleData {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  sku: string;
  tagline: string;
  description: string;
  descriptionEn?: string | null;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  brandName: string;
  carModelName: string;
  carModelGen?: string | null;
  price: string;
  formattedPrice: string;
  downforceBadge: string;
  dragBadge: string;
  downforceN: number;
  dragN: number;
  downforceBefore?: number;
  downforceAfter?: number;
  dragBefore?: number;
  dragAfter?: number;
  isCustomCfd: boolean;
  primaryImage: string;
  images: string[];
  slides: FeaturedBundleSlide[];
  pieces: string[];
  bundleItems: FeaturedBundleItem[];
  designer: string;
  link: string;
}

// ---------------------------------------------------------------------------
// VehicleBundleData & getFeaturedBundleForVehicle (Products Page Hero)
// ---------------------------------------------------------------------------

export interface VehicleBundleItem {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  sku: string;
  price: string;
  categoryName: string;
  categoryNameEn?: string | null;
  image?: string;
  downforceN?: number;
  dragN?: number;
}

export interface VehicleBundleData {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  sku: string;
  tagline: string;
  description: string;
  descriptionEn?: string | null;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  price: string;
  compareAtPrice?: string | null;
  formattedPrice: string;
  badgeType: "top_seller" | "featured" | "latest";
  badgeLabel: string;
  brandName: string;
  brandSlug: string;
  carModelName: string;
  carModelSlug: string;
  carModelGen?: string | null;
  downforceN: number;
  dragN: number;
  downforceBefore?: number;
  downforceAfter?: number;
  dragBefore?: number;
  dragAfter?: number;
  isCustomCfd: boolean;
  primaryImage: string;
  images: string[];
  pieces: string[];
  bundleItems: VehicleBundleItem[];
  totalSales: number;
}

/**
 * ดึงชุดเซ็ตเด่นสำหรับรถรุ่นที่เลือก (Brand & Model) จากฐานข้อมูล
 * พร้อม Fallback Priority Waterfall:
 * 1. Top Seller: ยอดขายสูงสุด (total_sales > 0 / completed orders)
 * 2. Featured by Admin: is_featured = true เรียงตาม created_at DESC
 * 3. Latest Created: ชุดแต่งล่าสุดที่เพิ่มเข้ามา (created_at DESC)
 * หากไม่มีชุดแต่งสำหรับรุ่นรถนั้น จะส่งกลับ null (ไม่แสดง mock ใดๆ)
 */
export async function getFeaturedBundleForVehicle(
  brandSlug?: string,
  modelSlug?: string
): Promise<VehicleBundleData | null> {
  try {
    const conditions: ReturnType<typeof eq>[] = [
      eq(products.productType, "bundle"),
      eq(products.status, "active"),
    ];

    if (brandSlug) {
      conditions.push(eq(brands.slug, brandSlug));
    }

    if (modelSlug) {
      conditions.push(eq(carModels.slug, modelSlug));
    }

    // 1. ค้นหาชุดเซ็ตที่สถานะ active สำหรับรถรุ่นที่เลือก
    const rawBundles = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        nameEn: products.nameEn,
        description: products.description,
        descriptionEn: products.descriptionEn,
        shortDescription: products.shortDescription,
        shortDescriptionEn: products.shortDescriptionEn,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        downforceN: products.downforceN,
        customDownforceN: products.customDownforceN,
        dragN: products.dragN,
        customDragN: products.customDragN,
        downforceBefore: products.downforceBefore,
        downforceAfter: products.downforceAfter,
        dragBefore: products.dragBefore,
        dragAfter: products.dragAfter,
        brandName: brands.name,
        brandSlug: brands.slug,
        carModelName: carModels.name,
        carModelSlug: carModels.slug,
        carModelGen: carModels.generation,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .where(and(...conditions));

    if (!rawBundles || rawBundles.length === 0) {
      return null;
    }

    const bundleIds = rawBundles.map((b) => b.id);

    // 2. คำนวณยอดขายสะสม (total_sales) จากออเดอร์ที่ชำระเงินสำเร็จ
    const salesRows = await db
      .select({
        productId: orderItems.productId,
        totalSales: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.as("total_sales"),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          inArray(orderItems.productId, bundleIds),
          or(
            eq(orders.paymentStatus, "paid"),
            inArray(orders.status, ["paid", "processing", "shipped", "delivered"])
          )
        )
      )
      .groupBy(orderItems.productId);

    const salesMap = new Map<string, number>();
    salesRows.forEach((row) => {
      salesMap.set(row.productId, Number(row.totalSales || 0));
    });

    // 3. Fallback Priority Waterfall:
    // Priority 1: Top Seller (total_sales > 0, highest sales)
    const bundlesWithSales = rawBundles
      .map((b) => ({ ...b, totalSales: salesMap.get(b.id) || 0 }))
      .filter((b) => b.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales || b.createdAt.getTime() - a.createdAt.getTime());

    let selectedBundle: (typeof rawBundles)[0] & { totalSales: number };
    let badgeType: "top_seller" | "featured" | "latest";
    let badgeLabel: string;

    if (bundlesWithSales.length > 0) {
      selectedBundle = bundlesWithSales[0];
      badgeType = "top_seller";
      badgeLabel = "Top Seller";
    } else {
      // Priority 2: Featured by Admin (is_featured = true, latest created)
      const featuredBundles = rawBundles
        .map((b) => ({ ...b, totalSales: 0 }))
        .filter((b) => b.isFeatured)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (featuredBundles.length > 0) {
        selectedBundle = featuredBundles[0];
        badgeType = "featured";
        badgeLabel = "Featured Kit";
      } else {
        // Priority 3: Latest Created (createdAt DESC)
        const latestBundles = rawBundles
          .map((b) => ({ ...b, totalSales: 0 }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        selectedBundle = latestBundles[0];
        badgeType = "latest";
        badgeLabel = "Complete Package";
      }
    }

    // 4. ดึงรูปภาพและชิ้นส่วนย่อยของชุดเซ็ตที่ถูกเลือก
    const [imagesRows, childRows] = await Promise.all([
      db
        .select({
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
          position: productImages.position,
        })
        .from(productImages)
        .where(eq(productImages.productId, selectedBundle.id))
        .orderBy(asc(productImages.position)),

      db
        .select({
          id: products.id,
          name: products.name,
          nameEn: products.nameEn,
          slug: products.slug,
          sku: products.sku,
          price: products.price,
          downforceN: products.downforceN,
          dragN: products.dragN,
          categoryName: categories.name,
          categoryNameEn: categories.nameEn,
        })
        .from(productBundleItems)
        .innerJoin(products, eq(productBundleItems.childProductId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(productBundleItems.bundleProductId, selectedBundle.id))
        .orderBy(asc(productBundleItems.position)),
    ]);

    // ดึงรูปภาพชิ้นส่วนย่อย (ถ้ามี)
    const childIds = childRows.map((c) => c.id);
    const childImagesMap = new Map<string, string>();
    if (childIds.length > 0) {
      const childImgs = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, childIds))
        .orderBy(desc(productImages.isPrimary), asc(productImages.position));

      childImgs.forEach((ci) => {
        if (!childImagesMap.has(ci.productId)) {
          childImagesMap.set(ci.productId, ci.secureUrl);
        }
      });
    }

    const imagesList = imagesRows.map((img) => img.secureUrl);
    const primaryImgRow = imagesRows.find((img) => img.isPrimary) || imagesRows[0];
    const primaryImage = primaryImgRow?.secureUrl || imagesList[0] || "/images/FRONT.png";

    const bundleItems: VehicleBundleItem[] = childRows.map((item) => ({
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      slug: item.slug,
      sku: item.sku,
      price: item.price,
      categoryName: item.categoryName || "Aero Part",
      categoryNameEn: item.categoryNameEn || "Aero Part",
      image: childImagesMap.get(item.id),
      downforceN: item.downforceN ? Number(item.downforceN) : undefined,
      dragN: item.dragN ? Number(item.dragN) : undefined,
    }));

    // Dynamic price calculation
    const dynamicSum = bundleItems.reduce((acc, part) => acc + Number(part.price || 0), 0);
    const effectivePriceNum = dynamicSum > 0 ? dynamicSum : Number(selectedBundle.price || 0);
    const effectivePriceStr = effectivePriceNum.toFixed(2);
    const formattedPrice = `฿${effectivePriceNum.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} THB`;

    const effectiveDownforce =
      selectedBundle.isCustomCfd && selectedBundle.customDownforceN
        ? Number(selectedBundle.customDownforceN)
        : Number(selectedBundle.downforceN || 0);
    const effectiveDrag =
      selectedBundle.isCustomCfd && selectedBundle.customDragN
        ? Number(selectedBundle.customDragN)
        : Number(selectedBundle.dragN || 0);

    const pieces = bundleItems.map((p) => `${p.categoryName}: ${p.name}`);

    return {
      id: selectedBundle.id,
      name: selectedBundle.name,
      nameEn: selectedBundle.nameEn,
      slug: selectedBundle.slug,
      sku: selectedBundle.sku,
      tagline:
        selectedBundle.shortDescription ||
        `FLAGSHIP ${selectedBundle.brandName ? selectedBundle.brandName.toUpperCase() : ""} ${selectedBundle.carModelName ? selectedBundle.carModelName.toUpperCase() : ""} PERFORMANCE BUILD`,
      description:
        selectedBundle.description ||
        `Precision engineered to elevate the stance and aerodynamic downforce of your ${selectedBundle.brandName || ""} ${selectedBundle.carModelName || ""}. Functional, track-tested, and built to stand out.`,
      descriptionEn: selectedBundle.descriptionEn,
      shortDescription: selectedBundle.shortDescription,
      shortDescriptionEn: selectedBundle.shortDescriptionEn,
      price: effectivePriceStr,
      compareAtPrice: selectedBundle.compareAtPrice,
      formattedPrice,
      badgeType,
      badgeLabel,
      brandName: selectedBundle.brandName || "South Aero",
      brandSlug: selectedBundle.brandSlug || "",
      carModelName: selectedBundle.carModelName || "Aero Spec",
      carModelSlug: selectedBundle.carModelSlug || "",
      carModelGen: selectedBundle.carModelGen || null,
      downforceN: effectiveDownforce,
      dragN: effectiveDrag,
      downforceBefore: selectedBundle.downforceBefore ? Number(selectedBundle.downforceBefore) : undefined,
      downforceAfter: selectedBundle.downforceAfter ? Number(selectedBundle.downforceAfter) : undefined,
      dragBefore: selectedBundle.dragBefore ? Number(selectedBundle.dragBefore) : undefined,
      dragAfter: selectedBundle.dragAfter ? Number(selectedBundle.dragAfter) : undefined,
      isCustomCfd: selectedBundle.isCustomCfd,
      primaryImage,
      images: imagesList.length > 0 ? imagesList : [primaryImage],
      pieces: pieces.length > 0 ? pieces : ["Full Aerodynamic Kit Package"],
      bundleItems,
      totalSales: selectedBundle.totalSales,
    };
  } catch (error) {
    console.error("[getFeaturedBundleForVehicle] Error querying featured bundle:", error);
    return null;
  }
}

/**
 * ดึงชุดเซ็ตแนะนำสูงสุด 4 ชุด (Featured Bundles) จาก Database
 * ใช้สำหรับแสดงผลทั้งในหน้าแรก (Homepage FeaturedSlider) และหน้า Collection (/collection)
 */
export async function getFeaturedBundles(): Promise<FeaturedBundleData[]> {
  try {
    // 1. Fetch featured bundles from DB (Max 4)
    const rawBundles = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        nameEn: products.nameEn,
        description: products.description,
        descriptionEn: products.descriptionEn,
        shortDescription: products.shortDescription,
        shortDescriptionEn: products.shortDescriptionEn,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        downforceN: products.downforceN,
        customDownforceN: products.customDownforceN,
        dragN: products.dragN,
        customDragN: products.customDragN,
        downforceBefore: products.downforceBefore,
        downforceAfter: products.downforceAfter,
        dragBefore: products.dragBefore,
        dragAfter: products.dragAfter,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        carModelId: products.carModelId,
        carModelName: carModels.name,
        carModelGen: carModels.generation,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .where(
        and(
          eq(products.productType, "bundle"),
          eq(products.isFeatured, true),
          eq(products.status, "active")
        )
      )
      .orderBy(desc(products.updatedAt), desc(products.createdAt))
      .limit(4);

    if (!rawBundles || rawBundles.length === 0) {
      return [];
    }

    const bundleIds = rawBundles.map((b) => b.id);

    // 2. Fetch images and child parts in parallel
    const [imagesRows, childRows] = await Promise.all([
      db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          position: productImages.position,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, bundleIds))
        .orderBy(asc(productImages.position)),

      db
        .select({
          bundleProductId: productBundleItems.bundleProductId,
          childProductId: productBundleItems.childProductId,
          position: productBundleItems.position,
          childName: products.name,
          childNameEn: products.nameEn,
          childSlug: products.slug,
          childSku: products.sku,
          childPrice: products.price,
          childDownforce: products.downforceN,
          childDrag: products.dragN,
          categoryName: categories.name,
          categoryNameEn: categories.nameEn,
          categorySlug: categories.slug,
        })
        .from(productBundleItems)
        .innerJoin(products, eq(productBundleItems.childProductId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(inArray(productBundleItems.bundleProductId, bundleIds))
        .orderBy(asc(productBundleItems.position)),
    ]);

    // 3. Map images by bundle ID
    const imagesMap: Record<string, string[]> = {};
    const primaryImageMap: Record<string, string> = {};

    imagesRows.forEach((img) => {
      if (!imagesMap[img.productId]) {
        imagesMap[img.productId] = [];
      }
      imagesMap[img.productId].push(img.secureUrl);
      if (img.isPrimary || !primaryImageMap[img.productId]) {
        primaryImageMap[img.productId] = img.secureUrl;
      }
    });

    // 4. Map child parts by bundle ID
    const childPartsMap: Record<string, FeaturedBundleItem[]> = {};

    childRows.forEach((item) => {
      if (!childPartsMap[item.bundleProductId]) {
        childPartsMap[item.bundleProductId] = [];
      }
      childPartsMap[item.bundleProductId].push({
        id: item.childProductId,
        name: item.childName,
        nameEn: item.childNameEn,
        slug: item.childSlug,
        sku: item.childSku,
        price: item.childPrice,
        categoryName: item.categoryName || "Aero Part",
        categoryNameEn: item.categoryNameEn,
        downforceN: item.childDownforce ? Number(item.childDownforce) : undefined,
        dragN: item.childDrag ? Number(item.childDrag) : undefined,
      });
    });

    // 5. Build enriched featured bundle data list
    const result: FeaturedBundleData[] = rawBundles.map((b) => {
      const childParts = childPartsMap[b.id] || [];
      const imagesList = imagesMap[b.id] || [];
      const primaryImage = primaryImageMap[b.id] || imagesList[0] || "/images/FRONT.png";

      // Dynamic price calculation
      const dynamicSum = childParts.reduce((acc, part) => acc + Number(part.price || 0), 0);
      const effectivePriceNum = dynamicSum > 0 ? dynamicSum : Number(b.price || 0);
      const effectivePriceStr = effectivePriceNum.toFixed(2);
      const formattedPrice = `฿${effectivePriceNum.toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} THB`;

      // Telemetry downforce & drag
      const effectiveDownforce =
        b.isCustomCfd && b.customDownforceN ? Number(b.customDownforceN) : Number(b.downforceN || 0);
      const effectiveDrag =
        b.isCustomCfd && b.customDragN ? Number(b.customDragN) : Number(b.dragN || 0);

      const downforceBadge = `${effectiveDownforce >= 0 ? "+" : ""}${effectiveDownforce} N`;
      const dragBadge = `${effectiveDrag > 0 ? "+" : ""}${effectiveDrag} N`;

      // Build pieces text list for collection cards
      const pieces = childParts.map((p) => `${p.categoryName}: ${p.name}`);

      // Build photo slides
      const slides: FeaturedBundleSlide[] =
        imagesList.length > 0
          ? imagesList.map((imgUrl, idx) => ({
              id: `${b.id}-slide-${idx}`,
              title: `${b.name} — View 0${idx + 1}`,
              image: imgUrl,
              caption: b.shortDescription || `${b.brandName || ""} ${b.carModelName || ""} Complete Aerodynamic Kit`,
            }))
          : [
              {
                id: `${b.id}-default-1`,
                title: `${b.name} — Front View`,
                image: primaryImage,
                caption: b.shortDescription || "Precision-engineered aerodynamic transformation.",
              },
            ];

      const tagline =
        b.shortDescription ||
        `FLAGSHIP ${b.brandName ? b.brandName.toUpperCase() : ""} ${b.carModelName ? b.carModelName.toUpperCase() : ""} PERFORMANCE BUILD`;

      return {
        id: b.id,
        name: b.name,
        nameEn: b.nameEn,
        slug: b.slug,
        sku: b.sku,
        tagline,
        description:
          b.description ||
          `Precision engineered to elevate the stance and aerodynamic downforce of your ${b.brandName || ""} ${b.carModelName || ""}. Functional, track-tested, and built to stand out.`,
        descriptionEn: b.descriptionEn,
        shortDescription: b.shortDescription,
        shortDescriptionEn: b.shortDescriptionEn,
        brandName: b.brandName || "South Aero",
        carModelName: b.carModelName || "Aero Spec",
        carModelGen: b.carModelGen || null,
        price: effectivePriceStr,
        formattedPrice,
        downforceBadge,
        dragBadge,
        downforceN: effectiveDownforce,
        dragN: effectiveDrag,
        downforceBefore: b.downforceBefore ? Number(b.downforceBefore) : undefined,
        downforceAfter: b.downforceAfter ? Number(b.downforceAfter) : undefined,
        dragBefore: b.dragBefore ? Number(b.dragBefore) : undefined,
        dragAfter: b.dragAfter ? Number(b.dragAfter) : undefined,
        isCustomCfd: b.isCustomCfd,
        primaryImage,
        images: imagesList.length > 0 ? imagesList : [primaryImage],
        slides,
        pieces: pieces.length > 0 ? pieces : ["Full Aerodynamic Kit Package"],
        bundleItems: childParts,
        designer: "South Aero Design Lab",
        link: `/products/${b.slug}`,
      };
    });

    return result;
  } catch (error) {
    console.error("[getFeaturedBundles] Error fetching featured bundles from DB:", error);
    return [];
  }
}

/**
 * ดึงข้อมูลชุดเซ็ตทั้งหมดที่สถานะพร้อมขาย (status = 'active') สำหรับหน้า Collection (/collection)
 * เรียงตามลำดับล่าสุดที่อัปเดต/สร้าง
 */
export async function getActiveBundles(): Promise<FeaturedBundleData[]> {
  try {
    const rawBundles = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        nameEn: products.nameEn,
        description: products.description,
        descriptionEn: products.descriptionEn,
        shortDescription: products.shortDescription,
        shortDescriptionEn: products.shortDescriptionEn,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        downforceN: products.downforceN,
        customDownforceN: products.customDownforceN,
        dragN: products.dragN,
        customDragN: products.customDragN,
        downforceBefore: products.downforceBefore,
        downforceAfter: products.downforceAfter,
        dragBefore: products.dragBefore,
        dragAfter: products.dragAfter,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        carModelId: products.carModelId,
        carModelName: carModels.name,
        carModelGen: carModels.generation,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .where(
        and(
          eq(products.productType, "bundle"),
          eq(products.status, "active")
        )
      )
      .orderBy(desc(products.updatedAt), desc(products.createdAt));

    if (!rawBundles || rawBundles.length === 0) {
      return [];
    }

    const bundleIds = rawBundles.map((b) => b.id);

    const [imagesRows, childRows] = await Promise.all([
      db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          position: productImages.position,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, bundleIds))
        .orderBy(asc(productImages.position)),

      db
        .select({
          bundleProductId: productBundleItems.bundleProductId,
          childProductId: productBundleItems.childProductId,
          position: productBundleItems.position,
          childName: products.name,
          childNameEn: products.nameEn,
          childSlug: products.slug,
          childSku: products.sku,
          childPrice: products.price,
          childDownforce: products.downforceN,
          childDrag: products.dragN,
          categoryName: categories.name,
          categoryNameEn: categories.nameEn,
          categorySlug: categories.slug,
        })
        .from(productBundleItems)
        .innerJoin(products, eq(productBundleItems.childProductId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(inArray(productBundleItems.bundleProductId, bundleIds))
        .orderBy(asc(productBundleItems.position)),
    ]);

    const imagesMap: Record<string, string[]> = {};
    const primaryImageMap: Record<string, string> = {};

    imagesRows.forEach((img) => {
      if (!imagesMap[img.productId]) {
        imagesMap[img.productId] = [];
      }
      imagesMap[img.productId].push(img.secureUrl);
      if (img.isPrimary || !primaryImageMap[img.productId]) {
        primaryImageMap[img.productId] = img.secureUrl;
      }
    });

    const childPartsMap: Record<string, FeaturedBundleItem[]> = {};

    childRows.forEach((item) => {
      if (!childPartsMap[item.bundleProductId]) {
        childPartsMap[item.bundleProductId] = [];
      }
      childPartsMap[item.bundleProductId].push({
        id: item.childProductId,
        name: item.childName,
        nameEn: item.childNameEn,
        slug: item.childSlug,
        sku: item.childSku,
        price: item.childPrice,
        categoryName: item.categoryName || "Aero Part",
        categoryNameEn: item.categoryNameEn,
        downforceN: item.childDownforce ? Number(item.childDownforce) : undefined,
        dragN: item.childDrag ? Number(item.childDrag) : undefined,
      });
    });

    return rawBundles.map((b) => {
      const childParts = childPartsMap[b.id] || [];
      const imagesList = imagesMap[b.id] || [];
      const primaryImage = primaryImageMap[b.id] || imagesList[0] || "/images/FRONT.png";

      const dynamicSum = childParts.reduce((acc, part) => acc + Number(part.price || 0), 0);
      const effectivePriceNum = dynamicSum > 0 ? dynamicSum : Number(b.price || 0);
      const effectivePriceStr = effectivePriceNum.toFixed(2);
      const formattedPrice = `฿${effectivePriceNum.toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} THB`;

      const effectiveDownforce =
        b.isCustomCfd && b.customDownforceN ? Number(b.customDownforceN) : Number(b.downforceN || 0);
      const effectiveDrag =
        b.isCustomCfd && b.customDragN ? Number(b.customDragN) : Number(b.dragN || 0);

      const downforceBadge = `${effectiveDownforce >= 0 ? "+" : ""}${effectiveDownforce} N`;
      const dragBadge = `${effectiveDrag > 0 ? "+" : ""}${effectiveDrag} N`;

      const pieces = childParts.map((p) => `${p.categoryName}: ${p.name}`);

      const slides: FeaturedBundleSlide[] =
        imagesList.length > 0
          ? imagesList.map((imgUrl, idx) => ({
              id: `${b.id}-slide-${idx}`,
              title: `${b.name} — View 0${idx + 1}`,
              image: imgUrl,
              caption: b.shortDescription || `${b.brandName || ""} ${b.carModelName || ""} Complete Aerodynamic Kit`,
            }))
          : [
              {
                id: `${b.id}-default-1`,
                title: `${b.name} — Front View`,
                image: primaryImage,
                caption: b.shortDescription || "Precision-engineered aerodynamic transformation.",
              },
            ];

      const tagline =
        b.shortDescription ||
        `FLAGSHIP ${b.brandName ? b.brandName.toUpperCase() : ""} ${b.carModelName ? b.carModelName.toUpperCase() : ""} PERFORMANCE BUILD`;

      return {
        id: b.id,
        name: b.name,
        nameEn: b.nameEn,
        slug: b.slug,
        sku: b.sku,
        tagline,
        description:
          b.description ||
          `Precision engineered to elevate the stance and aerodynamic downforce of your ${b.brandName || ""} ${b.carModelName || ""}. Functional, track-tested, and built to stand out.`,
        descriptionEn: b.descriptionEn,
        shortDescription: b.shortDescription,
        shortDescriptionEn: b.shortDescriptionEn,
        brandName: b.brandName || "South Aero",
        carModelName: b.carModelName || "Aero Spec",
        carModelGen: b.carModelGen || null,
        price: effectivePriceStr,
        formattedPrice,
        downforceBadge,
        dragBadge,
        downforceN: effectiveDownforce,
        dragN: effectiveDrag,
        downforceBefore: b.downforceBefore ? Number(b.downforceBefore) : undefined,
        downforceAfter: b.downforceAfter ? Number(b.downforceAfter) : undefined,
        dragBefore: b.dragBefore ? Number(b.dragBefore) : undefined,
        dragAfter: b.dragAfter ? Number(b.dragAfter) : undefined,
        isCustomCfd: b.isCustomCfd,
        primaryImage,
        images: imagesList.length > 0 ? imagesList : [primaryImage],
        slides,
        pieces: pieces.length > 0 ? pieces : ["Full Aerodynamic Kit Package"],
        bundleItems: childParts,
        designer: "South Aero Design Lab",
        link: `/products/${b.slug}`,
      };
    });
  } catch (error) {
    console.error("[getActiveBundles] Error fetching active bundles from DB:", error);
    return [];
  }
}

/**
 * ดึงข้อมูลสินค้าเดี่ยวหรือชุดเซ็ตจาก DB ด้วย slug (สำหรับหน้า /products/[slug])
 */
export async function getProductBySlug(slug: string): Promise<MockProduct | null> {
  try {
    const [row] = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        nameEn: products.nameEn,
        productType: products.productType,
        description: products.description,
        descriptionEn: products.descriptionEn,
        shortDescription: products.shortDescription,
        shortDescriptionEn: products.shortDescriptionEn,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stockQuantity: products.stockQuantity,
        status: products.status,
        isFeatured: products.isFeatured,
        isCustomCfd: products.isCustomCfd,
        downforceN: products.downforceN,
        customDownforceN: products.customDownforceN,
        dragN: products.dragN,
        customDragN: products.customDragN,
        downforceBefore: products.downforceBefore,
        downforceAfter: products.downforceAfter,
        dragBefore: products.dragBefore,
        dragAfter: products.dragAfter,
        weightKg: products.weightKg,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        carModelId: products.carModelId,
        carModelName: carModels.name,
        carModelGen: carModels.generation,
        carModelYearFrom: carModels.yearFrom,
        carModelYearTo: carModels.yearTo,
        materialId: products.materialId,
        materialName: materials.name,
        materialNameEn: materials.nameEn,
        installationId: products.installationId,
        installationName: installations.name,
        installationNameEn: installations.nameEn,
        installationEn: products.installationEn,
        features: products.features,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carModels, eq(products.carModelId, carModels.id))
      .leftJoin(materials, eq(products.materialId, materials.id))
      .leftJoin(installations, eq(products.installationId, installations.id))
      .where(eq(products.slug, slug))
      .limit(1);

    if (!row) {
      return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
    }

    // Fetch images and compatibility
    const [images, childItems, compatibilities] = await Promise.all([
      db
        .select({
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(eq(productImages.productId, row.id))
        .orderBy(asc(productImages.position)),
      row.productType === "bundle"
        ? db
            .select({
              id: products.id,
              name: products.name,
              nameEn: products.nameEn,
              slug: products.slug,
              sku: products.sku,
              price: products.price,
              categoryName: categories.name,
              categoryNameEn: categories.nameEn,
              downforceN: products.downforceN,
              dragN: products.dragN,
            })
            .from(productBundleItems)
            .innerJoin(products, eq(productBundleItems.childProductId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(eq(productBundleItems.bundleProductId, row.id))
            .orderBy(asc(productBundleItems.position))
        : Promise.resolve([]),
      db
        .select({
          make: productCompatibility.make,
          model: productCompatibility.model,
          yearFrom: productCompatibility.yearFrom,
          yearTo: productCompatibility.yearTo,
        })
        .from(productCompatibility)
        .where(eq(productCompatibility.productId, row.id)),
    ]);

    // Primary images for child items if bundle
    const childIds = childItems.map((c) => c.id);
    let childImagesMap: Record<string, string> = {};
    if (childIds.length > 0) {
      const childImgs = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, childIds));
      childImgs.forEach((ci) => {
        if (!childImagesMap[ci.productId] || ci.isPrimary) {
          childImagesMap[ci.productId] = ci.secureUrl;
        }
      });
    }

    const effectiveDownforce =
      row.isCustomCfd && row.customDownforceN ? Number(row.customDownforceN) : Number(row.downforceN || 0);
    const effectiveDrag =
      row.isCustomCfd && row.customDragN ? Number(row.customDragN) : Number(row.dragN || 0);

    const imageUrls = images.map((img) => img.secureUrl);

    const compatibility =
      compatibilities.length > 0
        ? compatibilities
        : [
            {
              make: row.brandName || "Universal",
              model: row.carModelName || "Model Specific",
              yearFrom: row.carModelYearFrom || 2013,
              yearTo: row.carModelYearTo || 2025,
            },
          ];

    // Dynamic price calculation if bundle
    const dynamicPrice =
      childItems.length > 0
        ? childItems.reduce((acc, c) => acc + Number(c.price || 0), 0).toFixed(2)
        : row.price;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameEn: row.nameEn || null,
      brand: row.brandName || "South Aero",
      productType: row.productType as "single" | "bundle",
      categorySlug: row.productType === "bundle" ? "body-kits" : "aeroparts",
      categoryName: row.productType === "bundle" ? "Aero Kits" : "Aeroparts",
      price: dynamicPrice,
      compareAtPrice: row.compareAtPrice || undefined,
      description: row.description || "",
      descriptionEn: row.descriptionEn || null,
      shortDescription: row.shortDescription || "",
      shortDescriptionEn: row.shortDescriptionEn || null,
      compatibility,
      material: row.materialName || "Pre-preg Carbon Fiber / High-Impact ABS",
      materialEn: row.materialNameEn || null,
      finish: "Gloss Black / Carbon Weave",
      finishOptions: ["Gloss Black", "Carbon Fiber Weave", "Matte Black"],
      installation: row.installationName || row.installationEn || "Bolt-on under-chassis mount",
      installationEn: row.installationNameEn || row.installationEn || null,
      weightKg: row.weightKg || "8.5",
      downforceN: effectiveDownforce,
      dragN: effectiveDrag,
      downforceBefore: row.downforceBefore ? Number(row.downforceBefore) : undefined,
      downforceAfter: row.downforceAfter ? Number(row.downforceAfter) : undefined,
      dragBefore: row.dragBefore ? Number(row.dragBefore) : undefined,
      dragAfter: row.dragAfter ? Number(row.dragAfter) : undefined,
      isCustomCfd: row.isCustomCfd,
      images: imageUrls.length > 0 ? imageUrls : ["/images/FRONT.png"],
      features: Array.isArray(row.features) && row.features.length > 0
        ? (row.features as any[]).map((f) => ({
            title: f.title || "",
            titleEn: f.titleEn || null,
            description: f.description || "",
            descriptionEn: f.descriptionEn || null,
          }))
        : [
            {
              title: "Total Aero Balance",
              titleEn: "Total Aero Balance",
              description: "Engineered as a cohesive aerodynamic system with matching body lines and surface flow.",
              descriptionEn: "Engineered as a cohesive aerodynamic system with matching body lines and surface flow.",
            },
          ],
      isFeatured: row.isFeatured,
      bundleItems: childItems.map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        slug: c.slug,
        sku: c.sku,
        price: c.price,
        categoryName: c.categoryName || "Aero Part",
        categoryNameEn: c.categoryNameEn || "Aero Part",
        image: childImagesMap[c.id] || undefined,
        downforceN: c.downforceN ? Number(c.downforceN) : undefined,
        dragN: c.dragN ? Number(c.dragN) : undefined,
      })),
    };
  } catch (error) {
    console.error("[getProductBySlug] Error fetching product:", error);
    return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
  }
}
