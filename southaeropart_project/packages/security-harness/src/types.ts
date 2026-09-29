export type TargetName =
  | "cart.add"
  | "checkout.create"
  | "guest.track"
  | "admin.product"
  | "inventory.delta"
  | "amount.validate"
  | "api.json"
  | "stripe.webhook"
  | "money.convert";

export type InvariantName =
  | "NO_LEAK"
  | "REJECT_NO_EFFECT"
  | "SAFE_ACCEPT"
  | "INTEGER_EXACT"
  | "NO_POLLUTION"
  | "PLAIN_TEXT"
  | "AT_MOST_ONCE"
  | "RESOURCE_BOUNDED"
  | "GUEST_PRIVATE"
  | "AUTHORITATIVE";

export type TestResultOutcome = "PASS" | "FAIL" | "UNIMPLEMENTED" | "BLOCKED";

export type EvidenceLayer =
  | "pure_unit"
  | "action_unit"
  | "service_unit"
  | "handler_unit"
  | "server_action"
  | "route_handler"
  | "parser_only"
  | "isolated_validator"
  | "browser_e2e";

export interface InputValues {
  mode: "values";
  operation: "set";
  path: string;
  values: unknown[];
}

export interface InputRaw {
  mode: "raw";
  values: string[];
}

export interface InputRecipe {
  mode: "recipe";
  name: string;
  args: Record<string, unknown>;
}

export type TestCaseInput = InputValues | InputRaw | InputRecipe;

export interface TestCaseExpected {
  semanticStatus: number;
  httpStatus: Record<string, number | null>;
  outcome:
    | "accept"
    | "reject"
    | "retry"
    | "accept_or_noop_by_variant"
    | "one_accept_one_conflict";
  errorCode: string | null;
  variantOverrides?: Record<
    string,
    {
      semanticStatus: number;
      wireStatus: number;
      errorCode: string | null;
    }
  >;
  invariants: InvariantName[];
  detail: string;
}

export interface TestCase {
  id: string;
  targets: TargetName[];
  summary: string;
  category: "N" | "S" | "T" | "G" | "W" | "A";
  applicability: "current_surface" | "proposed_contract" | "adapter_required";
  actor: string;
  fixture: string;
  input: TestCaseInput;
  expected: TestCaseExpected;
}

export interface CorpusData {
  schemaVersion: "1.0.0";
  title: string;
  language: "th";
  generatedAt: string;
  evidence: Record<string, unknown>;
  semantics: Record<string, unknown>;
  limits: Record<string, unknown>;
  targets: Record<
    TargetName,
    {
      transport: "server_action" | "route_handler" | "unit" | "contract_route";
      binding: string | null;
      actor: string;
      fixture: string;
      notes?: string;
    }
  >;
  fixtures: Record<string, unknown>;
  assertions: Record<string, string>;
  recipeDefinitions: Record<string, string>;
  cases: TestCase[];
}

export interface NormalizedResult {
  multiStepVerified?: boolean;
  availability?: "executed" | "blocked" | "unimplemented";
  evidenceLayer?: EvidenceLayer;
  success: boolean;
  wireStatus: number | null;
  semanticStatus: number | null;
  errorCode: string | null;
  errorMessage?: string;
  hasErrorCodeField: boolean;
  rawResponse: unknown;
  rawText?: string;
  dbDiff?: {
    tablesModified: string[];
    rowsChanged: number;
  };
  providerCalls?: {
    stripe: number;
    resend: number;
  };
  invariantsChecked: Partial<Record<InvariantName, boolean>>;
  leaks: string[];
  executionTimeMs: number;
}

export interface ExpandedVariant {
  caseId: string;
  target: TargetName;
  variantKey: string;
  seed: string;
  layer: EvidenceLayer;
  payload: unknown;
  rawPayload?: string | Buffer;
  headers?: Record<string, string>;
  expectedSemanticStatus: number;
  expectedHttpStatus: number | null;
  expectedErrorCode?: string | null;
  invariants: InvariantName[];
  notes?: string;
  variantIndex?: number;
  metadata?: Record<string, unknown>;
  recipe?: string;
}

export interface CoverageManifestEntry {
  caseId: string;
  target: TargetName;
  variant: string;
  seed: string;
  layer: EvidenceLayer;
  actualWireStatus: number | null;
  semanticResult: number | null;
  dbDiff: {
    tablesModified: string[];
    rowsChanged: number;
    leakFree: boolean;
  } | null;
  providerCalls: {
    stripe: number | null;
    resend: number | null;
  };
  result: TestResultOutcome;
  invariantsPassed: InvariantName[];
  invariantsFailed: InvariantName[];
  invariantsNotMeasured: InvariantName[];
  leakDetected: boolean;
  evidence: string;
  gapReason?: string;
}
