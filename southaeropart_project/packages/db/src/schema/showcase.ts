import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { brands, carModels } from "./products";

/**
 * 3 Mini Showcase Hero Cards displayed right below the 3D Ferrari Showcase on the Storefront Homepage.
 * Managed dynamically by the Admin dashboard.
 */
export const homepageHeroCards = pgTable(
  "homepage_hero_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    position: integer("position").notNull().default(1),
    title: text("title").notNull(),
    tag: text("tag").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    carModelId: uuid("car_model_id").references(() => carModels.id, { onDelete: "set null" }),
    imageUrl: text("image_url").notNull(),
    cloudinaryPublicId: text("cloudinary_public_id"),
    href: text("href").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    posIdx: index("hero_cards_position_idx").on(table.position),
    activeIdx: index("hero_cards_active_idx").on(table.isActive),
  })
);

export type HomepageHeroCard = typeof homepageHeroCards.$inferSelect;
export type NewHomepageHeroCard = typeof homepageHeroCards.$inferInsert;
