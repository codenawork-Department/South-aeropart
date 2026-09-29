import type {
  InventoryActor,
  InventoryAudit,
  InventoryAdjustmentDependencies,
  InventoryProduct,
} from "@repo/lib/inventory-adjustment";

/** Mechanical in-memory transaction fixture. It does not emulate PostgreSQL locks/concurrency. */
export function createInventoryMemoryFixture(options: {
  productId: string;
  stockBefore: number;
  actor?: InventoryActor | null;
  productType?: "single" | "bundle";
  missing?: boolean;
  failAudit?: boolean;
  conflictOnUpdate?: boolean;
}) {
  let state: { product: InventoryProduct | null; audits: InventoryAudit[] } = {
    product: options.missing
      ? null
      : {
          id: options.productId,
          productType: options.productType ?? "single",
          stockQuantity: options.stockBefore,
        },
    audits: [],
  };
  let active = false;
  let transactions = 0;
  const dependencies: InventoryAdjustmentDependencies = {
    async authorize() {
      return options.actor === undefined
        ? { id: "30000000-0000-4000-8000-000000000001", role: "admin" }
        : options.actor;
    },
    async transaction(work) {
      if (active)
        throw new Error(
          "Memory fixture does not model concurrent database transactions",
        );
      active = true;
      transactions++;
      const staged = structuredClone(state);
      try {
        const result = await work({
          async lockProduct(id) {
            return staged.product?.id === id
              ? structuredClone(staged.product)
              : null;
          },
          async setStock(id, before, after) {
            if (
              options.conflictOnUpdate ||
              !staged.product ||
              staged.product.id !== id ||
              staged.product.stockQuantity !== before
            )
              return false;
            staged.product.stockQuantity = after;
            return true;
          },
          async appendAudit(event) {
            if (options.failAudit)
              throw new Error(
                "Fixture audit failure: internal table details must not escape",
              );
            staged.audits.push(structuredClone(event));
          },
        });
        state = staged;
        return result;
      } finally {
        active = false;
      }
    },
  };
  return {
    dependencies,
    snapshot: () => structuredClone(state),
    transactionCount: () => transactions,
  };
}
