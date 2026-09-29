export class IsolationGuardError extends Error {
  constructor(
    message: string,
    public readonly failureReason: string,
  ) {
    super(message);
    this.name = "IsolationGuardError";
  }
}
export interface IsolationCheckResult {
  isIsolated: boolean;
  reasons: string[];
  dbEndpoint?: string;
  stripeMode: "test" | "live" | "unconfigured";
  emailSinkActive: boolean;
}
type Options = {
  requireDatabase?: boolean;
  requireStripe?: boolean;
  requireEmailSink?: boolean;
};
/**
 * Configuration preflight only. The external adapters additionally require
 * implemented fixtures/transports; passing this check alone never enables I/O.
 * No real credentials, parser exception text or URLs are emitted in reasons.
 */
export function checkSecurityTestIsolation(
  options: Options = {},
): IsolationCheckResult {
  const reasons: string[] = [];
  const env = process.env;
  if (env.NODE_ENV === "production" || env.APP_ENV === "production")
    reasons.push("Production execution is forbidden.");
  if (options.requireDatabase) {
    if (env.TEST_DATABASE_DISPOSABLE !== "true")
      reasons.push("Disposable database authorization is missing.");
    if (
      !env.DATABASE_URL ||
      !env.TEST_DATABASE_URL ||
      env.DATABASE_URL !== env.TEST_DATABASE_URL
    )
      reasons.push("Both database URLs must be present and match exactly.");
    try {
      const url = new URL(env.TEST_DATABASE_URL ?? "");
      if (!["postgres:", "postgresql:"].includes(url.protocol))
        reasons.push("Invalid database protocol.");
      // Exact endpoint/role identity, not substring or hostname suffix matching.
      const identity =
        url.protocol +
        "//" +
        url.hostname +
        ":" +
        (url.port || "5432") +
        url.pathname +
        "#" +
        url.username;
      const allowed: unknown = JSON.parse(
        env.SECURITY_TEST_DB_ALLOWLIST ?? "[]",
      );
      if (
        !Array.isArray(allowed) ||
        !allowed.every((x) => typeof x === "string") ||
        !allowed.includes(identity)
      )
        reasons.push(
          "Database endpoint and role are not explicitly provisioned in the test allowlist.",
        );
      if (url.search)
        reasons.push("Unreviewed database connection options are forbidden.");
    } catch {
      reasons.push("Database configuration or allowlist is invalid.");
    }
  }
  const key = env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = key.startsWith("sk_test_")
    ? "test"
    : key.startsWith("sk_live_")
      ? "live"
      : "unconfigured";
  if (key && stripeMode !== "test")
    reasons.push("Live or unrecognized Stripe credentials are forbidden.");
  if (options.requireStripe && stripeMode !== "test")
    reasons.push("Stripe test credentials are missing.");
  // A fake-looking API key does not install an email sink or intercept network I/O.
  if (options.requireEmailSink !== false)
    reasons.push(
      "No verified email sink transport is registered for application integration.",
    );
  else if (env.RESEND_API_KEY)
    reasons.push("An external email credential is present in an offline run.");
  return {
    isIsolated: reasons.length === 0,
    reasons,
    stripeMode,
    emailSinkActive: false,
  };
}
export function assertSecurityTestIsolation(options?: Options): void {
  const result = checkSecurityTestIsolation(options);
  if (!result.isIsolated)
    throw new IsolationGuardError(
      "Security isolation prerequisites unavailable.",
      result.reasons.join("; "),
    );
}
