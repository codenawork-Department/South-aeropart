import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

/**
 * Customer accounts only. Authentication is fully delegated to Clerk
 * (Google OAuth), so `id` is the Clerk user id and there is no
 * password/role column here — admins live in a completely separate
 * table with its own auth strategy (see admin.ts).
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isBanned: boolean("is_banned").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;