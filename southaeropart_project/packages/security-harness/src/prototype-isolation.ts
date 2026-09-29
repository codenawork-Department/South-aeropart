import { spawnSync } from "node:child_process";

export interface PrototypePollutionCheckResult {
  completed: boolean;
  scope: "javascript_object_operations_only";
  polluted: boolean | null;
  receiverPrototypeChanged: boolean | null;
  pollutedKeys: string[];
  exitCode: number | null;
  output: string;
}
const probe = String.raw`
  const fs = require("node:fs");
  try {
    const before = Object.getOwnPropertyNames(Object.prototype);
    const parsed = JSON.parse(fs.readFileSync(0, "utf8"));
    const spread = {...parsed};
    const assigned = Object.assign({}, parsed);
    const keys = ["isAdmin", "role", "polluted"];
    const fresh = {};
    const pollutedKeys = keys.filter(k => fresh[k] !== undefined);
    for (const key of Object.getOwnPropertyNames(Object.prototype))
      if (!before.includes(key)) pollutedKeys.push(key);
    process.stdout.write(JSON.stringify({
      polluted: pollutedKeys.length > 0, pollutedKeys,
      receiverPrototypeChanged: Object.getPrototypeOf(assigned) !== Object.prototype,
      spreadPrototypeChanged: Object.getPrototypeOf(spread) !== Object.prototype
    }));
  } catch {
    process.stderr.write("Probe did not complete");
    process.exitCode = 2;
  }
`;

export function runPrototypeCheckInIsolatedProcess(
  raw: string | Buffer,
): PrototypePollutionCheckResult {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "utf8");
  if (bytes.length > 1048576) return incomplete(null);
  const child = spawnSync(process.execPath, ["-e", probe], {
    input: bytes,
    encoding: "utf8",
    timeout: 2000,
    maxBuffer: 65536,
    windowsHide: true,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
    },
  });
  if (child.error || child.signal || child.status !== 0)
    return incomplete(child.status);
  try {
    const value: unknown = JSON.parse(child.stdout);
    if (!value || typeof value !== "object") return incomplete(child.status);
    const v = value as Record<string, unknown>;
    if (
      typeof v.polluted !== "boolean" ||
      typeof v.receiverPrototypeChanged !== "boolean" ||
      !Array.isArray(v.pollutedKeys)
    )
      return incomplete(child.status);
    return {
      completed: true,
      scope: "javascript_object_operations_only",
      polluted: v.polluted,
      receiverPrototypeChanged: v.receiverPrototypeChanged,
      pollutedKeys: v.pollutedKeys.filter(
        (x): x is string => typeof x === "string",
      ),
      exitCode: child.status,
      output: child.stdout,
    };
  } catch {
    return incomplete(child.status);
  }
}
function incomplete(exitCode: number | null): PrototypePollutionCheckResult {
  return {
    completed: false,
    scope: "javascript_object_operations_only",
    polluted: null,
    receiverPrototypeChanged: null,
    pollutedKeys: [],
    exitCode,
    output: "Probe unavailable or invalid; no safety conclusion.",
  };
}
