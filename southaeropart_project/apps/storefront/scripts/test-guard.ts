/**
 * Test Isolation Guard (CLAUDE.md §6.2)
 *
 * Prevents verification scripts from accidentally executing side effects or mutating data
 * against production databases or using live payment gateway credentials.
 */
export function assertTestIsolation(options?: { requireStripe?: boolean }) {
  const nodeEnv = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || "";
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const allowTestMutations = process.env.ALLOW_TEST_MUTATIONS === "true";

  // 1. Production environment guard
  if (nodeEnv === "production") {
    console.error("\n❌ [SECURITY GUARD ABORT] Cannot run verification scripts in production environment (NODE_ENV=production).\n");
    process.exit(1);
  }

  // 2. Stripe Secret Key guard
  if (stripeKey.startsWith("sk_live_")) {
    console.error("\n❌ [SECURITY GUARD ABORT] Detected LIVE Stripe Secret Key (sk_live_*)! Verification scripts must strictly use test credentials (sk_test_*).\n");
    process.exit(1);
  }

  if (options?.requireStripe && !stripeKey.startsWith("sk_test_")) {
    console.error("\n❌ [SECURITY GUARD ABORT] STRIPE_SECRET_KEY must start with 'sk_test_' to run Stripe verification scripts.\n");
    process.exit(1);
  }

  // 3. Database URL test isolation check
  const isLocalOrTestDb =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("_test") ||
    dbUrl.includes("test_") ||
    dbUrl.includes("-test") ||
    dbUrl.includes("/test");

  if (!isLocalOrTestDb && !allowTestMutations) {
    console.error(`
❌ [SECURITY GUARD ABORT] DATABASE_URL does not appear to be an isolated test database:
   Target: ${dbUrl ? dbUrl.replace(/:\/\/.*@/, "://<credentials>@") : "(empty)"}

   To safeguard production data against accidental test mutations (CLAUDE.md §6.2):
   - Either point DATABASE_URL to a dedicated test branch/database (e.g. containing '_test'),
   - Or explicitly set ALLOW_TEST_MUTATIONS=true in your environment if you are certain this database is disposable.
`);
    process.exit(1);
  }

  console.log("🛡️ [SECURITY GUARD] Test isolation verified (Safe non-production environment).");
}
