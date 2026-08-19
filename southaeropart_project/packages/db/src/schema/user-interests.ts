import {
  pgTable, uuid, text, pgEnum, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";

export const interactionTypeEnum = pgEnum("interaction_type", [
  "wishlist", "view", "price_drop_alert",
]);

export const userInterests = pgTable("user_interests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  interactionType: interactionTypeEnum("interaction_type").notNull().default("wishlist"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueUserProductInteraction: uniqueIndex("user_interests_user_product_type_idx")
    .on(table.userId, table.productId, table.interactionType),
}));

export type UserInterest = typeof userInterests.$inferSelect;
