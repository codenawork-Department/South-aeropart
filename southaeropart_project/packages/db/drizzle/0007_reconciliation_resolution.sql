ALTER TABLE "shipping_settings" ALTER COLUMN "id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "shipping_quotes" ALTER COLUMN "version" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN IF NOT EXISTS "icon_name" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "icon_name" text;--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD COLUMN IF NOT EXISTS "resolved_by" uuid;--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD COLUMN IF NOT EXISTS "resolution_note" text;--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD COLUMN IF NOT EXISTS "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD COLUMN IF NOT EXISTS "alerted_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_reconciliation_jobs" ADD CONSTRAINT "payment_reconciliation_jobs_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_reconciliation_jobs_state_created_idx" ON "payment_reconciliation_jobs" USING btree ("state","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_reconciliation_jobs" ADD CONSTRAINT "payment_reconciliation_jobs_state_check" CHECK (state IN ('pending_review', 'refunded', 'fulfilled_manually', 'dismissed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_reconciliation_jobs" ADD CONSTRAINT "payment_reconciliation_jobs_resolution_note_length" CHECK (resolution_note IS NULL OR length(resolution_note) <= 2000);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;