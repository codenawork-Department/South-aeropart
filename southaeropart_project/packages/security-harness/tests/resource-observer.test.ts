import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  armResourceWatchdog,
  jsonContainerDepth,
  resourceBudgetPassed,
} from "../src/integration/resource-observer";

const owned: Array<{ directory: string; child: ChildProcess }> = [];
const preload = fileURLToPath(
  new URL("../src/integration/resource-watchdog.cjs", import.meta.url),
);
async function fixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "south-aero-resource-unit-"),
  );
  const child = spawn(
    process.execPath,
    [
      "--require",
      preload,
      "-e",
      `
    process.on('message', (command) => {
      if (command === 'memory') global.retained = Buffer.alloc(64 * 1024 * 1024, 1);
      if (command === 'block' || command === 'memory') while (true) {}
      if (command === 'healthy') {
        global.retained = Buffer.alloc(16 * 1024 * 1024, 1);
        setTimeout(() => process.send('done'), 80);
      }
    });
  `,
    ],
    {
      windowsHide: true,
      env: { ...process.env, SECURITY_RESOURCE_DIRECTORY: directory },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  owned.push({ directory, child });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  return { directory, child };
}
afterEach(async () => {
  for (const { directory, child } of owned.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      child.kill("SIGKILL");
      await exited;
    }
    if (
      path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) ||
      !path.basename(directory).startsWith("south-aero-resource-unit-")
    )
      throw new Error("Unsafe test cleanup path");
    fs.rmSync(directory, { recursive: true });
  }
});

describe("Native process resource watchdog", () => {
  it("records the actual child RSS and acknowledges completion", async () => {
    const { directory, child } = await fixture();
    const watchdog = await armResourceWatchdog(directory, child.pid!);
    const done = new Promise((resolve) => child.once("message", resolve));
    child.send("healthy");
    await done;
    const measurement = await watchdog.finish();
    expect(measurement.pid).toBe(child.pid);
    expect(measurement.baselineRssBytes).toBeGreaterThan(0);
    expect(measurement.peakGrowthBytes).toBeGreaterThan(8 * 1024 * 1024);
    expect(resourceBudgetPassed(measurement)).toBe(true);
  });
  it("terminates a child whose main event loop is blocked", async () => {
    const { directory, child } = await fixture();
    const watchdog = await armResourceWatchdog(directory, child.pid!, {
      timeoutMs: 150,
      growthBudgetBytes: 256 * 1024 * 1024,
    });
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.send("block");
    await exited;
    const measurement = await watchdog.finish();
    expect(measurement.violation).toBe("timeout");
    expect(resourceBudgetPassed(measurement)).toBe(false);
  });
  it("terminates on RSS growth before the time budget", async () => {
    const { directory, child } = await fixture();
    const watchdog = await armResourceWatchdog(directory, child.pid!, {
      timeoutMs: 5000,
      growthBudgetBytes: 8 * 1024 * 1024,
    });
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.send("memory");
    await exited;
    const measurement = await watchdog.finish();
    expect(measurement.violation).toBe("rss");
    expect(resourceBudgetPassed(measurement)).toBe(false);
  });
  it("measures JSON containers without counting brackets or escapes in strings", () => {
    expect(jsonContainerDepth(Buffer.from('["[\\\"{","ข้อความ"]'))).toBe(1);
    expect(jsonContainerDepth(Buffer.from('{"a":[{"b":[]}]}'))).toBe(4);
    expect(() => jsonContainerDepth(Buffer.from("[invalid"))).toThrow();
  });
});
