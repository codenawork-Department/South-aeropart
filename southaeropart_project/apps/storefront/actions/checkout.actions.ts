"use server";

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
  desc,
  Address,
} from "@repo/db";
import { sendOrderConfirmationEmail } from "@/lib/order-email";
import {
  createPaymentIntent,
  retrievePaymentIntent,
  updatePaymentIntentReceiptEmail,
} from "@repo/lib";

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

    // Pre-flight Stock & Status Verification
    for (const item of validated.items) {
      const [productRow] = await db
        .select({
          id: products.id,
          name: products.name,
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

      // 1. Single Product Check
      if (productRow.productType === "single") {
        if (productRow.stockQuantity < item.quantity) {
          return {
            success: false,
            error: `สินค้า "${productRow.name}" มีสต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${productRow.stockQuantity} ชิ้น, ท่านสั่งซื้อ ${item.quantity} ชิ้น)`,
          };
        }
      }

      // 2. Bundle Product Check (check bundle header stock and all child items)
      if (productRow.productType === "bundle") {
        if (productRow.stockQuantity < item.quantity) {
          return {
            success: false,
            error: `ชุดแต่ง "${productRow.name}" มีสต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${productRow.stockQuantity} ชุด, ท่านสั่งซื้อ ${item.quantity} ชุด)`,
          };
        }

        // Query constituent child parts from productBundleItems
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
    for (const item of validated.items) {
      const [createdOrderItem] = await db
        .insert(orderItems)
        .values({
          orderId: createdOrder.id,
          productId: item.productId,
          productNameSnapshot: `${item.productName}${item.variant ? ` (${item.variant})` : ""}`,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
        })
        .returning();

      // If this item is a bundle, snapshot its child parts into orderItemBundleParts
      const [prodHeader] = await db
        .select({ productType: products.productType })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (prodHeader?.productType === "bundle") {
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

    // Fetch primary images & bundle parts for these items
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

        const bundleParts = await db
          .select()
          .from(orderItemBundleParts)
          .where(eq(orderItemBundleParts.orderItemId, item.id));

        return {
          ...item,
          imageUrl,
          bundleParts,
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

export interface FulfillPaymentParams {
  method: "stripe" | "mock" | "promptpay" | "credit_card";
  chargeId?: string;
  note?: string;
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

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.paymentStatus === "paid") {
      return { success: true, message: "Order is already paid" };
    }

    // 1. Update order status
    await db
      .update(orders)
      .set({
        status: "paid",
        paymentStatus: "paid",
        stripePaymentIntentId: params.method === "stripe" ? params.chargeId : (order.stripePaymentIntentId || null),
        omiseChargeId: params.method !== "stripe" ? (params.chargeId || `mock_qr_${Date.now()}`) : order.omiseChargeId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

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
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId) {
        // Decrement direct product
        const [prod] = await db
          .select({
            stockQuantity: products.stockQuantity,
            productType: products.productType,
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (prod) {
          const newStock = Math.max(0, prod.stockQuantity - item.quantity);
          await db
            .update(products)
            .set({
              stockQuantity: newStock,
              status: newStock === 0 ? "out_of_stock" : undefined,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));
        }

        // Decrement bundle child parts
        const bundleParts = await db
          .select()
          .from(orderItemBundleParts)
          .where(eq(orderItemBundleParts.orderItemId, item.id));

        for (const part of bundleParts) {
          if (part.childProductId) {
            const [childProd] = await db
              .select({ stockQuantity: products.stockQuantity })
              .from(products)
              .where(eq(products.id, part.childProductId))
              .limit(1);

            if (childProd) {
              const newChildStock = Math.max(0, childProd.stockQuantity - part.quantity);
              await db
                .update(products)
                .set({
                  stockQuantity: newChildStock,
                  status: newChildStock === 0 ? "out_of_stock" : undefined,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, part.childProductId));
            }
          }
        }
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
      error: error instanceof Error ? error.message : "Failed to initialize Stripe payment",
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
