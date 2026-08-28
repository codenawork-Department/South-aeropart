import { pgTable, text, timestamp, jsonb, boolean, uuid, integer, index } from "drizzle-orm/pg-core";
import { brands, carModels } from "./products";

export interface UserPreferences {
  language?: "th" | "en" | "ja" | string;
  currency?: "THB" | "USD" | "EUR" | "JPY" | "SGD" | string;
  defaultSteering?: "RHD" | "LHD" | null;
}

export interface UserPrivacyConsents {
  marketingEmail?: boolean;
  marketingSms?: boolean;
  analytics?: boolean;
  consentTimestamp?: string;
}

export interface UserMetadata {
  preferences?: UserPreferences;
  privacyConsents?: UserPrivacyConsents;
  [key: string]: unknown;
}

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
  metadata: jsonb("metadata").$type<UserMetadata>(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLoginIp: text("last_login_ip"),
  lastLoginMethod: text("last_login_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Customer saved addresses (Shipping & Billing/Tax).
 * Supports both Thai local and International address formats.
 */
export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("shipping"), // "shipping" | "billing"
  recipientName: text("recipient_name").notNull(),
  phoneCountryCode: text("phone_country_code").notNull().default("+66"),
  phone: text("phone").notNull(),
  country: text("country").notNull().default("TH"), // ISO-2 Country Code e.g. "TH", "US", "JP"
  line1: text("line1").notNull(), // Address line 1 (house number, street)
  line2: text("line2"),           // Address line 2 (building, room, floor)
  subDistrict: text("sub_district"), // ตำบล/แขวง (for Thailand)
  district: text("district"),       // อำเภอ/เขต (for Thailand)
  province: text("province"),       // จังหวัด (for Thailand)
  city: text("city"),               // City (for International)
  stateOrProvince: text("state_or_province"), // State / Province / Region (for International)
  postalCode: text("postal_code").notNull(),
  companyName: text("company_name"), // For Tax/Billing
  taxId: text("tax_id"),             // Tax ID / VAT Number
  branch: text("branch"),           // Head office or branch number
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_addresses_user_idx").on(table.userId),
}));

/**
 * Customer Garage (My Garage / โรงรถของฉัน).
 * Links customer with specific car models, steering orientation (RHD/LHD),
 * and model year to enable compatibility filters and market analytics.
 */
export const userVehicles = pgTable("user_vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  carModelId: uuid("car_model_id")
    .notNull()
    .references(() => carModels.id, { onDelete: "cascade" }),
  year: integer("year"),
  subModel: text("sub_model"), // e.g. "Type R FL5", "GR Sport", "NISMO"
  steeringOrientation: text("steering_orientation").notNull().default("RHD"), // "RHD" | "LHD"
  plateNumber: text("plate_number"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_vehicles_user_idx").on(table.userId),
}));

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
export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;
export type UserVehicle = typeof userVehicles.$inferSelect;
export type NewUserVehicle = typeof userVehicles.$inferInsert;
export type UserLoginLog = typeof userLoginLogs.$inferSelect;
export type NewUserLoginLog = typeof userLoginLogs.$inferInsert;