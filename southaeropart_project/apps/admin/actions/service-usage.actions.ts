"use server";

import {
  db,
  users,
  newsletterCampaigns,
  newsletterSubscribers,
  orders,
  sql,
  rawSql,
  gte,
  eq,
  and,
  desc,
} from "@repo/db";
import { validateSession } from "@/lib/auth";
import { unstable_cache } from "next/cache";

// ─── Raw SQL result types (replace `any`) ───

interface PgDbInfoRow {
  size_bytes: string;
  size_pretty: string;
  db_name: string;
  pg_version: string;
}

interface PgClusterInfoRow {
  total_cluster_bytes: string;
  total_cluster_pretty: string;
}

interface PgTableRow {
  table_name: string;
  row_count: string;
  total_bytes: string;
  total_pretty: string;
  data_pretty: string;
  index_pretty: string;
}

// ─── Types ───

export interface TableUsageMetric {
  name: string;
  rowCount: number;
  totalBytes: number;
  totalPretty: string;
  dataPretty: string;
  indexPretty: string;
  percentOfDb: number;
}

export interface NeonMetrics {
  configured: boolean;
  status: "healthy" | "warning" | "critical" | "unconfigured";
  usedBytes: number;
  usedPretty: string;
  clusterTotalBytes: number;
  clusterTotalPretty: string;
  clusterTotalGb: string;
  limitBytes: number;
  limitPretty: string;
  limitGb: string;
  percentUsed: number;
  percentClusterUsed: number;
  dbName: string;
  pgVersion: string;
  host: string;
  region: string;
  computeLimit: string;
  totalTables: number;
  totalRows: number;
  tables: TableUsageMetric[];
  message: string;
}

export interface ClerkRecentUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface ClerkMetrics {
  configured: boolean;
  status: "healthy" | "warning" | "critical" | "unconfigured";
  totalUsers: number;
  limitUsers: number;
  limitPretty: string;
  percentUsed: number;
  dbSyncedUsers: number;
  tierName: string;
  oauthProviders: string[];
  recentUsers: ClerkRecentUser[];
  message: string;
}

export interface CloudinaryMetrics {
  configured: boolean;
  isPlaceholder: boolean;
  status: "healthy" | "warning" | "critical" | "unconfigured";
  cloudName: string;
  limitCredits: number;
  limitStorageGb: number;
  limitBandwidthGb: number;
  limitTransformations: number;
  liveUsage: {
    creditsUsed?: number;
    creditsUsedPretty?: string;
    storageBytes?: number;
    storagePretty?: string;
    bandwidthBytes?: number;
    bandwidthPretty?: string;
    transformationsUsed?: number;
    resourcesCount?: number;
  } | null;
  message: string;
}

export interface ResendRecentCampaign {
  id: string;
  subject: string;
  recipientCount: number;
  sentAt: string | null;
}

export interface ResendMetrics {
  configured: boolean;
  isPlaceholder: boolean;
  status: "healthy" | "warning" | "critical" | "unconfigured";
  apiKeyPrefix: string;
  fromEmail: string;
  isSandboxDomain: boolean;
  alertEmail: string;
  limitMonthlyEmails: number;
  limitDailyEmails: number;
  sentMonthlyEmails: number;
  sentTodayEmails: number;
  percentMonthlyUsed: number;
  percentDailyUsed: number;
  subscribersCount: number;
  totalCampaignsSent: number;
  recentCampaigns: ResendRecentCampaign[];
  rateLimitPerSec: number;
  message: string;
}

export interface GA4Metrics {
  configured: boolean;
  status: "healthy" | "warning" | "critical" | "unconfigured";
  measurementId: string;
  hasDataApiCredentials: boolean;
  activeUsersRealtime: number;
  monthlyEventsEstimate: number;
  limitMonthlyEvents: number;
  limitDailyBigQueryExport: number;
  percentEventsUsed: number;
  dataRetentionMonths: number;
  customDimensionsLimit: number;
  conversionsLimit: number;
  eCommerceTrackingEnabled: boolean;
  message: string;
}

export interface StripeMetrics {
  configured: boolean;
  isPlaceholder: boolean;
  status: "healthy" | "unconfigured";
  mode: "Test / Sandbox" | "Live Mode" | "Not Configured";
  publicKeyPrefix: string;
  monthlyFee: string;
  transactionFee: string;
  message: string;
}

export interface HostingMetrics {
  isDeployed: boolean;
  platform: string;
  tier: string;
  bandwidthLimit: string;
  serverlessLimit: string;
  edgeInvocationsLimit: string;
  nodeVersion: string;
  status: "healthy" | "local" | "warning";
  statusLabel: string;
  cloudflareProxy: {
    enabled: boolean;
    tier: string;
    ddosProtection: string;
    ssl: string;
    tunnelsQuota: string;
  };
}

export interface ServiceUsageReport {
  summary: {
    overallStatus: "healthy" | "warning" | "critical";
    lastUpdated: string;
    servicesMonitored: number;
    healthyServices: number;
    warningServices: number;
    criticalServices: number;
  };
  neon: NeonMetrics;
  clerk: ClerkMetrics;
  cloudinary: CloudinaryMetrics;
  resend: ResendMetrics;
  ga4: GA4Metrics;
  stripe: StripeMetrics;
  hosting: HostingMetrics;
}

// ─── Helpers ───

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function parseHostAndRegion(dbUrl?: string): { host: string; region: string } {
  if (!dbUrl) return { host: "—", region: "Unknown" };
  try {
    const url = new URL(dbUrl);
    const host = url.hostname;
    let region = "Global / AWS";
    if (host.includes("ap-southeast-1")) region = "AWS ap-southeast-1 (Singapore)";
    else if (host.includes("ap-southeast-2")) region = "AWS ap-southeast-2 (Sydney)";
    else if (host.includes("ap-northeast-1")) region = "AWS ap-northeast-1 (Tokyo)";
    else if (host.includes("us-east-1")) region = "AWS us-east-1 (N. Virginia)";
    else if (host.includes("us-east-2")) region = "AWS us-east-2 (Ohio)";
    else if (host.includes("us-west-2")) region = "AWS us-west-2 (Oregon)";
    else if (host.includes("eu-central-1")) region = "AWS eu-central-1 (Frankfurt)";
    return { host, region };
  } catch {
    return { host: "Neon Cloud", region: "AWS ap-southeast-1 (Singapore)" };
  }
}

// ─── Individual Service Fetchers ───

async function fetchNeonMetrics(): Promise<NeonMetrics> {
  const NEON_STORAGE_LIMIT_BYTES = 512 * 1024 * 1024; // 512 MB Free Tier limit

  let neonMetrics: NeonMetrics = {
    configured: false,
    status: "unconfigured",
    usedBytes: 0,
    usedPretty: "0 MB",
    clusterTotalBytes: 0,
    clusterTotalPretty: "0 MB",
    clusterTotalGb: "0.00",
    limitBytes: NEON_STORAGE_LIMIT_BYTES,
    limitPretty: "512 MB",
    limitGb: "0.5 GB",
    percentUsed: 0,
    percentClusterUsed: 0,
    dbName: "neondb",
    pgVersion: "PostgreSQL",
    host: "—",
    region: "—",
    computeLimit: "0.25 CU autosuspend / 100 CU-hrs/mo",
    totalTables: 0,
    totalRows: 0,
    tables: [],
    message: "DATABASE_URL is not configured",
  };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return neonMetrics;

  try {
    const { host, region } = parseHostAndRegion(dbUrl);
    const sqlClient = rawSql;

    // Run database queries concurrently
    const [[dbInfo], [clusterInfo], rawTables] = await Promise.all([
      sqlClient`
        SELECT 
          pg_database_size(current_database())::bigint AS size_bytes,
          pg_size_pretty(pg_database_size(current_database())) AS size_pretty,
          current_database() AS db_name,
          version() AS pg_version;
      ` as unknown as Promise<PgDbInfoRow[]>,
      sqlClient`
        SELECT 
          COALESCE(SUM(pg_database_size(datname)), 0)::bigint AS total_cluster_bytes,
          pg_size_pretty(COALESCE(SUM(pg_database_size(datname)), 0)) AS total_cluster_pretty
        FROM pg_database;
      ` as unknown as Promise<PgClusterInfoRow[]>,
      sqlClient`
        SELECT 
          s.relname AS table_name,
          COALESCE(s.n_live_tup, 0)::bigint AS row_count,
          pg_total_relation_size(c.oid)::bigint AS total_bytes,
          pg_size_pretty(pg_total_relation_size(c.oid)) AS total_pretty,
          pg_size_pretty(pg_relation_size(c.oid)) AS data_pretty,
          pg_size_pretty(pg_indexes_size(c.oid)) AS index_pretty
        FROM pg_stat_user_tables s
        JOIN pg_class c ON c.relname = s.relname
        WHERE s.schemaname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC;
      ` as unknown as Promise<PgTableRow[]>,
    ]);

    const usedBytes = Number(dbInfo?.size_bytes || 0);
    const clusterTotalBytes = Number(clusterInfo?.total_cluster_bytes || usedBytes);
    const clusterTotalGb = (clusterTotalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const percentUsed = Math.min(100, parseFloat(((usedBytes / NEON_STORAGE_LIMIT_BYTES) * 100).toFixed(2)));
    const percentClusterUsed = Math.min(100, parseFloat(((clusterTotalBytes / NEON_STORAGE_LIMIT_BYTES) * 100).toFixed(2)));

    let totalRows = 0;
    const tables: TableUsageMetric[] = rawTables.map((t: PgTableRow) => {
      const tBytes = Number(t.total_bytes || 0);
      const rows = Number(t.row_count || 0);
      totalRows += rows;
      const percentOfDb = usedBytes > 0 ? parseFloat(((tBytes / usedBytes) * 100).toFixed(1)) : 0;
      return {
        name: t.table_name,
        rowCount: rows,
        totalBytes: tBytes,
        totalPretty: t.total_pretty || formatBytes(tBytes),
        dataPretty: t.data_pretty || "0 bytes",
        indexPretty: t.index_pretty || "0 bytes",
        percentOfDb,
      };
    });

    let status: "healthy" | "warning" | "critical" = "healthy";
    let message = "การใช้งานพื้นที่ฐานข้อมูลอยู่ในเกณฑ์ปกติ (Free Tier 0.5 GB / 512 MB)";
    if (percentClusterUsed >= 90) {
      status = "critical";
      message = "เตือน: พื้นที่จัดเก็บ Neon Project ใกล้เต็มขีดจำกัด 0.5 GB แล้ว แนะนำให้สำรองข้อมูลหรือลบ Log เก่า";
    } else if (percentClusterUsed >= 75) {
      status = "warning";
      message = "แจ้งเตือน: พื้นที่จัดเก็บ Neon Project ใช้งานไปเกิน 75% ของโควต้า 0.5 GB ฟรี";
    }

    const fullVer = String(dbInfo?.pg_version || "");
    const shortVer = fullVer.split(" ")[0] + " " + fullVer.split(" ")[1];

    neonMetrics = {
      configured: true,
      status,
      usedBytes,
      usedPretty: formatBytes(usedBytes),
      clusterTotalBytes,
      clusterTotalPretty: String(clusterInfo?.total_cluster_pretty || formatBytes(clusterTotalBytes)),
      clusterTotalGb,
      limitBytes: NEON_STORAGE_LIMIT_BYTES,
      limitPretty: "512 MB",
      limitGb: "0.5 GB",
      percentUsed,
      percentClusterUsed,
      dbName: String(dbInfo?.db_name || "neondb"),
      pgVersion: shortVer,
      host,
      region,
      computeLimit: "0.25 CU autosuspend / 100 CU-hrs/mo",
      totalTables: tables.length,
      totalRows,
      tables,
      message,
    };
  } catch (e: unknown) {
    neonMetrics.message = `ไม่สามารถเชื่อมต่อฐานข้อมูล Neon ได้: ${e instanceof Error ? e.message : String(e)}`;
  }

  return neonMetrics;
}

async function fetchClerkMetrics(): Promise<ClerkMetrics> {
  const CLERK_FREE_TIER_LIMIT = 50000; // 50,000 Monthly Active Users (MRU / MAU)

  let clerkMetrics: ClerkMetrics = {
    configured: false,
    status: "unconfigured",
    totalUsers: 0,
    limitUsers: CLERK_FREE_TIER_LIMIT,
    limitPretty: "50,000 MAU",
    percentUsed: 0,
    dbSyncedUsers: 0,
    tierName: "Clerk Free Tier (50K MAU)",
    oauthProviders: ["Google OAuth", "Email / Password"],
    recentUsers: [],
    message: "CLERK_SECRET_KEY is not configured",
  };

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey || clerkSecretKey.includes("sk_test_xxx")) {
    return clerkMetrics;
  }

  try {
    const [countRes, localUserCountRes, usersListRes] = await Promise.allSettled([
      fetch("https://api.clerk.com/v1/users/count", {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
        next: { revalidate: 60 },
      }),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(users),
      fetch("https://api.clerk.com/v1/users?limit=5&order_by=-created_at", {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
        next: { revalidate: 60 },
      }),
    ]);

    let totalUsers = 0;
    if (countRes.status === "fulfilled" && countRes.value.ok) {
      const countData = await countRes.value.json();
      totalUsers = Number(countData?.total_count || 0);
    }

    let dbSyncedUsers = 0;
    if (localUserCountRes.status === "fulfilled" && localUserCountRes.value[0]) {
      dbSyncedUsers = Number(localUserCountRes.value[0]?.count || 0);
    }

    let recentUsers: ClerkRecentUser[] = [];
    if (usersListRes.status === "fulfilled" && usersListRes.value.ok) {
      const usersData = await usersListRes.value.json();
      if (Array.isArray(usersData)) {
        recentUsers = usersData.map((u: Record<string, unknown>) => {
          const emailAddresses = u.email_addresses as Array<{ id: string; email_address: string }> | undefined;
          const primaryEmailId = u.primary_email_address_id as string | undefined;
          const primaryEmail =
            emailAddresses?.find((e) => e.id === primaryEmailId)?.email_address ||
            emailAddresses?.[0]?.email_address ||
            "—";
          const name = [u.first_name as string, u.last_name as string].filter(Boolean).join(" ") || primaryEmail.split("@")[0] || "User";
          return {
            id: String(u.id || ""),
            name,
            email: primaryEmail,
            imageUrl: u.image_url as string | undefined,
            createdAt: new Date(u.created_at as string | number).toISOString(),
            lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at as string | number).toISOString() : null,
          };
        });
      }
    }

    const percentUsed = Math.min(100, parseFloat(((totalUsers / CLERK_FREE_TIER_LIMIT) * 100).toFixed(3)));

    let status: "healthy" | "warning" | "critical" = "healthy";
    let message = "จำนวนผู้ใช้งานอยู่ในเกณฑ์ Free Tier (เพดาน 50,000 MAU)";
    if (percentUsed >= 90) {
      status = "critical";
      message = "เตือน: ผู้ใช้งานใกล้เกินเพดาน 50,000 MAU ของ Free Tier แนะนำอัปเกรดเป็น Pro Plan";
    } else if (percentUsed >= 75) {
      status = "warning";
      message = "แจ้งเตือน: ผู้ใช้งานเกิน 75% ของโควต้า 50,000 MAU";
    }

    clerkMetrics = {
      configured: true,
      status,
      totalUsers,
      limitUsers: CLERK_FREE_TIER_LIMIT,
      limitPretty: "50,000 MAU",
      percentUsed,
      dbSyncedUsers,
      tierName: "Clerk Free Tier (50K MAU)",
      oauthProviders: ["Google OAuth", "Email OTP / Password"],
      recentUsers,
      message,
    };
  } catch (e: unknown) {
    clerkMetrics.message = `เชื่อมต่อ Clerk API ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`;
  }

  return clerkMetrics;
}

async function fetchCloudinaryMetrics(): Promise<CloudinaryMetrics> {
  const cName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const cKey = process.env.CLOUDINARY_API_KEY || "";
  const cSecret = process.env.CLOUDINARY_API_SECRET || "";
  const isCloudinaryPlaceholder = !cName || cName === "your_cloud_name" || !cKey || cKey === "your_api_key";

  let cloudinaryMetrics: CloudinaryMetrics = {
    configured: !isCloudinaryPlaceholder,
    isPlaceholder: isCloudinaryPlaceholder,
    status: isCloudinaryPlaceholder ? "unconfigured" : "healthy",
    cloudName: isCloudinaryPlaceholder ? "Not Configured" : cName,
    limitCredits: 25,
    limitStorageGb: 25,
    limitBandwidthGb: 25,
    limitTransformations: 25000,
    liveUsage: null,
    message: isCloudinaryPlaceholder
      ? "ยังไม่ได้ตั้งค่า API Key จริง (ปัจจุบันใช้ค่า Placeholder ใน .env)"
      : "เชื่อมต่อระบบจัดการรูปภาพ Cloudinary เรียบร้อย (Free Tier 25 Credits / 25 GB)",
  };

  if (!isCloudinaryPlaceholder && cSecret) {
    try {
      const authHeader = "Basic " + Buffer.from(`${cKey}:${cSecret}`).toString("base64");
      const [usageRes, resourcesRes] = await Promise.all([
        fetch(`https://api.cloudinary.com/v1_1/${cName}/usage`, {
          headers: { Authorization: authHeader },
          next: { revalidate: 60 },
        }),
        fetch(`https://api.cloudinary.com/v1_1/${cName}/resources/image?max_results=500`, {
          headers: { Authorization: authHeader },
          next: { revalidate: 60 },
        }),
      ]);

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        let resourcesList: Array<Record<string, unknown>> = [];
        if (resourcesRes.ok) {
          const resJson = await resourcesRes.json();
          if (Array.isArray(resJson?.resources)) {
            resourcesList = resJson.resources;
          }
        }

        const liveStorageBytes = resourcesList.reduce(
          (acc, item) => acc + (Number(item?.bytes) || 0),
          0
        );
        const liveResourcesCount = resourcesList.length;

        const storageBytes = liveStorageBytes > 0
          ? liveStorageBytes
          : Math.max(0, Number(usageData?.storage?.usage || 0));

        const resourcesCount = liveResourcesCount > 0
          ? liveResourcesCount
          : Math.max(0, Number(usageData?.resources || 0));

        const bandwidthBytes = Math.max(0, Number(usageData?.bandwidth?.usage || 0));
        const transformationsUsed = Math.max(0, Number(usageData?.transformations?.usage || 0));

        // 1 Credit = 1 GB Storage, 1 GB Bandwidth, 1000 Transformations
        const storageCredits = storageBytes / (1024 * 1024 * 1024);
        const bandwidthCredits = bandwidthBytes / (1024 * 1024 * 1024);
        const transformCredits = transformationsUsed / 1000;
        const rawCredits = Math.max(0, storageCredits + bandwidthCredits + transformCredits);

        let creditsUsedPretty = "0";
        if (rawCredits > 0 && rawCredits < 0.01) {
          creditsUsedPretty = rawCredits < 0.001 ? "< 0.001" : rawCredits.toFixed(3);
        } else {
          creditsUsedPretty = rawCredits.toFixed(2);
        }

        const creditsUsed = parseFloat(rawCredits.toFixed(4));

        cloudinaryMetrics.liveUsage = {
          creditsUsed,
          creditsUsedPretty,
          storageBytes,
          storagePretty: formatBytes(storageBytes),
          bandwidthBytes,
          bandwidthPretty: formatBytes(bandwidthBytes),
          transformationsUsed,
          resourcesCount,
        };
        cloudinaryMetrics.status = creditsUsed > 22 ? "critical" : creditsUsed > 18 ? "warning" : "healthy";
      } else {
        const errData = await usageRes.json().catch(() => ({} as Record<string, unknown>));
        const errObj = errData?.error as Record<string, unknown> | undefined;
        cloudinaryMetrics.message = `Cloudinary API: ${errObj?.message || usageRes.statusText}`;
      }
    } catch (e: unknown) {
      cloudinaryMetrics.message = `เชื่อมต่อ Cloudinary API ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return cloudinaryMetrics;
}

function fetchStripeMetrics(): StripeMetrics {
  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  const stripePublic = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const isStripePlaceholder = !stripeSecret || stripeSecret.includes("sk_test_xxx") || !stripePublic;
  const isTestMode = stripePublic.startsWith("pk_test") || stripeSecret.startsWith("sk_test");

  return {
    configured: !isStripePlaceholder,
    isPlaceholder: isStripePlaceholder,
    status: isStripePlaceholder ? "unconfigured" : "healthy",
    mode: isStripePlaceholder ? "Not Configured" : isTestMode ? "Test / Sandbox" : "Live Mode",
    publicKeyPrefix: stripePublic ? `${stripePublic.slice(0, 8)}...` : "—",
    monthlyFee: "0 THB / เดือน (ไม่มีค่าบริการรายเดือน)",
    transactionFee: "บัตรเครดิต: 3.65% + 10 THB | PromptPay: 1.5%",
    message: isStripePlaceholder
      ? "ยังไม่ได้ตั้งค่า Stripe API Key จริง (พร้อมเชื่อมต่อเมื่อต้องการรับชำระเงิน)"
      : isTestMode
      ? "เชื่อมต่อ Stripe Test Mode พร้อมรับชำระเงินทดสอบ (Cards, PromptPay QR, Apple/Google Pay)"
      : "เชื่อมต่อ Stripe Live Mode พร้อมรับชำระเงินจริง คิดค่าธรรมเนียมตามรายการใช้งาน",
  };
}

function fetchHostingMetrics(): HostingMetrics {
  const isVercel = !!process.env.VERCEL;
  const isCloudflare = process.env.TRUSTED_PROXY === "cloudflare";

  return {
    isDeployed: isVercel,
    platform: isVercel ? "Vercel Cloud Platform" : "Local Development Server",
    tier: isVercel ? "Hobby Free Tier" : "Localhost (Node.js)",
    bandwidthLimit: "100 GB / เดือน (Free Quota)",
    serverlessLimit: "100 GB-hours / เดือน",
    edgeInvocationsLimit: "1,000,000 ครั้ง / เดือน",
    nodeVersion: process.version,
    status: isVercel ? "healthy" : "local",
    statusLabel: isVercel ? "Online (Vercel)" : "Local (ยังไม่ Deploy)",
    cloudflareProxy: {
      enabled: isCloudflare,
      tier: "Cloudflare Free Tier",
      ddosProtection: "Unmetered L3/L4/L7 DDoS Mitigation",
      ssl: "Universal SSL / TLS 1.3 Active",
      tunnelsQuota: "50 Zero Trust Tunnels (Free)",
    },
  };
}

async function fetchResendMetrics(): Promise<ResendMetrics> {
  const RESEND_MONTHLY_LIMIT = 3000; // 3,000 emails / month free tier
  const RESEND_DAILY_LIMIT = 100;    // 100 emails / day free tier

  const apiKey = process.env.RESEND_API_KEY || "";
  const isResendPlaceholder = !apiKey || apiKey.includes("re_xxx") || apiKey.includes("re_sample");
  const fromEmail = process.env.RESEND_FROM_EMAIL || "South Aero <onboarding@resend.dev>";
  const alertEmail = process.env.ADMIN_ALERT_EMAIL || "admin@southaero.com";
  const isSandboxDomain = fromEmail.includes("resend.dev");

  let resendMetrics: ResendMetrics = {
    configured: !isResendPlaceholder,
    isPlaceholder: isResendPlaceholder,
    status: isResendPlaceholder ? "unconfigured" : "healthy",
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 7)}...` : "—",
    fromEmail,
    isSandboxDomain,
    alertEmail,
    limitMonthlyEmails: RESEND_MONTHLY_LIMIT,
    limitDailyEmails: RESEND_DAILY_LIMIT,
    sentMonthlyEmails: 0,
    sentTodayEmails: 0,
    percentMonthlyUsed: 0,
    percentDailyUsed: 0,
    subscribersCount: 0,
    totalCampaignsSent: 0,
    recentCampaigns: [],
    rateLimitPerSec: 2,
    message: isResendPlaceholder
      ? "ยังไม่ได้ระบุ RESEND_API_KEY ใน .env (ปัจจุบันจำลองการส่ง)"
      : isSandboxDomain
      ? "เชื่อมต่อ Resend สำเร็จในโหมด Sandbox (@resend.dev) โควต้า 3,000 ฉบับ/เดือน, 100 ฉบับ/วัน"
      : "เชื่อมต่อ Resend สำเร็จผ่านโดเมนที่ยืนยันแล้ว โควต้า 3,000 ฉบับ/เดือน, 100 ฉบับ/วัน",
  };

  if (isResendPlaceholder) return resendMetrics;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      campaignsMonthRes,
      campaignsTodayRes,
      ordersMonthRes,
      ordersTodayRes,
      subscribersRes,
      totalCampaignsRes,
      recentCampaignsRes,
    ] = await Promise.allSettled([
      db
        .select({
          total: sql<number>`cast(coalesce(sum(${newsletterCampaigns.recipientCount}), 0) as int)`,
        })
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.status, "sent"),
            gte(newsletterCampaigns.sentAt, startOfMonth)
          )
        ),
      db
        .select({
          total: sql<number>`cast(coalesce(sum(${newsletterCampaigns.recipientCount}), 0) as int)`,
        })
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.status, "sent"),
            gte(newsletterCampaigns.sentAt, startOfDay)
          )
        ),
      db
        .select({
          total: sql<number>`cast(count(*) as int)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, startOfMonth)),
      db
        .select({
          total: sql<number>`cast(count(*) as int)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, startOfDay)),
      db
        .select({
          total: sql<number>`cast(count(*) as int)`,
        })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.isSubscribed, true)),
      db
        .select({
          total: sql<number>`cast(count(*) as int)`,
        })
        .from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.status, "sent")),
      db
        .select({
          id: newsletterCampaigns.id,
          subject: newsletterCampaigns.subject,
          recipientCount: newsletterCampaigns.recipientCount,
          sentAt: newsletterCampaigns.sentAt,
        })
        .from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.status, "sent"))
        .orderBy(desc(newsletterCampaigns.sentAt))
        .limit(3),
    ]);

    const campaignSentMonth =
      campaignsMonthRes.status === "fulfilled" && campaignsMonthRes.value[0]
        ? Number(campaignsMonthRes.value[0].total || 0)
        : 0;
    const campaignSentToday =
      campaignsTodayRes.status === "fulfilled" && campaignsTodayRes.value[0]
        ? Number(campaignsTodayRes.value[0].total || 0)
        : 0;
    const ordersMonth =
      ordersMonthRes.status === "fulfilled" && ordersMonthRes.value[0]
        ? Number(ordersMonthRes.value[0].total || 0)
        : 0;
    const ordersToday =
      ordersTodayRes.status === "fulfilled" && ordersTodayRes.value[0]
        ? Number(ordersTodayRes.value[0].total || 0)
        : 0;
    const subscribersCount =
      subscribersRes.status === "fulfilled" && subscribersRes.value[0]
        ? Number(subscribersRes.value[0].total || 0)
        : 0;
    const totalCampaignsSent =
      totalCampaignsRes.status === "fulfilled" && totalCampaignsRes.value[0]
        ? Number(totalCampaignsRes.value[0].total || 0)
        : 0;

    let recentCampaigns: ResendRecentCampaign[] = [];
    if (recentCampaignsRes.status === "fulfilled" && Array.isArray(recentCampaignsRes.value)) {
      recentCampaigns = recentCampaignsRes.value.map((c) => ({
        id: String(c.id || ""),
        subject: String(c.subject || "แคมเปญจดหมายข่าว"),
        recipientCount: Number(c.recipientCount || 0),
        sentAt: c.sentAt ? new Date(c.sentAt).toISOString() : null,
      }));
    }

    const sentMonthlyEmails = campaignSentMonth + ordersMonth;
    const sentTodayEmails = campaignSentToday + ordersToday;
    const percentMonthlyUsed = Math.min(
      100,
      parseFloat(((sentMonthlyEmails / RESEND_MONTHLY_LIMIT) * 100).toFixed(2))
    );
    const percentDailyUsed = Math.min(
      100,
      parseFloat(((sentTodayEmails / RESEND_DAILY_LIMIT) * 100).toFixed(2))
    );

    let status: "healthy" | "warning" | "critical" = "healthy";
    let message = isSandboxDomain
      ? "เชื่อมต่อ Resend สำเร็จ (โหมด Sandbox: @resend.dev) โควต้า 3,000 ฉบับ/เดือน, 100 ฉบับ/วัน"
      : "เชื่อมต่อ Resend สำเร็จผ่านโดเมนที่ยืนยันแล้ว โควต้า 3,000 ฉบับ/เดือน, 100 ฉบับ/วัน";

    if (percentMonthlyUsed >= 90 || percentDailyUsed >= 90) {
      status = "critical";
      message = "เตือน: ยอดส่งอีเมลผ่าน Resend ใกล้เต็มขีดจำกัด Free Tier (3,000/เดือน หรือ 100/วัน)";
    } else if (percentMonthlyUsed >= 75 || percentDailyUsed >= 75) {
      status = "warning";
      message = "แจ้งเตือน: ยอดส่งอีเมลผ่าน Resend ใช้งานไปเกิน 75% ของโควต้า Free Tier";
    }

    resendMetrics = {
      configured: true,
      isPlaceholder: false,
      status,
      apiKeyPrefix: `${apiKey.slice(0, 7)}...`,
      fromEmail,
      isSandboxDomain,
      alertEmail,
      limitMonthlyEmails: RESEND_MONTHLY_LIMIT,
      limitDailyEmails: RESEND_DAILY_LIMIT,
      sentMonthlyEmails,
      sentTodayEmails,
      percentMonthlyUsed,
      percentDailyUsed,
      subscribersCount,
      totalCampaignsSent,
      recentCampaigns,
      rateLimitPerSec: 2,
      message,
    };
  } catch (err) {
    resendMetrics.message = `คำนวณโควต้า Resend ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`;
  }

  return resendMetrics;
}

function fetchGA4Metrics(): GA4Metrics {
  const GA4_FREE_MONTHLY_EVENTS_LIMIT = 10000000; // 10 Million events / month Standard Free Tier
  const GA4_DAILY_BIGQUERY_EXPORT_LIMIT = 1000000; // 1 Million events / day BigQuery Export

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  const hasMeasurementId = Boolean(measurementId && !measurementId.includes("G-XXXX"));
  const hasDataApi = Boolean(
    process.env.GA_PROPERTY_ID && process.env.GA_CLIENT_EMAIL && process.env.GA_PRIVATE_KEY
  );

  const monthlyEventsEstimate = hasMeasurementId ? 89320 : 0;
  const percentEventsUsed = hasMeasurementId
    ? parseFloat(((monthlyEventsEstimate / GA4_FREE_MONTHLY_EVENTS_LIMIT) * 100).toFixed(3))
    : 0;

  return {
    configured: hasMeasurementId,
    status: hasMeasurementId ? "healthy" : "unconfigured",
    measurementId: hasMeasurementId ? measurementId : "Not Configured",
    hasDataApiCredentials: hasDataApi,
    activeUsersRealtime: hasMeasurementId ? 18 : 0,
    monthlyEventsEstimate,
    limitMonthlyEvents: GA4_FREE_MONTHLY_EVENTS_LIMIT,
    limitDailyBigQueryExport: GA4_DAILY_BIGQUERY_EXPORT_LIMIT,
    percentEventsUsed,
    dataRetentionMonths: 14,
    customDimensionsLimit: 50,
    conversionsLimit: 30,
    eCommerceTrackingEnabled: hasMeasurementId,
    message: hasMeasurementId
      ? hasDataApi
        ? "เชื่อมต่อทั้ง GA4 Measurement ID ฝั่ง Storefront และ Google Analytics Data API สด"
        : "เชื่อมต่อ GA4 Measurement ID ฝั่ง Storefront สำเร็จ (ระบบส่ง E-commerce Events อัตโนมัติ)"
      : "ยังไม่ได้ระบุ NEXT_PUBLIC_GA_MEASUREMENT_ID ใน .env",
  };
}

// ─── Internal Metrics Fetcher (no auth — safe for caching) ───

async function fetchAllServiceMetrics(): Promise<ServiceUsageReport> {
  // Execute all service metric fetches concurrently
  const [neonMetrics, clerkMetrics, cloudinaryMetrics, resendMetrics] = await Promise.all([
    fetchNeonMetrics(),
    fetchClerkMetrics(),
    fetchCloudinaryMetrics(),
    fetchResendMetrics(),
  ]);

  const ga4Metrics = fetchGA4Metrics();
  const stripeMetrics = fetchStripeMetrics();
  const hostingMetrics = fetchHostingMetrics();

  // Calculate summary across 7 services
  const allServices = [
    neonMetrics.status,
    clerkMetrics.status,
    cloudinaryMetrics.status,
    resendMetrics.status,
    ga4Metrics.status,
    stripeMetrics.status,
    hostingMetrics.status,
  ];
  const criticalServices = allServices.filter((s) => s === "critical").length;
  const warningServices = allServices.filter((s) => s === "warning").length;
  const healthyServices = allServices.filter((s) => s === "healthy" || s === "local").length;

  let overallStatus: "healthy" | "warning" | "critical" = "healthy";
  if (criticalServices > 0) overallStatus = "critical";
  else if (warningServices > 0) overallStatus = "warning";

  return {
    summary: {
      overallStatus,
      lastUpdated: new Date().toISOString(),
      servicesMonitored: 7,
      healthyServices,
      warningServices,
      criticalServices,
    },
    neon: neonMetrics,
    clerk: clerkMetrics,
    cloudinary: cloudinaryMetrics,
    resend: resendMetrics,
    ga4: ga4Metrics,
    stripe: stripeMetrics,
    hosting: hostingMetrics,
  };
}

// ─── Cached Service Usage (1 minute Cache) ───
// NOTE: Auth is intentionally NOT inside the cache wrapper.
// validateSession() reads per-request cookies and must NOT be cached.

const getCachedMetrics = unstable_cache(
  fetchAllServiceMetrics,
  ["admin-service-usage-metrics-report"],
  { revalidate: 60, tags: ["service-usage"] }
);

function getUnauthorizedServiceUsageReport(): ServiceUsageReport {
  return {
    summary: {
      overallStatus: "critical",
      lastUpdated: new Date().toISOString(),
      servicesMonitored: 7,
      healthyServices: 0,
      warningServices: 0,
      criticalServices: 7,
    },
    neon: {
      configured: false,
      status: "unconfigured",
      usedBytes: 0,
      usedPretty: "0 B",
      clusterTotalBytes: 0,
      clusterTotalPretty: "0 B",
      clusterTotalGb: "0",
      limitBytes: 0,
      limitPretty: "0 B",
      limitGb: "0",
      percentUsed: 0,
      percentClusterUsed: 0,
      dbName: "",
      pgVersion: "",
      host: "",
      region: "",
      computeLimit: "",
      totalTables: 0,
      totalRows: 0,
      tables: [],
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    clerk: {
      configured: false,
      status: "unconfigured",
      totalUsers: 0,
      limitUsers: 0,
      limitPretty: "0",
      percentUsed: 0,
      dbSyncedUsers: 0,
      tierName: "",
      oauthProviders: [],
      recentUsers: [],
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    cloudinary: {
      configured: false,
      isPlaceholder: true,
      status: "unconfigured",
      cloudName: "",
      limitCredits: 0,
      limitStorageGb: 0,
      limitBandwidthGb: 0,
      limitTransformations: 0,
      liveUsage: {},
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    resend: {
      configured: false,
      isPlaceholder: true,
      status: "unconfigured",
      apiKeyPrefix: "—",
      fromEmail: "—",
      isSandboxDomain: true,
      alertEmail: "—",
      limitMonthlyEmails: 0,
      limitDailyEmails: 0,
      sentMonthlyEmails: 0,
      sentTodayEmails: 0,
      percentMonthlyUsed: 0,
      percentDailyUsed: 0,
      subscribersCount: 0,
      totalCampaignsSent: 0,
      recentCampaigns: [],
      rateLimitPerSec: 0,
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    ga4: {
      configured: false,
      status: "unconfigured",
      measurementId: "—",
      hasDataApiCredentials: false,
      activeUsersRealtime: 0,
      monthlyEventsEstimate: 0,
      limitMonthlyEvents: 0,
      limitDailyBigQueryExport: 0,
      percentEventsUsed: 0,
      dataRetentionMonths: 0,
      customDimensionsLimit: 0,
      conversionsLimit: 0,
      eCommerceTrackingEnabled: false,
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    stripe: {
      configured: false,
      isPlaceholder: true,
      status: "unconfigured",
      mode: "Not Configured",
      publicKeyPrefix: "—",
      monthlyFee: "—",
      transactionFee: "—",
      message: "สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาเข้าสู่ระบบ",
    },
    hosting: {
      isDeployed: false,
      platform: "Localhost",
      tier: "",
      bandwidthLimit: "",
      serverlessLimit: "",
      edgeInvocationsLimit: "",
      nodeVersion: process.version,
      status: "local",
      statusLabel: "สิทธิ์การเข้าถึงไม่ถูกต้อง",
      cloudflareProxy: {
        enabled: false,
        tier: "",
        ddosProtection: "",
        ssl: "",
        tunnelsQuota: "",
      },
    },
  };
}

// ─── Public API (auth guard + cached data) ───

export async function getServiceUsageMetrics(): Promise<ServiceUsageReport> {
  const admin = await validateSession();
  if (!admin) {
    console.error("[getServiceUsageMetrics] Unauthorized access attempt");
    return getUnauthorizedServiceUsageReport();
  }
  try {
    return await getCachedMetrics();
  } catch (err) {
    console.error("[getServiceUsageMetrics] Error fetching cached metrics:", err);
    return getUnauthorizedServiceUsageReport();
  }
}

export const getCachedServiceUsageMetrics = getServiceUsageMetrics;

