"use server";
import { isExpectedStripeMode } from "@repo/lib/stripe";


import { getStripe } from "@repo/lib/stripe";
import { randomBytes } from "crypto";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import { customerAuth as auth } from "@/lib/customer-auth";
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
  reserveOrderStock,
  takeRateLimit,
  rawSql,
  orders,
  orderItems,
  orderStatusHistory,
  orderItemBundleParts,
  productBundleItems,
  users,
  userAddresses,
  products,
  shippingQuotes,
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
import { orderReadDto } from "@/lib/order-read-dto";
import { parseOrderReadInput, type OrderReadInput } from "@/lib/order-read-input";
import { orderReadLimit } from "@/lib/order-read-limit";
import {
  generateGuestOrderToken,
  verifyGuestOrderToken,
  getGuestTokenFromCookie,
  setGuestTokenCookie,
} from "@/lib/guest-order-token";
import { headers } from "next/headers";
import {
  globalStorefrontRateLimiter,
  getClientIp,
  RATE_LIMIT_PRESETS,
} from "@/lib/rate-limiter";

/* =========================================================================
   ZOD SCHEMAS & TYPES
   ========================================================================= */

import { checkoutSchema, type CheckoutInput } from "@/lib/checkout-input";
import { checkoutFailure, checkoutException } from "@/lib/checkout-errors";
import { checkedPayableSatang, formatSatang } from "@repo/lib/money-arithmetic";
import { ShippingConflict, moneySatang, shippingItemsSchema } from "@repo/lib/shipping";
import { loadShippingBasket, shippingRates, shippingIdentity, quoteOwner, hashShipping, shippingRateLimit } from "@/lib/shipping-service";

async function orderCheckoutResult(order: typeof orders.$inferSelect) {
  let guestToken: string | undefined;
  if (order.userId.startsWith("guest_")) {
    if (Date.now() - order.createdAt.getTime() >= 7 * 86400000) throw new ShippingConflict();
    guestToken = generateGuestOrderToken(order.id, order.userId, order.createdAt);
    await setGuestTokenCookie(order.id, guestToken);
  }
  return { success: true as const, orderId: order.id, orderNumber: order.orderNumber, total: order.total,
    guestToken, redirectUrl: `/checkout/payment/${order.id}` };
}

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
    const shippingItems = shippingItemsSchema.parse(validated.items.map(({ productId, quantity, variant }) => ({ productId, quantity, variant })));
    const quoteIdentity = validated.shippingQuote ? await shippingIdentity() : null;
    if (validated.shippingQuote && quoteIdentity) {
      await shippingRateLimit("accept", 20, quoteIdentity.userId);
      const [previous] = await db.select({ orderId: shippingQuotes.orderId }).from(shippingQuotes).where(and(eq(shippingQuotes.id, validated.shippingQuote.id), quoteOwner(quoteIdentity))).limit(1);
      if (previous?.orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, previous.orderId)).limit(1);
        if (!order) return checkoutFailure("CONFLICT");
        return orderCheckoutResult(order);
      }
    }
    let clerkUserId: string | null = null;
    try {
      clerkUserId = (await auth()).userId;
    } catch {
      return checkoutFailure("UNAUTHENTICATED");
    }

    if (!clerkUserId) {
      return checkoutFailure("UNAUTHENTICATED");
    }

    const orderUserId = clerkUserId;

    // Ensure user exists in the database
    const [existing] = await db
      .select({ id: users.id, isBanned: users.isBanned })
      .from(users)
      .where(eq(users.id, orderUserId))
      .limit(1);

    if (existing?.isBanned) return checkoutFailure("FORBIDDEN");
    if (!existing) {
      const clerkUser = await currentUser();
      const verifiedEmail = clerkUser?.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === "verified");
      if (!clerkUser || clerkUser.id !== orderUserId || !verifiedEmail) {
        return checkoutFailure("FORBIDDEN");
      }
      const email = verifiedEmail.emailAddress;
      const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || validated.shippingAddress.recipientName;
      
      await syncUserWithClerk({
        userId: orderUserId,
        email,
        fullName,
        phone: validated.shippingAddress.phone,
        avatarUrl: clerkUser?.imageUrl || null,
      });
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
    let subtotalSatang = 0n;

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
        return checkoutFailure("CONFLICT");
      }

      if (productRow.status !== "active") {
        return checkoutFailure("CONFLICT");
      }

      // Non-authoritative stock check for early UX feedback
      if (!validated.shippingQuote && productRow.stockQuantity < item.quantity) {
        const label = productRow.productType === "bundle" ? "ชุดแต่ง" : "สินค้า";
        const unit = productRow.productType === "bundle" ? "ชุด" : "ชิ้น";
        return checkoutFailure("CONFLICT");
      }

      // Bundle child parts: check status and stock (non-authoritative)
      if (productRow.productType === "bundle") {
        const childParts = bundlePartsMap.get(item.productId) || [];
        for (const childPart of childParts) {
          if (childPart.childStatus !== "active") {
            return checkoutFailure("CONFLICT");
          }
          const requiredChildQuantity = childPart.partQtyInBundle * item.quantity;
          if (!validated.shippingQuote && childPart.childStock < requiredChildQuantity) {
            return checkoutFailure("CONFLICT");
          }
        }
      }

      // Authoritative server-side price calculation (SEC-01 & decimal-safe satang arithmetic)
      const authoritativeUnitPrice = productRow.price;
      const unitPriceSatang = BigInt(toSmallestCurrencyUnit(authoritativeUnitPrice));
      const itemTotalSatang = unitPriceSatang * BigInt(item.quantity);
      subtotalSatang += itemTotalSatang;

      verifiedItems.push({
        productId: productRow.id,
        productName: productRow.name,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: authoritativeUnitPrice,
        lineTotal: formatSatang(itemTotalSatang),
        productType: productRow.productType as "single" | "bundle",
      });
    }

    const shippingBasket = await loadShippingBasket(shippingItems);
    if (moneySatang(shippingBasket.subtotal) !== subtotalSatang) throw new ShippingConflict();
    const quote = validated.shippingQuote && quoteIdentity ? (await db.select().from(shippingQuotes).where(and(eq(shippingQuotes.id, validated.shippingQuote.id), quoteOwner(quoteIdentity))).limit(1))[0] : null;
    const rates = quote ? null : await shippingRates(shippingBasket, validated.shippingAddress.country);
    if (validated.shippingQuote && !quote) return checkoutFailure("FORBIDDEN");
    if (rates?.requiresQuote) return checkoutFailure("CONFLICT");
    if (rates && validated.shippingPreviewKey && validated.shippingPreviewKey !== rates.key) return checkoutFailure("CONFLICT");
    const rate = quote ? quote.fee : rates?.[validated.shippingMethod];
    if (rate == null) return checkoutFailure("CONFLICT");
    const shippingFeeSatang = moneySatang(rate);

    const totalSatang = checkedPayableSatang([subtotalSatang, shippingFeeSatang]);
    const subtotalStr = formatSatang(subtotalSatang);
    const shippingFeeStr = formatSatang(shippingFeeSatang);
    const totalStr = formatSatang(totalSatang);

    // Audit #16: Cryptographically random 8-char hex suffix prevents collision (4.3B combinations/day)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = randomBytes(4).toString("hex").toUpperCase();
    const orderNumber = `SA-${dateStr}-${randomSuffix}`;

    const formattedShippingAddress: Address = {
      country: validated.shippingAddress.country,
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
      country: validated.billingAddress.country,
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
      if (validated.shippingQuote && quoteIdentity) {
        // Serialize acceptance, offer revisions and cancellation on one durable row.
        const [locked] = await tx.select().from(shippingQuotes).where(and(eq(shippingQuotes.id, validated.shippingQuote.id), quoteOwner(quoteIdentity))).for("update");
        if (!locked) throw new ShippingConflict();
        if (locked.status === "converted" && locked.orderId) {
          const [existing] = await tx.select().from(orders).where(eq(orders.id, locked.orderId));
          if (!existing) throw new ShippingConflict();
          return existing;
        }
        if (locked.status !== "offered" || locked.version !== validated.shippingQuote.version ||
            !locked.offerExpiresAt || locked.offerExpiresAt.getTime() <= Date.now() ||
            locked.accessExpiresAt.getTime() <= Date.now() || locked.fee !== quote?.fee ||
            hashShipping(locked.address) !== hashShipping(validated.shippingAddress) ||
            (locked.customerNote || "") !== (validated.customerNote || "")) throw new ShippingConflict();
        // Keep the existing physical-stock lock mode and deterministic ordering.
        for (const id of shippingBasket.productIds) await tx.execute(sql`SELECT 1 FROM ${products} WHERE ${products.id} = ${id} FOR NO KEY UPDATE`);
        const currentBasket = await loadShippingBasket(shippingItems, tx);
        if (currentBasket.fingerprint !== locked.basketFingerprint || currentBasket.fingerprint !== shippingBasket.fingerprint)
          throw new ShippingConflict();
      }
      // Guest identity is committed only with its successful order/reservation.
      if (!clerkUserId) await tx.insert(users).values({
        id: orderUserId, email: `${orderUserId}@southaero.local`,
        fullName: validated.shippingAddress.recipientName, phone: validated.shippingAddress.phone,
      });
      // 1. Insert order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: orderUserId,
          status: "pending",
          inventoryState: "reserved",
          reservationExpiresAt: new Date(Date.now() + 30 * 60000),
          paymentMethod: validated.paymentMethod,
          paymentStatus: "pending",
          subtotal: subtotalStr,
          shippingFee: shippingFeeStr,
          shippingDetails: quote ? { quoteId: quote.id, quoteVersion: quote.version, method: "quote", terms: quote.terms || "", deliveryEstimate: quote.deliveryEstimate || "", parcels: quote.parcels } : { method: validated.shippingMethod },
          taxAmount: "0.00", // Tax included in prices
          total: totalStr,
          currency: "THB",
          shippingCarrier: quote ? quote.carrier : validated.shippingMethod === "express"
              ? "South Aero Express Crated Logistics"
              : "South Aero Standard Logistics",
          shippingAddress: formattedShippingAddress,
          billingAddress: formattedBillingAddress,
          customerNote: validated.customerNote?.trim() ? validated.customerNote : null,
        })
        .returning();

      const demand = new Map<string, number>();
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

          if (!bundleChildParts.length) throw new Error("Bundle has no physical parts");
          if (bundleChildParts.length > 0) {
            const partsToInsert = bundleChildParts.map((part) => ({
              orderItemId: createdOrderItem.id,
              childProductId: part.childProductId,
              childProductNameSnapshot: part.childName,
              unitPriceSnapshot: part.childPrice,
              quantity: part.childQty * item.quantity,
            }));

            await tx.insert(orderItemBundleParts).values(partsToInsert);
            for (const part of partsToInsert) demand.set(part.childProductId, (demand.get(part.childProductId) || 0) + part.quantity);
          }
        }
      }

      for (const item of verifiedItems) {
        if (item.productType === "single") demand.set(item.productId, (demand.get(item.productId) || 0) + item.quantity);
      }
      await reserveOrderStock(tx, newOrder.id, demand);

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
            country: validated.shippingAddress.country,
            city: validated.shippingAddress.country === "TH" ? null : validated.shippingAddress.district,
            stateOrProvince: validated.shippingAddress.country === "TH" ? null : validated.shippingAddress.province,
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

      if (quote) await tx.update(shippingQuotes).set({ status: "converted", orderId: newOrder.id, version: quote.version + 1, updatedAt: new Date() }).where(eq(shippingQuotes.id, quote.id));
      return newOrder;
    });

    safeRevalidatePath("/orders");
    safeRevalidatePath("/shipping-quotes");

    // SEC §5.1: Generate cryptographic guest order token if guest checkout
    let guestToken: string | undefined;
    if (createdOrder.userId.startsWith("guest_")) {
      guestToken = generateGuestOrderToken(
        createdOrder.id,
        createdOrder.userId,
        createdOrder.createdAt
      );
      await setGuestTokenCookie(createdOrder.id, guestToken);
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
    return checkoutException(error);
  }
}

export interface OrderItemBundlePartDetail {
  id: string;
  orderItemId: string;
  childProductId: string;
  childProductNameSnapshot: string;
  childProductName?: string | null;
  childProductNameEn?: string | null;
  unitPriceSnapshot: string;
  quantity: number;
  createdAt: Date;
}

function orderReadFailure(code: "INVALID_INPUT" | "NOT_FOUND" | "INTERNAL_ERROR" | "RATE_LIMITED") {
  const messages = { INVALID_INPUT: "Invalid request", NOT_FOUND: "Resource not found", INTERNAL_ERROR: "Unable to process request", RATE_LIMITED:"Too many requests" };
  // Keep the string error for existing callers; add a stable code without exposing identity.
  return { success: false as const, code, error: messages[code], data: null };
}

/**
 * Retrieves full order details including items, products, and status history.
 */
export async function getOrderDetails(input: string | OrderReadInput, positionalToken?: string) {
  const parsed = parseOrderReadInput(input, positionalToken);
  if (!parsed) return orderReadFailure("INVALID_INPUT");
  const { orderId, guestToken } = parsed;
  try {
    const limit=await orderReadLimit();
    if(!limit.allowed)return {...orderReadFailure("RATE_LIMITED"),retryAfter:limit.retryAfter};

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) {
      return orderReadFailure("NOT_FOUND");
    }

    // IDOR Security Guard (SEC §5.1):
    // 1. Registered user orders must only be accessed by the account owner
    if (!order.userId.startsWith("guest_")) {
      let currentUserId: string | null = null;
      try {
        currentUserId = (await auth()).userId;
      } catch {
        currentUserId = null;
      }

      if (!currentUserId || currentUserId !== order.userId) {
        return orderReadFailure("NOT_FOUND");
      }
    } else {
      // 2. Guest orders must present a valid cryptographic access token (via param or HttpOnly cookie)
      const effectiveToken = guestToken === undefined ? await getGuestTokenFromCookie(orderId) : guestToken;
      const isTokenValid = verifyGuestOrderToken(
        typeof effectiveToken === "string" ? effectiveToken : null,
        order.id,
        order.userId,
        order.createdAt
      );

      if (!isTokenValid) {
        return orderReadFailure("NOT_FOUND");
      }
    }

    // Fetch order items with product details & primary image
    const rawItems = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productNameSnapshot: orderItems.productNameSnapshot,
        productName: products.name,
        productNameEn: products.nameEn,
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
    const bundlePartsMap = new Map<string, OrderItemBundlePartDetail[]>();
    if (itemIds.length > 0) {
      const allBundleParts = await db
        .select({
          id: orderItemBundleParts.id,
          orderItemId: orderItemBundleParts.orderItemId,
          childProductId: orderItemBundleParts.childProductId,
          childProductNameSnapshot: orderItemBundleParts.childProductNameSnapshot,
          childProductName: products.name,
          childProductNameEn: products.nameEn,
          unitPriceSnapshot: orderItemBundleParts.unitPriceSnapshot,
          quantity: orderItemBundleParts.quantity,
          createdAt: orderItemBundleParts.createdAt,
        })
        .from(orderItemBundleParts)
        .leftJoin(products, eq(orderItemBundleParts.childProductId, products.id))
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
      .select({ id: orderStatusHistory.id, orderId: orderStatusHistory.orderId,
        status: orderStatusHistory.status, createdAt: orderStatusHistory.createdAt })
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));

    return {
      success: true,
      error: null,
      data: {
        order: orderReadDto(order),
        items: itemsWithImages,
        history,
      },
    };
  } catch (error) {
    console.error("[getOrderDetails] Lookup failed");
    return orderReadFailure("INTERNAL_ERROR");
  }
}

/**
 * Fast check for order payment status (used for Polling on the payment page).
 */
export async function getOrderStatus(input: string | OrderReadInput, positionalToken?: string) {
  const parsed = parseOrderReadInput(input, positionalToken);
  if (!parsed) return orderReadFailure("INVALID_INPUT");
  const { orderId, guestToken } = parsed;
  try {
    const limit=await orderReadLimit();
    if(!limit.allowed)return {...orderReadFailure("RATE_LIMITED"),retryAfter:limit.retryAfter};
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
      return orderReadFailure("NOT_FOUND");
    }

    // IDOR Security Guard (SEC §5.1): Registered users check ownership; guests check cryptographic token
    if (!order.userId.startsWith("guest_")) {
      let currentUserId: string | null = null;
      try {
        currentUserId = (await auth()).userId;
      } catch {
        currentUserId = null;
      }

      if (!currentUserId || currentUserId !== order.userId) {
        return orderReadFailure("NOT_FOUND");
      }
    } else {
      const effectiveToken = guestToken === undefined ? await getGuestTokenFromCookie(orderId) : guestToken;
      const isTokenValid = verifyGuestOrderToken(
        typeof effectiveToken === "string" ? effectiveToken : null,
        order.id,
        order.userId,
        order.createdAt
      );
      if (!isTokenValid) {
        return orderReadFailure("NOT_FOUND");
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
    return orderReadFailure("INTERNAL_ERROR");
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
      currentUserId = (await auth()).userId;
    } catch {
      currentUserId = null;
    }

    if (!currentUserId || currentUserId !== order.userId) {
      return { success: false, error: "Unauthorized access to order" };
    }
  } else {
    const effectiveToken = guestToken || await getGuestTokenFromCookie(orderId);
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
        inventoryState: orders.inventoryState,
        reservationExpiresAt: orders.reservationExpiresAt,
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
    try {
      currentUserId = (await auth()).userId;
    } catch {
      return { success: false, error: "Unable to verify authentication" };
    }

    if (!order.userId.startsWith("guest_")) {
      if (!currentUserId || currentUserId !== order.userId) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || await getGuestTokenFromCookie(orderId);
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

    if (order.status !== "pending" || !["pending", "failed", "authorized"].includes(order.paymentStatus)) {
      return { success: false, error: "Order cannot accept payment" };
    }
    if (order.inventoryState !== "reserved" || !order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) return { success: false, error: "Order reservation expired or requires reconciliation" };
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
          const receivedAmount = existingIntent.amount_received;
          const expectedCurrency = (order.currency || "THB").toLowerCase();
          const receivedCurrency = (existingIntent.currency || "").toLowerCase();

          if (expectedAmount === receivedAmount && expectedCurrency === receivedCurrency && (isExpectedStripeMode(existingIntent.livemode))) {
            const recovered = await fulfillOrderPayment(order.id, {
              method: "stripe",
              chargeId: existingIntent.id,
              note: "ชำระเงินสำเร็จผ่าน Stripe Payment Gateway (Auto-recovered in createOrGetStripePaymentIntent)",
            });
            if (!recovered.success) return recovered;
            if ("reconciliationPending" in recovered && recovered.reconciliationPending) return { success: false, error: "Payment is awaiting review" };
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
          (isExpectedStripeMode(existingIntent.livemode)) &&
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
        return { success: false, error: "Unable to verify existing payment; please retry" };
      }
      return { success: false, error: "Existing payment needs reconciliation" };
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
    const [bound] = await db
      .update(orders)
      .set({
        stripePaymentIntentId: intent.id,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending"), eq(orders.inventoryState, "reserved"), gte(orders.reservationExpiresAt, new Date()), sql`(${orders.stripePaymentIntentId} IS NULL OR ${orders.stripePaymentIntentId} = ${intent.id})`))
      .returning({ id: orders.id });
    if (!bound) {
      await getStripe().paymentIntents.cancel(intent.id, {}, { idempotencyKey: `cancel_order_${orderId}` });
      return { success: false, error: "Reservation expired or order changed" };
    }

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
    try {
      currentUserId = (await auth()).userId;
    } catch {
      return { success: false, error: "Unable to verify authentication" };
    }

    if (!order.userId.startsWith("guest_")) {
      if (!currentUserId || currentUserId !== order.userId) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || await getGuestTokenFromCookie(orderId);
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
    try {
      currentUserId = (await auth()).userId;
    } catch {
      return { success: false, error: "Unable to verify authentication" };
    }

    if (!order.userId.startsWith("guest_")) {
      if (!currentUserId || currentUserId !== order.userId) {
        return { success: false, error: "Unauthorized access to order" };
      }
    } else {
      const effectiveToken = guestToken || await getGuestTokenFromCookie(orderId);
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

export interface UserOrderItemDetail {
  id: string;
  orderId: string;
  productId: string | null;
  productNameSnapshot: string;
  productName?: string | null;
  productNameEn?: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  imageUrl: string | null;
  bundlePartsCount: number;
}

/**
 * Fetches all orders for current authenticated user with item previews.
 */
export async function getUserOrders() {
  try {
    const { userId } = await auth();
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
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productNameSnapshot: orderItems.productNameSnapshot,
        productName: products.name,
        productNameEn: products.nameEn,
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    // Batch query product images for unique productIds
    const productIds = Array.from(
      new Set(allItems.map((i) => i.productId).filter((id): id is string => Boolean(id)))
    );

    const imageMap = new Map<string, string>();
    if (productIds.length > 0) {
      const images = await db
        .select({
          productId: productImages.productId,
          secureUrl: productImages.secureUrl,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(desc(productImages.isPrimary));

      for (const img of images) {
        if (!imageMap.has(img.productId)) {
          imageMap.set(img.productId, img.secureUrl);
        }
      }
    }

    // Batch query bundle parts count for multi-part items
    const itemIds = allItems.map((i) => i.id);
    const bundleCountMap = new Map<string, number>();
    if (itemIds.length > 0) {
      const bundleParts = await db
        .select({
          orderItemId: orderItemBundleParts.orderItemId,
          count: sql<number>`count(*)::int`,
        })
        .from(orderItemBundleParts)
        .where(inArray(orderItemBundleParts.orderItemId, itemIds))
        .groupBy(orderItemBundleParts.orderItemId);

      for (const bp of bundleParts) {
        bundleCountMap.set(bp.orderItemId, bp.count);
      }
    }

    const countMap = new Map<string, number>();
    const itemsByOrder = new Map<string, UserOrderItemDetail[]>();

    for (const item of allItems) {
      countMap.set(item.orderId, (countMap.get(item.orderId) || 0) + item.quantity);

      const list = itemsByOrder.get(item.orderId) || [];
      list.push({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        productName: item.productName,
        productNameEn: item.productNameEn,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        imageUrl: item.productId ? (imageMap.get(item.productId) || null) : null,
        bundlePartsCount: bundleCountMap.get(item.id) || 0,
      });
      itemsByOrder.set(item.orderId, list);
    }

    const ordersWithDetails = userOrders.map((order) => ({
      ...order,
      itemCount: countMap.get(order.id) || 0,
      items: itemsByOrder.get(order.id) || [],
    }));

    return { success: true, data: ordersWithDetails };
  } catch (error) {
    console.error("[getUserOrders] Error:", error);
    return { success: false, error: "Failed to load orders", data: [] };
  }
}

/**
 * Fetches the most recent shipped order for the current user.
 * Used to display on-screen shipment toast/notification.
 */
export async function getLatestCustomerShipmentAlertAction() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: true, data: null };
    }

    const [latestShippedOrder] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
        shippingCarrier: orders.shippingCarrier,
        updatedAt: orders.updatedAt,
        total: orders.total,
        currency: orders.currency,
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "shipped")))
      .orderBy(desc(orders.updatedAt))
      .limit(1);

    if (!latestShippedOrder) {
      return { success: true, data: null };
    }

    // Fetch first product snapshot and image for this order
    const [firstItem] = await db
      .select({
        productId: orderItems.productId,
        productNameSnapshot: orderItems.productNameSnapshot,
        productNameEn: products.nameEn,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, latestShippedOrder.id))
      .limit(1);

    let imageUrl: string | null = null;
    if (firstItem?.productId) {
      const [img] = await db
        .select({ secureUrl: productImages.secureUrl })
        .from(productImages)
        .where(eq(productImages.productId, firstItem.productId))
        .orderBy(desc(productImages.isPrimary))
        .limit(1);
      imageUrl = img?.secureUrl || null;
    }

    return {
      success: true,
      data: {
        ...latestShippedOrder,
        productName: firstItem?.productNameSnapshot || "สินค้าชิ้นส่วนแอโรพาร์ท South Aero",
        productNameEn: firstItem?.productNameEn || null,
        imageUrl,
      },
    };
  } catch (error) {
    console.error("[getLatestCustomerShipmentAlertAction] Error:", error);
    return { success: false, data: null };
  }
}

/**
 * Fetches saved user addresses to pre-fill checkout.
 */
export async function getSavedCheckoutAddresses() {
  try {
    const { userId } = await auth();
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
