import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServiceUsageMetrics } from "./service-usage.actions";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  rawSql: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSession: mocks.validateSession,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
}));

vi.mock("@repo/db", () => ({
  db: {
    select: mocks.dbSelect,
  },
  rawSql: mocks.rawSql,
  users: { id: "id" },
  newsletterCampaigns: {
    id: "id",
    subject: "subject",
    recipientCount: "recipient_count",
    status: "status",
    sentAt: "sent_at",
  },
  newsletterSubscribers: {
    id: "id",
    isSubscribed: "is_subscribed",
  },
  orders: {
    id: "id",
    createdAt: "created_at",
  },
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
    { raw: (s: string) => s }
  ),
  gte: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

describe("service-usage.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized fallback report if session is invalid", async () => {
    mocks.validateSession.mockResolvedValueOnce(null);

    const report = await getServiceUsageMetrics();
    expect(report.summary.overallStatus).toBe("critical");
    expect(report.summary.servicesMonitored).toBe(7);
    expect(report.resend.status).toBe("unconfigured");
    expect(report.ga4.status).toBe("unconfigured");
    expect(report.neon.message).toContain("สิทธิ์การเข้าถึงไม่ถูกต้อง");
  });

  it("returns report with all 7 tech stack metrics when session is authenticated", async () => {
    mocks.validateSession.mockResolvedValueOnce({
      id: "admin-1",
      email: "admin@southaero.com",
      role: "super_admin",
    });

    // Mock DB rawSql for Neon
    mocks.rawSql.mockResolvedValueOnce([
      { size_bytes: "10485760", size_pretty: "10 MB", db_name: "neondb", pg_version: "PostgreSQL 16" },
    ]);
    mocks.rawSql.mockResolvedValueOnce([
      { total_cluster_bytes: "20971520", total_cluster_pretty: "20 MB" },
    ]);
    mocks.rawSql.mockResolvedValueOnce([]);

    // Mock fluent DB selects for Resend & Clerk
    const mockQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ total: 5, count: 5 }]),
    };
    mocks.dbSelect.mockReturnValue(mockQueryBuilder);

    const report = await getServiceUsageMetrics();

    expect(report.summary.servicesMonitored).toBe(7);
    expect(report.neon).toBeDefined();
    expect(report.clerk).toBeDefined();
    expect(report.cloudinary).toBeDefined();
    expect(report.resend).toBeDefined();
    expect(report.ga4).toBeDefined();
    expect(report.stripe).toBeDefined();
    expect(report.hosting).toBeDefined();

    // Verify Resend quotas
    expect(report.resend.limitMonthlyEmails).toBe(3000);
    expect(report.resend.limitDailyEmails).toBe(100);

    // Verify GA4 quotas
    expect(report.ga4.limitMonthlyEvents).toBe(10000000);
    expect(report.ga4.limitDailyBigQueryExport).toBe(1000000);
    expect(report.ga4.dataRetentionMonths).toBe(14);
  });
});
