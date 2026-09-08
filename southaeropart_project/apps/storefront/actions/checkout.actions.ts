"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request context (e.g. scripts or test suite)
  }
}
import {
  db,
  rawSql,
  orders,
  orderItems,
  orderStatusHistory,
  orderItemBundleParts,
  productBundleItems,
  users,
  userAddresses,
  products,
  productImages,
  eq,
  sql,
  desc,
  and,
  gte,
  inArray,
  Address,
} from "@repo/db";
import { sendOrderConfirmationEmail } from "@/lib/order-email";
import {
  createPaymentIntent,
  retrievePaymentIntent,
  updatePaymentIntentReceiptEmail,
} from "@repo/lib";
import { syncUserWithClerk } from "@/lib/user-sync";

/* =========================================================================
   ZOD SCHEMAS & TYPES
   ========================================================================= */

const addressSchema = z.object({
  recipientName: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับ"),
  phone: z.string().trim().min(8, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง"),
  email: z.string().trim().email("กรุณากรอกอีเมลที่ถูกต้อง").optional().or(z.literal("")),
  line1: z.string().trim().min(1, "กรุณากรอกที่อยู่ (บ้านเลขที่, ถนน/ซอย)"),
  line2: z.string().trim().optional(),
  subDistrict: z.string().trim().min(1, "กรุณากรอกตำบล/แขวง"),
  district: z.string().trim().min(1, "กรุณากรอกอำเภอ/เขต"),
  province: z.string().trim().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().trim().length(5, "รหัสไปรษณีย์ต้องเป็น 5 หลัก"),
});

const checkoutItemSchema = z.object({
  productId: z.string().uuid("รหัสสินค้าไม่ถูกต้อง"),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  variant: z.string().optional(),
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["credit_card", "promptpay"]).default("promptpay"),
  items: z.array(checkoutItemSchema).min(1, "ตะกร้าสินค้าว่างเปล่า"),
  saveAddress: z.boolean().optional().default(false),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* =========================================================================
   CHECKOUT ACTIONS
   ========================================================================= */

/**
 * Creates an order in the database within a transaction.
 * Supports both Clerk-authenticated users and guest customers.
 */
export async function createOrder(input: CheckoutInput) {
  try {
    const validated = checkoutSchema.parse(input);
    let clerkUserId: string | null = null;
    try {
      clerkUserId = auth().userId;
    } catch {
      clerkUserId = null;
    }

    let orderUserId = clerkUserId;

    // If signed in, ensure user exists in the database
    if (orderUserId) {
      const [existing] = await db.select().from(users).where(eq(users.id, orderUserId)).limit(1);
      if (!existing) {
        let clerkUser = null;
        try {
          clerkUser = await currentUser();
        } catch {
          clerkUser = null;
        }
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress || validated.shippingAddress.email || `user_${orderUserId}@example.com`;
        const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || validated.shippingAddress.recipientName;
        
        await syncUserWithClerk({
          userId: orderUserId,
          email,
          fullName,
          phone: validated.shippingAddress.phone,
          avatarUrl: clerkUser?.imageUrl || null,
        });
      }
    } else {
      // Guest customer handling: Create or reuse a guest record to maintain FK
      const guestEmail = validated.shippingAddress.email || `guest_${Date.now()}@southaero.local`;
      const [existingGuest] = await db.select().from(users).where(eq(users.email, guestEmail)).limit(1);

      if (existingGuest) {
        orderUserId = existingGuest.id;
      } else {
        const generatedGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const [createdGuest] = await db.insert(users).values({
          id: generatedGuestId,
          email: guestEmail,
          fullName: validated.shippingAddress.recipientName,
          phone: validated.shippingAddress.phone,
        }).returning();
        orderUserId = createdGuest.id;
      }
    }

    if (!orderUserId) {
      throw new Error("Unable to determine customer identity");
    }

    // Pre-flight Price, Status & Stock Verification
    // NOTE (Audit #2): Stock availability is checked here for UX (early error),
    // but the authoritative stock reservation happens atomically AFTER order insert
    // using UPDATE ... WHERE stock_quantity >= $qty to prevent race conditions.
    interface VerifiedItem {
      productId: string;
      productName: string;
      variant?: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
      productType: "single" | "bundle";
    }

    const verifiedItems: VerifiedItem[] = [];
    let subtotalNum = 0;

    for (const item of validated.items) {
      const [productRow] = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          status: products.status,
          stockQuantity: products.stockQuantity,
          productType: products.productType,
        })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!productRow) {
        return {
          success: false,
          error: `ไม่พบข้อมูลสินค้า "${item.productName}" ในระบบ`,
        };
      }

      if (productRow.status !== "active") {
        return {
          success: false,
          error: `สินค้า "${productRow.name}" ขณะนี้ยังไม่เปิดจำหน่ายหรือสินค้าหมดชั่วคราว`,
        };
      }

      // Non-authoritative stock check for early UX feedback
      if (productRow.stockQuantity < item.quantity) {
        const label = productRow.productType === "bundle" ? "ชุดแต่ง" : "สินค้า";
        const unit = productRow.productType === "bundle" ? "ชุด" : "ชิ้น";
        return {
          success: false,
          error: `${label} "${productRow.name}" มีสต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${productRow.stockQuantity} ${unit}, ท่านสั่งซื้อ ${item.quantity} ${unit})`,
        };
      }

      // Bundle child parts: check status and stock (non-authoritative)
      if (productRow.productType === "bundle") {
        const bundleChildParts = await db
          .select({
            childId: productBundleItems.childProductId,
            partQtyInBundle: productBundleItems.quantity,
            childName: products.name,
            childStock: products.stockQuantity,
            childStatus: products.status,
          })
          .from(productBundleItems)
          .innerJoin(products, eq(productBundleItems.childProductId, products.id))
          .where(eq(productBundleItems.bundleProductId, item.productId));

        for (const childPart of bundleChildParts) {
          if (childPart.childStatus !== "active") {
            return {
              success: false,
              error: `ชิ้นส่วน "${childPart.childName}" ในชุดแต่ง "${productRow.name}" ขณะนี้ไม่พร้อมจำหน่าย`,
            };
          }
          const requiredChildQuantity = childPart.partQtyInBundle * item.quantity;
          if (childPart.childStock < requiredChildQuantity) {
            return {
              success: false,
              error: `ชิ้นส่วน "${childPart.childName}" ในชุดแต่ง "${productRow.name}" มีสต็อกไม่เพียงพอ (คงเหลือ ${childPart.childStock} ชิ้น, จำเป็นต้องใช้ ${requiredChildQuantity} ชิ้น)`,
            };
          }
        }
      }

      // Authoritative server-side price calculation (SEC-01 Price Tampering Guard)
      const authoritativeUnitPrice = productRow.price;
      const itemTotalNum = parseFloat(authoritativeUnitPrice) * item.quantity;
      subtotalNum += itemTotalNum;

      verifiedItems.push({
        productId: productRow.id,
        productName: productRow.name,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: authoritativeUnitPrice,
        lineTotal: itemTotalNum.toFixed(2),
        productType: productRow.productType as "single" | "bundle",
      });
    }

    // Calculate shipping fee
    let shippingFeeNum = 0;
    if (validated.shippingMethod === "express") {
      shippingFeeNum = 450;
    } else {
      // Standard: 150 THB, free if subtotal >= 15,000 THB
      shippingFeeNum = subtotalNum >= 15000 ? 0 : 150;
    }

    const totalNum = subtotalNum + shippingFeeNum;

    // Audit #16: Cryptographically random 8-char hex suffix prevents collision (4.3B combinations/day)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = randomBytes(4).toString("hex").toUpperCase();
    const orderNumber = `SA-${dateStr}-${randomSuffix}`;

    const formattedShippingAddress: Address = {
      recipientName: validated.shippingAddress.recipientName,
      phone: validated.shippingAddress.phone,
      email: validated.shippingAddress.email || undefined,
      line1: validated.shippingAddress.line1,
      line2: validated.shippingAddress.line2 || undefined,
      subDistrict: validated.shippingAddress.subDistrict,
      district: validated.shippingAddress.district,
      province: validated.shippingAddress.province,
      postalCode: validated.shippingAddress.postalCode,
    };

    const formattedBillingAddress: Address | undefined = validated.billingAddress ? {
      recipientName: validated.billingAddress.recipientName,
      phone: validated.billingAddress.phone,
      email: validated.billingAddress.email || undefined,
      line1: validated.billingAddress.line1,
      line2: validated.billingAddress.line2 || undefined,
      subDistrict: validated.billingAddress.subDistrict,
      district: validated.billingAddress.district,
      province: validated.billingAddress.province,
      postalCode: validated.billingAddress.postalCode,
    } : undefined;

    // Insert order, items, and status history (neon-http driver executes per-request)
    // 1. Insert order
    const [createdOrder] = await db.insert(orders).values({
      orderNumber,
      userId: orderUserId,
      status: "pending",
      paymentMethod: validated.paymentMethod,
      paymentStatus: "pending",
      subtotal: subtotalNum.toFixed(2),
      shippingFee: shippingFeeNum.toFixed(2),
      taxAmount: "0.00", // Tax included in prices
      total: totalNum.toFixed(2),
      currency: "THB",
      shippingCarrier: validated.shippingMethod === "express" ? "South Aero Express Crated Logistics" : "South Aero Standard Logistics",
      shippingAddress: formattedShippingAddress,
      billingAddress: formattedBillingAddress,
    }).returning();

    // 2. Insert order items and bundle child part snapshots
    for (const item of verifiedItems) {
      const [createdOrderItem] = await db
        .insert(orderItems)
        .values({
          orderId: createdOrder.id,
          productId: item.productId,
          productNameSnapshot: `${item.productName}${item.variant ? ` (${item.variant})` : ""}`,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })
        .returning();

      // If this item is a bundle, snapshot its child parts into orderItemBundleParts
      if (item.productType === "bundle") {
        const bundleChildParts = await db
          .select({
            childProductId: productBundleItems.childProductId,
            childQty: productBundleItems.quantity,
            childName: products.name,
            childPrice: products.price,
          })
          .from(productBundleItems)
          .innerJoin(products, eq(productBundleItems.childProductId, products.id))
          .where(eq(productBundleItems.bundleProductId, item.productId));

        if (bundleChildParts.length > 0) {
          const partsToInsert = bundleChildParts.map((part) => ({
            orderItemId: createdOrderItem.id,
            childProductId: part.childProductId,
            childProductNameSnapshot: part.childName,
            unitPriceSnapshot: part.childPrice,
            quantity: part.childQty * item.quantity,
          }));

          await db.insert(orderItemBundleParts).values(partsToInsert);
        }
      }
    }

    // ── Audit #2: Atomic stock reservation ──────────────────────────────────
    // Use atomic UPDATE ... WHERE stock_quantity >= $qty to prevent overselling.
    // If any reservation fails, delete the order (rollback) and return error.
    for (const item of verifiedItems) {
      // Atomically decrement the product's own stock
      const [reserved] = await db
        .update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, item.productId),
            gte(products.stockQuantity, item.quantity)
          )
        )
        .returning({ id: products.id, stockQuantity: products.stockQuantity });

      if (!reserved) {
        // Rollback: delete order items, bundle parts, and order
        const createdItemIds = await db
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(eq(orderItems.orderId, createdOrder.id));
        for (const oi of createdItemIds) {
          await db.delete(orderItemBundleParts).where(eq(orderItemBundleParts.orderItemId, oi.id));
        }
        await db.delete(orderItems).where(eq(orderItems.orderId, createdOrder.id));
        await db.delete(orders).where(eq(orders.id, createdOrder.id));
        // Restore previously decremented stock for items that were already reserved
        for (const prev of verifiedItems) {
          if (prev.productId === item.productId) break; // stop at the failed item
          await db
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} + ${prev.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, prev.productId));
        }
        return {
          success: false,
          error: `สินค้า "${item.productName}" มีสต็อกคงเหลือไม่เพียงพอ กรุณาลองใหม่อีกครั้ง`,
        };
      }

      // Auto-set out_of_stock status when stock reaches 0
      if (reserved.stockQuantity === 0) {
        await db
          .update(products)
          .set({ status: "out_of_stock", updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }
    }
    // ── End atomic stock reservation ────────────────────────────────────────

    // 3. Insert initial status history
    await db.insert(orderStatusHistory).values({
      orderId: createdOrder.id,
      status: "pending",
      note: "สร้างคำสั่งซื้อสำเร็จ รอการชำระเงินผ่าน PromptPay QR Code (Order placed, awaiting payment)",
    });

    // Optionally save address to user's address book if signed in
    if (clerkUserId && validated.saveAddress) {
      try {
        await db.insert(userAddresses).values({
          userId: clerkUserId,
          recipientName: validated.shippingAddress.recipientName,
          phone: validated.shippingAddress.phone,
          line1: validated.shippingAddress.line1,
          line2: validated.shippingAddress.line2 || null,
          subDistrict: validated.shippingAddress.subDistrict,
          district: validated.shippingAddress.district,
          province: validated.shippingAddress.province,
          postalCode: validated.shippingAddress.postalCode,
          isDefault: true,
        });
      } catch (addrErr) {
        console.warn("[createOrder] Failed to save address for user", addrErr);
      }
    }

    safeRevalidatePath("/orders");

    return {
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      total: createdOrder.total,
      redirectUrl: `/checkout/payment/${createdOrder.id}`,
    };
  } catch (error) {
    console.error("[createOrder] Error:", error);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * Retrieves full order details including items, products, and status history.
 */
export async function getOrderDetails(orderId: string) {
  try {
    z.string().uuid().parse(orderId);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found", data: null };
    }

    // IDOR Security Guard: Registered user orders must only be accessed by the account owner
    if (!order.userId.startsWith("guest_")) {
      let currentUserId: string | null = null;
      try {
        currentUserId = auth().userId;
      } catch {
        currentUserId = null;
      }

      if (!currentUserId || currentUserId !== order.userId) {
        return { success: false, error: "Unauthorized access to order details", data: null };
      }
    }

    // Fetch order items with product details & primary image
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
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // Audit #14: Batch-fetch all productImages and bundleParts in single queries to eliminate N+1
    const productIds = Array.from(new Set(rawItems.map((i) => i.productId).filter(Boolean))) as string[];
    const itemIds = rawItems.map((i) => i.id);

    // Fetch primary images in batch
    const imageMap = new Map<string, string>();
    if (productIds.length > 0) {
      const allImages = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
          isPrimary: productImages.isPrimary,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(desc(productImages.isPrimary));

      for (const img of allImages) {
        if (!imageMap.has(img.productId)) {
          imageMap.set(img.productId, img.secureUrl);
        }
      }
    }

    // Fetch bundle parts in batch
    type BundlePartItem = typeof orderItemBundleParts.$inferSelect;
    const bundlePartsMap = new Map<string, BundlePartItem[]>();
    if (itemIds.length > 0) {
      const allBundleParts = await db
        .select()
        .from(orderItemBundleParts)
        .where(inArray(orderItemBundleParts.orderItemId, itemIds));

      for (const part of allBundleParts) {
        const list = bundlePartsMap.get(part.orderItemId) || [];
        list.push(part);
        bundlePartsMap.set(part.orderItemId, list);
      }
    }

    const itemsWithImages = rawItems.map((item) => ({
      ...item,
      imageUrl: item.productId ? imageMap.get(item.productId) || null : null,
      bundleParts: bundlePartsMap.get(item.id) || [],
    }));

    // Fetch status history
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));

    return {
      success: true,
      error: null,
      data: {
        order,
        items: itemsWithImages,
        history,
      },
    };
  } catch (error) {
    console.error("[getOrderDetails] Error:", error);
    return { success: false, error: "Failed to load order details", data: null };
  }
}

/**
 * Fast check for order payment status (used for Polling on the payment page).
 */
export async function getOrderStatus(orderId: string) {
  try {
    z.string().uuid().parse(orderId);
    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Audit #8: IDOR Security Guard: Registered user orders must only be accessed by the account owner
    if (!order.userId.startsWith("guest_")) {
      let currentUserId: string | null = null;
      try {
        currentUserId = auth().userId;
      } catch {
        currentUserId = null;
      }

      if (!currentUserId || currentUserId !== order.userId) {
        return { success: false, error: "Unauthorized access to order status" };
      }
    }

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    return { success: false, error: "Failed to check status" };
  }
}

export interface FulfillPaymentParams {
  method: "stripe" | "mock" | "promptpay" | "credit_card";
  chargeId?: string;
  note?: string;
}

/**
 * Synchronizes bundle stockQuantity and status for all bundles containing the given child product.
 */
export async function syncBundleStockForChildPart(childProductId: string) {
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

      const minAvailableSets = Math.min(
        ...bundleParts.map((p) => Math.floor(Math.max(0, p.childStock) / (p.partQty || 1)))
      );

      await db
        .update(products)
        .set({
          stockQuantity: minAvailableSets,
          status: minAvailableSets === 0 ? "out_of_stock" : "active",
          updatedAt: new Date(),
        })
        .where(eq(products.id, bundleProductId));
    }
  } catch (err) {
    console.error("[syncBundleStockForChildPart] Error syncing bundle stock:", err);
  }
}

/**
 * Authoritative fulfillment for order payments (used by both Webhook and Mock payments):
 * - Idempotency guard: checks if order is already paid.
 * - Updates order.paymentStatus = "paid", status = "paid", stripePaymentIntentId.
 * - Inserts into orderStatusHistory.
 * - Decrements stockQuantity for single products and constituent bundle parts.
 * - Sets status = "out_of_stock" if stock reaches 0.
 * - Sends Resend Order Confirmation Email (non-blocking).
 * - Revalidates paths.
 */
export async function fulfillOrderPayment(orderId: string, params: FulfillPaymentParams) {
  try {
    z.string().uuid().parse(orderId);

    // SEC-02: Guard mock payments against execution in production
    if (params.method === "mock" && process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "Mock payment simulator is disabled in production environment.",
      };
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Audit #3: Atomic idempotency guard — UPDATE only if not already paid.
    // If 0 rows returned, another concurrent call already fulfilled this order.
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: "paid",
        paymentStatus: "paid",
        stripePaymentIntentId: params.method === "stripe" ? params.chargeId : (order.stripePaymentIntentId || null),
        omiseChargeId: params.method !== "stripe" ? (params.chargeId || `mock_qr_${Date.now()}`) : order.omiseChargeId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, orderId),
          sql`${orders.paymentStatus} != 'paid'`
        )
      )
      .returning({ id: orders.id });

    if (!updatedOrder) {
      return { success: true, message: "Order is already paid" };
    }

    // 2. Insert into history
    const historyNote = params.note || (params.method === "stripe"
      ? `ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (PaymentIntent: ${params.chargeId || "N/A"})`
      : "ชำระเงินสำเร็จ (Payment Approved)");

    await db.insert(orderStatusHistory).values({
      orderId,
      status: "paid",
      note: historyNote,
    });

    // 3. Decrement product stock (single products & bundle child parts)
    // 3. Audit #15: Decrement product stock in batch upfront to eliminate N+1 cascade
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const itemIds = items.map((i) => i.id);

    // Batch-fetch all bundle parts for all items in 1 query
    const allBundleParts = itemIds.length > 0
      ? await db
          .select()
          .from(orderItemBundleParts)
          .where(inArray(orderItemBundleParts.orderItemId, itemIds))
      : [];

    // Aggregate required stock decrement per productId
    const decrementMap = new Map<string, number>();
    const partsToSync = new Set<string>();

    for (const item of items) {
      if (item.productId) {
        decrementMap.set(item.productId, (decrementMap.get(item.productId) || 0) + item.quantity);
      }
    }

    for (const part of allBundleParts) {
      if (part.childProductId) {
        decrementMap.set(part.childProductId, (decrementMap.get(part.childProductId) || 0) + part.quantity);
        partsToSync.add(part.childProductId);
      }
    }

    // Batch-fetch and update all impacted products
    const targetProductIds = Array.from(decrementMap.keys());
    if (targetProductIds.length > 0) {
      const targetProds = await db
        .select({
          id: products.id,
          stockQuantity: products.stockQuantity,
          productType: products.productType,
        })
        .from(products)
        .where(inArray(products.id, targetProductIds));

      for (const prod of targetProds) {
        if (prod.productType === "single") {
          partsToSync.add(prod.id);
        }
        const dec = decrementMap.get(prod.id) || 0;
        const newStock = Math.max(0, prod.stockQuantity - dec);
        await db
          .update(products)
          .set({
            stockQuantity: newStock,
            status: newStock === 0 ? "out_of_stock" : undefined,
            updatedAt: new Date(),
          })
          .where(eq(products.id, prod.id));
      }

      // Deduplicated bundle stock synchronization (once per unique constituent part)
      for (const partId of partsToSync) {
        await syncBundleStockForChildPart(partId);
      }
    }

    // 4. Send Order Confirmation Email via Resend (non-blocking)
    try {
      await sendOrderConfirmationEmail(orderId);
    } catch (emailErr) {
      console.warn("[fulfillOrderPayment] Failed to send order confirmation email:", emailErr);
    }

    safeRevalidatePath(`/orders/${orderId}`);
    safeRevalidatePath(`/checkout/payment/${orderId}`);
    safeRevalidatePath("/orders");

    return { success: true, message: "ชำระเงินสำเร็จเรียบร้อยแล้ว!" };
  } catch (error) {
    console.error("[fulfillOrderPayment] Error:", error);
    return { success: false, error: "Failed to fulfill payment" };
  }
}

/**
 * Confirms mock QR payment (wraps authoritative fulfillOrderPayment)
 */
export async function confirmMockPayment(orderId: string) {
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Mock payment simulator is disabled in production environment.",
    };
  }
  return fulfillOrderPayment(orderId, {
    method: "mock",
    note: "ชำระเงินสำเร็จผ่าน PromptPay QR Code (Mockup Payment Approved)",
  });
}

/**
 * Creates or retrieves a Stripe PaymentIntent for the given order.
 * Returns clientSecret to initialize Stripe Payment Element on the frontend.
 */
export async function createOrGetStripePaymentIntent(orderId: string): Promise<{
  success: boolean;
  clientSecret?: string;
  publishableKey?: string;
  isAlreadyPaid?: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    z.string().uuid().parse(orderId);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.paymentStatus === "paid" || order.status === "paid") {
      return {
        success: true,
        isAlreadyPaid: true,
        redirectUrl: `/orders/${order.id}?paid=true`,
      };
    }

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      return { success: false, error: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured" };
    }

    // Check if there is an existing payment intent for this order
    if (order.stripePaymentIntentId) {
      try {
        const existingIntent = await retrievePaymentIntent(order.stripePaymentIntentId);
        
        // If the existing intent has already succeeded, fulfill the order and redirect!
        if (existingIntent && existingIntent.status === "succeeded") {
          console.log(`[createOrGetStripePaymentIntent] PaymentIntent ${existingIntent.id} is already SUCCEEDED. Fulfilling order...`);
          await fulfillOrderPayment(order.id, {
            method: "stripe",
            chargeId: existingIntent.id,
            note: "ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Auto-recovered in createOrGetStripePaymentIntent)",
          });
          return {
            success: true,
            isAlreadyPaid: true,
            redirectUrl: `/orders/${order.id}?paid=true`,
          };
        }

        // Only reuse clientSecret if intent is in a pending/submittable state
        if (
          existingIntent &&
          existingIntent.status !== "canceled" &&
          existingIntent.status !== "succeeded" &&
          existingIntent.client_secret
        ) {
          return {
            success: true,
            clientSecret: existingIntent.client_secret,
            publishableKey,
          };
        }
      } catch (e) {
        console.warn("[createOrGetStripePaymentIntent] Could not retrieve existing intent, creating a new one:", e);
      }
    }

    // Determine customer receipt email: prioritize order.shippingAddress.email, fallback to user account email
    let customerEmail = (order.shippingAddress as Address)?.email?.trim();
    if (!customerEmail && order.userId) {
      const [userRow] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);
      if (userRow?.email && !userRow.email.includes("@southaero.local")) {
        customerEmail = userRow.email.trim();
      }
    }

    const intent = await createPaymentIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountNumeric: order.total,
      currency: order.currency || "THB",
      receiptEmail: customerEmail,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
      },
    });

    if (!intent.client_secret) {
      return { success: false, error: "Failed to obtain client secret from Stripe" };
    }

    // Save stripePaymentIntentId on the order
    await db
      .update(orders)
      .set({
        stripePaymentIntentId: intent.id,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return {
      success: true,
      clientSecret: intent.client_secret,
      publishableKey,
    };
  } catch (error) {
    console.error("[createOrGetStripePaymentIntent] Error:", error);
    return {
      success: false,
      error: "Failed to initialize Stripe payment",
    };
  }
}

/**
 * Updates the customer receipt email on an existing order.
 * Also synchronizes Stripe PaymentIntent's receipt_email if stripePaymentIntentId exists.
 */
export async function updateOrderReceiptEmail(orderId: string, email: string) {
  try {
    z.string().uuid().parse(orderId);
    const validatedEmail = z.string().trim().email("กรุณากรอกรูปแบบอีเมลที่ถูกต้อง").parse(email);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "ไม่พบข้อมูลคำสั่งซื้อในระบบ" };
    }

    const currentShippingAddress = (order.shippingAddress || {}) as Address;
    const updatedShippingAddress: Address = {
      ...currentShippingAddress,
      email: validatedEmail,
    };

    await db
      .update(orders)
      .set({
        shippingAddress: updatedShippingAddress,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Also update Stripe PaymentIntent receipt_email if intent exists
    if (order.stripePaymentIntentId) {
      try {
        await updatePaymentIntentReceiptEmail(order.stripePaymentIntentId, validatedEmail);
        console.log(`[updateOrderReceiptEmail] Synced receipt_email ${validatedEmail} with Stripe Intent ${order.stripePaymentIntentId}`);
      } catch (stripeErr) {
        console.warn("[updateOrderReceiptEmail] Warning: Could not update Stripe receipt email:", stripeErr);
      }
    }

    safeRevalidatePath(`/checkout/payment/${orderId}`);
    safeRevalidatePath(`/orders/${orderId}`);

    return { success: true, email: validatedEmail };
  } catch (error) {
    console.error("[updateOrderReceiptEmail] Error:", error);
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors[0]?.message : "ไม่สามารถอัปเดตอีเมลสำหรับรับใบเสร็จได้",
    };
  }
}

/**
 * Rejects or cancels mock QR payment:
 * - Updates order.paymentStatus = "failed"
 * - Updates order.status = "cancelled"
 * - Inserts into order_status_history
 */
export async function rejectMockPayment(orderId: string, reason = "ผู้ใช้ปฏิเสธการชำระเงิน / ยกเลิกคำสั่งซื้อ") {
  try {
    z.string().uuid().parse(orderId);

    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "Mock payment simulator is disabled in production environment.",
      };
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return { success: true, message: "Order is already cancelled" };
    }

    await db
      .update(orders)
      .set({
        status: "cancelled",
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await db.insert(orderStatusHistory).values({
      orderId,
      status: "cancelled",
      note: `การชำระเงินถูกปฏิเสธ: ${reason} (Mockup Payment Rejected)`,
    });

    safeRevalidatePath(`/orders/${orderId}`);
    safeRevalidatePath(`/checkout/payment/${orderId}`);
    safeRevalidatePath("/orders");

    return { success: true, message: "การชำระเงินถูกปฏิเสธ/ยกเลิกเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("[rejectMockPayment] Error:", error);
    return { success: false, error: "Failed to reject payment" };
  }
}

/**
 * Fetches all orders for current authenticated user.
 */
export async function getUserOrders() {
  try {
    const { userId } = auth();
    if (!userId) {
      return { success: true, data: [] };
    }

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // Get item counts for each order
    const ordersWithCounts = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select({ quantity: orderItems.quantity })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...order,
          itemCount: totalQuantity,
        };
      })
    );

    return { success: true, data: ordersWithCounts };
  } catch (error) {
    console.error("[getUserOrders] Error:", error);
    return { success: false, error: "Failed to load orders", data: [] };
  }
}

/**
 * Fetches saved user addresses to pre-fill checkout.
 */
export async function getSavedCheckoutAddresses() {
  try {
    const { userId } = auth();
    if (!userId) {
      return { success: true, addresses: [], userProfile: null };
    }

    const addresses = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId))
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));

    const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    let userProfile = userRow || null;
    if (!userProfile?.email || userProfile.email.includes("@southaero.local")) {
      try {
        const clerkUser = await currentUser();
        const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
        if (clerkEmail) {
          userProfile = {
            ...(userProfile || {
              id: userId,
              fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
              phone: null,
              avatarUrl: clerkUser.imageUrl || null,
              role: "customer" as const,
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: null,
            }),
            email: clerkEmail,
          };
        }
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      addresses,
      userProfile,
    };
  } catch (error) {
    console.error("[getSavedCheckoutAddresses] Error:", error);
    return { success: false, addresses: [], userProfile: null };
  }
}
