CREATE TYPE "public"."product_type" AS ENUM('single', 'bundle');--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "user_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"car_model_id" uuid NOT NULL,
	"year" integer,
	"sub_model" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"description_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installations_name_unique" UNIQUE("name"),
	CONSTRAINT "installations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"description_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_name_unique" UNIQUE("name"),
	CONSTRAINT "materials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_product_id" uuid NOT NULL,
	"child_product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_bundle_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"child_product_id" uuid NOT NULL,
	"child_product_name_snapshot" text NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_stock_reservations_quantity_positive" CHECK ("order_stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "homepage_hero_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"tag" text NOT NULL,
	"brand_id" uuid,
	"car_model_id" uuid,
	"image_url" text NOT NULL,
	"cloudinary_public_id" text,
	"href" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
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
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"is_subscribed" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_token" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "mfa_last_used_step" integer;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "mfa_challenge_hash" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "mfa_pending_setup" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "mfa_pending_setup_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" "product_type" DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "material_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "installation_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "installation" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "installation_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "downforce_n" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drag_n" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "downforce_before" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "downforce_after" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drag_before" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drag_after" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_custom_cfd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_downforce_n" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_drag_n" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_state" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reservation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_child_product_id_products_id_fk" FOREIGN KEY ("child_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_bundle_parts" ADD CONSTRAINT "order_item_bundle_parts_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_bundle_parts" ADD CONSTRAINT "order_item_bundle_parts_child_product_id_products_id_fk" FOREIGN KEY ("child_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stock_reservations" ADD CONSTRAINT "order_stock_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stock_reservations" ADD CONSTRAINT "order_stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_hero_cards" ADD CONSTRAINT "homepage_hero_cards_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_hero_cards" ADD CONSTRAINT "homepage_hero_cards_car_model_id_car_models_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_created_by_admin_id_admin_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_addresses_user_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_vehicles_user_idx" ON "user_vehicles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "installations_slug_idx" ON "installations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "installations_name_idx" ON "installations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "materials_slug_idx" ON "materials" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "materials_name_idx" ON "materials" USING btree ("name");--> statement-breakpoint
CREATE INDEX "bundle_items_bundle_idx" ON "product_bundle_items" USING btree ("bundle_product_id");--> statement-breakpoint
CREATE INDEX "bundle_items_child_idx" ON "product_bundle_items" USING btree ("child_product_id");--> statement-breakpoint
CREATE INDEX "order_item_bundle_parts_item_idx" ON "order_item_bundle_parts" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_item_bundle_parts_child_product_idx" ON "order_item_bundle_parts" USING btree ("child_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_stock_reservations_order_product_unique" ON "order_stock_reservations" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "hero_cards_position_idx" ON "homepage_hero_cards" USING btree ("position");--> statement-breakpoint
CREATE INDEX "hero_cards_active_idx" ON "homepage_hero_cards" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_status_idx" ON "newsletter_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_created_by_idx" ON "newsletter_campaigns" USING btree ("created_by_admin_id");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_user_idx" ON "newsletter_subscribers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_is_subscribed_idx" ON "newsletter_subscribers" USING btree ("is_subscribed");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_unsub_token_idx" ON "newsletter_subscribers" USING btree ("unsubscribe_token");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_installation_id_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_material_idx" ON "products" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "products_installation_idx" ON "products" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "products_type_created_idx" ON "products" USING btree ("product_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_intent_unique" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_inventory_state_check" CHECK ("orders"."inventory_state" IN ('legacy', 'reserved', 'consumed', 'released'));