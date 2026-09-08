"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  orderItemBundleParts,
  productBundleItems,
  adminUsers,
  users,
  products,
  productImages,
  eq,
  desc,
  asc,
  and,
  or,
  ilike,
  sql,
} from "@repo/db";
import { validateSession, logAuditEvent } from "@/lib/auth";

/* =========================================================================
   ZOD SCHEMAS & TYPES
   ========================================================================= */

const getOrdersSchema = z.object({
  search: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  paymentStatus: z.string().optional().default("all"),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const updateStatusSchema = z.object({
  orderId: z.string().uuid("รหัสคำสั่งซื้อไม่ถูกต้อง"),
  status: z.enum([
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  paymentStatus: z
    .enum(["pending", "authorized", "paid", "failed", "refunded"])
    .optional(),
  note: z.string().max(500).optional().default(""),
});

const updateFulfillmentSchema = z.object({
  orderId: z.string().uuid("รหัสคำสั่งซื้อไม่ถูกต้อง"),
  trackingNumber: z.string().trim().min(1, "กรุณาระบุเลขพัสดุ"),
  shippingCarrier: z.string().trim().min(1, "กรุณาระบุบริษัทขนส่ง"),
  markAsShipped: z.boolean().optional().default(true),
  note: z.string().max(500).optional().default(""),
});

const assignAdminSchema = z.object({
  orderId: z.string().uuid("รหัสคำสั่งซื้อไม่ถูกต้อง"),
  adminId: z.string().uuid().nullable(),
});

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateFulfillmentInput = z.infer<typeof updateFulfillmentSchema>;

/* =========================================================================
   ADMIN ORDER ACTIONS
   ========================================================================= */

/**
 * Get KPI Metrics for Orders Overview
 */
export async function getOrderStatsAction() {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized", data: null };
    }

    const all = await db.select().from(orders);

    const totalOrders = all.length;
    const pendingOrders = all.filter((o) => o.status === "pending" || o.paymentStatus === "pending").length;
    const paidOrProcessing = all.filter(
      (o) => o.status === "paid" || o.status === "processing"
    ).length;
    const shippedOrDelivered = all.filter((o) => o.status === "shipped" || o.status === "delivered").length;
    const cancelledOrders = all.filter((o) => o.status === "cancelled" || o.paymentStatus === "failed").length;

    // Calculate revenue from paid/completed orders
    const totalRevenue = all
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

    return {
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        paidOrProcessing,
        shippedOrDelivered,
        cancelledOrders,
        totalRevenue,
      },
    };
  } catch (error) {
    console.error("[getOrderStatsAction] Error:", error);
    return { success: false, error: "Failed to load stats", data: null };
  }
}

/**
 * Get paginated list of orders with filters and search
 */
export async function getOrdersAction(params?: Partial<GetOrdersParams>) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized", data: null };
    }

    const { search, status, paymentStatus, page, limit } = getOrdersSchema.parse(params || {});
    const offset = (page - 1) * limit;

    // Base query conditions
    const conditions = [];

    // Filter by order status
    if (status && status !== "all") {
      conditions.push(eq(orders.status, status as any));
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== "all") {
      conditions.push(eq(orders.paymentStatus, paymentStatus as any));
    }

    // Search by orderNumber, recipientName, phone
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, s),
          sql`orders.shipping_address->>'recipientName' ILIKE ${s}`,
          sql`orders.shipping_address->>'phone' ILIKE ${s}`,
          ilike(orders.trackingNumber, s)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Orders rows query
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        subtotal: orders.subtotal,
        shippingFee: orders.shippingFee,
        total: orders.total,
        currency: orders.currency,
        trackingNumber: orders.trackingNumber,
        shippingCarrier: orders.shippingCarrier,
        shippingAddress: orders.shippingAddress,
        assignedAdminId: orders.assignedAdminId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        assignedAdminName: adminUsers.fullName,
      })
      .from(orders)
      .leftJoin(adminUsers, eq(orders.assignedAdminId, adminUsers.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get item counts for each order
    const ordersWithCounts = await Promise.all(
      rows.map(async (row) => {
        const items = await db
          .select({ quantity: orderItems.quantity })
          .from(orderItems)
          .where(eq(orderItems.orderId, row.id));
        const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
        return {
          ...row,
          itemCount: totalItemsCount,
        };
      })
    );

    return {
      success: true,
      data: {
        items: ordersWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };
  } catch (error) {
    console.error("[getOrdersAction] Error:", error);
    return { success: false, error: "Failed to load orders", data: null };
  }
}

/**
 * Get detailed information for a single order
 */
export async function getOrderByIdAction(orderId: string) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized", data: null };
    }

    z.string().uuid().parse(orderId);

    // 1. Fetch order with assigned admin
    const [orderRow] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        omiseChargeId: orders.omiseChargeId,
        subtotal: orders.subtotal,
        shippingFee: orders.shippingFee,
        taxAmount: orders.taxAmount,
        total: orders.total,
        currency: orders.currency,
        trackingNumber: orders.trackingNumber,
        shippingCarrier: orders.shippingCarrier,
        shippingAddress: orders.shippingAddress,
        billingAddress: orders.billingAddress,
        assignedAdminId: orders.assignedAdminId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        assignedAdminName: adminUsers.fullName,
        assignedAdminEmail: adminUsers.email,
      })
      .from(orders)
      .leftJoin(adminUsers, eq(orders.assignedAdminId, adminUsers.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderRow) {
      return { success: false, error: "Order not found", data: null };
    }

    // 2. Fetch customer info if available
    const [customer] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, orderRow.userId))
      .limit(1);

    // 3. Fetch order items with product details and primary image
    const rawItems = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productNameSnapshot: orderItems.productNameSnapshot,
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
        slug: products.slug,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    const itemsWithImages = await Promise.all(
      rawItems.map(async (item) => {
        let imageUrl: string | null = null;
        if (item.productId) {
          const [img] = await db
            .select({ secureUrl: productImages.secureUrl })
            .from(productImages)
            .where(eq(productImages.productId, item.productId))
            .orderBy(desc(productImages.isPrimary))
            .limit(1);
          imageUrl = img?.secureUrl || null;
        }
        return {
          ...item,
          imageUrl,
        };
      })
    );

    // 4. Fetch status history with admin who changed it
    const history = await db
      .select({
        id: orderStatusHistory.id,
        orderId: orderStatusHistory.orderId,
        status: orderStatusHistory.status,
        note: orderStatusHistory.note,
        changedByAdminId: orderStatusHistory.changedByAdminId,
        createdAt: orderStatusHistory.createdAt,
        adminName: adminUsers.fullName,
      })
      .from(orderStatusHistory)
      .leftJoin(adminUsers, eq(orderStatusHistory.changedByAdminId, adminUsers.id))
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));

    return {
      success: true,
      data: {
        order: orderRow,
        customer: customer || null,
        items: itemsWithImages,
        history,
      },
    };
  } catch (error) {
    console.error("[getOrderByIdAction] Error:", error);
    return { success: false, error: "Failed to load order details", data: null };
  }
}

/**
 * Update order status with audit history log
 */
export async function updateOrderStatusAction(input: UpdateStatusInput) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const { orderId, status, paymentStatus, note } = updateStatusSchema.parse(input);

    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) {
      return { success: false, error: "Order not found" };
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    } else if (status === "paid") {
      updates.paymentStatus = "paid";
    } else if (status === "cancelled") {
      updates.paymentStatus = "failed";
    }

    const isPreviousPaid =
      existing.status === "paid" ||
      existing.status === "processing" ||
      existing.status === "shipped" ||
      existing.paymentStatus === "paid";

    const isNowCancelled = status === "cancelled" || status === "refunded";

    // 1. Update order
    await db.update(orders).set(updates).where(eq(orders.id, orderId));

    // 2. If order was paid and is now cancelled/refunded, restore stock (INV-02 Guard)
    if (isPreviousPaid && isNowCancelled) {
      await restoreOrderStock(orderId);
    }

    // 3. Insert into history
    await db.insert(orderStatusHistory).values({
      orderId,
      status,
      note: note || `สถานะถูกอัปเดตเป็น ${status} โดย ${admin.fullName}`,
      changedByAdminId: admin.id,
    });

    // 4. Log Audit Event
    await logAuditEvent({
      adminId: admin.id,
      action: "order.status_updated",
      entityType: "order",
      entityId: orderId,
      metadata: {
        orderNumber: existing.orderNumber,
        previousStatus: existing.status,
        newStatus: status,
        note,
      },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);

    return { success: true, message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว` };
  } catch (error) {
    console.error("[updateOrderStatusAction] Error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Restores inventory stock for products and bundle parts when an order is cancelled/refunded.
 */
async function restoreOrderStock(orderId: string) {
  try {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      if (item.productId) {
        // Restore single product stock
        const [prod] = await db
          .select({
            stockQuantity: products.stockQuantity,
            productType: products.productType,
            status: products.status,
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (prod) {
          const restoredStock = prod.stockQuantity + item.quantity;
          await db
            .update(products)
            .set({
              stockQuantity: restoredStock,
              status: prod.status === "out_of_stock" ? "active" : prod.status,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));

          if (prod.productType === "single") {
            await syncAdminBundleStockForChild(item.productId);
          }
        }

        // Restore bundle child parts
        const bundleParts = await db
          .select()
          .from(orderItemBundleParts)
          .where(eq(orderItemBundleParts.orderItemId, item.id));

        for (const part of bundleParts) {
          if (part.childProductId) {
            const [childProd] = await db
              .select({
                stockQuantity: products.stockQuantity,
                status: products.status,
              })
              .from(products)
              .where(eq(products.id, part.childProductId))
              .limit(1);

            if (childProd) {
              const restoredChildStock = childProd.stockQuantity + part.quantity;
              await db
                .update(products)
                .set({
                  stockQuantity: restoredChildStock,
                  status: childProd.status === "out_of_stock" ? "active" : childProd.status,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, part.childProductId));

              await syncAdminBundleStockForChild(part.childProductId);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[restoreOrderStock] Error restoring stock for order:", orderId, err);
  }
}

/**
 * Recalculates and updates bundle stock based on child parts in admin context.
 */
async function syncAdminBundleStockForChild(childProductId: string) {
  try {
    const parentBundles = await db
      .select({ bundleProductId: productBundleItems.bundleProductId })
      .from(productBundleItems)
      .where(eq(productBundleItems.childProductId, childProductId));

    for (const { bundleProductId } of parentBundles) {
      const bundleParts = await db
        .select({
          childId: productBundleItems.childProductId,
          partQty: productBundleItems.quantity,
          childStock: products.stockQuantity,
        })
        .from(productBundleItems)
        .innerJoin(products, eq(productBundleItems.childProductId, products.id))
        .where(eq(productBundleItems.bundleProductId, bundleProductId));

      if (bundleParts.length === 0) continue;

      const minSets = Math.min(
        ...bundleParts.map((p) => Math.floor(Math.max(0, p.childStock) / (p.partQty || 1)))
      );

      await db
        .update(products)
        .set({
          stockQuantity: minSets,
          status: minSets === 0 ? "out_of_stock" : "active",
          updatedAt: new Date(),
        })
        .where(eq(products.id, bundleProductId));
    }
  } catch (err) {
    console.error("[syncAdminBundleStockForChild] Error syncing bundle stock:", err);
  }
}

/**
 * Update tracking number & shipping carrier
 */
export async function updateOrderFulfillmentAction(input: UpdateFulfillmentInput) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const { orderId, trackingNumber, shippingCarrier, markAsShipped, note } =
      updateFulfillmentSchema.parse(input);

    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) {
      return { success: false, error: "Order not found" };
    }

    const updates: Record<string, unknown> = {
      trackingNumber,
      shippingCarrier,
      updatedAt: new Date(),
    };

    const newStatus = markAsShipped ? "shipped" : existing.status;
    if (markAsShipped) {
      updates.status = "shipped";
    }

    // 1. Update order
    await db.update(orders).set(updates).where(eq(orders.id, orderId));

    // 2. Insert into history
    await db.insert(orderStatusHistory).values({
      orderId,
      status: newStatus,
      note: `อัปเดตการจัดส่ง: ขนส่ง ${shippingCarrier} เลขพัสดุ ${trackingNumber}${note ? ` (${note})` : ""}`,
      changedByAdminId: admin.id,
    });

    // 3. Log Audit Event
    await logAuditEvent({
      adminId: admin.id,
      action: "order.fulfillment_updated",
      entityType: "order",
      entityId: orderId,
      metadata: {
        orderNumber: existing.orderNumber,
        trackingNumber,
        shippingCarrier,
        status: newStatus,
      },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);

    return { success: true, message: "บันทึกข้อมูลการจัดส่งสำเร็จ" };
  } catch (error) {
    console.error("[updateOrderFulfillmentAction] Error:", error);
    return { success: false, error: "Failed to update fulfillment" };
  }
}

/**
 * Assign staff member to order
 */
export async function assignAdminToOrderAction(input: { orderId: string; adminId: string | null }) {
  try {
    const admin = await validateSession();
    if (!admin) {
      return { success: false, error: "Unauthorized" };
    }

    const { orderId, adminId } = assignAdminSchema.parse(input);

    await db
      .update(orders)
      .set({
        assignedAdminId: adminId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);

    return { success: true, message: "มอบหมายผู้ดูแลสำเร็จ" };
  } catch (error) {
    console.error("[assignAdminToOrderAction] Error:", error);
    return { success: false, error: "Failed to assign admin" };
  }
}

/**
 * Get active admin staff list for dropdown selector
 */
export async function getAdminStaffListAction() {
  try {
    const admin = await validateSession();
    if (!admin) return [];

    return await db
      .select({
        id: adminUsers.id,
        name: adminUsers.fullName,
        email: adminUsers.email,
        role: adminUsers.role,
      })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true))
      .orderBy(asc(adminUsers.fullName));
  } catch (error) {
    return [];
  }
}
