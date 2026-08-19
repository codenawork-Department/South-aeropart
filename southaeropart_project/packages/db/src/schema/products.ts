import {
  pgTable, uuid, text, integer, numeric, pgEnum,
  timestamp, boolean, index, AnyPgColumn,
} from "drizzle-orm/pg-core";

export const productStatusEnum = pgEnum("product_status", [
  "draft", "active", "archived", "out_of_stock",
]);

/**
 * Hierarchical categories (self-referencing parent/child) so the
 * catalog can grow into nested categories/subcategories without a
 * schema migration later.
 */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentIdx: index("categories_parent_idx").on(table.parentId),
}));

/** Normalized out of the old free-text `brand` column so you can manage
 *  brand pages, logos, and filters without string-matching typos. */
export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  status: productStatusEnum("status").notNull().default("draft"),
  weightKg: numeric("weight_kg", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("products_slug_idx").on(table.slug),
  categoryIdx: index("products_category_idx").on(table.categoryId),
  brandIdx: index("products_brand_idx").on(table.brandId),
  statusIdx: index("products_status_idx").on(table.status),
}));

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  secureUrl: text("secure_url").notNull(),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index("product_images_product_idx").on(table.productId),
}));

/**
 * Normalized out of the old `compatibility` JSONB column so make/model/
 * year can actually be filtered and indexed at scale — e.g. "parts that
 * fit a 2018 Toyota Camry" — instead of scanning JSON on every request.
 */
export const productCompatibility = pgTable("product_compatibility", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  yearFrom: integer("year_from").notNull(),
  yearTo: integer("year_to").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index("product_compat_product_idx").on(table.productId),
  makeModelIdx: index("product_compat_make_model_idx").on(table.make, table.model),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductCompatibility = typeof productCompatibility.$inferSelect;