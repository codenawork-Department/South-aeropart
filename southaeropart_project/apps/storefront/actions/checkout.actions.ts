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
  toSmallestCurrencyUnit,
} from "@repo/lib";
import { syncUserWithClerk } from "@/lib/user-sync";
import { fulfillOrderPayment, syncBundleStockForChildPart } from "@/lib/order-fulfillment";
import {
  generateGuestOrderToken,
  verifyGuestOrderToken,
  getGuestTokenFromCookie,
  setGuestTokenCookie,
} from "@/lib/guest-order-token";

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
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, orderUserId))
        .limit(1);

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

      // CRIT-03: Rate limit guest orders (Max 5 guest orders per 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentGuestOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            sql`${orders.userId} LIKE 'guest_%'`,
            gte(orders.createdAt, fifteenMinutesAgo),
            sql`${orders.shippingAddress}->>'email' = ${guestEmail}`
          )
        );

      if (recentGuestOrders.length >= 5) {
        return {
          success: false,
          error: "คุณสร้างคำสั่งซื้อเกินจำนวนที่กำหนดสำหรับลูกค้าทั่วไป กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ",
        };
      }

      const [existingGuest] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, guestEmail))
        .limit(1);

      if (existingGuest) {
        orderUserId = existingGuest.id;
      } else {
        const generatedGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const [createdGuest] = await db
          .insert(users)
          .values({
            id: generatedGuestId,
            email: guestEmail,
            fullName: validated.shippingAddress.recipientName,
            phone: validated.shippingAddress.phone,
          })
          .returning({ id: users.id });
        orderUserId = createdGuest.id;
      }
    }

    if (!orderUserId) {
      throw new Error("Unable to determine customer identity");
    }

    // Pre-flight Price, Status & Stock Verification (MED-03: Batch queries)
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
    let subtotalSatang = 0;

    const itemProductIds = Array.from(new Set(validated.items.map((i) => i.productId)));
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        status: products.status,
        stockQuantity: products.stockQuantity,
        productType: products.productType,
      })
      .from(products)
      .where(inArray(products.id, itemProductIds));

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    const bundleIds = productRows.filter((p) => p.productType === "bundle").map((p) => p.id);
    const bundleParts = bundleIds.length > 0
      ? await db
          .select({
            bundleProductId: productBundleItems.bundleProductId,
            childId: productBundleItems.childProductId,
            partQtyInBundle: productBundleItems.quantity,
            childName: products.name,
            childStock: products.stockQuantity,
            childStatus: products.status,
          })
          .from(productBundleItems)
          .innerJoin(products, eq(productBundleItems.childProductId, products.id))
          .where(inArray(productBundleItems.bundleProductId, bundleIds))
      : [];

    const bundlePartsMap = new Map<string, typeof bundleParts>();
    for (const bp of bundleParts) {
      const list = bundlePartsMap.get(bp.bundleProductId) || [];
      list.push(bp);
      bundlePartsMap.set(bp.bundleProductId, list);
    }

    for (const item of validated.items) {
      const productRow = productMap.get(item.productId);

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
        const childParts = bundlePartsMap.get(item.productId) || [];
        for (const childPart of childParts) {
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

      // Authoritative server-side price calculation (SEC-01 & decimal-safe satang arithmetic)
      const authoritativeUnitPrice = productRow.price;
      const unitPriceSatang = toSmallestCurrencyUnit(authoritativeUnitPrice);
      const itemTotalSatang = unitPriceSatang * item.quantity;
      subtotalSatang += itemTotalSatang;

      verifiedItems.push({
        productId: productRow.id,
        productName: productRow.name,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: authoritativeUnitPrice,
        lineTotal: (itemTotalSatang / 100).toFixed(2),
        productType: productRow.productType as "single" | "bundle",
      });
    }

    // Calculate shipping fee using exact satang units
    let shippingFeeSatang = 0;
    if (validated.shippingMethod === "express") {
      shippingFeeSatang = 450 * 100;
    } else {
      // Standard: 150 THB, free if subtotal >= 15,000 THB (1,500,000 satang)
      shippingFeeSatang = subtotalSatang >= 15000 * 100 ? 0 : 150 * 100;
    }

    const totalSatang = subtotalSatang + shippingFeeSatang;
    const subtotalStr = (subtotalSatang / 100).toFixed(2);
    const shippingFeeStr = (shippingFeeSatang / 100).toFixed(2);
    const totalStr = (totalSatang / 100).toFixed(2);

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

    // ── Audit #2 & CRIT-01: Atomic Multi-Table Transaction ─────────────────────
    const createdOrder = await db.transaction(async (tx) => {
      // 1. Insert order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: orderUserId,
          status: "pending",
          paymentMethod: validated.paymentMethod,
          paymentStatus: "pending",
          subtotal: subtotalStr,
          shippingFee: shippingFeeStr,
          taxAmount: "0.00", // Tax included in prices
          total: totalStr,
          currency: "THB",
          shippingCarrier:
            validated.shippingMethod === "express"
              ? "South Aero Express Crated Logistics"
              : "South Aero Standard Logistics",
          shippingAddress: formattedShippingAddress,
          billingAddress: formattedBillingAddress,
        })
        .returning();

      // 2. Insert order items and bundle child part snapshots
      for (const item of verifiedItems) {
        const [createdOrderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: item.productId,
            productNameSnapshot: `${item.productName}${item.variant ? ` (${item.variant})` : ""}`,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })
          .returning();

        // If this item is a bundle, snapshot its child parts into orderItemBundleParts
        if (item.productType === "bundle") {
          const bundleChildParts = await tx
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

            await tx.insert(orderItemBundleParts).values(partsToInsert);
          }
        }
      }

      // 3. Atomic stock reservation
      for (const item of verifiedItems) {
        const [reserved] = await tx
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
          throw new Error(`สินค้า "${item.productName}" มีสต็อกคงเหลือไม่เพียงพอ กรุณาลองใหม่อีกครั้ง`);
        }

        // Auto-set out_of_stock status when stock reaches 0
        if (reserved.stockQuantity === 0) {
          await tx
            .update(products)
            .set({ status: "out_of_stock", updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }
      }

      // 4. Insert initial status history
      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        status: "pending",
        note: "สร้างคำสั่งซื้อสำเร็จ รอการชำระเงินผ่าน PromptPay QR Code (Order placed, awaiting payment)",
      });

      // 5. Optionally save address to user's address book if signed in
      if (clerkUserId && validated.saveAddress) {
        try {
          await tx.insert(userAddresses).values({
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

      return newOrder;
    });

    safeRevalidatePath("/orders");

    // SEC §5.1: Generate cryptographic guest order token if guest checkout
    let guestToken: string | undefined;
    if (createdOrder.userId.startsWith("guest_")) {
      guestToken = generateGuestOrderToken(
        createdOrder.id,
        createdOrder.userId,
        createdOrder.createdAt
      );
      setGuestTokenCookie(createdOrder.id, guestToken);
    }

    const redirectUrl = guestToken
      ? `/checkout/payment/${createdOrder.id}?token=${guestToken}`
      : `/checkout/payment/${createdOrder.id}`;

    return {
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      total: createdOrder.total,
      guestToken,
      redirectUrl,
    };
  } catch (error) {
    console.error("[createOrder] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith("สินค้า")
          ? error.message
          : "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * Retrieves full order details including items, products, and status history.
 */
export async function getOrderDetails(orderId: string, guestToken?: string) {
  try {
    z.string().uuid().parse(orderId);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) {
      return { success: false, error: "Order not found", data: null };
    }

    // IDOR Security Guard (SEC §5.1):
    // 1. Registered user orders must only be accessed by the account owner
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
    } else {
      // 2. Guest orders must present a valid cryptographic access token (via param or HttpOnly cookie)
      const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
      const isTokenValid = verifyGuestOrderToken(
        effectiveToken,
        order.id,
        order.userId,
        order.createdAt
      );

      if (!isTokenValid) {
        return { success: false, error: "Unauthorized access to guest order details", data: null };
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
export async function getOrderStatus(orderId: string, guestToken?: string) {
  try {
    z.string().uuid().parse(orderId);
    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // IDOR Security Guard (SEC §5.1): Registered users check ownership; guests check cryptographic token
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
    } else {
      const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
      const isTokenValid = verifyGuestOrderToken(
        effectiveToken,
        order.id,
        order.userId,
        order.createdAt
      );
      if (!isTokenValid) {
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

/**
 * Confirms mock QR payment (wraps authoritative fulfillOrderPayment with IDOR protection)
 */
export async function confirmMockPayment(orderId: string, guestToken?: string) {
  z.string().uuid().parse(orderId);

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Mock payment simulator is disabled in production environment.",
    };
  }

  // IDOR check (SEC §5.1): Registered user orders can only be mock-paid by the owner; guest orders require token
  const [order] = await db
    .select({ id: orders.id, userId: orders.userId, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (!order.userId.startsWith("guest_")) {
    let currentUserId: string | null = null;
    try {
      currentUserId = auth().userId;
    } catch {
      currentUserId = null;
    }

    if (!currentUserId || currentUserId !== order.userId) {
      return { success: false, error: "Unauthorized access to order" };
    }
  } else {
    const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
    const isTokenValid = verifyGuestOrderToken(
      effectiveToken,
      order.id,
      order.userId,
      order.createdAt
    );
    if (!isTokenValid) {
      return { success: false, error: "Unauthorized access to order" };
    }
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
export async function createOrGetStripePaymentIntent(
  orderId: string,
  guestToken?: string
): Promise<{
  success: boolean;
  clientSecret?: string;
  publishableKey?: string;
  isAlreadyPaid?: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    z.string().uuid().parse(orderId);

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        stripePaymentIntentId: orders.stripePaymentIntentId,
        total: orders.total,
        currency: orders.currency,
        shippingAddress: orders.shippingAddress,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // IDOR Security Guard (SEC §5.1): Registered user orders require owner session; guest orders require cryptographic token
    let currentUserId: string | null = null;
    let isOutsideRequestContext = false;
    try {
      currentUserId = auth().userId;
    } catch {
      isOutsideRequestContext = true;
    }

    if (!order.userId.startsWith("guest_")) {
      if (!isOutsideRequestContext && (!currentUserId || currentUserId !== order.userId)) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
      const isTokenValid = verifyGuestOrderToken(
        effectiveToken,
        order.id,
        order.userId,
        order.createdAt
      );
      if (!isTokenValid) {
        return { success: false, error: "Unauthorized access to order" };
      }
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
        
        // If the existing intent has already succeeded, verify amount & currency before fulfilling!
        if (existingIntent && existingIntent.status === "succeeded") {
          const expectedAmount = toSmallestCurrencyUnit(order.total);
          const receivedAmount = existingIntent.amount_received || existingIntent.amount;
          const expectedCurrency = (order.currency || "THB").toLowerCase();
          const receivedCurrency = (existingIntent.currency || "").toLowerCase();

          if (expectedAmount === receivedAmount && expectedCurrency === receivedCurrency) {
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
          } else {
            console.warn(
              `[createOrGetStripePaymentIntent Security] Existing succeeded intent amount/currency mismatch on order ${order.id}. Expected ${expectedAmount} ${expectedCurrency}, got ${receivedAmount} ${receivedCurrency}`
            );
          }
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
      idempotencyKey: `pi_order_${order.id}`,
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
export async function updateOrderReceiptEmail(
  orderId: string,
  email: string,
  guestToken?: string
) {
  try {
    z.string().uuid().parse(orderId);
    const validatedEmail = z.string().trim().email("กรุณากรอกรูปแบบอีเมลที่ถูกต้อง").parse(email);

    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        shippingAddress: orders.shippingAddress,
        stripePaymentIntentId: orders.stripePaymentIntentId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "ไม่พบข้อมูลคำสั่งซื้อในระบบ" };
    }

    // IDOR Security Guard (SEC §5.1)
    let currentUserId: string | null = null;
    let isOutsideRequestContext = false;
    try {
      currentUserId = auth().userId;
    } catch {
      isOutsideRequestContext = true;
    }

    if (!order.userId.startsWith("guest_")) {
      if (!isOutsideRequestContext && (!currentUserId || currentUserId !== order.userId)) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
      const isTokenValid = verifyGuestOrderToken(
        effectiveToken,
        order.id,
        order.userId,
        order.createdAt
      );
      if (!isTokenValid) {
        return { success: false, error: "Unauthorized access to order" };
      }
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
export async function rejectMockPayment(
  orderId: string,
  reason = "ผู้ใช้ปฏิเสธการชำระเงิน / ยกเลิกคำสั่งซื้อ",
  guestToken?: string
) {
  try {
    z.string().uuid().parse(orderId);

    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "Mock payment simulator is disabled in production environment.",
      };
    }

    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // IDOR Security Guard (SEC §5.1)
    let currentUserId: string | null = null;
    let isOutsideRequestContext = false;
    try {
      currentUserId = auth().userId;
    } catch {
      isOutsideRequestContext = true;
    }

    if (!order.userId.startsWith("guest_")) {
      if (!isOutsideRequestContext && (!currentUserId || currentUserId !== order.userId)) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || getGuestTokenFromCookie(orderId);
      const isTokenValid = verifyGuestOrderToken(
        effectiveToken,
        order.id,
        order.userId,
        order.createdAt
      );
      if (!isTokenValid) {
        return { success: false, error: "Unauthorized access to order" };
      }
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
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        subtotal: orders.subtotal,
        shippingFee: orders.shippingFee,
        taxAmount: orders.taxAmount,
        total: orders.total,
        currency: orders.currency,
        trackingNumber: orders.trackingNumber,
        shippingCarrier: orders.shippingCarrier,
        shippingAddress: orders.shippingAddress,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return { success: true, data: [] };
    }

    // MED-01: Batch query all items for user's orders to eliminate N+1
    const orderIds = userOrders.map((o) => o.id);
    const allItems = await db
      .select({
        orderId: orderItems.orderId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const countMap = new Map<string, number>();
    for (const item of allItems) {
      countMap.set(item.orderId, (countMap.get(item.orderId) || 0) + item.quantity);
    }

    const ordersWithCounts = userOrders.map((order) => ({
      ...order,
      itemCount: countMap.get(order.id) || 0,
    }));

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

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let userProfile = userRow || null;
    if (!userProfile?.email || userProfile.email.includes("@southaero.local")) {
      try {
        const clerkUser = await currentUser();
        const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
        if (clerkEmail) {
          userProfile = {
            ...(userProfile || {
              id: userId,
              email: clerkEmail,
              fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
              phone: null,
              avatarUrl: clerkUser.imageUrl || null,
              isBanned: false,
              lastLoginAt: null,
              lastLoginIp: null,
              lastLoginMethod: null,
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
