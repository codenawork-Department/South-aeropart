import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db, products, productBundleItems, productShippingPolicies, shippingSettings, shippingQuotes, users, eq, and, or, gt, inArray, takeRateLimit } from "@repo/db";
import { customerAuth } from "./customer-auth";
import { getClientIp } from "./rate-limiter";
import { calculateShipping, DEFAULT_SHIPPING_SETTINGS, shippingPolicySchema, moneySatang, ShippingConflict, type ShippingItem } from "@repo/lib/shipping";
import { checkedPayableSatang, formatSatang } from "@repo/lib/money-arithmetic";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export const hashShipping = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const COOKIE = "south_aero_shipping_guest";
const LIFETIME = 30 * 24 * 60 * 60;
export async function shippingIdentity(create = false) {
  const { userId } = await customerAuth();
  if (userId) {
    const [u] = await db.select({ banned: users.isBanned }).from(users).where(eq(users.id, userId)).limit(1);
    if (u?.banned) throw new ShippingConflict();
  }
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if ((!token || !/^[a-f0-9]{64}$/.test(token)) && create && !userId) {
    token = randomBytes(32).toString("hex");
    jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: LIFETIME });
  }
  const guestHash = !userId && token && /^[a-f0-9]{64}$/.test(token) ? hashShipping(["shipping-guest-v1", token]) : null;
  return { userId, guestHash };
}
export function quoteOwner(identity: { userId: string | null; guestHash: string | null }) {
  const predicates = [];
  if (identity.userId) predicates.push(eq(shippingQuotes.userId, identity.userId));
  if (identity.guestHash) predicates.push(and(eq(shippingQuotes.guestHash, identity.guestHash), gt(shippingQuotes.accessExpiresAt, new Date()))!);
  if (!predicates.length) throw new ShippingConflict();
  return or(...predicates)!;
}
export async function shippingRateLimit(operation: string, limit: number, userId?: string | null) {
  const ip = getClientIp({ headers: await headers() });
  if (!await takeRateLimit(`shipping:${operation}:ip:${ip}`, limit, 15 * 60000)) throw new ShippingConflict();
  if (userId && !await takeRateLimit(`shipping:${operation}:user:${userId}`, limit, 15 * 60000)) throw new ShippingConflict();
}
type ReadClient = Pick<typeof db, "select">;
export async function loadShippingBasket(input: ShippingItem[], client: ReadClient = db) {
  const ids = [...new Set(input.map(i => i.productId))].sort();
  const rows = await client.select({ id: products.id, name: products.name, price: products.price, status: products.status, productType: products.productType }).from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map(p => [p.id, p]));
  const lines = input.map(i => {
    const p = byId.get(i.productId);
    if (!p || p.status !== "active") throw new ShippingConflict();
    return { productId: p.id, quantity: i.quantity, variant: i.variant || undefined, name: p.name, unitPrice: p.price, productType: p.productType };
  });
  const bundleIds = rows.filter(p => p.productType === "bundle").map(p => p.id);
  const parts = bundleIds.length ? await client.select({ bundleId: productBundleItems.bundleProductId, productId: productBundleItems.childProductId, quantity: productBundleItems.quantity, name: products.name, status: products.status }).from(productBundleItems).innerJoin(products, eq(productBundleItems.childProductId, products.id)).where(inArray(productBundleItems.bundleProductId, bundleIds)) : [];
  if (bundleIds.some(id => !parts.some(p => p.bundleId === id)) || parts.some(p => p.status !== "active")) throw new ShippingConflict();
  const canonical = lines.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, variant: i.variant || "", unitPrice: formatSatang(moneySatang(i.unitPrice)), productType: i.productType })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const fingerprint = hashShipping({ lines: canonical, parts: parts.map(p => ({ bundleId: p.bundleId, productId: p.productId, name: p.name, quantity: p.quantity })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
  const subtotal = formatSatang(checkedPayableSatang(lines.map(i => moneySatang(i.unitPrice) * BigInt(i.quantity))));
  return { lines, parts, subtotal, fingerprint, productIds: [...new Set([...ids, ...parts.map(p => p.productId)])].sort() };
}
export async function shippingRates(basket: Awaited<ReturnType<typeof loadShippingBasket>>, country: string) {
  const rows = await db.select().from(productShippingPolicies).where(inArray(productShippingPolicies.productId, basket.lines.map(i => i.productId)));
  const [settings] = await db.select().from(shippingSettings).where(eq(shippingSettings.id, 1));
  const rates = calculateShipping(basket.lines, rows.map(p => shippingPolicySchema.parse({ productId: p.productId, mode: p.mode, firstItem: p.firstItem, additionalItem: p.additionalItem, freeShippingEligible: p.freeShippingEligible })), country, settings || DEFAULT_SHIPPING_SETTINGS);
  return { ...rates, subtotal: basket.subtotal, key: hashShipping([basket.fingerprint, country, rates]) };
}
export const quotePublicFields = {
  id: shippingQuotes.id, status: shippingQuotes.status, version: shippingQuotes.version, items: shippingQuotes.items,
  address: shippingQuotes.address, customerNote: shippingQuotes.customerNote, subtotal: shippingQuotes.subtotal,
  fee: shippingQuotes.fee, carrier: shippingQuotes.carrier, deliveryEstimate: shippingQuotes.deliveryEstimate,
  terms: shippingQuotes.terms, parcels: shippingQuotes.parcels, offerExpiresAt: shippingQuotes.offerExpiresAt,
  orderId: shippingQuotes.orderId, createdAt: shippingQuotes.createdAt,
};
