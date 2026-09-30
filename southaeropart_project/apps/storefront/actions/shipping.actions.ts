"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, shippingQuotes, and, eq, desc, gt, inArray } from "@repo/db";
import { countrySchema, shippingAddressSchema, shippingItemsSchema } from "@repo/lib/shipping";
import { orderNoteSchema } from "@repo/lib/order-note";
import { loadShippingBasket, shippingRates, shippingIdentity, quoteOwner, shippingRateLimit, hashShipping, quotePublicFields } from "@/lib/shipping-service";
import { checkoutException, checkoutFailure } from "@/lib/checkout-errors";

export async function previewShipping(input: unknown) {
  try {
    const v = z.object({ items: shippingItemsSchema, country: countrySchema }).strict().parse(input);
    await shippingRateLimit("preview", 120);
    const basket = await loadShippingBasket(v.items);
    return { success: true as const, data: await shippingRates(basket, v.country) };
  } catch (error) { return checkoutException(error); }
}

export async function requestShippingQuote(input: unknown) {
  try {
    const v = z.object({ items: shippingItemsSchema, address: shippingAddressSchema, customerNote: orderNoteSchema.optional(), requestId: z.string().uuid() }).strict().parse(input);
    const identity = await shippingIdentity(false);
    if (!identity.userId) return checkoutFailure("UNAUTHENTICATED");
    await shippingRateLimit("request", 10, identity.userId);
    const basket = await loadShippingBasket(v.items);
    const requestKey = hashShipping([identity.userId, v.requestId]);
    const [created] = await db.insert(shippingQuotes).values({
      userId: identity.userId, guestHash: null,
      requestKey, basketFingerprint: basket.fingerprint, items: basket.lines,
      address: v.address, customerNote: v.customerNote || null, subtotal: basket.subtotal,
      accessExpiresAt: new Date(Date.now() + 30 * 86400000),
    }).onConflictDoNothing({ target: shippingQuotes.requestKey }).returning({ id: shippingQuotes.id });
    const [existing] = created ? [created] : await db.select({ id: shippingQuotes.id }).from(shippingQuotes).where(and(eq(shippingQuotes.requestKey, requestKey), quoteOwner(identity))).limit(1);
    if (!existing) return checkoutFailure("CONFLICT");
    revalidatePath("/shipping-quotes");
    return { success: true as const, quoteId: existing.id };
  } catch (error) { return checkoutException(error); }
}

export async function getShippingQuote(id: string) {
  try {
    z.string().uuid().parse(id);
    const identity = await shippingIdentity();
    await shippingRateLimit("read", 120, identity.userId);
    const [quote] = await db.select(quotePublicFields).from(shippingQuotes).where(and(eq(shippingQuotes.id, id), quoteOwner(identity))).limit(1);
    if (!quote) return checkoutFailure("FORBIDDEN");
    return { success: true as const, quote };
  } catch (error) { return checkoutException(error); }
}
export async function listShippingQuotes(page = 1) {
  try {
    z.number().int().min(1).max(1000).parse(page);
    const identity = await shippingIdentity();
    if (!identity.userId && !identity.guestHash) return { success: true as const, quotes: [], hasMore: false };
    await shippingRateLimit("read", 120, identity.userId);
    const quotes = await db.select({
      id: shippingQuotes.id,
      status: shippingQuotes.status,
      version: shippingQuotes.version,
      subtotal: shippingQuotes.subtotal,
      fee: shippingQuotes.fee,
      carrier: shippingQuotes.carrier,
      deliveryEstimate: shippingQuotes.deliveryEstimate,
      offerExpiresAt: shippingQuotes.offerExpiresAt,
      items: shippingQuotes.items,
      address: shippingQuotes.address,
      orderId: shippingQuotes.orderId,
      createdAt: shippingQuotes.createdAt,
      updatedAt: shippingQuotes.updatedAt,
    }).from(shippingQuotes).where(quoteOwner(identity)).orderBy(desc(shippingQuotes.createdAt)).limit(21).offset((page - 1) * 20);
    return { success: true as const, quotes: quotes.slice(0, 20), hasMore: quotes.length > 20 };
  } catch (error) { return checkoutException(error); }
}
export async function cancelShippingQuote(input: unknown) {
  try {
    const v = z.object({ id: z.string().uuid(), version: z.number().int().nonnegative() }).strict().parse(input);
    const identity = await shippingIdentity();
    await shippingRateLimit("cancel", 20, identity.userId);
    const updated = await db.update(shippingQuotes).set({ status: "cancelled", version: v.version + 1, updatedAt: new Date() }).where(and(eq(shippingQuotes.id, v.id), eq(shippingQuotes.version, v.version), gt(shippingQuotes.accessExpiresAt, new Date()), quoteOwner(identity), inArray(shippingQuotes.status, ["requested", "offered"]))).returning({ id: shippingQuotes.id });
    if (!updated.length) return checkoutFailure("CONFLICT");
    revalidatePath("/shipping-quotes"); revalidatePath(`/shipping-quotes/${v.id}`);
    return { success: true as const };
  } catch (error) { return checkoutException(error); }
}
