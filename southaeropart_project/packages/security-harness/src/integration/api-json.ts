import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import type { NativeRuntime } from "./native-runtime";
import { postNativeHttp } from "./native-http";
import { armResourceWatchdog, resourceBudgetPassed } from "./resource-observer";
import { expandCaseVariants, evaluateVariant } from "../execution-engine";
import { detectErrorLeaks } from "../leak-detector";
import type {
  CorpusData,
  CoverageManifestEntry,
  NormalizedResult,
} from "../types";

export async function checkApiJson(
  runtime: NativeRuntime,
  corpus: CorpusData,
  entries: CoverageManifestEntry[],
) {
  const resources = path.join(runtime.directory, "api-contract-resources");
  fs.mkdirSync(resources, { recursive: true });
  const directory = path.join(runtime.root, "packages/security-harness");
  const child = spawn(
    process.execPath,
    [
      "--require",
      path.join(directory, "src/integration/resource-watchdog.cjs"),
      "--import",
      "tsx",
      path.join(directory, "src/integration/api-json-worker.ts"),
    ],
    {
      cwd: directory,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      // No DB or provider credentials are inherited by this parser worker.
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        SECURITY_RESOURCE_DIRECTORY: resources,
      },
    },
  );
  const evidence = [];
  try {
    const [ready] = (await once(child, "message", {
      signal: AbortSignal.timeout(15000),
    })) as [{ port: number; pid: number }];
    for (const testCase of corpus.cases.filter((c) =>
      ["S-07", "S-12", "S-14"].includes(c.id),
    )) {
      for (const variant of expandCaseVariants(testCase, corpus).filter(
        (v) => v.target === "api.json",
      )) {
        const raw = Buffer.from(
          variant.rawPayload ?? JSON.stringify(variant.payload),
        );
        const chunked = variant.variantKey.includes(
          "chunked_no_content_length",
        );
        const watchdog = await armResourceWatchdog(resources, ready.pid);
        const wire = await postNativeHttp(
          `http://127.0.0.1:${ready.port}/`,
          raw,
          { "x-parser-only": String(variant.recipe === "nestedJson") },
          chunked,
        );
        const measurement = await watchdog.finish();
        const result = JSON.parse(wire.rawText) as NormalizedResult & {
          receivedBytes: number;
          prototypeUnchanged: boolean;
          pid: number;
        };
        assert.equal(result.receivedBytes, raw.length);
        assert.equal(result.pid, ready.pid);
        assert.equal(wire.chunked, chunked);
        const leaks = detectErrorLeaks(wire.rawText).leaks;
        const observed: NormalizedResult = {
          ...result,
          wireStatus: wire.status,
          evidenceLayer: "parser_only",
          executionTimeMs: measurement.durationMs,
          leaks,
          invariantsChecked: {
            ...result.invariantsChecked,
            NO_LEAK: leaks.length === 0,
            NO_POLLUTION: result.prototypeUnchanged,
            RESOURCE_BOUNDED: resourceBudgetPassed(measurement),
          },
        };
        const index = entries.findIndex(
          (e) =>
            e.target === variant.target &&
            e.caseId === variant.caseId &&
            e.variant === variant.variantKey,
        );
        assert(index >= 0);
        entries[index] = evaluateVariant(variant, testCase, observed);
        evidence.push({
          caseId: variant.caseId,
          variant: variant.variantKey,
          entry: entries[index],
          bytes: wire.bytes,
          sha256: wire.sha256,
          chunked: wire.chunked,
          resources: measurement,
          prototypeUnchanged: result.prototypeUnchanged,
        });
        console.log(
          `${entries[index].result} ${variant.caseId} ${variant.variantKey}`,
        );
      }
    }
    return {
      scope:
        "Isolated abstract API contract over loopback HTTP; not an application endpoint",
      observations: evidence,
    };
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
  }
}
