ALTER TABLE "orders" ADD COLUMN "shipping_details" jsonb;
--> statement-breakpoint
CREATE TABLE "shipping_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "standard_fee" numeric(12,2) DEFAULT '150' NOT NULL,
  "express_fee" numeric(12,2) DEFAULT '450' NOT NULL,
  "free_threshold" numeric(12,2),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shipping_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "shipping_settings_amounts" CHECK ("standard_fee" >= 0 AND "express_fee" >= 0 AND ("free_threshold" IS NULL OR "free_threshold" >= 0))
);
--> statement-breakpoint
CREATE TABLE "product_shipping_policies" (
  "product_id" uuid PRIMARY KEY NOT NULL,
  "mode" text DEFAULT 'standard' NOT NULL,
  "first_item" numeric(12,2) DEFAULT '0' NOT NULL,
  "additional_item" numeric(12,2) DEFAULT '0' NOT NULL,
  "free_shipping_eligible" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shipping_policy_mode" CHECK ("mode" IN ('standard','fixed','free','quote')),
  CONSTRAINT "shipping_policy_amounts" CHECK ("first_item" >= 0 AND "additional_item" >= 0),
  CONSTRAINT "product_shipping_policies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE TABLE "shipping_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text,
  "guest_hash" text,
  "status" text DEFAULT 'requested' NOT NULL,
  "version" integer DEFAULT 0 NOT NULL,
  "request_key" text NOT NULL,
  "basket_fingerprint" text NOT NULL,
  "items" jsonb NOT NULL,
  "address" jsonb NOT NULL,
  "customer_note" text,
  "subtotal" numeric(12,2) NOT NULL,
  "fee" numeric(12,2),
  "carrier" text,
  "delivery_estimate" text,
  "terms" text,
  "parcels" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "offer_expires_at" timestamp with time zone,
  "access_expires_at" timestamp with time zone NOT NULL,
  "order_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shipping_quotes_owner" CHECK (("user_id" IS NOT NULL) <> ("guest_hash" IS NOT NULL)),
  CONSTRAINT "shipping_quotes_guest_hash_format" CHECK ("guest_hash" IS NULL OR "guest_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "shipping_quotes_request_key_format" CHECK ("request_key" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "shipping_quotes_fingerprint_format" CHECK ("basket_fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "shipping_quotes_state" CHECK ("status" IN ('requested','offered','converted','declined','cancelled')),
  CONSTRAINT "shipping_quotes_offer_complete" CHECK ("status" NOT IN ('offered','converted') OR ("fee" IS NOT NULL AND "carrier" IS NOT NULL AND "terms" IS NOT NULL AND "offer_expires_at" IS NOT NULL)),
  CONSTRAINT "shipping_quotes_converted" CHECK (("status" = 'converted') = ("order_id" IS NOT NULL)),
  CONSTRAINT "shipping_quotes_amounts" CHECK ("subtotal" > 0 AND ("fee" IS NULL OR "fee" >= 0) AND "version" >= 0),
  CONSTRAINT "shipping_quotes_note_size" CHECK (octet_length("customer_note") <= 2048),
  CONSTRAINT "shipping_quotes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_quotes_request_unique" ON "shipping_quotes" USING btree ("request_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_quotes_order_unique" ON "shipping_quotes" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "shipping_quotes_user_idx" ON "shipping_quotes" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "shipping_quotes_guest_idx" ON "shipping_quotes" USING btree ("guest_hash","created_at");
--> statement-breakpoint
CREATE INDEX "shipping_quotes_status_idx" ON "shipping_quotes" USING btree ("status","created_at");
