"use server";

import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  users,
  userAddresses,
  products,
  productImages,
  eq,
  desc,
  Address,
} from "@repo/db";

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
    const { userId: clerkUserId } = auth();

    let orderUserId = clerkUserId;

    // If signed in, ensure user exists in the database
    if (orderUserId) {
      const [existing] = await db.select().from(users).where(eq(users.id, orderUserId)).limit(1);
      if (!existing) {
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress || validated.shippingAddress.email || `user_${orderUserId}@example.com`;
        const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || validated.shippingAddress.recipientName;
        
        await db.insert(users).values({
          id: orderUserId,
          email,
          fullName,
          phone: validated.shippingAddress.phone,
          avatarUrl: clerkUser?.imageUrl || null,
        }).onConflictDoUpdate({
          target: users.id,
          set: { updatedAt: new Date() },
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

    // Calculate subtotal
    const subtotalNum = validated.items.reduce((acc, item) => {
      return acc + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    // Calculate shipping fee
    let shippingFeeNum = 0;
    if (validated.shippingMethod === "express") {
      shippingFeeNum = 450;
    } else {
      // Standard: 150 THB, free if subtotal >= 15,000 THB
      shippingFeeNum = subtotalNum >= 15000 ? 0 : 150;
    }

    const totalNum = subtotalNum + shippingFeeNum;

    // Generate Order Number: e.g. SA-20260903-8492
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SA-${dateStr}-${randomSuffix}`;

    const formattedShippingAddress: Address = {
      recipientName: validated.shippingAddress.recipientName,
      phone: validated.shippingAddress.phone,
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

    // 2. Insert order items
    const orderItemsToInsert = validated.items.map((item) => ({
      orderId: createdOrder.id,
      productId: item.productId,
      productNameSnapshot: `${item.productName}${item.variant ? ` (${item.variant})` : ""}`,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
    }));

    if (orderItemsToInsert.length > 0) {
      await db.insert(orderItems).values(orderItemsToInsert);
    }

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

    revalidatePath("/orders");

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
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง",
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

    // Fetch primary images for these items
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
 * Confirms mock QR payment:
 * - Updates order.paymentStatus = "paid"
 * - Updates order.status = "paid"
 * - Inserts into order_status_history
 * - Decrements stockQuantity for products in the order
 */
export async function confirmMockPayment(orderId: string) {
  try {
    z.string().uuid().parse(orderId);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.paymentStatus === "paid") {
      return { success: true, message: "Order is already paid" };
    }

    // Update order directly (neon-http compatible)
    // 1. Update order
    await db
      .update(orders)
      .set({
        status: "paid",
        paymentStatus: "paid",
        omiseChargeId: `mock_qr_${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 2. Insert into history
    await db.insert(orderStatusHistory).values({
      orderId,
      status: "paid",
      note: "ชำระเงินสำเร็จผ่าน PromptPay QR Code (Mockup Payment Approved)",
    });

    // 3. Decrement product stock
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId) {
        const [prod] = await db
          .select({ stockQuantity: products.stockQuantity })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (prod) {
          const newStock = Math.max(0, prod.stockQuantity - item.quantity);
          await db
            .update(products)
            .set({ stockQuantity: newStock, updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }
      }
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/checkout/payment/${orderId}`);
    revalidatePath("/orders");

    return { success: true, message: "ชำระเงินสำเร็จเรียบร้อยแล้ว!" };
  } catch (error) {
    console.error("[confirmMockPayment] Error:", error);
    return { success: false, error: "Failed to confirm payment" };
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

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/checkout/payment/${orderId}`);
    revalidatePath("/orders");

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

    return {
      success: true,
      addresses,
      userProfile: userRow || null,
    };
  } catch (error) {
    console.error("[getSavedCheckoutAddresses] Error:", error);
    return { success: false, addresses: [], userProfile: null };
  }
}
