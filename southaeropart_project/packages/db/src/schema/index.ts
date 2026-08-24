import { relations } from "drizzle-orm";
import { users, userLoginLogs } from "./users";
import { adminUsers, adminSessions, adminAuditLogs } from "./admin";
import { categories, brands, carModels, products, productImages, productCompatibility } from "./products";
import { orders, orderItems, orderStatusHistory } from "./orders";
import { reviews } from "./reviews";
import { userInterests } from "./user-interests";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  interests: many(userInterests),
  loginLogs: many(userLoginLogs),
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

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  carModel: one(carModels, { fields: [products.carModelId], references: [carModels.id] }),
  images: many(productImages),
  compatibility: many(productCompatibility),
  reviews: many(reviews),
  interests: many(userInterests),
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

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
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

export * from "./users";
export * from "./admin";
export * from "./products";
export * from "./orders";
export * from "./reviews";
export * from "./user-interests";