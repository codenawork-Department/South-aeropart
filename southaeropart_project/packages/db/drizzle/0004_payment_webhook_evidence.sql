CREATE TABLE "stripe_webhook_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "order_id" uuid CONSTRAINT "stripe_webhook_events_order_id_orders_id_fk" REFERENCES "orders"("id"),
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reconciliation_jobs" (
  "payment_intent_id" text PRIMARY KEY NOT NULL,
  "order_id" uuid NOT NULL CONSTRAINT "payment_reconciliation_jobs_order_id_orders_id_fk" REFERENCES "orders"("id"),
  "reason" text NOT NULL,
  "state" text DEFAULT 'pending_review' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
