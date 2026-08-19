import {
  pgTable, uuid, text, integer, pgEnum, timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { adminUsers } from "./admin";

export const reviewModerationStatusEnum = pgEnum("review_moderation_status", [
  "pending", "approved", "rejected",
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  moderationStatus: reviewModerationStatusEnum("moderation_status").notNull().default("pending"),
  moderationReason: text("moderation_reason"),
  moderatedByAdminId: uuid("moderated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // The hottest read path is "approved reviews for this product" —
  // a composite index makes that a single index scan at any scale.
  productStatusIdx: index("reviews_product_status_idx").on(table.productId, table.moderationStatus),
  userIdx: index("reviews_user_idx").on(table.userId),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;