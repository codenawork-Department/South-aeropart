// Preloaded only into disposable native-test servers. Never imported by app code.
const fs = require("node:fs");
const path = require("node:path");
const { Worker, isMainThread, workerData } = require("node:worker_threads");

const directory = process.env.SECURITY_RESOURCE_DIRECTORY;
if (directory && isMainThread) {
  const worker = new Worker(__filename, {
    workerData: { securityResourceWatchdog: true },
    execArgv: [],
  });
  worker.unref();
} else if (directory && workerData?.securityResourceWatchdog) {
  const prefix = path.join(directory, String(process.pid));
  const write = (suffix, value) => {
    const file = `${prefix}.${suffix}.json`;
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(value));
    fs.renameSync(`${file}.tmp`, file);
  };
  write("ready", { pid: process.pid, samplingIntervalMs: 10 });
  let measurement;
  let started = 0;
  let sampledAt = 0;
  let lastId;
  setInterval(() => {
    let control;
    try {
      control = JSON.parse(fs.readFileSync(`${prefix}.control.json`, "utf8"));
    } catch {
      // The controller uses atomic replacement; absent control means idle.
    }
    if (control?.command === "arm" && control.id !== lastId && !measurement) {
      if (
        !/^[a-f0-9-]{36}$/.test(control.id) ||
        !Number.isInteger(control.timeoutMs) ||
        control.timeoutMs < 1 ||
        control.timeoutMs > 5000 ||
        !Number.isInteger(control.growthBudgetBytes) ||
        control.growthBudgetBytes < 1 ||
        control.growthBudgetBytes > 256 * 1024 * 1024
      )
        return;
      lastId = control.id;
      started = sampledAt = performance.now();
      const rss = process.memoryUsage.rss();
      measurement = {
        id: control.id,
        pid: process.pid,
        state: "armed",
        timeoutMs: control.timeoutMs,
        growthBudgetBytes: control.growthBudgetBytes,
        baselineRssBytes: rss,
        peakRssBytes: rss,
        peakGrowthBytes: 0,
        samples: 1,
        maxSampleIntervalMs: 0,
        durationMs: 0,
        samplingIntervalMs: 10,
      };
      write("measurement", measurement);
    }
    if (!measurement) return;
    const now = performance.now();
    measurement.maxSampleIntervalMs = Math.max(
      measurement.maxSampleIntervalMs,
      now - sampledAt,
    );
    sampledAt = now;
    measurement.samples++;
    measurement.durationMs = now - started;
    measurement.peakRssBytes = Math.max(
      measurement.peakRssBytes,
      process.memoryUsage.rss(),
    );
    measurement.peakGrowthBytes =
      measurement.peakRssBytes - measurement.baselineRssBytes;
    const violation =
      measurement.durationMs >= measurement.timeoutMs
        ? "timeout"
        : measurement.peakGrowthBytes > measurement.growthBudgetBytes
          ? "rss"
          : null;
    if (violation) {
      measurement.state = "violated";
      measurement.violation = violation;
      write("measurement", measurement);
      // Killing this process from a separate thread also stops a blocked main loop.
      // process.exit() would terminate only this worker, so it is insufficient here.
      process.kill(process.pid, "SIGKILL");
      return;
    }
    if (control?.command === "finish" && control.id === measurement.id) {
      measurement.state = "complete";
      write("measurement", measurement);
      measurement = undefined;
    }
  }, 10);
}
