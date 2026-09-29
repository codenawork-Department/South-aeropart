import {
  generateCoverageManifest,
  saveManifestArtifacts,
  securityGatePassed,
} from "../manifest-generator";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--strict"))
    throw new Error("Unsupported argument");
  console.log(
    "Running offline corpus observations; unavailable integrations remain BLOCKED.",
  );
  const { entries, summary } = await generateCoverageManifest();
  saveManifestArtifacts(entries, summary);
  console.log(JSON.stringify(summary, null, 2));
  console.log("Artifacts: docs/security/fuzz-matrix-2026-09-24/artifacts/");
  if (!securityGatePassed(summary)) {
    console.log(
      "Security corpus gate NOT PASSED. Report generation is not a security pass.",
    );
    if (args.includes("--strict")) process.exitCode = 1;
  }
}
main().catch(() => {
  console.error(
    "Manifest generation failed; no successful run can be claimed. Inspect corpus and runner configuration.",
  );
  process.exitCode = 1;
});
