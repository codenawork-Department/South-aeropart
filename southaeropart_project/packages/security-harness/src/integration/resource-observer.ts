import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ResourceMeasurement {
  id: string;
  pid: number;
  state: "armed" | "complete" | "violated";
  violation?: "timeout" | "rss";
  timeoutMs: number;
  growthBudgetBytes: number;
  baselineRssBytes: number;
  peakRssBytes: number;
  peakGrowthBytes: number;
  samples: number;
  maxSampleIntervalMs: number;
  durationMs: number;
  samplingIntervalMs: number;
}

/** Arms a watchdog in the actual app process, independently of its main event loop. */
export async function armResourceWatchdog(
  directory: string,
  pid: number,
  budget = { timeoutMs: 5000, growthBudgetBytes: 256 * 1024 * 1024 },
) {
  assert(Number.isSafeInteger(pid) && pid > 0);
  const prefix = path.join(directory, String(pid));
  const read = (suffix: string) => {
    try {
      return JSON.parse(fs.readFileSync(`${prefix}.${suffix}.json`, "utf8"));
    } catch {
      return undefined;
    }
  };
  async function waitFor<T>(probe: () => T | undefined): Promise<T> {
    const started = performance.now();
    while (performance.now() - started < 2000) {
      const value = probe();
      if (value !== undefined) return value;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(
      "Resource watchdog did not acknowledge the requested state",
    );
  }
  await waitFor(() => (read("ready")?.pid === pid ? true : undefined));
  const id = randomUUID();
  const command = (value: "arm" | "finish") => {
    const file = `${prefix}.control.json`;
    fs.writeFileSync(
      `${file}.tmp`,
      JSON.stringify({ id, command: value, ...budget }),
    );
    fs.renameSync(`${file}.tmp`, file);
  };
  command("arm");
  await waitFor(() => (read("measurement")?.id === id ? true : undefined));
  return {
    async finish(): Promise<ResourceMeasurement> {
      command("finish");
      return waitFor(() => {
        const result = read("measurement") as ResourceMeasurement | undefined;
        return result?.id === id && result.state !== "armed"
          ? result
          : undefined;
      });
    },
  };
}

export function resourceBudgetPassed(
  measurement: ResourceMeasurement,
): boolean {
  return (
    measurement.state === "complete" &&
    measurement.durationMs < measurement.timeoutMs &&
    measurement.peakGrowthBytes <= measurement.growthBudgetBytes &&
    measurement.samples >= 2 &&
    // Record scheduling gaps instead of disguising a stalled sampler as a pass.
    measurement.maxSampleIntervalMs <= 100
  );
}

/** Container depth of the observed JSON bytes, excluding escaped string contents. */
export function jsonContainerDepth(body: Buffer): number {
  JSON.parse(body.toString("utf8"));
  let depth = 0,
    maximum = 0,
    inString = false,
    escaped = false;
  for (const byte of body) {
    if (inString) {
      if (escaped) escaped = false;
      else if (byte === 92) escaped = true;
      else if (byte === 34) inString = false;
    } else if (byte === 34) inString = true;
    else if (byte === 91 || byte === 123) maximum = Math.max(maximum, ++depth);
    else if (byte === 93 || byte === 125) depth--;
  }
  return maximum;
}
