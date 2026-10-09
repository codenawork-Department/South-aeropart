import { describe, it, expect } from "vitest";
import {
  runPreflightChecks,
  storefrontEnvSchema,
  adminEnvSchema,
} from "./env-schemas";

describe("runPreflightChecks", () => {
  const validDevEnv: Record<string, string> = {
    APP_ENV: "development",
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/south_aero?sslmode=require",
    ADMIN_SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ADMIN_MFA_ENCRYPTION_KEY: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    ADMIN_BOOTSTRAP_TOKEN: "bootstrap-token-1234567890",
    ORDER_TOKEN_SECRET: "order-token-secret-at-least-32-characters-long",
    REALTIME_SECRET: "realtime-secret-at-least-32-characters-long-abc",
    MAINTENANCE_SECRET: "maintenance-secret-at-least-32-characters-long",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_sample123",
    CLERK_SECRET_KEY: "sk_test_sample123",
    CLERK_WEBHOOK_SECRET: "whsec_sample123",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_stripe123",
    STRIPE_SECRET_KEY: "sk_test_stripe123",
    STRIPE_WEBHOOK_SECRET: "whsec_stripe123",
    RESEND_API_KEY: "re_sample123",
    RESEND_FROM_EMAIL: "South Aero <onboarding@resend.dev>",
    CLOUDINARY_CLOUD_NAME: "demo-cloud",
    CLOUDINARY_API_KEY: "1234567890",
    CLOUDINARY_API_SECRET: "abcdefghijklmnopqrstuvwxyz",
    NEXT_PUBLIC_STOREFRONT_URL: "http://localhost:3000",
    NEXT_PUBLIC_ADMIN_URL: "http://localhost:3001",
  };

  const validProdEnv: Record<string, string> = {
    APP_ENV: "production",
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@neon.tech/south_aero?sslmode=require",
    ADMIN_SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ADMIN_MFA_ENCRYPTION_KEY: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    ORDER_TOKEN_SECRET: "order-token-secret-at-least-32-characters-long",
    REALTIME_SECRET: "realtime-secret-at-least-32-characters-long-abc",
    MAINTENANCE_SECRET: "maintenance-secret-at-least-32-characters-long",
    TRUSTED_PROXY: "cloudflare",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_sample123",
    CLERK_SECRET_KEY: "sk_live_sample123",
    CLERK_WEBHOOK_SECRET: "whsec_real_clerk_secret",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_stripe123",
    STRIPE_SECRET_KEY: "sk_live_stripe123",
    STRIPE_WEBHOOK_SECRET: "whsec_real_stripe_secret",
    RESEND_API_KEY: "re_real_resend_key",
    RESEND_FROM_EMAIL: "South Aero <orders@southaero.com>",
    CLOUDINARY_CLOUD_NAME: "south-aero-prod",
    CLOUDINARY_API_KEY: "9876543210",
    CLOUDINARY_API_SECRET: "secure_prod_cloudinary_secret",
    NEXT_PUBLIC_STOREFRONT_URL: "https://southaero.com",
    NEXT_PUBLIC_ADMIN_URL: "https://admin.southaero.com",
  };

  it("passes all checks in valid development environment", () => {
    const summary = runPreflightChecks(validDevEnv, "development");
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBeGreaterThan(10);
  });

  it("passes all checks in valid production environment", () => {
    const summary = runPreflightChecks(validProdEnv, "production");
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBeGreaterThan(12);
  });

  it("fails in production when database url lacks sslmode=require", () => {
    const badEnv = {
      ...validProdEnv,
      DATABASE_URL: "postgresql://user:pass@neon.tech/south_aero",
    };
    const summary = runPreflightChecks(badEnv, "production");
    expect(summary.failed).toBeGreaterThan(0);
    const dbCheck = summary.checks.find((c) => c.variable === "DATABASE_URL");
    expect(dbCheck?.status).toBe("FAIL");
  });

  it("fails in production when Stripe keys are test mode", () => {
    const badEnv = {
      ...validProdEnv,
      STRIPE_SECRET_KEY: "sk_test_12345",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_12345",
    };
    const summary = runPreflightChecks(badEnv, "production");
    const secretCheck = summary.checks.find((c) => c.variable === "STRIPE_SECRET_KEY");
    const pubCheck = summary.checks.find((c) => c.variable === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(secretCheck?.status).toBe("FAIL");
    expect(pubCheck?.status).toBe("FAIL");
  });

  it("detects reused secret keys across distinct purposes", () => {
    const reusedEnv = {
      ...validProdEnv,
      ORDER_TOKEN_SECRET: validProdEnv.ADMIN_SESSION_SECRET,
    };
    const summary = runPreflightChecks(reusedEnv, "production");
    expect(summary.failed).toBeGreaterThan(0);
    const reuseCheck = summary.checks.find((c) => c.variable === "ORDER_TOKEN_SECRET_UNIQUENESS");
    expect(reuseCheck?.status).toBe("FAIL");
    expect(reuseCheck?.message).toContain("reused");
  });

  it("fails in production when URLs are not HTTPS", () => {
    const httpEnv = {
      ...validProdEnv,
      NEXT_PUBLIC_STOREFRONT_URL: "http://southaero.com",
      NEXT_PUBLIC_ADMIN_URL: "http://admin.southaero.com",
    };
    const summary = runPreflightChecks(httpEnv, "production");
    const storeUrlCheck = summary.checks.find((c) => c.variable === "NEXT_PUBLIC_STOREFRONT_URL");
    const adminUrlCheck = summary.checks.find((c) => c.variable === "NEXT_PUBLIC_ADMIN_URL");
    expect(storeUrlCheck?.status).toBe("FAIL");
    expect(adminUrlCheck?.status).toBe("FAIL");
  });

  it("fails in production when RESEND_FROM_EMAIL uses resend.dev", () => {
    const badEmailEnv = {
      ...validProdEnv,
      RESEND_FROM_EMAIL: "orders@resend.dev",
    };
    const summary = runPreflightChecks(badEmailEnv, "production");
    const resendCheck = summary.checks.find((c) => c.variable === "RESEND_FROM_EMAIL");
    expect(resendCheck?.status).toBe("FAIL");
  });

  it("warns in production if ADMIN_BOOTSTRAP_TOKEN is set", () => {
    const tokenEnv = {
      ...validProdEnv,
      ADMIN_BOOTSTRAP_TOKEN: "leftover-token-12345",
    };
    const summary = runPreflightChecks(tokenEnv, "production");
    const tokenCheck = summary.checks.find((c) => c.variable === "ADMIN_BOOTSTRAP_TOKEN");
    expect(tokenCheck?.status).toBe("WARN");
  });

  it("warns in production if TRUSTED_PROXY is not cloudflare", () => {
    const noProxyEnv = {
      ...validProdEnv,
      TRUSTED_PROXY: undefined,
    };
    const summary = runPreflightChecks(noProxyEnv, "production");
    const proxyCheck = summary.checks.find((c) => c.variable === "TRUSTED_PROXY");
    expect(proxyCheck?.status).toBe("WARN");
  });
});

describe("Zod schema validation", () => {
  it("validates storefront environment correctly", () => {
    const result = storefrontEnvSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_123",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      RESEND_API_KEY: "re_123",
    });
    expect(result.success).toBe(true);
  });

  it("validates admin environment correctly", () => {
    const result = adminEnvSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      ADMIN_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
      ADMIN_MFA_ENCRYPTION_KEY: "fedcba9876543210fedcba9876543210",
    });
    expect(result.success).toBe(true);
  });
});
