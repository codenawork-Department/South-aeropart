import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const storefrontRequire = createRequire(
  path.join(root, "apps/storefront/package.json"),
);
const adminRequire = createRequire(path.join(root, "apps/admin/package.json"));
const browserRequire = createRequire(path.join(root, "e2e/package.json"));
type Neon =
  typeof import("../../../../apps/storefront/node_modules/@neondatabase/serverless");
type Playwright = typeof import("../../../../e2e/security-browser");
type Browser = import("../../../../e2e/security-browser").Browser;
type Page = import("../../../../e2e/security-browser").Page;
type BrowserContext = import("../../../../e2e/security-browser").BrowserContext;
export interface NativeRuntime {
  root: string;
  runId: string;
  directory: string;
  env: NodeJS.ProcessEnv;
  pool: InstanceType<(typeof import("@repo/db"))["Pool"]>;
  emails: Array<{
    path: string;
    body: unknown;
    status?: number;
    idempotencyKey?: string;
  }>;
  setEmailFailure(enabled: boolean): void;
  browser: Browser;
  adminCookie(
    role: "admin" | "staff" | "super_admin",
    sessionState?: string,
  ): Promise<{ id: string; sid: string; token: string }>;
  launchApp(
    app: "admin" | "storefront",
    options?: {
      guestClockMs?: number;
      webhookClockMs?: number;
      productionTls?: boolean;
      turbopack?: boolean;
      instance?: "notes";
    },
  ): Promise<{
    page: Page;
    context: BrowserContext;
    baseUrl: string;
    url: string;
    logPath: string;
    resourceDirectory: string;
  }>;
  cleanup(): Promise<void>;
}

export async function createNativeRuntime(): Promise<NativeRuntime> {
  storefrontRequire("dotenv").config({
    path: path.join(root, ".env"),
    quiet: true,
  });
  assert.equal(
    process.env.ALLOW_ISOLATED_SECURITY_TESTS,
    "true",
    "Explicit development DB test authorization required",
  );
  assert(
    process.env.NODE_ENV !== "production" &&
      process.env.APP_ENV !== "production",
    "Production is forbidden",
  );
  assert(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    "Stripe test credentials required",
  );
  assert(
    process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"),
    "Clerk test instance required",
  );
  const original = new URL(process.env.DATABASE_URL ?? "");
  assert(["postgres:", "postgresql:"].includes(original.protocol));
  const runId = `security_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(runId, /^security_test_[a-f0-9]{32}$/);
  const directory = path.join(root, ".security-runs", runId);
  fs.mkdirSync(directory, { recursive: true });
  const databaseUrl = new URL(original);
  databaseUrl.hostname = databaseUrl.hostname.replace("-pooler.", ".");
  databaseUrl.searchParams.set(
    "options",
    `-c search_path=${runId} -c statement_timeout=20000 -c lock_timeout=15000`,
  );
  const neon: Neon = storefrontRequire("@neondatabase/serverless");
  neon.neonConfig.webSocketConstructor = storefrontRequire("ws");
  const control = new neon.Pool({
    connectionString: original.toString(),
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  const pool = new neon.Pool({
    connectionString: databaseUrl.toString(),
    max: 5,
    connectionTimeoutMillis: 15000,
  });
  const children: ChildProcess[] = [];
  const emails: NativeRuntime["emails"] = [];
  let emailFailure = false;
  const sink = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    if (
      req.method !== "POST" ||
      !["/emails", "/emails/batch"].includes(req.url ?? "")
    ) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      emails.push({
        path: req.url!,
        body,
        status: emailFailure ? 503 : 200,
        idempotencyKey: String(req.headers["idempotency-key"] ?? ""),
      });
      if (emailFailure) {
        res.writeHead(503, { "content-type": "application/json" }).end(
          JSON.stringify({
            statusCode: 503,
            name: "application_error",
            message: "QA_RESEND_SENTINEL_SECRET",
          }),
        );
        return;
      }
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(
          JSON.stringify(
            Array.isArray(body)
              ? { data: body.map(() => ({ id: randomUUID() })) }
              : { id: randomUUID() },
          ),
        );
    } catch {
      res.writeHead(400).end();
    }
  });
  sink.requestTimeout = 10000;
  await new Promise<void>((resolve, reject) => {
    sink.once("error", reject);
    sink.listen(0, "127.0.0.1", resolve);
  });
  const sinkPort = (sink.address() as net.AddressInfo).port;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl.toString(),
    APP_ENV: "test",
    NODE_ENV: "development",
    ADMIN_SESSION_SECRET: randomBytes(40).toString("hex"),
    ORDER_TOKEN_SECRET: randomBytes(40).toString("hex"),
    STRIPE_WEBHOOK_SECRET: `whsec_${randomBytes(32).toString("hex")}`,
    RESEND_API_KEY: "re_local_security_capture",
    RESEND_BASE_URL: `http://127.0.0.1:${sinkPort}`,
    REALTIME_SECRET: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  let browser:
    Awaited<ReturnType<Playwright["chromium"]["launch"]>> | undefined;
  let schemaCreated = false;
  const cleanup = async () => {
    const failures: unknown[] = [];
    const attempt = async (operation: () => Promise<unknown>) => {
      try {
        await operation();
      } catch (error) {
        failures.push(error);
      }
    };
    await attempt(async () => browser?.close());
    for (const child of children.reverse())
      if (child.pid && child.exitCode === null) {
        if (process.platform === "win32")
          await new Promise<void>((resolve) => {
            const killer = spawn(
              "taskkill",
              ["/PID", String(child.pid), "/T", "/F"],
              { windowsHide: true, stdio: "ignore" },
            );
            killer.on("close", () => resolve());
            killer.on("error", () => resolve());
          });
        else child.kill("SIGTERM");
        await attempt(async () => {
          if (child.exitCode !== null || child.signalCode !== null) return;
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("Owned test server did not exit")),
              5000,
            );
            child.once("exit", () => {
              clearTimeout(timer);
              resolve();
            });
          });
        });
      }
    await attempt(async () => pool.end());
    if (schemaCreated)
      await attempt(async () => {
        await control.query(`DROP SCHEMA "${runId}" CASCADE`);
        assert.equal(
          (
            await control.query(
              "select count(*)::int as count from information_schema.schemata where schema_name=$1",
              [runId],
            )
          ).rows[0].count,
          0,
        );
      });
    await attempt(async () => control.end());
    sink.closeAllConnections();
    await new Promise<void>((resolve) => sink.close(() => resolve()));
    if (failures.length)
      throw new Error(
        "Isolated cleanup incomplete; inspect the run-owned resources before retrying",
      );
  };
  try {
    await control.query(`CREATE SCHEMA "${runId}"`);
    schemaCreated = true;
    const client = await pool.connect();
    try {
      assert.equal(
        (await client.query("select current_schema() as name")).rows[0].name,
        runId,
      );
      await client.query("BEGIN");
      const journal = JSON.parse(
        fs.readFileSync(
          path.join(root, "packages/db/drizzle/meta/_journal.json"),
          "utf8",
        ),
      ) as { entries: Array<{ tag: string }> };
      for (const { tag } of journal.entries) {
        assert.match(tag, /^\d{4}_[a-z0-9_]+$/);
        const sql = fs
          .readFileSync(
            path.join(root, "packages/db/drizzle", tag + ".sql"),
            "utf8",
          )
          .replaceAll('"public"', `"${runId}"`)
          .replaceAll("public.", `"${runId}".`);
        for (const statement of sql.split("--> statement-breakpoint"))
          if (statement.trim()) await client.query(statement);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const playwright: Playwright = browserRequire("@playwright/test");
    browser = await playwright.chromium.launch({
      headless: true,
      channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    });
  } catch (error) {
    await cleanup();
    throw error;
  }

  async function adminCookie(
    role: "admin" | "staff" | "super_admin",
    sessionState = "active",
  ) {
    const id = randomUUID(),
      sid = randomUUID();
    await pool.query(
      "insert into admin_users(id,email,password_hash,full_name,role,is_active) values($1,$2,$3,$4,$5,true)",
      [
        id,
        `${id}@example.invalid`,
        "!disabled-security-fixture",
        "Native test actor",
        role,
      ],
    );
    const {
      SignJWT,
    }: typeof import("../../../../apps/admin/node_modules/jose") =
      adminRequire("jose");
    const token = await new SignJWT({ sid })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(env.ADMIN_SESSION_SECRET));
    await pool.query(
      "insert into admin_sessions(id,admin_id,token_hash,mfa_verified,last_seen_at,expires_at,revoked_at) values($1,$2,$3,true,$4,$5,$6)",
      [
        sid,
        id,
        createHash("sha256").update(token).digest("hex"),
        new Date(),
        new Date(Date.now() + (sessionState === "expired" ? -60000 : 7200000)),
        sessionState === "revoked" ? new Date() : null,
      ],
    );
    return { id, sid, token };
  }
  async function launchApp(
    app: "admin" | "storefront",
    options: {
      guestClockMs?: number;
      webhookClockMs?: number;
      productionTls?: boolean;
      turbopack?: boolean;
      instance?: "notes";
    } = {},
  ) {
    assert(
      !(options.productionTls && options.turbopack),
      "Select production HTTPS or Turbopack development separately",
    );
    const instance = options.instance ? `${app}-${options.instance}` : app;
    const label = options.productionTls
      ? `${instance}-tls`
      : options.turbopack
        ? `${instance}-turbo`
        : instance;
    const source = path.join(root, "apps", app),
      destination = path.join(directory, label);
    fs.cpSync(source, destination, {
      recursive: true,
      filter: (sourcePath) => {
        const relative = path.relative(source, sourcePath);
        return (
          !relative
            .split(path.sep)
            .some(
              (part) =>
                [
                  "node_modules",
                  ".next",
                  ".next-test",
                  "public",
                  "test-results",
                ].includes(part) || part.startsWith(".env"),
            ) && !relative.endsWith(".tsbuildinfo")
        );
      },
    });
    fs.symlinkSync(
      path.join(source, "node_modules"),
      path.join(destination, "node_modules"),
      "junction",
    );
    if (fs.existsSync(path.join(source, "public")))
      fs.symlinkSync(
        path.join(source, "public"),
        path.join(destination, "public"),
        "junction",
      );
    // Verification scripts contain imports outside the app folder. Preserve their
    // original module targets after relocation instead of excluding them from build checks.
    function relocateExternalImports(folder: string) {
      for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        if (
          ["node_modules", ".next", ".next-test", "public"].includes(item.name)
        )
          continue;
        const target = path.join(folder, item.name);
        if (item.isDirectory()) {
          relocateExternalImports(target);
          continue;
        }
        if (!/\.tsx?$/.test(item.name)) continue;
        const text = fs.readFileSync(target, "utf8");
        const origin = path.join(source, path.relative(destination, target));
        const relocated = text.replace(
          /(\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(["'])(\.\.[^"']*)\2/g,
          (match, prefix, _quote, specifier) => {
            const originalTarget = path.resolve(
              path.dirname(origin),
              specifier,
            );
            return originalTarget.startsWith(source + path.sep)
              ? match
              : prefix + JSON.stringify(originalTarget.replaceAll("\\", "/"));
          },
        );
        if (relocated !== text) fs.writeFileSync(target, relocated);
      }
    }
    relocateExternalImports(destination);
    const config = JSON.parse(
      fs.readFileSync(path.join(source, "tsconfig.json"), "utf8"),
    );
    config.extends = path
      .relative(
        destination,
        path.join(root, "packages/config/typescript/nextjs.json"),
      )
      .replaceAll("\\", "/");
    fs.writeFileSync(
      path.join(destination, "tsconfig.json"),
      JSON.stringify(config, null, 2),
    );
    if (options.guestClockMs !== undefined) {
      assert(
        app === "storefront" && Number.isSafeInteger(options.guestClockMs),
      );
      // Only the disposable app's guest-token clock is controlled. No public flag,
      // global Date override, or alteration to Clerk/admin-session clock validation.
      fs.writeFileSync(
        path.join(destination, "lib/order-token-clock.ts"),
        `export function orderTokenNowMs(): number { return ${options.guestClockMs}; }\n`,
      );
    }
    if (options.webhookClockMs !== undefined) {
      assert(
        app === "storefront" && Number.isSafeInteger(options.webhookClockMs),
      );
      fs.writeFileSync(
        path.join(destination, "lib/webhook-clock.ts"),
        `export function webhookNowMs(): number { return ${options.webhookClockMs}; }\n`,
      );
    }
    // Probe pages exist only in the disposable copy; production routes/guards/actions stay intact.
    const probePath =
      app === "admin" ? "login/security-harness" : "security-harness";
    const imports =
      app === "admin"
        ? 'import {adjustInventoryAction} from "@/actions/inventory.actions";\nimport {createProductAction,updateProductAction} from "@/actions/product.actions";\nimport {emailProbe,resourceProcessProbe,prototypeProbe} from "./probe-actions";'
        : 'import {addToCart} from "@/actions/cart.actions";\nimport {createOrder,getOrderDetails,getOrderStatus} from "@/actions/checkout.actions";\nimport {receiptEmailProbe,resourceProcessProbe,guestStoredDateProbe,prototypeProbe} from "./probe-actions";' +
          (options.guestClockMs === undefined
            ? ""
            : '\nimport {guestClockProbe} from "./probe-actions";');
    const bindings =
      app === "admin"
        ? "{inventory:adjustInventoryAction,productCreate:createProductAction,productUpdate:updateProductAction,emailProbe,resourceProcessProbe,prototypeProbe}"
        : `{cart:addToCart,checkout:createOrder,guestDetails:getOrderDetails,guestStatus:getOrderStatus,receiptEmailProbe,resourceProcessProbe,guestStoredDateProbe,prototypeProbe${options.guestClockMs === undefined ? "" : ",guestClockProbe"}}`;
    const probeDir = path.join(destination, "app", probePath);
    fs.mkdirSync(probeDir, { recursive: true });
    if (app === "admin")
      fs.writeFileSync(
        path.join(probeDir, "probe-actions.ts"),
        '"use server";\nimport {sendShipmentNotificationEmail} from "@/lib/shipment-email";\nexport async function emailProbe(orderId:string){return sendShipmentNotificationEmail(orderId)}',
      );
    if (app === "storefront")
      fs.writeFileSync(
        path.join(probeDir, "probe-actions.ts"),
        options.guestClockMs === undefined
          ? '"use server";\n'
          : '"use server";\nimport {orderTokenNowMs} from "@/lib/order-token-clock";\nexport async function guestClockProbe(){return orderTokenNowMs()}',
      );
    fs.appendFileSync(
      path.join(probeDir, "probe-actions.ts"),
      "\nexport async function resourceProcessProbe(){return process.pid}",
    );
    if (app === "storefront")
      fs.appendFileSync(
        path.join(probeDir, "probe-actions.ts"),
        '\nimport {db,orders,eq} from "@repo/db";\nimport {sendOrderConfirmationEmail} from "@/lib/order-email";\nexport async function receiptEmailProbe(id:string){return sendOrderConfirmationEmail(id)}\nexport async function guestStoredDateProbe(id:string){const [order]=await db.select({createdAt:orders.createdAt}).from(orders).where(eq(orders.id,id));return {isDate:order.createdAt instanceof Date,finite:Number.isFinite(order.createdAt.getTime())};}',
      );
    fs.appendFileSync(
      path.join(probeDir, "probe-actions.ts"),
      '\nexport async function prototypeProbe(){ const keys=["isAdmin","role","polluted"]; return {pid:process.pid,clean:keys.every(k=>!Object.prototype.hasOwnProperty.call(Object.prototype,k)&&!(k in {}))}; }',
    );
    fs.writeFileSync(
      path.join(probeDir, "page.tsx"),
      `"use client";\nimport {useEffect} from "react";\n${imports}\nexport default function Probe(){useEffect(()=>{Object.assign(window,{securityActions:${bindings}})},[]);return <main>Local security harness</main>}`,
    );
    const server = net.createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const logPath = path.join(directory, `${label}.log`);
    const resourceDirectory = path.join(directory, `resource-${label}`);
    fs.mkdirSync(resourceDirectory);
    const watchdog = path.join(directory, "resource-watchdog.cjs");
    fs.copyFileSync(
      path.join(
        root,
        "packages/security-harness/src/integration/resource-watchdog.cjs",
      ),
      watchdog,
    );
    const log = fs.openSync(logPath, "a");
    let certificate: Buffer | undefined;
    const childEnv: NodeJS.ProcessEnv = {
      ...env,
      PORT: String(port),
      SECURITY_RESOURCE_DIRECTORY: resourceDirectory,
      SECURITY_PROVIDER_DIRECTORY: resourceDirectory,
    };
    let command = [
      path.join(source, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ];
    if (options.turbopack) command.push("--turbopack");
    if (options.productionTls) {
      // Real production compilation with test providers and only the already-guarded
      // random schema. No system certificate store or global TLS override is changed.
      const openssl =
        process.env.SECURITY_OPENSSL_PATH ??
        "C:\\Program Files\\Git\\usr\\bin\\openssl.exe";
      assert(
        fs.existsSync(openssl),
        "Local OpenSSL is required for the ephemeral loopback TLS certificate",
      );
      const key = path.join(directory, `${label}-localhost.key`),
        cert = path.join(directory, `${label}-localhost.crt`);
      const generated = spawnSync(
        openssl,
        [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-nodes",
          "-keyout",
          key,
          "-out",
          cert,
          "-days",
          "1",
          "-subj",
          "/CN=localhost",
          "-addext",
          "subjectAltName=DNS:localhost,IP:127.0.0.1",
        ],
        { windowsHide: true, stdio: "ignore", timeout: 20000 },
      );
      assert.equal(
        generated.status,
        0,
        "Ephemeral TLS certificate generation failed",
      );
      certificate = fs.readFileSync(cert);
      childEnv.NODE_ENV = "production";
      childEnv.APP_ENV = "staging";
      childEnv.NODE_EXTRA_CA_CERTS = cert;
      childEnv.REALTIME_SECRET = randomBytes(40).toString("hex");
      // No media operation belongs to this cookie test. Use isolated credentials
      // with an explicit transport denial, never inherited media write credentials.
      childEnv.CLOUDINARY_CLOUD_NAME = "isolated-cookie-test";
      childEnv.CLOUDINARY_API_KEY = "isolated-cookie-test";
      childEnv.CLOUDINARY_API_SECRET = randomBytes(40).toString("hex");
      const build = spawn(
        process.execPath,
        [
          "--require",
          path.join(
            root,
            "packages/security-harness/src/integration/windows-build-links.cjs",
          ),
          path.join(source, "node_modules/next/dist/bin/next"),
          "build",
        ],
        {
          cwd: destination,
          env: childEnv,
          windowsHide: true,
          stdio: ["ignore", log, log],
        },
      );
      children.push(build);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          build.kill();
          reject(new Error("Isolated production build timed out"));
        }, 300000);
        build.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        build.once("exit", (code) => {
          clearTimeout(timer);
          code === 0
            ? resolve()
            : reject(
                new Error(
                  `Isolated production build failed; inspect the local ${label}.log diagnostics`,
                ),
              );
        });
      });
      const launcher = path.join(directory, `${label}-server.cjs`);
      fs.writeFileSync(
        launcher,
        `const fs=require('node:fs');const https=require('node:https');const next=require(${JSON.stringify(path.join(source, "node_modules/next"))});const app=next({dev:false,dir:${JSON.stringify(destination)},hostname:'localhost',port:${port}});app.prepare().then(()=>{const handle=app.getRequestHandler();https.createServer({key:fs.readFileSync(${JSON.stringify(key)}),cert:fs.readFileSync(${JSON.stringify(cert)})},(req,res)=>{if(req.headers.host!=='localhost:${port}'){res.writeHead(400).end();return;}req.headers['x-forwarded-proto']='https';return handle(req,res);}).listen(${port},'localhost');});`,
      );
      command = [
        "--require",
        path.join(
          root,
          "packages/security-harness/src/integration/disabled-media.cjs",
        ),
        launcher,
      ];
    }
    const child = spawn(
      process.execPath,
      [
        "--require",
        watchdog,
        "--require",
        path.join(
          root,
          "packages/security-harness/src/integration/provider-observer.cjs",
        ),
        ...command,
      ],
      {
        cwd: destination,
        env: childEnv,
        windowsHide: true,
        stdio: ["ignore", log, log],
      },
    );
    fs.closeSync(log);
    children.push(child);
    const baseUrl = `${options.productionTls ? "https" : "http"}://localhost:${port}`,
      url = `${baseUrl}/${probePath}`;
    const started = Date.now();
    while (Date.now() - started < 180000) {
      if (child.exitCode !== null)
        throw new Error(`${app} test server exited; inspect its local run log`);
      // Clerk development handshakes need a browser cookie jar. Following redirects in
      // a readiness fetch loops through the handshake and can exhaust the real rate limit.
      try {
        if (certificate) {
          const status = await new Promise<number>((resolve, reject) => {
            const request = https.get(
              url,
              { ca: certificate, timeout: 5000 },
              (response) => {
                response.resume();
                resolve(response.statusCode ?? 500);
              },
            );
            request.once("timeout", () =>
              request.destroy(new Error("Local TLS readiness timeout")),
            );
            request.once("error", reject);
          });
          if (status >= 200 && status < 400) break;
        } else {
          const response = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(5000),
          });
          await response.body?.cancel();
          if (response.status >= 200 && response.status < 400) break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const context = await browser!.newContext({
      ignoreHTTPSErrors: options.productionTls === true,
    });
    const page = await context.newPage();
    const navigationTrace: Array<{
      status: number;
      origin: string;
      path: string;
    }> = [];
    page.on("response", (response) => {
      if (
        !response.request().isNavigationRequest() ||
        navigationTrace.length >= 24
      )
        return;
      const observedUrl = new URL(response.url());
      navigationTrace.push({
        status: response.status(),
        origin: observedUrl.origin,
        path: observedUrl.pathname,
      });
      fs.writeFileSync(
        path.join(directory, `${label}-navigation.json`),
        JSON.stringify(navigationTrace, null, 2),
      );
    });
    const navigation = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    try {
      await page.waitForFunction(() => "securityActions" in window, undefined, {
        timeout: 60000,
      });
    } catch {
      const location = new URL(page.url());
      throw new Error(
        `${app} probe did not hydrate: HTTP ${navigation?.status()}, location ${location.origin}${location.pathname}, title ${await page.title()}`,
      );
    }
    const finalUrl = new URL(page.url());
    assert(
      ["localhost", "127.0.0.1"].includes(finalUrl.hostname) &&
        finalUrl.port === String(port),
      "Probe must remain on its isolated loopback server",
    );
    return {
      page,
      context,
      baseUrl: finalUrl.origin,
      url: finalUrl.href,
      logPath,
      resourceDirectory,
    };
  }
  return {
    root,
    runId,
    directory,
    env,
    pool,
    emails,
    setEmailFailure(enabled) {
      emailFailure = enabled;
    },
    browser: browser!,
    adminCookie,
    launchApp,
    cleanup,
  };
}
