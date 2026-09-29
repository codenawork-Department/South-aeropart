import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./client";
import { orders, orderStockReservations } from "./schema/orders";
import { products } from "./schema/products";

export type InventoryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Demand is computed from the immutable order snapshots, in physical units. */
export async function reserveOrderStock(tx: InventoryTransaction, orderId: string, demand: Map<string, number>) {
  if (!demand.size) throw new Error("An order must reserve physical inventory");
  for (const [productId, quantity] of [...demand.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error("Invalid stock quantity");

    // Lock stock changes without conflicting with the key-share locks held by
    // order_items foreign keys. FOR UPDATE lets two new orders deadlock while
    // upgrading those locks; this operation never changes the product's key.
    // Sorted productId order (enforced by .sort() above) prevents deadlocks
    // when two concurrent transactions reserve overlapping product sets.
    await tx.execute(sql`SELECT 1 FROM ${products} WHERE ${products.id} = ${productId} FOR NO KEY UPDATE`);

    const [reserved] = await tx.update(products).set({
      stockQuantity: sql`${products.stockQuantity} - ${quantity}`,
      updatedAt: new Date(),
    }).where(and(eq(products.id, productId), eq(products.status, "active"), gte(products.stockQuantity, quantity)))
      .returning({ id: products.id });
    if (!reserved) throw new Error("Insufficient or unavailable stock");
    await tx.insert(orderStockReservations).values({ orderId, productId, quantity });
  }
}

/** Caller holds/claims the order row before taking product locks. */
export async function releaseOrderStock(tx: InventoryTransaction, orderId: string) {
  const [released] = await tx.update(orders).set({ inventoryState: "released", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.inventoryState, "reserved")))
    .returning({ id: orders.id });
  if (!released) throw new Error("Reservation is not releasable");
  const rows = await tx.select().from(orderStockReservations).where(eq(orderStockReservations.orderId, orderId));
  if (!rows.length) throw new Error("Reservation ledger is missing");
  for (const row of rows.sort((a, b) => a.productId.localeCompare(b.productId))) {
    await tx.update(products).set({
      stockQuantity: sql`${products.stockQuantity} + ${row.quantity}`,
      updatedAt: new Date(),
    }).where(eq(products.id, row.productId));
  }
}
