import { z } from "zod";

/**
 * Base schemas for Storefront and Admin environment variables.
 * Centralized to uphold DRY principle across apps and preflight validation tooling.
 */

export const storefrontBaseSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().default("/"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().optional(),
  REALTIME_SECRET: z.string().optional(),
  ORDER_TOKEN_SECRET: z.string().optional(),
  MAINTENANCE_SECRET: z.string().optional(),
  TRUSTED_PROXY: z.string().optional(),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  ADMIN_ALERT_EMAIL: z.string().email().optional(),
});

export const storefrontEnvSchema = storefrontBaseSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (!["staging", "production"].includes(data.APP_ENV || "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENV"],
        message: "Explicit staging or production environment is required",
      });
    }
    const keyMode = data.APP_ENV === "staging" ? "test" : "live";
    if (
      !data.STRIPE_SECRET_KEY.startsWith(`sk_${keyMode}_`) ||
      !data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(`pk_${keyMode}_`)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STRIPE_SECRET_KEY"],
        message: "Stripe mode mismatch",
      });
    }
    for (const [key, value] of [
      ["ORDER_TOKEN_SECRET", data.ORDER_TOKEN_SECRET],
      ["REALTIME_SECRET", data.REALTIME_SECRET],
      ["MAINTENANCE_SECRET", data.MAINTENANCE_SECRET],
    ] as const) {
      if (!value || value.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Dedicated secret must be 32+ characters",
        });
      }
    }
    if (data.APP_ENV === "production" && !data.NEXT_PUBLIC_STOREFRONT_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_STOREFRONT_URL"],
        message: "HTTPS storefront URL is required",
      });
    }
    if (data.APP_ENV === "production" && !data.DATABASE_URL.includes("sslmode=require")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must enforce sslmode=require in production",
      });
    }
    if (!data.CLERK_WEBHOOK_SECRET || data.CLERK_WEBHOOK_SECRET.startsWith("whsec_xxx")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLERK_WEBHOOK_SECRET"],
        message: "CLERK_WEBHOOK_SECRET is required and must not be a placeholder in production",
      });
    }
    if (!data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
        message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required in production",
      });
    }
    if (!data.REALTIME_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REALTIME_SECRET"],
        message: "REALTIME_SECRET is required in production for cache-invalidation webhooks",
      });
    }
    if (!data.CLOUDINARY_API_KEY || !data.CLOUDINARY_API_SECRET || !data.CLOUDINARY_CLOUD_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLOUDINARY_CLOUD_NAME"],
        message: "Cloudinary credentials (CLOUD_NAME, API_KEY, API_SECRET) are required in production",
      });
    }
  }
});

export const adminBaseSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required — set it in .env or .env.local"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters"),
  ADMIN_MFA_ENCRYPTION_KEY: z.string().min(32, "ADMIN_MFA_ENCRYPTION_KEY must be at least 32 characters"),
  ADMIN_BOOTSTRAP_TOKEN: z.string().optional(),
  NEXT_PUBLIC_ADMIN_URL: z.string().default("http://localhost:3001"),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().default("http://localhost:3000"),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  TRUSTED_PROXY: z.string().optional(),
});

export const adminEnvSchema = adminBaseSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (!["staging", "production"].includes(data.APP_ENV || "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENV"],
        message: "Explicit deployment environment is required",
      });
    }
    if (data.APP_ENV === "production") {
      if (!data.DATABASE_URL.includes("sslmode=require")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DATABASE_URL"],
          message: "DATABASE_URL must enforce sslmode=require in production",
        });
      }
      if (!data.NEXT_PUBLIC_ADMIN_URL.startsWith("https://")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXT_PUBLIC_ADMIN_URL"],
          message: "HTTPS admin URL is required in production",
        });
      }
    }
  }
});

export type PreflightMode = "development" | "staging" | "production";

export interface PreflightCheckItem {
  category: "Storefront" | "Admin" | "Shared Security" | "Infrastructure" | "Operational";
  variable: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
}

export interface PreflightSummary {
  mode: PreflightMode;
  total: number;
  passed: number;
  failed: number;
  warned: number;
  checks: PreflightCheckItem[];
}

const PLACEHOLDER_PREFIXES = ["replace_with", "your_", "whsec_xxx", "pk_test_xxx", "sk_test_xxx", "re_xxx"];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Runs preflight environment validation checks for a specified target mode.
 * Crucial rule: Never logs or returns raw secret values!
 */
export function runPreflightChecks(
  env: Record<string, string | undefined>,
  mode: PreflightMode = "development",
): PreflightSummary {
  const checks: PreflightCheckItem[] = [];

  const add = (
    category: PreflightCheckItem["category"],
    variable: string,
    status: PreflightCheckItem["status"],
    message: string,
  ) => {
    checks.push({ category, variable, status, message });
  };

  // 1. Database
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    add("Shared Security", "DATABASE_URL", "FAIL", "DATABASE_URL is missing");
  } else if (!dbUrl.includes("sslmode=require")) {
    if (mode === "development") {
      add("Shared Security", "DATABASE_URL", "WARN", "Missing sslmode=require (recommended even in dev)");
    } else {
      add("Shared Security", "DATABASE_URL", "FAIL", "Must enforce sslmode=require in staging/production");
    }
  } else {
    add("Shared Security", "DATABASE_URL", "PASS", "Configured with sslmode=require");
  }

  // 2. Internal Secrets Length & Strength
  const checkSecret = (
    cat: PreflightCheckItem["category"],
    varName: string,
    minLen: number,
    prodRecommended: number,
  ) => {
    const val = env[varName];
    if (!val) {
      add(cat, varName, "FAIL", `${varName} is missing`);
    } else if (isPlaceholder(val)) {
      add(cat, varName, "FAIL", `${varName} is still a placeholder`);
    } else if (val.length < minLen) {
      add(cat, varName, "FAIL", `${varName} length (${val.length}) is below required minimum ${minLen}`);
    } else if (mode === "production" && val.length < prodRecommended) {
      add(cat, varName, "WARN", `${varName} length (${val.length}) is under recommended ${prodRecommended} chars`);
    } else {
      add(cat, varName, "PASS", `Present and meets length requirements (${val.length} chars)`);
    }
  };

  checkSecret("Admin", "ADMIN_SESSION_SECRET", 32, 64);
  checkSecret("Admin", "ADMIN_MFA_ENCRYPTION_KEY", 32, 64);
  checkSecret("Storefront", "ORDER_TOKEN_SECRET", 32, 32);
  checkSecret("Storefront", "REALTIME_SECRET", 32, 32);
  checkSecret("Storefront", "MAINTENANCE_SECRET", 32, 32);

  // 3. Secret Uniqueness (Never reuse keys across purposes)
  const secretsToCheck = [
    "ADMIN_SESSION_SECRET",
    "ADMIN_MFA_ENCRYPTION_KEY",
    "ORDER_TOKEN_SECRET",
    "REALTIME_SECRET",
    "MAINTENANCE_SECRET",
  ];
  const seenValues = new Map<string, string>();
  let hasReuse = false;
  for (const name of secretsToCheck) {
    const val = env[name];
    if (val && !isPlaceholder(val)) {
      if (seenValues.has(val)) {
        add(
          "Shared Security",
          `${name}_UNIQUENESS`,
          "FAIL",
          `Secret key value is reused with ${seenValues.get(val)}! Keys must be independently generated.`,
        );
        hasReuse = true;
      } else {
        seenValues.set(val, name);
      }
    }
  }
  if (!hasReuse && seenValues.size > 1) {
    add("Shared Security", "INTERNAL_SECRETS_UNIQUENESS", "PASS", "All defined internal secrets are independent");
  }

  // 4. Stripe Keys & Mode Matching
  const stripeSecret = env.STRIPE_SECRET_KEY;
  const stripePub = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeWebhook = env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret) {
    add("Storefront", "STRIPE_SECRET_KEY", "FAIL", "STRIPE_SECRET_KEY is missing");
  } else if (isPlaceholder(stripeSecret)) {
    add("Storefront", "STRIPE_SECRET_KEY", "FAIL", "STRIPE_SECRET_KEY is a placeholder");
  } else if (mode === "production" && !stripeSecret.startsWith("sk_live_")) {
    add("Storefront", "STRIPE_SECRET_KEY", "FAIL", "Production requires live secret key (must start with sk_live_)");
  } else if (mode !== "production" && stripeSecret.startsWith("sk_live_")) {
    add("Storefront", "STRIPE_SECRET_KEY", "WARN", "Live Stripe secret key detected in non-production mode!");
  } else {
    add("Storefront", "STRIPE_SECRET_KEY", "PASS", `Valid key prefix for ${mode} mode`);
  }

  if (!stripePub) {
    add("Storefront", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", mode === "production" ? "FAIL" : "WARN", "Publishable key is missing");
  } else if (mode === "production" && !stripePub.startsWith("pk_live_")) {
    add("Storefront", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "FAIL", "Production requires live publishable key (must start with pk_live_)");
  } else if (mode !== "production" && stripePub.startsWith("pk_live_")) {
    add("Storefront", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "WARN", "Live publishable key detected in non-production mode!");
  } else {
    add("Storefront", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "PASS", `Valid publishable key prefix for ${mode} mode`);
  }

  if (!stripeWebhook) {
    add("Storefront", "STRIPE_WEBHOOK_SECRET", "FAIL", "STRIPE_WEBHOOK_SECRET is missing");
  } else if (isPlaceholder(stripeWebhook)) {
    add("Storefront", "STRIPE_WEBHOOK_SECRET", mode === "production" ? "FAIL" : "WARN", "STRIPE_WEBHOOK_SECRET is a placeholder");
  } else {
    add("Storefront", "STRIPE_WEBHOOK_SECRET", "PASS", "STRIPE_WEBHOOK_SECRET is configured");
  }

  // 5. Clerk Auth Keys & Mode Matching
  const clerkPub = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkSecret = env.CLERK_SECRET_KEY;
  const clerkWebhook = env.CLERK_WEBHOOK_SECRET;

  if (!clerkPub) {
    add("Storefront", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "FAIL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing");
  } else if (mode === "production" && !clerkPub.startsWith("pk_live_")) {
    add("Storefront", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "FAIL", "Production requires pk_live_ prefix");
  } else {
    add("Storefront", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "PASS", `Configured for ${mode} mode`);
  }

  if (!clerkSecret) {
    add("Storefront", "CLERK_SECRET_KEY", "FAIL", "CLERK_SECRET_KEY is missing");
  } else if (mode === "production" && !clerkSecret.startsWith("sk_live_")) {
    add("Storefront", "CLERK_SECRET_KEY", "FAIL", "Production requires sk_live_ prefix");
  } else {
    add("Storefront", "CLERK_SECRET_KEY", "PASS", `Configured for ${mode} mode`);
  }

  if (clerkWebhook) {
    if (isPlaceholder(clerkWebhook)) {
      add("Storefront", "CLERK_WEBHOOK_SECRET", mode === "production" ? "FAIL" : "WARN", "CLERK_WEBHOOK_SECRET is a placeholder");
    } else {
      add("Storefront", "CLERK_WEBHOOK_SECRET", "PASS", "Configured");
    }
  } else if (mode === "production") {
    add("Storefront", "CLERK_WEBHOOK_SECRET", "FAIL", "Required for syncing users on production");
  }

  // 6. Resend Email
  const resendKey = env.RESEND_API_KEY;
  const resendFrom = env.RESEND_FROM_EMAIL;

  if (!resendKey || isPlaceholder(resendKey)) {
    add("Storefront", "RESEND_API_KEY", mode === "production" ? "FAIL" : "WARN", "RESEND_API_KEY is missing or placeholder");
  } else {
    add("Storefront", "RESEND_API_KEY", "PASS", "Configured");
  }

  if (resendFrom) {
    if (mode === "production" && resendFrom.includes("resend.dev")) {
      add("Storefront", "RESEND_FROM_EMAIL", "FAIL", "Cannot use @resend.dev testing address in production");
    } else {
      add("Storefront", "RESEND_FROM_EMAIL", "PASS", `Configured (${resendFrom.includes("resend.dev") ? "dev testing domain" : "custom domain"})`);
    }
  } else if (mode === "production") {
    add("Storefront", "RESEND_FROM_EMAIL", "FAIL", "RESEND_FROM_EMAIL must be configured with verified production domain");
  }

  // 7. Cloudinary
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const cloudKey = env.CLOUDINARY_API_KEY;
  const cloudSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudKey || !cloudSecret || isPlaceholder(cloudName)) {
    add("Shared Security", "CLOUDINARY_CREDENTIALS", mode === "production" ? "FAIL" : "WARN", "Cloudinary credentials missing or placeholder");
  } else {
    add("Shared Security", "CLOUDINARY_CREDENTIALS", "PASS", "Configured");
  }

  // 8. Public URLs & HTTPS
  const storeUrl = env.NEXT_PUBLIC_STOREFRONT_URL;
  const adminUrl = env.NEXT_PUBLIC_ADMIN_URL;

  if (!storeUrl) {
    add("Infrastructure", "NEXT_PUBLIC_STOREFRONT_URL", "FAIL", "NEXT_PUBLIC_STOREFRONT_URL is missing");
  } else if (mode !== "development" && !storeUrl.startsWith("https://")) {
    add("Infrastructure", "NEXT_PUBLIC_STOREFRONT_URL", "FAIL", "Must use HTTPS in staging/production");
  } else {
    add("Infrastructure", "NEXT_PUBLIC_STOREFRONT_URL", "PASS", "Configured");
  }

  if (!adminUrl) {
    add("Infrastructure", "NEXT_PUBLIC_ADMIN_URL", "FAIL", "NEXT_PUBLIC_ADMIN_URL is missing");
  } else if (mode !== "development" && !adminUrl.startsWith("https://")) {
    add("Infrastructure", "NEXT_PUBLIC_ADMIN_URL", "FAIL", "Must use HTTPS in staging/production");
  } else {
    add("Infrastructure", "NEXT_PUBLIC_ADMIN_URL", "PASS", "Configured");
  }

  // 9. Governance Warnings
  const bootstrapToken = env.ADMIN_BOOTSTRAP_TOKEN;
  if (bootstrapToken && bootstrapToken.trim().length > 0) {
    if (mode === "production") {
      add(
        "Admin",
        "ADMIN_BOOTSTRAP_TOKEN",
        "WARN",
        "ADMIN_BOOTSTRAP_TOKEN is set. You MUST delete this token from the environment immediately after initial superadmin setup!",
      );
    } else {
      add("Admin", "ADMIN_BOOTSTRAP_TOKEN", "PASS", "Bootstrap token present for initial dev setup");
    }
  }

  const trustedProxy = env.TRUSTED_PROXY;
  if (mode === "production") {
    if (trustedProxy !== "cloudflare") {
      add(
        "Infrastructure",
        "TRUSTED_PROXY",
        "WARN",
        "TRUSTED_PROXY is not set to 'cloudflare'. Ensure direct origin access is blocked and rate limiter receives valid client IP.",
      );
    } else {
      add("Infrastructure", "TRUSTED_PROXY", "PASS", "Configured to 'cloudflare'");
    }
  }

  // 10. Operational Alert Email
  const adminAlertEmail = env.ADMIN_ALERT_EMAIL;
  if (adminAlertEmail && !isPlaceholder(adminAlertEmail)) {
    if (z.string().email().safeParse(adminAlertEmail).success) {
      add("Operational", "ADMIN_ALERT_EMAIL", "PASS", "Configured with valid email syntax");
    } else {
      add("Operational", "ADMIN_ALERT_EMAIL", "FAIL", "Invalid email format");
    }
  } else if (mode === "production") {
    add("Operational", "ADMIN_ALERT_EMAIL", "WARN", "ADMIN_ALERT_EMAIL is not set; reconciliation alerts will not be delivered to operators");
  } else {
    add("Operational", "ADMIN_ALERT_EMAIL", "PASS", "Optional in development");
  }

  // Calculate totals
  const total = checks.length;
  const passed = checks.filter((c) => c.status === "PASS").length;
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const warned = checks.filter((c) => c.status === "WARN").length;

  return {
    mode,
    total,
    passed,
    failed,
    warned,
    checks,
  };
}
