import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
  }
  return parsed;
}

const envFromFile = parseEnvFile(path.join(rootDir, ".env"));
for (const [k, v] of Object.entries(envFromFile)) {
  if (!process.env[k]) {
    process.env[k] = v;
  }
}

const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl || process.env.TEST_DATABASE_DISPOSABLE !== 'true' || process.env.NODE_ENV === 'production') throw new Error('Provision a disposable TEST_DATABASE_URL explicitly before stateful E2E');
if (process.env.RESEND_API_KEY || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) throw new Error('Stateful E2E requires an email sink and Stripe test mode');

function checkPortListening(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isUp = await checkPortListening(port);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  console.log("\n🛡️ [STATEFUL E2E] Initializing Automated Stateful E2E Runner...");

  if (await checkPortListening(3005)) throw new Error("Port 3005 is occupied; refusing to use an unverified server");

  // 1. Seed the test database
  console.log("🌱 [STATEFUL E2E] Step 1/3: Seeding dedicated test database (southaero_test)...");
  try {
    execSync("pnpm --filter storefront exec tsx scripts/seed-test-db.ts", {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
    });
  } catch (err) {
    console.error("❌ [STATEFUL E2E] Failed to seed test database:", err);
    process.exit(1);
  }

  // 2. Check if port 3005 is already running
  let serverProcess = null;
  const isAlreadyRunning = await checkPortListening(3005);

  if (isAlreadyRunning) {
    throw new Error("Test server port became occupied; refusing reuse");
  } else {
    console.log("🚀 [STATEFUL E2E] Step 2/3: Launching Storefront test server on port 3005 (southaero_test)...");
    serverProcess = spawn(
      "pnpm",
      ["--filter", "storefront", "exec", "next", "dev", "-p", "3005"],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
          PORT: "3005",
        },
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    serverProcess.stdout.on("data", (data) => {
      const line = data.toString();
      if (line.includes("Ready") || line.includes("ready") || line.includes("started server")) {
        console.log(`   [Storefront :3005] ${line.trim()}`);
      }
    });

    console.log("⏳ [STATEFUL E2E] Waiting for port 3005 to respond...");
    const ready = await waitForServer(3005, 60000);
    if (!ready) {
      console.error("❌ [STATEFUL E2E] Test server failed to respond on port 3005 within 60s.");
      if (serverProcess && serverProcess.pid) {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: "ignore" });
        } catch {
          serverProcess.kill();
        }
      }
      process.exit(1);
    }
    console.log("✅ [STATEFUL E2E] Test server on port 3005 is ready and accepting requests!");
  }

  // 3. Run Playwright Stateful Test
  console.log("🎭 [STATEFUL E2E] Step 3/3: Executing Playwright Stateful Checkout Tests...");
  let testExitCode = 0;
  try {
    execSync("pnpm --filter e2e exec playwright test --project=storefront-test-db", {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_BASE_URL: "http://localhost:3005",
      },
    });
  } catch (err) {
    testExitCode = err.status || 1;
  }

  // 4. Cleanup background server if we spawned it
  if (serverProcess && serverProcess.pid) {
    console.log("🧹 [STATEFUL E2E] Cleaning up background test server on port 3005...");
    try {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: "ignore" });
    } catch {
      serverProcess.kill();
    }
  }

  if (testExitCode === 0) {
    console.log("🎉 [STATEFUL E2E] ALL STATEFUL E2E TESTS PASSED SUCCESSFULLY!\n");
  } else {
    console.error(`❌ [STATEFUL E2E] Stateful E2E tests finished with exit code ${testExitCode}\n`);
  }
  process.exit(testExitCode);
}

main().catch((err) => {
  console.error("❌ Unexpected runner error:", err);
  process.exit(1);
});
