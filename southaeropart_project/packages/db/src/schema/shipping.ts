import { pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb, index, check, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products } from "./products";
import { orders, type Address } from "./orders";

export const shippingSettings = pgTable("shipping_settings", {
  id: integer("id").primaryKey().default(1),
  standardFee: numeric("standard_fee", { precision: 12, scale: 2 }).notNull().default("150"),
  expressFee: numeric("express_fee", { precision: 12, scale: 2 }).notNull().default("450"),
  freeThreshold: numeric("free_threshold", { precision: 12, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ singleton: check("shipping_settings_singleton", sql`${t.id} = 1`), amounts: check("shipping_settings_amounts", sql`${t.standardFee} >= 0 AND ${t.expressFee} >= 0 AND (${t.freeThreshold} IS NULL OR ${t.freeThreshold} >= 0)`) }));

export const productShippingPolicies = pgTable("product_shipping_policies", {
  productId: uuid("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("standard"),
  firstItem: numeric("first_item", { precision: 12, scale: 2 }).notNull().default("0"),
  additionalItem: numeric("additional_item", { precision: 12, scale: 2 }).notNull().default("0"),
  freeShippingEligible: boolean("free_shipping_eligible").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ modeCheck: check("shipping_policy_mode", sql`${t.mode} IN ('standard','fixed','free','quote')`), amounts: check("shipping_policy_amounts", sql`${t.firstItem} >= 0 AND ${t.additionalItem} >= 0`) }));

export type QuoteItem = { productId: string; quantity: number; variant?: string; name: string; unitPrice: string; productType: "single" | "bundle" };
export type QuoteParcel = { contents: string; lengthCm: number; widthCm: number; heightCm: number; weightKg: number };
export const shippingQuotes = pgTable("shipping_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Clerk identity is authenticated before insertion; local users are created by checkout on conversion.
  userId: text("user_id"), guestHash: text("guest_hash"),
  status: text("status").notNull().default("requested"), version: integer("version").notNull().default(0),
  requestKey: text("request_key").notNull(), basketFingerprint: text("basket_fingerprint").notNull(),
  items: jsonb("items").$type<QuoteItem[]>().notNull(), address: jsonb("address").$type<Address>().notNull(),
  customerNote: text("customer_note"), subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 12, scale: 2 }), carrier: text("carrier"), deliveryEstimate: text("delivery_estimate"), terms: text("terms"),
  parcels: jsonb("parcels").$type<QuoteParcel[]>().notNull().default([]),
  offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true }),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  userIdx: index("shipping_quotes_user_idx").on(t.userId, t.createdAt), guestIdx: index("shipping_quotes_guest_idx").on(t.guestHash, t.createdAt),
  statusIdx: index("shipping_quotes_status_idx").on(t.status, t.createdAt), requestUnique: uniqueIndex("shipping_quotes_request_unique").on(t.requestKey),
  orderUnique: uniqueIndex("shipping_quotes_order_unique").on(t.orderId),
  owner: check("shipping_quotes_owner", sql`(${t.userId} IS NOT NULL) <> (${t.guestHash} IS NOT NULL)`),
  guestHashFormat: check("shipping_quotes_guest_hash_format", sql`${t.guestHash} IS NULL OR ${t.guestHash} ~ '^[a-f0-9]{64}$'`),
  requestKeyFormat: check("shipping_quotes_request_key_format", sql`${t.requestKey} ~ '^[a-f0-9]{64}$'`),
  fingerprintFormat: check("shipping_quotes_fingerprint_format", sql`${t.basketFingerprint} ~ '^[a-f0-9]{64}$'`),
  state: check("shipping_quotes_state", sql`${t.status} IN ('requested','offered','converted','declined','cancelled')`),
  offered: check("shipping_quotes_offer_complete", sql`${t.status} NOT IN ('offered','converted') OR (${t.fee} IS NOT NULL AND ${t.carrier} IS NOT NULL AND ${t.terms} IS NOT NULL AND ${t.offerExpiresAt} IS NOT NULL)`),
  converted: check("shipping_quotes_converted", sql`(${t.status} = 'converted') = (${t.orderId} IS NOT NULL)`),
  amounts: check("shipping_quotes_amounts", sql`${t.subtotal} > 0 AND (${t.fee} IS NULL OR ${t.fee} >= 0) AND ${t.version} >= 0`),
  note: check("shipping_quotes_note_size", sql`octet_length(${t.customerNote}) <= 2048`),
}));
