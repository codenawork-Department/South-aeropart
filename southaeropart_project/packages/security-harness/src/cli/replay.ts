import { loadCorpus, validateCorpusAgainstSchema } from "../schema-validator";
import { expandCaseVariants, executeVariant } from "../execution-engine";

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || !["--case", "--seed"].includes(args[0]))
    throw new Error("Use replay --case N-01 or replay --seed <manifest-seed>");
  const corpus = loadCorpus();
  if (!validateCorpusAgainstSchema(corpus).valid)
    throw new Error("Invalid corpus");
  const matches = corpus.cases.flatMap((testCase) =>
    expandCaseVariants(testCase, corpus)
      .filter((v) =>
        args[0] === "--case" ? v.caseId === args[1] : v.seed === args[1],
      )
      .map((variant) => ({ variant, testCase })),
  );
  if (!matches.length) throw new Error("No matching variant");
  if (args[0] === "--seed" && matches.length !== 1)
    throw new Error("Ambiguous seed; use a case ID");
  const entries = [];
  for (const { variant, testCase } of matches)
    entries.push(await executeVariant(variant, testCase));
  console.log(JSON.stringify(entries, null, 2));
  // Does not overwrite the full manifest with a partial replay.
  if (entries.some((e) => e.result !== "PASS")) process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Replay failed. Use --case <case ID> or --seed <unique manifest seed> with a valid corpus.",
  );
  process.exitCode = 1;
});
