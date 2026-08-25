const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Syncing database schema for icons and products.features...");

  // 1. Create icons table
  await sql`
    CREATE TABLE IF NOT EXISTS "icons" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "category" text DEFAULT 'general' NOT NULL,
      "type" text DEFAULT 'lucide' NOT NULL,
      "svg_content" text,
      "image_url" text,
      "lucide_name" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ Icons table created or already exists.");

  // 2. Create indexes on icons
  await sql`CREATE INDEX IF NOT EXISTS "icons_slug_idx" ON "icons" ("slug");`;
  await sql`CREATE INDEX IF NOT EXISTS "icons_category_idx" ON "icons" ("category");`;
  await sql`CREATE INDEX IF NOT EXISTS "icons_is_active_idx" ON "icons" ("is_active");`;
  console.log("✓ Icons indexes created.");

  // 3. Add features column to products if not exists
  await sql`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
  `;
  console.log("✓ products.features column added or already exists.");

  console.log("Database schema sync completed successfully!");
}

run().catch((err) => {
  console.error("Schema sync failed:", err);
  process.exit(1);
});
