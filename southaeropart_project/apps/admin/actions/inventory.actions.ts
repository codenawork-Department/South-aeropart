"use server";

import { revalidatePath } from "next/cache";
import { adjustInventory } from "@repo/lib/inventory-adjustment";
import { validateSession } from "@/lib/auth";
import { runInventoryTransaction } from "@/lib/inventory-repository";
import { notifyStorefrontCatalogChange } from "@/lib/realtime-notifier";

/** Public Server Action entry point; actor identity always comes from the verified session. */
export async function adjustInventoryAction(input: unknown) {
  const result = await adjustInventory(input, {
    authorize: validateSession,
    transaction: runInventoryTransaction,
  });
  if (result.success) {
    // Cache/notification failures after commit must not invite a duplicate stock adjustment.
    try {
      revalidatePath("/products");
      revalidatePath(`/products/${result.data.productId}/edit`);
    } catch {
      console.warn("[InventoryAdjustment] Cache refresh failed after commit");
    }
    try {
      await notifyStorefrontCatalogChange("product.updated", {
        id: result.data.productId,
      });
    } catch {
      console.warn(
        "[InventoryAdjustment] Catalog notification failed after commit",
      );
    }
  }
  return result;
}
