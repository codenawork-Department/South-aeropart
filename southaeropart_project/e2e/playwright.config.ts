import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for South Aero Platform E2E tests.
 *
 * Configures two projects:
 * - storefront: customer-facing app on port 3000
 * - admin: back-office dashboard on port 3001
 *
 * IMPORTANT (CLAUDE.md §6.2):
 * Dev servers must be started manually (pnpm dev) before running E2E tests
 * so the operator controls which environment/DB is connected.
 * Do NOT add webServer auto-start until test isolation guards are in place.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: "storefront",
      testDir: "./tests/storefront",
      testIgnore: ["**/checkout-flow.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
    },
    {
      name: "admin",
      testDir: "./tests/admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
    },
    {
      name: "security",
      testDir: "./tests/security",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
    },
    {
      name: "storefront-test-db",
      testDir: "./tests/storefront",
      testMatch: ["**/checkout-flow.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.TEST_BASE_URL || "http://localhost:3005",
      },
    },
  ],
});
