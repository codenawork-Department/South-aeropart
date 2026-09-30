"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, shippingQuotes, shippingSettings, productShippingPolicies, products, productBundleItems, eq, and, desc, asc, inArray, takeRateLimit, sql } from "@repo/db";
import { shippingPolicySchema, shippingSettingsSchema, shippingOfferSchema, moneySatang, DEFAULT_SHIPPING_SETTINGS } from "@repo/lib/shipping";
import { checkedPayableSatang } from "@repo/lib/money-arithmetic";
import { validateSession, hasRequiredRole, logAuditEvent } from "@/lib/auth";
import { notifyStorefrontCatalogChange } from "@/lib/realtime-notifier";

async function guard() {
  const admin = await validateSession();
  if (!admin || !hasRequiredRole(admin)) throw new Error("Forbidden");
  if (!await takeRateLimit(`admin-shipping:${admin.id}`, 100, 60000)) throw new Error("Rate limited");
  return admin;
}
function failure() { return { success: false as const, error: "ไม่สามารถดำเนินการได้ กรุณาตรวจสิทธิ์ ข้อมูล และรีเฟรชรายการ / Unable to process this request", requestId: randomUUID() }; }

export async function getShippingStatsAction() {
  try {
    await guard();
    const stats = await db.select({
      status: shippingQuotes.status,
      count: sql<number>`count(*)::int`,
    }).from(shippingQuotes).groupBy(shippingQuotes.status);

    let requested = 0;
    let offered = 0;
    let converted = 0;
    let declined = 0;
    let cancelled = 0;
    let total = 0;

    for (const row of stats) {
      total += row.count;
      if (row.status === "requested") requested += row.count;
      else if (row.status === "offered") offered += row.count;
      else if (row.status === "converted") converted += row.count;
      else if (row.status === "declined") declined += row.count;
      else if (row.status === "cancelled") cancelled += row.count;
    }
    return { success: true as const, data: { requested, offered, converted, declined, cancelled, total } };
  } catch {
    return failure();
  }
}

export async function getShippingSettings() {
  try { await guard(); const [row] = await db.select().from(shippingSettings).where(eq(shippingSettings.id, 1)); return { success: true as const, data: row || DEFAULT_SHIPPING_SETTINGS }; } catch { return failure(); }
}
export async function saveShippingSettings(input: unknown) {
  try {
    const admin = await guard(); const v = shippingSettingsSchema.parse(input);
    await db.transaction(async tx => {
      await tx.insert(shippingSettings).values({ id: 1, ...v }).onConflictDoUpdate({ target: shippingSettings.id, set: { ...v, updatedAt: new Date() } });
      await logAuditEvent({ adminId: admin.id, action: "shipping.settings.update", entityType: "shipping_settings", metadata: { values: v, outcome: "success", correlationId: randomUUID() } }, tx);
    });
    revalidatePath("/shipping"); return { success: true as const };
  } catch { return failure(); }
}
export async function getProductShipping(productId: string) {
  try {
    await guard(); z.string().uuid().parse(productId);
    const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!p) return failure();
    const [row] = await db.select().from(productShippingPolicies).where(eq(productShippingPolicies.productId, productId));
    return { success: true as const, data: shippingPolicySchema.parse(row ? { productId, mode: row.mode, firstItem: row.firstItem, additionalItem: row.additionalItem, freeShippingEligible: row.freeShippingEligible } : { productId, mode: "standard", firstItem: "0.00", additionalItem: "0.00", freeShippingEligible: true }) };
  } catch { return failure(); }
}
export async function saveProductShipping(input: unknown) {
  try {
    const admin = await guard(); const v = shippingPolicySchema.parse(input);
    await db.transaction(async tx => {
      const [previous] = await tx.select().from(productShippingPolicies).where(eq(productShippingPolicies.productId, v.productId));
      await tx.insert(productShippingPolicies).values(v).onConflictDoUpdate({ target: productShippingPolicies.productId, set: { ...v, updatedAt: new Date() } });
      await logAuditEvent({ adminId: admin.id, action: "shipping.product.update", entityType: "product", entityId: v.productId, metadata: { previous: previous ? { mode: previous.mode, firstItem: previous.firstItem, additionalItem: previous.additionalItem, freeShippingEligible: previous.freeShippingEligible } : null, values: v, outcome: "success", correlationId: randomUUID() } }, tx);
    });
    revalidatePath(`/products/${v.productId}/edit`); revalidatePath(`/bundles/${v.productId}`);
    return { success: true as const };
  } catch { return failure(); }
}
export async function listAdminShippingQuotes(input: unknown) {
  try {
    await guard();
    const v = z.object({
      page: z.coerce.number().int().min(1).max(1000).default(1),
      status: z.enum(["all", "requested", "offered", "converted", "declined", "cancelled"]).default("all"),
      sort: z.enum(["newest", "oldest"]).default("newest"),
      search: z.string().optional(),
    }).strict().parse(input);

    const conditions = [];
    if (v.status !== "all") {
      conditions.push(eq(shippingQuotes.status, v.status));
    }
    if (v.search && v.search.trim()) {
      const term = `%${v.search.trim()}%`;
      conditions.push(sql`(${shippingQuotes.id}::text ILIKE ${term} OR ${shippingQuotes.address}->>'recipientName' ILIKE ${term} OR ${shippingQuotes.address}->>'phone' ILIKE ${term} OR ${shippingQuotes.carrier} ILIKE ${term})`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const [countRes] = await db.select({ total: sql<number>`count(*)::int` }).from(shippingQuotes).where(whereClause);
    const total = countRes?.total ?? 0;

    const rows = await db.select({
      id: shippingQuotes.id,
      status: shippingQuotes.status,
      subtotal: shippingQuotes.subtotal,
      fee: shippingQuotes.fee,
      carrier: shippingQuotes.carrier,
      address: shippingQuotes.address,
      items: shippingQuotes.items,
      customerNote: shippingQuotes.customerNote,
      offerExpiresAt: shippingQuotes.offerExpiresAt,
      createdAt: shippingQuotes.createdAt,
      updatedAt: shippingQuotes.updatedAt,
    }).from(shippingQuotes)
      .where(whereClause)
      .orderBy(v.sort === "newest" ? desc(shippingQuotes.createdAt) : asc(shippingQuotes.createdAt))
      .limit(21)
      .offset((v.page - 1) * 20);

    return {
      success: true as const,
      rows: rows.slice(0, 20),
      hasMore: rows.length > 20,
      pagination: {
        page: v.page,
        limit: 20,
        total,
        totalPages: Math.ceil(total / 20) || 1,
      },
    };
  } catch { return failure(); }
}
export async function getAdminShippingQuote(id: string) {
  try {
    await guard(); z.string().uuid().parse(id);
    const [q] = await db.select({ id: shippingQuotes.id, status: shippingQuotes.status, version: shippingQuotes.version, items: shippingQuotes.items, address: shippingQuotes.address, customerNote: shippingQuotes.customerNote, subtotal: shippingQuotes.subtotal, fee: shippingQuotes.fee, carrier: shippingQuotes.carrier, deliveryEstimate: shippingQuotes.deliveryEstimate, terms: shippingQuotes.terms, parcels: shippingQuotes.parcels, offerExpiresAt: shippingQuotes.offerExpiresAt, accessExpiresAt: shippingQuotes.accessExpiresAt, orderId: shippingQuotes.orderId }).from(shippingQuotes).where(eq(shippingQuotes.id, id));
    if (!q) return failure();
    const ids = q.items.filter(i => i.productType === "bundle").map(i => i.productId);
    const parts = ids.length ? await db.select({ bundleId: productBundleItems.bundleProductId, name: products.name, quantity: productBundleItems.quantity }).from(productBundleItems).innerJoin(products, eq(products.id, productBundleItems.childProductId)).where(inArray(productBundleItems.bundleProductId, ids)) : [];
    return { success: true as const, quote: q, parts };
  } catch { return failure(); }
}
export async function offerShippingQuote(input: unknown) {
  try {
    const admin = await guard(); const v = shippingOfferSchema.parse(input);
    await db.transaction(async tx => {
      const [q] = await tx.select().from(shippingQuotes).where(eq(shippingQuotes.id, v.quoteId)).for("update");
      if (!q || !["requested", "offered"].includes(q.status) || q.version !== v.version || q.accessExpiresAt.getTime() <= Date.now()) throw new Error("Conflict");
      checkedPayableSatang([moneySatang(q.subtotal), moneySatang(v.fee)]);
      const offerExpiresAt = new Date(Date.now() + v.validDays * 86400000);
      const accessExpiresAt = new Date(Math.max(q.accessExpiresAt.getTime(), offerExpiresAt.getTime() + 30 * 86400000));
      await tx.update(shippingQuotes).set({ status: "offered", version: q.version + 1, fee: v.fee, carrier: v.carrier, deliveryEstimate: v.deliveryEstimate, terms: v.terms, parcels: v.parcels, offerExpiresAt, accessExpiresAt, updatedAt: new Date() }).where(eq(shippingQuotes.id, q.id));
      await logAuditEvent({ adminId: admin.id, action: "shipping.quote.offer", entityType: "shipping_quote", entityId: q.id, metadata: { previousFee: q.fee, fee: v.fee, previousVersion: q.version, version: q.version + 1, carrier: v.carrier, deliveryEstimate: v.deliveryEstimate, terms: v.terms, parcels: v.parcels, offerExpiresAt: offerExpiresAt.toISOString(), outcome: "success", correlationId: randomUUID() } }, tx);
    });
    await notifyStorefrontCatalogChange("quote_offered", { quoteId: v.quoteId });
    revalidatePath("/shipping"); revalidatePath(`/shipping/${v.quoteId}`); return { success: true as const };
  } catch { return failure(); }
}
export async function declineShippingQuote(input: unknown) {
  try {
    const admin = await guard(); const v = z.object({ id: z.string().uuid(), version: z.number().int().nonnegative(), reason: z.string().trim().min(1).max(1000) }).strict().parse(input);
    await db.transaction(async tx => {
      const rows = await tx.update(shippingQuotes).set({ status: "declined", terms: v.reason, version: v.version + 1, updatedAt: new Date() }).where(and(eq(shippingQuotes.id, v.id), eq(shippingQuotes.version, v.version), inArray(shippingQuotes.status, ["requested", "offered"]))).returning({ id: shippingQuotes.id });
      if (!rows.length) throw new Error("Conflict");
      await logAuditEvent({ adminId: admin.id, action: "shipping.quote.decline", entityType: "shipping_quote", entityId: v.id, metadata: { reason: v.reason, outcome: "success", correlationId: randomUUID() } }, tx);
    });
    await notifyStorefrontCatalogChange("quote_declined", { quoteId: v.id });
    revalidatePath("/shipping"); revalidatePath(`/shipping/${v.id}`); return { success: true as const };
  } catch { return failure(); }
}
