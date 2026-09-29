ALTER TABLE "orders" ADD COLUMN "customer_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_note_size_check" CHECK (octet_length("orders"."customer_note") <= 2048);
