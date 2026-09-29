import type { TargetName, ExpandedVariant, NormalizedResult } from "../types";

export interface TargetAdapter {
  readonly targetName: TargetName;
  invoke(variant: ExpandedVariant): Promise<NormalizedResult>;
}
