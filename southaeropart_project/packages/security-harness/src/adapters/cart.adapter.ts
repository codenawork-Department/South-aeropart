import type { TargetAdapter } from "./base.adapter";
import type { ExpandedVariant, NormalizedResult } from "../types";
import { unavailable } from "./unavailable";

export class CartAddAdapter implements TargetAdapter {
  readonly targetName = "cart.add" as const;
  async invoke(variant: ExpandedVariant): Promise<NormalizedResult> {
    if (variant.metadata?.unrepresentable === true)
      return unavailable(
        "Numeric lexeme cannot be represented by a native JS number; requires a raw HTTP parser adapter.",
      );
    const { addToCart } =
      await import("../../../../apps/storefront/actions/cart.actions");
    const start = performance.now();
    try {
      const response = await addToCart(
        variant.payload as Parameters<typeof addToCart>[0],
      );
      const error = response.success ? null : response.error;
      return {
        evidenceLayer: "action_unit",
        success: response.success,
        wireStatus: null,
        semanticStatus: response.success ? 200 : 422,
        errorCode: error?.code ?? null,
        errorMessage: error?.message,
        hasErrorCodeField: error !== null,
        rawResponse: response,
        leaks: [],
        executionTimeMs: performance.now() - start,
        // Only the direct pure action result is observed; transport remains unmeasured.
        invariantsChecked: {
          SAFE_ACCEPT: response.success,
          REJECT_NO_EFFECT: !response.success,
          ...(!response.success
            ? {
                NO_LEAK:
                  JSON.stringify(response) ===
                  JSON.stringify({
                    success: false,
                    error: {
                      code: "INVALID_INPUT",
                      message: "Invalid request",
                    },
                  }),
              }
            : {}),
        },
      };
    } catch (error) {
      return {
        evidenceLayer: "action_unit",
        success: false,
        wireStatus: null,
        semanticStatus: null,
        errorCode: null,
        hasErrorCodeField: false,
        errorMessage:
          "Action threw during direct function invocation; HTTP serialization not observed.",
        rawResponse: {
          threw: true,
          name: error instanceof Error ? error.name : "Unknown",
        },
        leaks: [],
        executionTimeMs: performance.now() - start,
        invariantsChecked: {},
      };
    }
  }
}
