import { db, products, adminAuditLogs, eq, and } from "@repo/db";
import type { InventoryAdjustmentDependencies } from "@repo/lib/inventory-adjustment";

/** PostgreSQL keeps the row lock until the stock update and audit both commit. */
export const runInventoryTransaction: InventoryAdjustmentDependencies["transaction"] =
  (work) =>
    db.transaction(async (tx) =>
      work({
        async lockProduct(productId) {
          const [product] = await tx
            .select({
              id: products.id,
              productType: products.productType,
              stockQuantity: products.stockQuantity,
            })
            .from(products)
            .where(eq(products.id, productId))
            .limit(1)
            .for("update");
          return product ?? null;
        },
        async setStock(productId, stockBefore, stockAfter) {
          const rows = await tx
            .update(products)
            .set({ stockQuantity: stockAfter, updatedAt: new Date() })
            .where(
              and(
                eq(products.id, productId),
                eq(products.productType, "single"),
                eq(products.stockQuantity, stockBefore),
              ),
            )
            .returning({ id: products.id });
          return rows.length === 1;
        },
        async appendAudit(event) {
          await tx.insert(adminAuditLogs).values(event);
        },
      }),
    );
