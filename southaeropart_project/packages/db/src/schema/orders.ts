import {
  pgTable, uuid, text, integer, numeric, pgEnum, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { adminUsers } from "./admin";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["credit_card", "promptpay"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "authorized", "paid", "failed", "refunded",
]);

export type Address = {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  omiseChargeId: text("omise_charge_id"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingFee: numeric("shipping_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("THB"),
  trackingNumber: text("tracking_number"),
  shippingCarrier: text("shipping_carrier"),
  shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
  billingAddress: jsonb("billing_address").$type<Address>(),
  // Which admin is currently handling this order (support / fulfillment).
  assignedAdminId: uuid("assigned_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("orders_user_idx").on(table.userId),
  statusIdx: index("orders_status_idx").on(table.status),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  orderIdx: index("order_items_order_idx").on(table.orderId),
  productIdx: index("order_items_product_idx").on(table.productId),
}));

/**
 * Append-only history of status transitions. Once more than one admin
 * touches orders, this is what support/dispute lookups actually need
 * ("who marked this as shipped, and when?") instead of only the
 * current `orders.status` snapshot.
 */
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  changedByAdminId: uuid("changed_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index("order_status_history_order_idx").on(table.orderId),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;