import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CoverageManifestEntry, CorpusData, EvidenceLayer } from "./types";
import { loadCorpus, validateCorpusAgainstSchema } from "./schema-validator";
import { expandCaseVariants, executeVariant } from "./execution-engine";

const ARTIFACTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/security/fuzz-matrix-2026-09-24/artifacts",
);

export interface RunSummary {
  totalVariants: number;
  passed: number;
  failed: number;
  unimplemented: number;
  blocked: number;
  byLayer: Partial<Record<EvidenceLayer, number>>;
  durationMs: number;
  generatedAt: string;
}

export function securityGatePassed(summary: RunSummary): boolean {
  return (
    summary.totalVariants > 0 &&
    summary.passed === summary.totalVariants &&
    summary.failed === 0 &&
    summary.blocked === 0 &&
    summary.unimplemented === 0
  );
}

export async function generateCoverageManifest(
  corpus: CorpusData = loadCorpus(),
): Promise<{
  entries: CoverageManifestEntry[];
  summary: RunSummary;
}> {
  if (!validateCorpusAgainstSchema(corpus).valid)
    throw new Error("Corpus failed schema validation");
  const started = performance.now();
  const entries: CoverageManifestEntry[] = [];
  const identifiers = new Set<string>();
  for (const testCase of corpus.cases) {
    const variants = expandCaseVariants(testCase, corpus);
    if (!variants.length)
      throw new Error("Corpus case expanded to zero variants");
    for (const variant of variants) {
      const id = JSON.stringify([
        variant.caseId,
        variant.target,
        variant.variantKey,
      ]);
      if (identifiers.has(id))
        throw new Error("Duplicate expanded variant identifier");
      identifiers.add(id);
      entries.push(await executeVariant(variant, testCase));
    }
  }
  const byLayer: RunSummary["byLayer"] = {};
  for (const entry of entries)
    byLayer[entry.layer] = (byLayer[entry.layer] ?? 0) + 1;
  const summary: RunSummary = {
    totalVariants: entries.length,
    passed: entries.filter((e) => e.result === "PASS").length,
    failed: entries.filter((e) => e.result === "FAIL").length,
    unimplemented: entries.filter((e) => e.result === "UNIMPLEMENTED").length,
    blocked: entries.filter((e) => e.result === "BLOCKED").length,
    byLayer,
    durationMs: Math.round(performance.now() - started),
    generatedAt: new Date().toISOString(),
  };
  return { entries, summary };
}

// Payload labels are untrusted data even in a generated Markdown report.
function cell(value: unknown): string {
  return String(value ?? "not measured")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/`/g, "&#96;")
    .replace(/[\r\n]/g, " ")
    .replace(
      /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
}

export function saveManifestArtifacts(
  entries: CoverageManifestEntry[],
  summary: RunSummary,
  outputDir = ARTIFACTS_DIR,
  runtimeScope?: string,
): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "coverage-manifest.json"),
    JSON.stringify({ summary, entries }, null, 2),
    "utf8",
  );
  const sections = (["FAIL", "BLOCKED", "UNIMPLEMENTED", "PASS"] as const).map(
    (outcome) => {
      const selected = entries.filter((e) => e.result === outcome);
      const rows = selected.map((e) =>
        [
          e.caseId,
          e.target,
          e.variant,
          e.layer,
          e.actualWireStatus,
          e.semanticResult,
          e.invariantsNotMeasured.join(", ") || "none",
          e.evidence,
        ]
          .map(cell)
          .join(" | "),
      );
      return (
        `## ${outcome} (${selected.length})\n\n| Case | Target | Variant | Layer | Wire | Semantic | Unmeasured invariants | Evidence |\n|---|---|---|---|---|---|---|---|\n` +
        rows.map((row) => "| " + row + " |").join("\n")
      );
    },
  );
  const report =
    `# Security harness coverage and gaps\n\nGenerated: ${summary.generatedAt}\n\n` +
    `Variants: **${summary.totalVariants}**; PASS **${summary.passed}**; FAIL **${summary.failed}**; BLOCKED **${summary.blocked}**; UNIMPLEMENTED **${summary.unimplemented}**.\n\n` +
    `Strict corpus gate: **${securityGatePassed(summary) ? "PASS" : "NOT PASSED"}**. Duration: ${summary.durationMs} ms.\n\n` +
    "PASS applies only to the listed evidence layer and requested assertions. Isolated validators implement proposed contracts; they do not prove deployed application behavior. action_unit invokes a function directly and has no HTTP status. service_unit executes the production inventory command with an in-memory transactional fixture, not PostgreSQL or real sessions. Null DB/provider values mean unmeasured, not zero.\n\n" +
    "Scope update (2026-09-25): coupon N-26/N-27 (13 variants) removed at the customer's request, not marked PASS. Inventory N-17..N-19 (10 variants) have an application binding. Consult each entry for its measured evidence layer.\n\n" +
    "FAIL means an observed mismatch with the corpus contract; a proposed-contract mismatch is not automatically a production exploit. BLOCKED means execution or required evidence is missing. UNIMPLEMENTED means no application binding exists.\n\n" +
    (runtimeScope
      ? cell(runtimeScope)
      : "No checkout/admin/guest/webhook integration, real DB diff, provider side-effect count, native Server Action envelope, or browser execution was measured by this manifest. SDK signature unit tests and mocked email template diagnostics are separate suites.") +
    " No production-readiness conclusion is supported.\n\n" +
    "See packages/security-harness/README.md for replay commands, isolation requirements, and remaining integration work.\n\n" +
    sections.join("\n\n") +
    "\n";
  fs.writeFileSync(
    path.join(outputDir, "gaps-and-failures-report.md"),
    report,
    "utf8",
  );
}
