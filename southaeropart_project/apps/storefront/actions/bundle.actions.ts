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
  eq,
  and,
  desc,
  asc,
  inArray,
} from "@repo/db";
import { MockProduct, MOCK_PRODUCTS } from "@/lib/mock-data";

export interface FeaturedBundleItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  categoryName: string;
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
  slug: string;
  sku: string;
  tagline: string;
  description: string;
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

/**
 * Fallback mock data when DB has no featured bundles configured yet
 */
const FALLBACK_FEATURED_BUNDLES: FeaturedBundleData[] = [
  {
    id: "fallback-accord-g9",
    name: "ACCORD G9 BODY KIT 02",
    slug: "accord-g9-complete-body-kit-02",
    sku: "KIT-ACCO-STAGE2-01",
    tagline: "FLAGSHIP EXECUTIVE MOTORSPORT TRANSFORMATION",
    description:
      "The benchmark for Japanese executive sports styling. Full 4-piece aerodynamic kit engineered using 3D laser surface scan data to ensure race-grade fitment and real-world downforce gains.",
    brandName: "Honda",
    carModelName: "Accord G9",
    carModelGen: "2013-2017",
    price: "22760.00",
    formattedPrice: "฿22,760 THB",
    downforceBadge: "+155 N",
    dragBadge: "-4 N",
    downforceN: 155,
    dragN: -4,
    downforceBefore: 50.0,
    downforceAfter: 205.0,
    dragBefore: 890.0,
    dragAfter: 886.0,
    isCustomCfd: true,
    primaryImage: "/images/FRONT.png",
    images: [
      "/images/FRONT.png",
      "/images/BACK.png",
      "/images/AS.png",
      "/images/G9 KIT2/07.png",
    ],
    slides: [
      {
        id: 1,
        title: "Accord G9 Body Kit 02 — Front 3/4 Stance",
        image: "/images/FRONT.png",
        caption: "Sculpted front splitter and aerodynamically balanced profile.",
      },
      {
        id: 2,
        title: "Accord G9 Body Kit 02 — Rear Profile & Ducktail",
        image: "/images/BACK.png",
        caption: "High-downforce ducktail spoiler and multi-fin rear diffuser.",
      },
      {
        id: 3,
        title: "Accord G9 Body Kit 02 — Side Aerodynamic Flow",
        image: "/images/AS.png",
        caption: "Ground-effect side skirts with integrated flow channels.",
      },
      {
        id: 4,
        title: "Accord G9 Body Kit 02 — Track Fitment",
        image: "/images/AS.png",
        caption: "Tested at speed for structural rigidity and drag reduction.",
      },
    ],
    pieces: [
      "Front Lip: Carbon Fiber Front Splitter Lip",
      "Side Skirts: Aerodynamic Side Skirt Extensions",
      "Rear Diffuser: Multi-Channel Rear Under Diffuser",
      "Ducktail Spoiler: Integrated Trunk Ducktail Spoiler",
    ],
    bundleItems: [
      {
        id: "p1",
        name: "Carbon Fiber Front Lip",
        slug: "carbon-fiber-front-lip-accord-g9",
        sku: "SA-ACC-G9-FLP-01",
        price: "4590.00",
        categoryName: "Front Lips",
        image: "/images/G9 KIT2/01.png",
        downforceN: 110,
        dragN: -2,
      },
      {
        id: "p2",
        name: "Carbon Fiber Side Skirts",
        slug: "carbon-fiber-side-skirts-accord-g9",
        sku: "SA-ACC-G9-SSK-01",
        price: "5190.00",
        categoryName: "Side Skirts",
        image: "/images/G9 KIT2/03.png",
        downforceN: 45,
        dragN: -3,
      },
      {
        id: "p3",
        name: "Carbon Fiber Rear Diffuser",
        slug: "carbon-fiber-rear-diffuser-accord-g9",
        sku: "SA-ACC-G9-RDF-01",
        price: "6990.00",
        categoryName: "Rear Diffusers",
        image: "/images/G9 KIT2/05.png",
        downforceN: 135,
        dragN: -6,
      },
      {
        id: "p4",
        name: "Ducktail Spoiler",
        slug: "ducktail-spoiler-accord-g9",
        sku: "SA-ACC-G9-SPL-01",
        price: "5990.00",
        categoryName: "Spoilers",
        image: "/images/DETAIL g9/01.jpg",
        downforceN: 155,
        dragN: -4,
      },
    ],
    designer: "South Aero Design Lab",
    link: "/products/accord-g9-complete-body-kit-02",
  },
];

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
        description: products.description,
        shortDescription: products.shortDescription,
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
          childSlug: products.slug,
          childSku: products.sku,
          childPrice: products.price,
          childDownforce: products.downforceN,
          childDrag: products.dragN,
          categoryName: categories.name,
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
        slug: item.childSlug,
        sku: item.childSku,
        price: item.childPrice,
        categoryName: item.categoryName || "Aero Part",
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
        slug: b.slug,
        sku: b.sku,
        tagline,
        description:
          b.description ||
          `Precision engineered to elevate the stance and aerodynamic downforce of your ${b.brandName || ""} ${b.carModelName || ""}. Functional, track-tested, and built to stand out.`,
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
        description: products.description,
        shortDescription: products.shortDescription,
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
          childSlug: products.slug,
          childSku: products.sku,
          childPrice: products.price,
          childDownforce: products.downforceN,
          childDrag: products.dragN,
          categoryName: categories.name,
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
        slug: item.childSlug,
        sku: item.childSku,
        price: item.childPrice,
        categoryName: item.categoryName || "Aero Part",
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
        slug: b.slug,
        sku: b.sku,
        tagline,
        description:
          b.description ||
          `Precision engineered to elevate the stance and aerodynamic downforce of your ${b.brandName || ""} ${b.carModelName || ""}. Functional, track-tested, and built to stand out.`,
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
        productType: products.productType,
        description: products.description,
        shortDescription: products.shortDescription,
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
        installationId: products.installationId,
        installationName: installations.name,
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
              slug: products.slug,
              sku: products.sku,
              price: products.price,
              categoryName: categories.name,
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
      brand: row.brandName || "South Aero",
      productType: row.productType as "single" | "bundle",
      categorySlug: row.productType === "bundle" ? "body-kits" : "aeroparts",
      categoryName: row.productType === "bundle" ? "Aero Kits" : "Aeroparts",
      price: dynamicPrice,
      compareAtPrice: row.compareAtPrice || undefined,
      description: row.description || "",
      shortDescription: row.shortDescription || "",
      compatibility,
      material: row.materialName || "Pre-preg Carbon Fiber / High-Impact ABS",
      finish: "Gloss Black / Carbon Weave",
      finishOptions: ["Gloss Black", "Carbon Fiber Weave", "Matte Black"],
      installation: row.installationName || "Bolt-on under-chassis mount",
      weightKg: row.weightKg || "8.5",
      downforceN: effectiveDownforce,
      dragN: effectiveDrag,
      downforceBefore: row.downforceBefore ? Number(row.downforceBefore) : undefined,
      downforceAfter: row.downforceAfter ? Number(row.downforceAfter) : undefined,
      dragBefore: row.dragBefore ? Number(row.dragBefore) : undefined,
      dragAfter: row.dragAfter ? Number(row.dragAfter) : undefined,
      isCustomCfd: row.isCustomCfd,
      images: imageUrls.length > 0 ? imageUrls : ["/images/FRONT.png"],
      features: (row.features as any) || [
        {
          title: "Total Aero Balance",
          description: "Engineered as a cohesive aerodynamic system with matching body lines and surface flow.",
        },
      ],
      isFeatured: row.isFeatured,
      bundleItems: childItems.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sku: c.sku,
        price: c.price,
        categoryName: c.categoryName || "Aero Part",
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
