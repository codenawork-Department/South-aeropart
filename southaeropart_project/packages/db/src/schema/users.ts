import { pgTable, text, timestamp, jsonb, boolean, uuid } from "drizzle-orm/pg-core";

/**
 * Customer accounts only. Authentication is fully delegated to Clerk
 * (Google OAuth, Email/Password), so `id` is the Clerk user id and there is no
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
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLoginIp: text("last_login_ip"),
  lastLoginMethod: text("last_login_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Immutable audit trail of customer login events.
 * Records every successful login along with authentication method,
 * IP address, user agent, and contextual session metadata.
 */
export const userLoginLogs = pgTable("user_login_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  loginMethod: text("login_method").notNull().default("unknown"), // "google", "email_password", "oauth", "sso"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserLoginLog = typeof userLoginLogs.$inferSelect;
export type NewUserLoginLog = typeof userLoginLogs.$inferInsert;