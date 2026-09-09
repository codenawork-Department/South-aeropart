import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  orderItemBundleParts,
  productBundleItems,
  products,
  eq,
  sql,
  and,
  inArray,
} from "@repo/db";
import { sendOrderConfirmationEmail } from "@/lib/order-email";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request context
  }
}

export interface FulfillPaymentParams {
  method: "stripe" | "promptpay" | "mock";
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
 * Authoritative fulfillment for order payments (CRIT-02 & HIGH-01):
 * - NOT exposed as a public Server Action (in a non-"use server" file).
 * - Idempotency guard: checks if order is already paid.
 * - Atomic transaction for order status update, history insertion, and inventory decrements.
 * - Deduplicated bundle stock synchronization.
 * - Non-blocking order confirmation email dispatch via Resend.
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

    // Atomic transaction for payment fulfillment and stock decrements (CRIT-02)
    const txResult = await db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          paymentStatus: orders.paymentStatus,
          stripePaymentIntentId: orders.stripePaymentIntentId,
          omiseChargeId: orders.omiseChargeId,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return { notFound: true, alreadyPaid: false, partsToSync: [] };
      }

      // Idempotency: If already paid, do nothing
      if (order.paymentStatus === "paid") {
        return { notFound: false, alreadyPaid: true, partsToSync: [] };
      }

      // 1. Atomic update to mark paid
      const [updatedOrder] = await tx
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
        return { notFound: false, alreadyPaid: true, partsToSync: [] };
      }

      // 2. Insert into history
      const historyNote = params.note || (params.method === "stripe"
        ? `ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (PaymentIntent: ${params.chargeId || "N/A"})`
        : "ชำระเงินสำเร็จ (Payment Approved)");

      await tx.insert(orderStatusHistory).values({
        orderId,
        status: "paid",
        note: historyNote,
      });

      // 3. Decrement product stock within transaction
      const items = await tx
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      const itemIds = items.map((i) => i.id);

      const allBundleParts = itemIds.length > 0
        ? await tx
            .select({
              childProductId: orderItemBundleParts.childProductId,
              quantity: orderItemBundleParts.quantity,
            })
            .from(orderItemBundleParts)
            .where(inArray(orderItemBundleParts.orderItemId, itemIds))
        : [];

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

      const targetProductIds = Array.from(decrementMap.keys());
      if (targetProductIds.length > 0) {
        const targetProds = await tx
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
          await tx
            .update(products)
            .set({
              stockQuantity: newStock,
              status: newStock === 0 ? "out_of_stock" : undefined,
              updatedAt: new Date(),
            })
            .where(eq(products.id, prod.id));
        }
      }

      return {
        notFound: false,
        alreadyPaid: false,
        partsToSync: Array.from(partsToSync),
      };
    });

    if (txResult.notFound) {
      return { success: false, error: "Order not found" };
    }

    if (txResult.alreadyPaid) {
      return { success: true, message: "Order is already paid" };
    }

    // 4. Synchronize bundle stock for constituent parts (post-transaction)
    for (const partId of txResult.partsToSync) {
      await syncBundleStockForChildPart(partId);
    }

    // 5. Send Order Confirmation Email via Resend (non-blocking)
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
