import { validateCorpusAgainstSchema, loadCorpus } from "../schema-validator";

function main() {
  console.log(
    "🔍 [SECURITY HARNESS] Validating corpus.json against corpus.schema.json...",
  );
  const corpus = loadCorpus();
  const result = validateCorpusAgainstSchema(corpus);

  if (result.valid) {
    console.log(
      `✅ [VALIDATION PASS] corpus.json is 100% valid under draft-07 schema (${corpus.cases.length} test groups).`,
    );
    process.exit(0);
  } else {
    console.error(
      `❌ [VALIDATION FAILED] Found ${result.errors.length} schema errors:`,
    );
    for (const err of result.errors) {
      console.error(
        `   - ${err.instancePath}: ${err.message} (${err.keyword})`,
      );
    }
    process.exit(1);
  }
}

main();
