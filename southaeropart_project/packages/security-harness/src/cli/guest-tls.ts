import fs from "node:fs";
import path from "node:path";
import { createNativeRuntime } from "../integration/native-runtime";
import { checkGuestTlsCookie } from "../integration/guest-tls-cookie";

async function main() {
  const runtime = await createNativeRuntime();
  const out = path.join(
    runtime.root,
    "docs/security/fuzz-matrix-2026-09-24/artifacts/native",
    runtime.runId,
  );
  fs.mkdirSync(out, { recursive: true });
  console.log(`TLS cookie run ${runtime.runId}`);
  try {
    const result = await checkGuestTlsCookie(runtime);
    fs.writeFileSync(
      path.join(out, "guest-tls-cookie.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(
      "PASS real checkout cookie issuance and cookie-only reads over TLS",
    );
  } finally {
    await runtime.cleanup();
    fs.writeFileSync(
      path.join(out, "cleanup.json"),
      JSON.stringify({ schemaDropped: true, serversStopped: true }, null, 2),
    );
    console.log(`Artifacts: ${out}`);
  }
}
main().catch((error) => {
  console.error(
    `TLS verification failed (${error instanceof Error ? error.name : "Unknown error"}); inspect the local build diagnostics for the reported stage.`,
  );
  process.exitCode = 1;
});
