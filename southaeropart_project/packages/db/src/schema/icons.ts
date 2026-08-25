import {
  pgTable, uuid, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";

/**
 * System and custom icons repository for South Aero platform
 * Used in Product Key Features, Categories, Feature Badges, Trust Marks, and Services
 */
export const icons = pgTable("icons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull().default("general"), // "aerodynamics" | "material" | "performance" | "trust" | "services" | "general"
  type: text("type").notNull().default("lucide"), // "lucide" | "svg_code" | "image_url"
  svgContent: text("svg_content"),
  imageUrl: text("image_url"),
  lucideName: text("lucide_name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("icons_slug_idx").on(table.slug),
  categoryIdx: index("icons_category_idx").on(table.category),
  isActiveIdx: index("icons_is_active_idx").on(table.isActive),
}));

export type Icon = typeof icons.$inferSelect;
export type NewIcon = typeof icons.$inferInsert;
