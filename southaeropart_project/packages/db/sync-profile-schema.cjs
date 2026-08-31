const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Syncing database schema for user_addresses and user_vehicles...");

  // 1. Create user_addresses table
  await sql`
    CREATE TABLE IF NOT EXISTS "user_addresses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text DEFAULT 'shipping' NOT NULL,
      "recipient_name" text NOT NULL,
      "phone_country_code" text DEFAULT '+66' NOT NULL,
      "phone" text NOT NULL,
      "country" text DEFAULT 'TH' NOT NULL,
      "line1" text NOT NULL,
      "line2" text,
      "sub_district" text,
      "district" text,
      "province" text,
      "city" text,
      "state_or_province" text,
      "postal_code" text NOT NULL,
      "company_name" text,
      "tax_id" text,
      "branch" text,
      "is_default" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ user_addresses table created or already exists.");

  // 2. Index on user_addresses
  await sql`CREATE INDEX IF NOT EXISTS "user_addresses_user_idx" ON "user_addresses" ("user_id");`;
  console.log("✓ user_addresses indexes created.");

  // 3. Create or update user_vehicles table
  await sql`
    CREATE TABLE IF NOT EXISTS "user_vehicles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "brand_id" uuid NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
      "car_model_id" uuid NOT NULL REFERENCES "car_models"("id") ON DELETE CASCADE,
      "year" integer,
      "sub_model" text,
      "is_default" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ user_vehicles table created or already exists.");

  // Drop columns steering_orientation and plate_number if they still exist
  await sql`
    ALTER TABLE "user_vehicles"
    DROP COLUMN IF EXISTS "steering_orientation",
    DROP COLUMN IF EXISTS "plate_number";
  `;
  console.log("✓ steering_orientation and plate_number columns dropped from user_vehicles.");

  // 4. Index on user_vehicles
  await sql`CREATE INDEX IF NOT EXISTS "user_vehicles_user_idx" ON "user_vehicles" ("user_id");`;
  console.log("✓ user_vehicles indexes created.");

  console.log("Database schema sync for profile completed successfully!");
}

run().catch((err) => {
  console.error("Schema sync failed:", err);
  process.exit(1);
});
