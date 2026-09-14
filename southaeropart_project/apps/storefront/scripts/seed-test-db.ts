import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { assertTestIsolation } from "./test-guard";

// Target dedicated test database
const originalDbUrl = process.env.DATABASE_URL || "";
const testDbUrl = process.env.TEST_DATABASE_URL || originalDbUrl.replace(/\/neondb(\?|$)/, "/southaero_test$1");
process.env.DATABASE_URL = testDbUrl;

// Verify strict test isolation before executing any DB query
assertTestIsolation();

import { createDbClient } from "@repo/db";
import {
  brands,
  carModels,
  categories,
  products,
  productBundleItems,
  eq,
} from "@repo/db";

export async function seedTestDatabase() {
  console.log("🌱 [SEED] Connecting to test database:", testDbUrl.replace(/:\/\/.*@/, "://<credentials>@"));
  const { db, pool } = createDbClient(testDbUrl);

  try {
    // 1. Seed or find Brand
    let [brand] = await db.select().from(brands).where(eq(brands.slug, "bmw")).limit(1);
    if (!brand) {
      [brand] = await db
        .insert(brands)
        .values({
          name: "BMW",
          slug: "bmw",
          isActive: true,
        })
        .returning();
      console.log("✅ Seeded Brand:", brand.name, `(${brand.id})`);
    }

    // 2. Seed or find Car Model
    let [carModel] = await db.select().from(carModels).where(eq(carModels.slug, "m3-g80")).limit(1);
    if (!carModel) {
      [carModel] = await db
        .insert(carModels)
        .values({
          brandId: brand.id,
          name: "M3 G80",
          slug: "m3-g80",
          generation: "G80",
          yearFrom: 2021,
          yearTo: 2024,
          isActive: true,
        })
        .returning();
      console.log("✅ Seeded Car Model:", carModel.name, `(${carModel.id})`);
    }

    // 3. Seed or find Category
    let [category] = await db.select().from(categories).where(eq(categories.slug, "carbon-aerodynamics")).limit(1);
    if (!category) {
      [category] = await db
        .insert(categories)
        .values({
          name: "Carbon Aerodynamics",
          nameEn: "Carbon Aerodynamics",
          slug: "carbon-aerodynamics",
          isActive: true,
        })
        .returning();
      console.log("✅ Seeded Category:", category.name, `(${category.id})`);
    }

    // 4. Seed Single Part (Front Lip)
    let [singlePart] = await db.select().from(products).where(eq(products.slug, "bmw-m3-g80-carbon-front-lip")).limit(1);
    if (!singlePart) {
      [singlePart] = await db
        .insert(products)
        .values({
          sku: "BMW-G80-LIP-01",
          slug: "bmw-m3-g80-carbon-front-lip",
          name: "BMW M3 G80 Carbon Fiber Front Lip",
          nameEn: "BMW M3 G80 Carbon Fiber Front Lip",
          productType: "single",
          description: "High performance autoclave carbon fiber front splitter designed for maximum downforce.",
          brandId: brand.id,
          carModelId: carModel.id,
          categoryId: category.id,
          price: "35000.00",
          stockQuantity: 25,
          status: "active",
          isFeatured: true,
        })
        .returning();
      console.log("✅ Seeded Single Product:", singlePart.name, `(${singlePart.id})`);
    } else {
      // Ensure stock is sufficient
      await db.update(products).set({ stockQuantity: 25, status: "active" }).where(eq(products.id, singlePart.id));
    }

    // 5. Seed Child Part (Canards)
    let [canardsPart] = await db.select().from(products).where(eq(products.slug, "bmw-m3-g80-carbon-canards")).limit(1);
    if (!canardsPart) {
      [canardsPart] = await db
        .insert(products)
        .values({
          sku: "BMW-G80-CAN-01",
          slug: "bmw-m3-g80-carbon-canards",
          name: "BMW M3 G80 Carbon Aero Canards Pair",
          nameEn: "BMW M3 G80 Carbon Aero Canards Pair",
          productType: "single",
          description: "Precision engineered dual dive planes for front end aero stability.",
          brandId: brand.id,
          carModelId: carModel.id,
          categoryId: category.id,
          price: "12000.00",
          stockQuantity: 30,
          status: "active",
        })
        .returning();
      console.log("✅ Seeded Child Product:", canardsPart.name, `(${canardsPart.id})`);
    } else {
      await db.update(products).set({ stockQuantity: 30, status: "active" }).where(eq(products.id, canardsPart.id));
    }

    // 6. Seed Bundle Product
    let [bundleProduct] = await db.select().from(products).where(eq(products.slug, "bmw-m3-g80-carbon-aero-kit")).limit(1);
    if (!bundleProduct) {
      [bundleProduct] = await db
        .insert(products)
        .values({
          sku: "BMW-G80-KIT-01",
          slug: "bmw-m3-g80-carbon-aero-kit",
          name: "BMW M3 G80 Carbon Aero Stage 1 Kit",
          nameEn: "BMW M3 G80 Carbon Aero Stage 1 Kit",
          productType: "bundle",
          description: "Complete track-ready aero package including Front Lip and Canards pair.",
          brandId: brand.id,
          carModelId: carModel.id,
          categoryId: category.id,
          price: "42000.00",
          stockQuantity: 15,
          status: "active",
          isFeatured: true,
        })
        .returning();
      console.log("✅ Seeded Bundle Product:", bundleProduct.name, `(${bundleProduct.id})`);

      // Link bundle items
      await db.insert(productBundleItems).values([
        {
          bundleProductId: bundleProduct.id,
          childProductId: singlePart.id,
          quantity: 1,
          position: 0,
        },
        {
          bundleProductId: bundleProduct.id,
          childProductId: canardsPart.id,
          quantity: 1,
          position: 1,
        },
      ]);
      console.log("✅ Linked Bundle child items");
    } else {
      await db.update(products).set({ stockQuantity: 15, status: "active" }).where(eq(products.id, bundleProduct.id));
    }

    console.log("🎉 [SEED] Test database successfully initialized with fixtures!");
    return {
      brand,
      carModel,
      category,
      singlePart,
      canardsPart,
      bundleProduct,
    };
  } finally {
    await pool.end();
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed-test-db.ts")) {
  seedTestDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ [SEED FAILED]:", err);
      process.exit(1);
    });
}
