CREATE TABLE "order_email_jobs" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_id" uuid,
	"lease_expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "abuse_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_uploads" (
	"public_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secure_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_uploads_secure_url_unique" UNIQUE("secure_url")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD COLUMN "mfa_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_email_jobs" ADD CONSTRAINT "order_email_jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "bundle_items_positive_quantity" CHECK ("product_bundle_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "bundle_items_no_self_reference" CHECK ("product_bundle_items"."bundle_product_id" <> "product_bundle_items"."child_product_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_nonnegative_stock" CHECK ("products"."stock_quantity" >= 0);