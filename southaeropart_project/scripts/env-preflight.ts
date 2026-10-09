import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { runPreflightChecks, type PreflightMode } from "../packages/lib/src/env-schemas";

function parseArgs(): { mode: PreflightMode; envFile?: string } {
  const args = process.argv.slice(2);
  let mode: PreflightMode = "development";
  let envFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mode" && args[i + 1]) {
      const val = args[i + 1];
      if (val === "development" || val === "staging" || val === "production") {
        mode = val;
      } else {
        console.error(`[PREFLIGHT ERROR] Invalid mode "${val}". Must be development, staging, or production.`);
        process.exit(1);
      }
      i++;
    } else if (arg.startsWith("--mode=")) {
      const val = arg.split("=")[1];
      if (val === "development" || val === "staging" || val === "production") {
        mode = val;
      } else {
        console.error(`[PREFLIGHT ERROR] Invalid mode "${val}". Must be development, staging, or production.`);
        process.exit(1);
      }
    } else if (arg === "--env-file" && args[i + 1]) {
      envFile = args[i + 1];
      i++;
    } else if (arg.startsWith("--env-file=")) {
      envFile = arg.split("=")[1];
    }
  }

  return { mode, envFile };
}

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.resolve(__dirname, "..");

function resolveEnvFile(explicitPath?: string): { filePath: string; exists: boolean } {
  if (explicitPath) {
    const fullPath = path.isAbsolute(explicitPath) ? explicitPath : path.resolve(process.cwd(), explicitPath);
    return { filePath: fullPath, exists: fs.existsSync(fullPath) };
  }

  // Auto-detect default hierarchy from monorepo root and cwd
  const candidates = [
    path.resolve(process.cwd(), ".env.production"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(MONOREPO_ROOT, ".env.production"),
    path.resolve(MONOREPO_ROOT, ".env.local"),
    path.resolve(MONOREPO_ROOT, ".env"),
  ];

  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath)) {
      return { filePath: candidatePath, exists: true };
    }
  }

  return { filePath: path.resolve(MONOREPO_ROOT, ".env"), exists: false };
}

function main() {
  const { mode: cliMode, envFile } = parseArgs();
  const { filePath, exists } = resolveEnvFile(envFile);

  console.log(`\n======================================================`);
  console.log(`  SOUTH AERO — ENVIRONMENT PRE-FLIGHT VALIDATOR`);
  console.log(`======================================================\n`);

  if (!exists) {
    console.warn(`[!] Warning: Env file not found at ${filePath}. Checking existing process.env variables.`);
  } else {
    console.log(`[i] Loaded environment file: ${filePath}`);
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    // Merge into process.env clone without printing secrets
    Object.assign(process.env, parsed);
  }

  // Determine mode: CLI takes priority, then APP_ENV in file, then development
  const targetMode: PreflightMode = cliMode !== "development"
    ? cliMode
    : (process.env.APP_ENV as PreflightMode) || "development";

  console.log(`[i] Target Verification Mode: [ ${targetMode.toUpperCase()} ]\n`);

  const summary = runPreflightChecks(process.env, targetMode);

  // Print formatted report
  console.log(`| Status | Category        | Variable / Invariant                  | Message`);
  console.log(`|:------:|:----------------|:--------------------------------------|:-----------------------------------------`);

  for (const check of summary.checks) {
    const icon =
      check.status === "PASS"
        ? "\x1b[32m PASS \x1b[0m"
        : check.status === "FAIL"
          ? "\x1b[31m FAIL \x1b[0m"
          : "\x1b[33m WARN \x1b[0m";

    const cat = check.category.padEnd(15);
    const vName = check.variable.padEnd(38);
    console.log(`| ${icon} | ${cat} | ${vName} | ${check.message}`);
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Verification Summary for [${targetMode.toUpperCase()}]:`);
  console.log(`  TOTAL CHECKS: ${summary.total}`);
  console.log(`  PASSED:       \x1b[32m${summary.passed}\x1b[0m`);
  console.log(`  WARNINGS:     \x1b[33m${summary.warned}\x1b[0m`);
  console.log(`  FAILURES:     \x1b[31m${summary.failed}\x1b[0m`);
  console.log(`------------------------------------------------------\n`);

  if (summary.failed > 0) {
    console.error(`\x1b[31m[FAILED]\x1b[0m Pre-flight check failed with ${summary.failed} errors.`);
    console.error(`Fix the required variables above before deploying or running in ${targetMode} mode.\n`);
    process.exit(1);
  }

  if (summary.warned > 0) {
    console.log(`\x1b[33m[PASSED WITH WARNINGS]\x1b[0m Environment is structurally valid, but review warnings above.\n`);
  } else {
    console.log(`\x1b[32m[PASSED]\x1b[0m All security and environment requirements are met 100%!\n`);
  }

  process.exit(0);
}

main();
