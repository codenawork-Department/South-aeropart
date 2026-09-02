import { relations } from "drizzle-orm";
import { users, userLoginLogs, userAddresses, userVehicles } from "./users";
import { adminUsers, adminSessions, adminAuditLogs } from "./admin";
import { categories, brands, carModels, materials, installations, products, productImages, productCompatibility, productBundleItems } from "./products";
import { orders, orderItems, orderStatusHistory, orderItemBundleParts } from "./orders";
import { reviews } from "./reviews";
import { userInterests } from "./user-interests";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  interests: many(userInterests),
  loginLogs: many(userLoginLogs),
  addresses: many(userAddresses),
  vehicles: many(userVehicles),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, { fields: [userAddresses.userId], references: [users.id] }),
}));

export const userVehiclesRelations = relations(userVehicles, ({ one }) => ({
  user: one(users, { fields: [userVehicles.userId], references: [users.id] }),
  brand: one(brands, { fields: [userVehicles.brandId], references: [brands.id] }),
  carModel: one(carModels, { fields: [userVehicles.carModelId], references: [carModels.id] }),
}));

export const userLoginLogsRelations = relations(userLoginLogs, ({ one }) => ({
  user: one(users, { fields: [userLoginLogs.userId], references: [users.id] }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
  auditLogs: many(adminAuditLogs),
  moderatedReviews: many(reviews),
  handledOrders: many(orders),
  orderStatusChanges: many(orderStatusHistory),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(adminUsers, { fields: [adminSessions.adminId], references: [adminUsers.id] }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(adminUsers, { fields: [adminAuditLogs.adminId], references: [adminUsers.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  models: many(carModels),
  products: many(products),
}));

export const carModelsRelations = relations(carModels, ({ one, many }) => ({
  brand: one(brands, { fields: [carModels.brandId], references: [brands.id] }),
  products: many(products),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  products: many(products),
}));

export const installationsRelations = relations(installations, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  carModel: one(carModels, { fields: [products.carModelId], references: [carModels.id] }),
  material: one(materials, { fields: [products.materialId], references: [materials.id] }),
  installationMethod: one(installations, { fields: [products.installationId], references: [installations.id] }),
  images: many(productImages),
  compatibility: many(productCompatibility),
  bundleItems: many(productBundleItems, { relationName: "bundleToItems" }),
  partOfBundles: many(productBundleItems, { relationName: "childToBundles" }),
  reviews: many(reviews),
  interests: many(userInterests),
}));

export const productBundleItemsRelations = relations(productBundleItems, ({ one }) => ({
  bundle: one(products, {
    fields: [productBundleItems.bundleProductId],
    references: [products.id],
    relationName: "bundleToItems",
  }),
  childProduct: one(products, {
    fields: [productBundleItems.childProductId],
    references: [products.id],
    relationName: "childToBundles",
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productCompatibilityRelations = relations(productCompatibility, ({ one }) => ({
  product: one(products, { fields: [productCompatibility.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  assignedAdmin: one(adminUsers, { fields: [orders.assignedAdminId], references: [adminUsers.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  bundleParts: many(orderItemBundleParts),
}));

export const orderItemBundlePartsRelations = relations(orderItemBundleParts, ({ one }) => ({
  orderItem: one(orderItems, { fields: [orderItemBundleParts.orderItemId], references: [orderItems.id] }),
  childProduct: one(products, { fields: [orderItemBundleParts.childProductId], references: [products.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  changedByAdmin: one(adminUsers, {
    fields: [orderStatusHistory.changedByAdminId],
    references: [adminUsers.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  moderatedByAdmin: one(adminUsers, {
    fields: [reviews.moderatedByAdminId],
    references: [adminUsers.id],
  }),
}));

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, { fields: [userInterests.userId], references: [users.id] }),
  product: one(products, { fields: [userInterests.productId], references: [products.id] }),
}));

import { newsletterSubscribers, newsletterCampaigns } from "./newsletter";

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({ one }) => ({
  user: one(users, { fields: [newsletterSubscribers.userId], references: [users.id] }),
}));

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({ one }) => ({
  createdByAdmin: one(adminUsers, { fields: [newsletterCampaigns.createdByAdminId], references: [adminUsers.id] }),
}));

export * from "./icons";
export * from "./users";
export * from "./admin";
export * from "./products";
export * from "./orders";
export * from "./reviews";
export * from "./user-interests";
export * from "./showcase";
export * from "./newsletter";