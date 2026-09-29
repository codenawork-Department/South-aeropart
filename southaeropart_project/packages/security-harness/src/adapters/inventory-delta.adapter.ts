import { isDeepStrictEqual } from "node:util";
import { adjustInventory } from "@repo/lib/inventory-adjustment";
import { createInventoryMemoryFixture } from "../fixtures/inventory-memory";
import { loadCorpus } from "../schema-validator";
import type { TargetAdapter } from "./base.adapter";
import type { ExpandedVariant, NormalizedResult } from "../types";

/** Executes the production command with a fixture store, never the live Admin/DB modules. */
export class InventoryDeltaAdapter implements TargetAdapter {
  readonly targetName = "inventory.delta" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    const baseline = loadCorpus().fixtures.inventory as {
      input: { productId: string };
      stockBefore: number;
    };
    const stockBefore =
      typeof variant.metadata?.stockBefore === "number"
        ? variant.metadata.stockBefore
        : baseline.stockBefore;
    const actor = { id: "30000000-0000-4000-8000-000000000001", role: "admin" };
    const fixture = createInventoryMemoryFixture({
      productId: baseline.input.productId,
      stockBefore,
      actor,
    });
    const before = fixture.snapshot();
    const start = performance.now();
    const response = await adjustInventory(
      variant.payload,
      fixture.dependencies,
    );
    const after = fixture.snapshot();
    const code = response.success ? null : response.error.code;
    const statuses = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      INVALID_INPUT: 422,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_ERROR: 500,
    } as const;
    const messages = {
      UNAUTHENTICATED: "Authentication required",
      FORBIDDEN: "Request not permitted",
      INVALID_INPUT: "Invalid request",
      NOT_FOUND: "Resource not found",
      CONFLICT: "Request conflicts with current state",
      INTERNAL_ERROR: "Unable to process request",
    };
    const unchanged = isDeepStrictEqual(before, after);
    const input = variant.payload as {
      productId?: unknown;
      delta?: unknown;
    } | null;
    // The oracle comes from the request, never from the command's reported delta.
    const expectedStock =
      typeof input?.delta === "number" && Number.isSafeInteger(input.delta)
        ? BigInt(stockBefore) + BigInt(input.delta)
        : null;
    const exact =
      response.success &&
      after.product !== null &&
      Number.isSafeInteger(after.product.stockQuantity) &&
      BigInt(after.product.stockQuantity) === expectedStock;
    const intended =
      exact &&
      expectedStock !== null &&
      input !== null &&
      isDeepStrictEqual(response.data, {
        productId: input.productId,
        delta: input.delta,
        stockBefore,
        stockAfter: Number(expectedStock),
      }) &&
      isDeepStrictEqual(after.product, {
        ...before.product,
        stockQuantity: Number(expectedStock),
      }) &&
      isDeepStrictEqual(after.audits, [
        {
          adminId: actor.id,
          action: "inventory.adjusted",
          entityType: "product",
          entityId: input.productId,
          metadata: {
            delta: input.delta,
            stockBefore,
            stockAfter: Number(expectedStock),
          },
        },
      ]);
    return {
      evidenceLayer: "service_unit",
      success: response.success,
      wireStatus: null,
      semanticStatus: code ? statuses[code] : 200,
      errorCode: code,
      errorMessage: response.success ? undefined : response.error.message,
      hasErrorCodeField: !response.success,
      rawResponse: response,
      leaks: [],
      // Only fixture observations. No DB/provider counts or HTTP status are synthesized.
      invariantsChecked: {
        SAFE_ACCEPT: intended,
        REJECT_NO_EFFECT: !response.success && unchanged,
        INTEGER_EXACT: response.success ? exact : unchanged,
        NO_LEAK:
          response.success ||
          JSON.stringify(response) ===
            JSON.stringify({
              success: false,
              error: { code, message: messages[response.error.code] },
            }),
      },
      executionTimeMs: performance.now() - start,
    };
  }
}
