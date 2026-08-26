-- Migration: 0003_installations
-- สร้างตาราง installations และเพิ่มคอลัมน์ installation_id ใน products

CREATE TABLE IF NOT EXISTS "installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installations_name_unique" UNIQUE("name"),
	CONSTRAINT "installations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installations_slug_idx" ON "installations" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installations_name_idx" ON "installations" USING btree ("name");
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "installation_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_installation_id_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_installation_idx" ON "products" USING btree ("installation_id");
