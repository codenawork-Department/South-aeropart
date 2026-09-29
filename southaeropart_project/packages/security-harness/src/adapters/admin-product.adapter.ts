import type { TargetAdapter } from "./base.adapter";
import type { ExpandedVariant, NormalizedResult } from "../types";
import { checkSecurityTestIsolation } from "../isolation-guard";
import { unavailable } from "./unavailable";

/** No application imports until native transport, run fixtures and instrumentation exist. */
export class AdminProductAdapter implements TargetAdapter {
  readonly targetName = "admin.product" as const;
  async invoke(_variant: ExpandedVariant): Promise<NormalizedResult> {
    const isolation = checkSecurityTestIsolation({
      requireDatabase: true,
      requireStripe: false,
      requireEmailSink: true,
    });
    return unavailable(
      isolation.isIsolated
        ? "Native transport, run-owned authenticated fixtures, DB/provider instrumentation and cleanup are not registered for admin.product."
        : "Isolation prerequisites unavailable: " +
            isolation.reasons.join("; "),
    );
  }
}
