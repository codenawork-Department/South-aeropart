CREATE TABLE IF NOT EXISTS "icons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"type" text DEFAULT 'lucide' NOT NULL,
	"svg_content" text,
	"image_url" text,
	"lucide_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "icons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_login_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"login_method" text DEFAULT 'unknown' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "car_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"generation" text,
	"year_from" integer,
	"year_to" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_method" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "car_model_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_login_logs" ADD CONSTRAINT "user_login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "car_models" ADD CONSTRAINT "car_models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "icons_slug_idx" ON "icons" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "icons_category_idx" ON "icons" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "icons_is_active_idx" ON "icons" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "car_models_brand_idx" ON "car_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "car_models_slug_idx" ON "car_models" USING btree ("slug");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_car_model_idx" ON "products" USING btree ("car_model_id");