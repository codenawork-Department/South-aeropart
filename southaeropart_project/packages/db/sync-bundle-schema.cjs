const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Syncing database schema for product bundles (Aero Kits)...");

  // 1. Create product_type enum if not exists
  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE "product_type" AS ENUM('single', 'bundle');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ product_type enum verified.");
  } catch (err) {
    console.log("Enum creation note:", err.message);
  }

  // 2. Add columns to products table
  await sql`
    ALTER TABLE "products" 
    ADD COLUMN IF NOT EXISTS "product_type" product_type DEFAULT 'single' NOT NULL,
    ADD COLUMN IF NOT EXISTS "is_custom_cfd" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "custom_downforce_n" numeric(10, 2),
    ADD COLUMN IF NOT EXISTS "custom_drag_n" numeric(10, 2);
  `;
  console.log("✓ products table columns added.");

  // 3. Create index on products.product_type
  await sql`CREATE INDEX IF NOT EXISTS "products_type_idx" ON "products" ("product_type");`;

  // 4. Create product_bundle_items table
  await sql`
    CREATE TABLE IF NOT EXISTS "product_bundle_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "bundle_product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      "child_product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      "quantity" integer DEFAULT 1 NOT NULL,
      "position" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ product_bundle_items table created.");

  await sql`CREATE INDEX IF NOT EXISTS "bundle_items_bundle_idx" ON "product_bundle_items" ("bundle_product_id");`;
  await sql`CREATE INDEX IF NOT EXISTS "bundle_items_child_idx" ON "product_bundle_items" ("child_product_id");`;

  // 5. Create order_item_bundle_parts table
  await sql`
    CREATE TABLE IF NOT EXISTS "order_item_bundle_parts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "order_item_id" uuid NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
      "child_product_id" uuid NOT NULL REFERENCES "products"("id"),
      "child_product_name_snapshot" text NOT NULL,
      "unit_price_snapshot" numeric(12, 2) NOT NULL,
      "quantity" integer DEFAULT 1 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ order_item_bundle_parts table created.");

  await sql`CREATE INDEX IF NOT EXISTS "order_item_bundle_parts_item_idx" ON "order_item_bundle_parts" ("order_item_id");`;
  await sql`CREATE INDEX IF NOT EXISTS "order_item_bundle_parts_child_product_idx" ON "order_item_bundle_parts" ("child_product_id");`;

  console.log("Database schema sync for bundles completed successfully!");
}

run().catch((err) => {
  console.error("Bundle schema sync failed:", err);
  process.exit(1);
});
