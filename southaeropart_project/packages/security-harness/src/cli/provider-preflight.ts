import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { root } from "../integration/native-runtime";

// Read-only authentication check. Record no balances, customer data or credentials.
async function main() {
  createRequire(path.join(root, "apps/storefront/package.json"))(
    "dotenv",
  ).config({ path: path.join(root, ".env"), quiet: true });
  assert(
    process.env.NODE_ENV !== "production" &&
      process.env.APP_ENV !== "production",
    "Production is forbidden",
  );
  assert(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    "Stripe test key required",
  );
  const response = await fetch("https://api.stripe.com/v1/balance", {
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  assert(
    response.ok,
    `Stripe test authentication failed: HTTP ${response.status}`,
  );
  const result = (await response.json()) as {
    livemode?: boolean;
    object?: string;
  };
  assert(
    result.object === "balance" && result.livemode === false,
    "Stripe must confirm test mode",
  );
  const evidence = {
    checkedAt: new Date().toISOString(),
    method: "GET",
    endpoint: "/v1/balance",
    authenticated: true,
    livemode: false,
    paymentWrites: false,
  };
  const directory = path.join(root, "docs/security/handoff/2026-09-27");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "stripe-preflight.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
}
main().catch(() => {
  console.error(
    "Stripe test preflight failed; no credentials or provider response recorded",
  );
  process.exitCode = 1;
});
