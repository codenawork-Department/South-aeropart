import {
  pgTable, uuid, text, integer, numeric, pgEnum,
  timestamp, boolean, index, jsonb, AnyPgColumn,
} from "drizzle-orm/pg-core";

export interface ProductFeatureItem {
  title: string;
  description: string;
  iconSlug?: string | null;
  iconId?: string | null;
}

export const productStatusEnum = pgEnum("product_status", [
  "draft", "active", "archived", "out_of_stock",
]);

/**
 * Hierarchical categories (self-referencing parent/child) for Aeropart categories
 * e.g. "Front Lip", "Ducktail Spoiler", "Rear Diffuser", "Side Skirts", "GT Wing", "Canards"
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
  slugIdx: index("categories_slug_idx").on(table.slug),
}));

/** 
 * Car Brands (แบรนด์รถยนต์) e.g. "Toyota", "Honda", "Nissan", "BMW", "Porsche", "Subaru"
 */
export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("brands_slug_idx").on(table.slug),
}));

/**
 * Car Models (รุ่น/โมเดลรถยนต์) linked to Car Brands
 * e.g. Toyota -> "GR86", "GR Yaris", "Supra A90", Honda -> "Civic Type R FL5", Nissan -> "GTR R35"
 */
export const carModels = pgTable("car_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  generation: text("generation"), // e.g. "ZN8 / ZD8", "FL5", "R35"
  yearFrom: integer("year_from"), // e.g. 2022
  yearTo: integer("year_to"), // e.g. 2024
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  brandIdx: index("car_models_brand_idx").on(table.brandId),
  slugIdx: index("car_models_slug_idx").on(table.slug),
}));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  carModelId: uuid("car_model_id").references(() => carModels.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  status: productStatusEnum("status").notNull().default("draft"),
  weightKg: numeric("weight_kg", { precision: 8, scale: 2 }),
  features: jsonb("features").$type<ProductFeatureItem[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("products_slug_idx").on(table.slug),
  categoryIdx: index("products_category_idx").on(table.categoryId),
  brandIdx: index("products_brand_idx").on(table.brandId),
  carModelIdx: index("products_car_model_idx").on(table.carModelId),
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
 * Specific compatibility fitments (make/model/years)
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
export type CarModel = typeof carModels.$inferSelect;
export type NewCarModel = typeof carModels.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductCompatibility = typeof productCompatibility.$inferSelect;