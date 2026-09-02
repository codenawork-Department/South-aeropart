const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_4Hj0tNmvJzYc@ep-divine-hill-a111a8m9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Syncing database schema for newsletter_subscribers and newsletter_campaigns...");

  // 1. Create newsletter_subscribers table
  await sql`
    CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" text NOT NULL UNIQUE,
      "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "is_subscribed" boolean DEFAULT true NOT NULL,
      "source" text DEFAULT 'footer' NOT NULL,
      "subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
      "unsubscribed_at" timestamp with time zone,
      "unsubscribe_token" text DEFAULT gen_random_uuid() NOT NULL,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ newsletter_subscribers table created or already exists.");

  // 2. Indexes for newsletter_subscribers
  await sql`CREATE INDEX IF NOT EXISTS "newsletter_subscribers_email_idx" ON "newsletter_subscribers" ("email");`;
  await sql`CREATE INDEX IF NOT EXISTS "newsletter_subscribers_user_idx" ON "newsletter_subscribers" ("user_id");`;
  await sql`CREATE INDEX IF NOT EXISTS "newsletter_subscribers_is_subscribed_idx" ON "newsletter_subscribers" ("is_subscribed");`;
  console.log("✓ newsletter_subscribers indexes verified.");

  // 3. Create newsletter_campaigns table
  await sql`
    CREATE TABLE IF NOT EXISTS "newsletter_campaigns" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "subject" text NOT NULL,
      "title" text NOT NULL,
      "preview_text" text,
      "banner_image_url" text,
      "design_json" jsonb,
      "content_html" text NOT NULL,
      "status" text DEFAULT 'draft' NOT NULL,
      "recipient_count" integer DEFAULT 0,
      "sent_at" timestamp with time zone,
      "created_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ newsletter_campaigns table created or already exists.");

  // 4. Indexes for newsletter_campaigns
  await sql`CREATE INDEX IF NOT EXISTS "newsletter_campaigns_status_idx" ON "newsletter_campaigns" ("status");`;
  await sql`CREATE INDEX IF NOT EXISTS "newsletter_campaigns_created_by_idx" ON "newsletter_campaigns" ("created_by_admin_id");`;
  console.log("✓ newsletter_campaigns indexes verified.");

  console.log("Database schema sync for newsletter system completed successfully!");
}

run().catch((err) => {
  console.error("Schema sync failed:", err);
  process.exit(1);
});
