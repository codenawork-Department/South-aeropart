import { isExpectedStripeMode } from "@repo/lib/stripe";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  orders,
  orderEmailJobs,
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
import { dispatchOrderEmailJob } from "@/lib/order-email-jobs";
import { retrievePaymentIntent, toSmallestCurrencyUnit } from "@repo/lib/stripe";

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
 * - Atomic transition consumes an existing reservation; never deducts stock twice.
 * - Durable email job is committed with the paid transition.
 */
export async function fulfillOrderPayment(orderId: string, params: FulfillPaymentParams) {
  try {
    z.string().uuid().parse(orderId);

    // SEC-02: Guard mock payments against execution in production
    if (params.method !== "stripe" && process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "Mock payment simulator is disabled in production environment.",
      };
    }

    const verifiedIntent = params.method === "stripe" && params.chargeId
      ? await retrievePaymentIntent(params.chargeId) : null;
    // Provider proof applies to every caller, including server-rendered recovery pages.
    if (params.method === "stripe" && (!verifiedIntent || verifiedIntent.status !== "succeeded" ||
      (!isExpectedStripeMode(verifiedIntent.livemode)))) {
      throw new Error("Payment is not confirmed by the provider");
    }
    const txResult = await db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          paymentStatus: orders.paymentStatus,
          status: orders.status,
          inventoryState: orders.inventoryState,
          total: orders.total,
          currency: orders.currency,
          stripePaymentIntentId: orders.stripePaymentIntentId,
          omiseChargeId: orders.omiseChargeId,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return { notFound: true, alreadyPaid: false, partsToSync: [] };
      }

      if (params.method === "stripe" && (!params.chargeId || order.stripePaymentIntentId !== params.chargeId)) throw new Error("Payment binding mismatch");
      if (verifiedIntent && (verifiedIntent.amount_received !== toSmallestCurrencyUnit(order.total) || verifiedIntent.currency.toLowerCase() !== order.currency.toLowerCase())) throw new Error("Payment total mismatch");
      // Idempotency: If already paid, do nothing
      if (order.paymentStatus === "paid") {
        return { notFound: false, alreadyPaid: true, partsToSync: [] };
      }

      if (order.status !== "pending" || !["pending", "failed", "authorized"].includes(order.paymentStatus) || order.inventoryState !== "reserved") {
        throw new Error("Order requires payment reconciliation");
      }
      // 1. Atomic update to mark paid
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: "paid",
          paymentStatus: "paid",
          inventoryState: "consumed",
          stripePaymentIntentId: params.method === "stripe" ? params.chargeId : (order.stripePaymentIntentId || null),
          omiseChargeId: params.method !== "stripe" ? (params.chargeId || `mock_qr_${Date.now()}`) : order.omiseChargeId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.status, "pending"),
            eq(orders.inventoryState, "reserved"),
            sql`${orders.stripePaymentIntentId} IS NOT DISTINCT FROM ${order.stripePaymentIntentId}`,
            inArray(orders.paymentStatus, ["pending", "failed", "authorized"])
          )
        )
        .returning({ id: orders.id });

      if (!updatedOrder) {
        throw new Error("Concurrent order transition; retry reconciliation");
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

      await tx.insert(orderEmailJobs).values({ orderId }).onConflictDoNothing();
      // Checkout reserved every physical part atomically. Payment consumes the
      // reservation once and must never decrement available inventory again.
      return { notFound: false, alreadyPaid: false, partsToSync: [] as string[] };
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
      await dispatchOrderEmailJob(orderId);
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
