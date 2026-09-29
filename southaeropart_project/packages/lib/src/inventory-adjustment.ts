import { z } from "zod";

export const MAX_STOCK = 2147483647;
export const inventoryAdjustmentSchema = z
  .object({
    productId: z.string().uuid(),
    delta: z
      .number()
      .int()
      .min(-MAX_STOCK)
      .max(MAX_STOCK)
      .refine((value) => value !== 0),
  })
  .strict();

export type InventoryAdjustmentInput = z.infer<
  typeof inventoryAdjustmentSchema
>;
export interface InventoryActor {
  id: string;
  role: string;
}
export interface InventoryProduct {
  id: string;
  productType: "single" | "bundle";
  stockQuantity: number;
}
export interface InventoryAudit {
  adminId: string;
  action: "inventory.adjusted";
  entityType: "product";
  entityId: string;
  metadata: { delta: number; stockBefore: number; stockAfter: number };
}
/** Every operation must use the same transaction; lockProduct holds a write lock. */
export interface InventoryAdjustmentTransaction {
  lockProduct(productId: string): Promise<InventoryProduct | null>;
  setStock(
    productId: string,
    stockBefore: number,
    stockAfter: number,
  ): Promise<boolean>;
  appendAudit(event: InventoryAudit): Promise<void>;
}
export interface InventoryAdjustmentDependencies {
  authorize(): Promise<InventoryActor | null>;
  transaction<T>(
    work: (tx: InventoryAdjustmentTransaction) => Promise<T>,
  ): Promise<T>;
}

const errors = {
  UNAUTHENTICATED: "Authentication required",
  FORBIDDEN: "Request not permitted",
  INVALID_INPUT: "Invalid request",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Request conflicts with current state",
  INTERNAL_ERROR: "Unable to process request",
} as const;
export type InventoryErrorCode = keyof typeof errors;
export type InventoryAdjustmentResult =
  | {
      success: true;
      data: {
        productId: string;
        delta: number;
        stockBefore: number;
        stockAfter: number;
      };
    }
  | { success: false; error: { code: InventoryErrorCode; message: string } };

class AdjustmentRejection extends Error {
  constructor(readonly code: "NOT_FOUND" | "CONFLICT") {
    super(code);
  }
}
function failure(code: InventoryErrorCode): InventoryAdjustmentResult {
  return { success: false, error: { code, message: errors[code] } };
}

/** Shared command used by the Admin action and isolated service tests. */
export async function adjustInventory(
  input: unknown,
  dependencies: InventoryAdjustmentDependencies,
): Promise<InventoryAdjustmentResult> {
  try {
    const actor = await dependencies.authorize();
    if (!actor) return failure("UNAUTHENTICATED");
    if (actor.role !== "admin" && actor.role !== "super_admin")
      return failure("FORBIDDEN");
    const parsed = inventoryAdjustmentSchema.safeParse(input);
    if (!parsed.success) return failure("INVALID_INPUT");
    const { productId, delta } = parsed.data;

    const data = await dependencies.transaction(async (tx) => {
      const product = await tx.lockProduct(productId);
      if (!product) throw new AdjustmentRejection("NOT_FOUND");
      // Bundle capacity derives from its physical child parts, never an independent adjustment.
      if (product.productType !== "single")
        throw new AdjustmentRejection("CONFLICT");
      const stockBefore = product.stockQuantity;
      const stockAfter = stockBefore + delta;
      if (
        !Number.isSafeInteger(stockBefore) ||
        stockBefore < 0 ||
        stockBefore > MAX_STOCK ||
        !Number.isSafeInteger(stockAfter) ||
        stockAfter < 0 ||
        stockAfter > MAX_STOCK
      )
        throw new AdjustmentRejection("CONFLICT");
      if (!(await tx.setStock(productId, stockBefore, stockAfter)))
        throw new AdjustmentRejection("CONFLICT");
      // Audit failure propagates out of the transaction so the stock write rolls back.
      await tx.appendAudit({
        adminId: actor.id,
        action: "inventory.adjusted",
        entityType: "product",
        entityId: productId,
        metadata: { delta, stockBefore, stockAfter },
      });
      return { productId, delta, stockBefore, stockAfter };
    });
    return { success: true, data };
  } catch (error) {
    return failure(
      error instanceof AdjustmentRejection ? error.code : "INTERNAL_ERROR",
    );
  }
}
