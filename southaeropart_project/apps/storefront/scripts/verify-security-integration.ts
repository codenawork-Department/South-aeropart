import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

async function main() {
// All DB/provider imports occur after the isolated target and test mode guards.
config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
const root = resolve(process.cwd(), "../..");
const useStripe = process.argv.includes("--stripe");
const originalUrl = process.env.DATABASE_URL;
if (!originalUrl || process.env.ALLOW_ISOLATED_SECURITY_TESTS !== "true") throw new Error("Explicit isolated security test authorization is required");
if (process.env.NODE_ENV === "production") throw new Error("Run this verifier in test mode only");
if (useStripe && !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Stripe test key required");
if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) throw new Error("Live Stripe keys are forbidden");
const schemaName = `security_test_${randomUUID().replaceAll("-", "")}`;
assert.match(schemaName, /^security_test_[a-f0-9]{32}$/);
const testUrl = new URL(originalUrl);
// Session startup options require the direct Neon endpoint, not transaction pooling.
testUrl.hostname = testUrl.hostname.replace("-pooler.", ".");
testUrl.searchParams.set("options", `-c search_path=${schemaName}`);
process.env.DATABASE_URL = testUrl.toString();
process.env.RESEND_API_KEY = ""; // Explicit email sink; never dispatch email from this verifier.
process.env.APP_ENV = "test";
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
const output: { run: string; checks: string[]; cleanup: boolean; stripeCleanup: boolean; error?: string } = { run: schemaName, checks: [], cleanup: false, stripeCleanup: true };
writeFileSync(resolve(root, "audit/2026-09-14/neon-stripe-integration-results.json"), JSON.stringify(output, null, 2));
const { Pool, neonConfig } = await import("@neondatabase/serverless");
neonConfig.webSocketConstructor = (await import("ws")).default;
const control = new Pool({ connectionString: originalUrl, max: 1 });
const migrationPool = new Pool({ connectionString: testUrl.toString(), max: 1 });
control.on("error", () => { process.exitCode = 1; });
migrationPool.on("error", () => { process.exitCode = 1; });
let appDb: Awaited<typeof import("@repo/db")> | undefined;
let stripe: ReturnType<typeof import("@repo/lib/stripe")["getStripe"]> | undefined;
const intents: string[] = [];
const savedError = console.error;
const savedWarn = console.warn;
console.error = () => {}; // Application error paths can include SQL; persist only test assertions.
console.warn = () => {};
function passed(name: string) { output.checks.push(name); console.log(`PASS ${name}`); }

try {
  await control.query(`CREATE SCHEMA "${schemaName}"`);
  const client = await migrationPool.connect();
  try {
    const scope = await client.query("SELECT current_schema() AS name");
    assert.equal(scope.rows[0].name, schemaName, "Driver must use the isolated schema");
    await client.query("BEGIN");
    const journal = JSON.parse(readFileSync(resolve(root, "packages/db/drizzle/meta/_journal.json"), "utf8"));
    for (const entry of journal.entries) {
      const migration = readFileSync(resolve(root, `packages/db/drizzle/${entry.tag}.sql`), "utf8")
        .replaceAll('"public"', `"${schemaName}"`).replaceAll("public.", `"${schemaName}".`);
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.query(statement);
      }
    }
    await client.query("COMMIT");
    passed("fresh database migration journal");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }

  appDb = await import("@repo/db");
  const { db, products, users, orders, orderItems, orderStatusHistory, orderEmailJobs, reserveOrderStock, releaseOrderStock, takeRateLimit, eq, and, sql } = appDb;
  const schemaResult = await db.execute(sql`SELECT current_schema() AS name`);
  assert.equal(schemaResult.rows[0].name, schemaName, "Application queries must remain isolated");
  const userId = `guest_${randomUUID()}`;
  await db.insert(users).values({ id: userId, email: `${userId}@example.invalid` });
  const address = { recipientName: "Security Fixture", phone: "0000000000", line1: "Fixture", subDistrict: "Fixture", district: "Fixture", province: "Fixture", postalCode: "00000" };
  async function product(stock: number) {
    const id = randomUUID();
    await db.insert(products).values({ id, sku: id, slug: id, name: "Isolated fixture", price: "100.00", stockQuantity: stock, status: "active" });
    return id;
  }
  async function order(productId: string, quantity = 1) {
    const id = randomUUID();
    await db.insert(orders).values({ id, orderNumber: id, userId, paymentMethod: "credit_card", subtotal: "100.00", total: "100.00", shippingAddress: address, inventoryState: "reserved", reservationExpiresAt: new Date(Date.now() + 30 * 60000) });
    await db.insert(orderItems).values({ orderId: id, productId, productNameSnapshot: "Isolated fixture", unitPrice: "100.00", quantity, lineTotal: "100.00" });
    return id;
  }
  async function stock(id: string) { return (await db.select().from(products).where(eq(products.id, id)))[0].stockQuantity; }

  const lastPart = await product(1);
  const competitors = await Promise.all(Array.from({ length: 4 }, () => order(lastPart)));
  const races = await Promise.allSettled(competitors.map(id => db.transaction(tx => reserveOrderStock(tx, id, new Map([[lastPart, 1]])))));
  assert.equal(races.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await stock(lastPart), 0);
  passed("four distinct orders racing for last physical part: exactly one reservation");

  const first = await product(4);
  const missing = await product(0);
  const rollbackOrder = await order(first);
  await assert.rejects(db.transaction(tx => reserveOrderStock(tx, rollbackOrder, new Map([[first, 2], [missing, 1]]))));
  assert.equal(await stock(first), 4);
  passed("multi-part reservation failure rolls back all decrements");
  await assert.rejects(db.update(products).set({ stockQuantity: -1 }).where(eq(products.id, first)));
  passed("database rejects negative stock");

  const shared = await product(8);
  const combinedOrder = await order(shared, 5);
  await db.transaction(tx => reserveOrderStock(tx, combinedOrder, new Map([[shared, 5]])));
  assert.equal(await stock(shared), 3);
  const releases = await Promise.allSettled([1, 2].map(() => db.transaction(tx => releaseOrderStock(tx, combinedOrder))));
  assert.equal(releases.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await stock(shared), 8);
  passed("reservation release is atomic and single-use under concurrency");

  const rateResults = await Promise.all(Array.from({ length: 8 }, () => takeRateLimit(`fixture:${schemaName}`, 3, 60000)));
  assert.equal(rateResults.filter(Boolean).length, 3);
  passed("shared database rate limiter admits exactly three of eight concurrent requests");

  if (useStripe) {
    const stripeModule = await import("@repo/lib/stripe");
    stripe = stripeModule.getStripe();
    const { fulfillOrderPayment } = await import("@/lib/order-fulfillment");
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const { NextRequest } = await import("next/server");
    const paidPart = await product(10);
    const paidOrder = await order(paidPart);
    await db.transaction(tx => reserveOrderStock(tx, paidOrder, new Map([[paidPart, 1]])));
    const creation = { amount: 10000, currency: "thb", payment_method: "pm_card_visa", confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: "never" as const }, metadata: { orderId: paidOrder, securityTestRun: schemaName } };
    const intent = await stripe.paymentIntents.create(creation, { idempotencyKey: schemaName });
    intents.push(intent.id);
    assert.equal(intent.livemode, false);
    assert.equal(intent.status, "succeeded");
    const retry = await stripe.paymentIntents.create(creation, { idempotencyKey: schemaName });
    assert.equal(retry.id, intent.id);
    passed("Stripe test payment succeeds and creation retry returns same intent");
    await db.update(orders).set({ stripePaymentIntentId: intent.id }).where(eq(orders.id, paidOrder));
    const otherOrder = await order(paidPart);
    const mismatch = await fulfillOrderPayment(otherOrder, { method: "stripe", chargeId: intent.id });
    assert.equal(mismatch.success, false);
    assert.equal(await stock(paidPart), 9);
    passed("paid Stripe intent cannot fulfill an unbound order");
    await db.update(orders).set({ total: "200.00" }).where(eq(orders.id, paidOrder));
    assert.equal((await fulfillOrderPayment(paidOrder, { method: "stripe", chargeId: intent.id })).success, false);
    await db.update(orders).set({ total: "100.00" }).where(eq(orders.id, paidOrder));
    passed("provider-confirmed payment with wrong amount is rejected");
    const fulfillments = await Promise.all([1, 2].map(() => fulfillOrderPayment(paidOrder, { method: "stripe", chargeId: intent.id })));
    assert(fulfillments.some(result => result.success));
    assert.equal((await fulfillOrderPayment(paidOrder, { method: "stripe", chargeId: intent.id })).success, true);
    assert.equal(await stock(paidPart), 9);
    assert.equal((await db.select().from(orderStatusHistory).where(and(eq(orderStatusHistory.orderId, paidOrder), eq(orderStatusHistory.status, "paid")))).length, 1);
    assert.equal((await db.select().from(orderEmailJobs).where(eq(orderEmailJobs.orderId, paidOrder))).length, 1);
    passed("concurrent fulfillment and retry: one paid transition, one email job, no second stock deduction");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    assert(typeof webhookSecret === "string" && webhookSecret.startsWith("whsec_"));
    const payload = JSON.stringify({ id: `evt_${schemaName}`, object: "event", type: "payment_intent.payment_failed", livemode: false, data: { object: intent } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const response = await POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature } }));
    assert.equal(response.status, 200);
    assert.equal((await db.select().from(orders).where(eq(orders.id, paidOrder)))[0].paymentStatus, "paid");
    const forged = await POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: payload + " ", headers: { "stripe-signature": signature } }));
    assert.equal(forged.status, 400);
    passed("real Stripe SDK verifies raw-body signature; late failure cannot overwrite paid");
  }
} catch (error) {
  output.error = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[REDACTED]") : "Unknown failure";
  process.exitCode = 1;
} finally {
  if (stripe) for (const id of intents) {
    try { await stripe.refunds.create({ payment_intent: id, metadata: { securityTestRun: schemaName } }, { idempotencyKey: `cleanup_${id}` }); }
    catch { output.stripeCleanup = false; process.exitCode = 1; }
  }
  if (appDb) await appDb.db.$client.end();
  await migrationPool.end();
  try {
    // The identifier is generated in this process and checked before CREATE/DROP.
    await control.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    output.cleanup = true;
  } catch { process.exitCode = 1; }
  await control.end();
  console.error = savedError;
  console.warn = savedWarn;
  writeFileSync(resolve(root, "audit/2026-09-14/neon-stripe-integration-results.json"), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output));
}

}
main().catch(error => { console.error(error instanceof Error ? error.message : "Verification failed"); process.exitCode = 1; });
