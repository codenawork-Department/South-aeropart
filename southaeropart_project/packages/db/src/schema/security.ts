import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const abuseBuckets = pgTable("abuse_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const reviewUploads = pgTable("review_uploads", {
  publicId: text("public_id").primaryKey(),
  userId: text("user_id").notNull(),
  secureUrl: text("secure_url").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
