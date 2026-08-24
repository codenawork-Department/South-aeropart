"use server";

import { db, users, sql, rawSql } from "@repo/db";
import { validateSession } from "@/lib/auth";
import { unstable_cache } from "next/cache";

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

export interface OmiseMetrics {
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
  omise: OmiseMetrics;
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
      `,
      sqlClient`
        SELECT 
          COALESCE(SUM(pg_database_size(datname)), 0)::bigint AS total_cluster_bytes,
          pg_size_pretty(COALESCE(SUM(pg_database_size(datname)), 0)) AS total_cluster_pretty
        FROM pg_database;
      `,
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
      `,
    ]);

    const usedBytes = Number(dbInfo?.size_bytes || 0);
    const clusterTotalBytes = Number(clusterInfo?.total_cluster_bytes || usedBytes);
    const clusterTotalGb = (clusterTotalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const percentUsed = Math.min(100, parseFloat(((usedBytes / NEON_STORAGE_LIMIT_BYTES) * 100).toFixed(2)));
    const percentClusterUsed = Math.min(100, parseFloat(((clusterTotalBytes / NEON_STORAGE_LIMIT_BYTES) * 100).toFixed(2)));

    let totalRows = 0;
    const tables: TableUsageMetric[] = rawTables.map((t: any) => {
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
  } catch (e: any) {
    neonMetrics.message = `ไม่สามารถเชื่อมต่อฐานข้อมูล Neon ได้: ${e.message}`;
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
        recentUsers = usersData.map((u: any) => {
          const primaryEmail =
            u.email_addresses?.find((e: any) => e.id === u.primary_email_address_id)?.email_address ||
            u.email_addresses?.[0]?.email_address ||
            "—";
          const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || primaryEmail.split("@")[0] || "User";
          return {
            id: u.id,
            name,
            email: primaryEmail,
            imageUrl: u.image_url,
            createdAt: new Date(u.created_at).toISOString(),
            lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null,
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
  } catch (e: any) {
    clerkMetrics.message = `เชื่อมต่อ Clerk API ไม่สำเร็จ: ${e.message}`;
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
        let resourcesList: any[] = [];
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
        const errData = await usageRes.json().catch(() => ({}));
        cloudinaryMetrics.message = `Cloudinary API: ${errData?.error?.message || usageRes.statusText}`;
      }
    } catch (e: any) {
      cloudinaryMetrics.message = `เชื่อมต่อ Cloudinary API ไม่สำเร็จ: ${e.message}`;
    }
  }

  return cloudinaryMetrics;
}

function fetchOmiseMetrics(): OmiseMetrics {
  const omiseSecret = process.env.OMISE_SECRET_KEY || "";
  const omisePublic = process.env.OMISE_PUBLIC_KEY || "";
  const isOmisePlaceholder = !omiseSecret || omiseSecret.includes("skey_test_xxx") || !omisePublic;
  const isTestMode = omisePublic.startsWith("pkey_test") || omiseSecret.startsWith("skey_test");

  return {
    configured: !isOmisePlaceholder,
    isPlaceholder: isOmisePlaceholder,
    status: isOmisePlaceholder ? "unconfigured" : "healthy",
    mode: isOmisePlaceholder ? "Not Configured" : isTestMode ? "Test / Sandbox" : "Live Mode",
    publicKeyPrefix: omisePublic ? `${omisePublic.slice(0, 9)}...` : "—",
    monthlyFee: "0 THB / เดือน (ไม่มีค่าบริการรายเดือน)",
    transactionFee: "บัตรเครดิต: 3.65% + VAT | PromptPay: ~15 THB",
    message: isOmisePlaceholder
      ? "ยังไม่ได้ตั้งค่า Omise API Key จริง (พร้อมเชื่อมต่อเมื่อต้องการรับชำระเงิน)"
      : isTestMode
      ? "เชื่อมต่อ Omise Sandbox (โหมดทดสอบ) พร้อมรับชำระเงินทดสอบแบบไม่มีค่าใช้จ่าย"
      : "เชื่อมต่อ Omise Live พร้อมรับชำระเงินจริง คิดค่าธรรมเนียมตามรายการใช้งาน",
  };
}

function fetchHostingMetrics(): HostingMetrics {
  const isVercel = !!process.env.VERCEL;
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
  };
}

// ─── Main Aggregator ───

export async function getServiceUsageMetrics(): Promise<ServiceUsageReport> {
  const admin = await validateSession();
  if (!admin) {
    throw new Error("Unauthorized: Please log in as admin");
  }

  // Execute all service metric fetches concurrently
  const [neonMetrics, clerkMetrics, cloudinaryMetrics] = await Promise.all([
    fetchNeonMetrics(),
    fetchClerkMetrics(),
    fetchCloudinaryMetrics(),
  ]);

  const omiseMetrics = fetchOmiseMetrics();
  const hostingMetrics = fetchHostingMetrics();

  // Calculate summary
  const allServices = [neonMetrics.status, clerkMetrics.status, cloudinaryMetrics.status];
  const criticalServices = allServices.filter((s) => s === "critical").length;
  const warningServices = allServices.filter((s) => s === "warning").length;
  const healthyServices = allServices.filter((s) => s === "healthy").length;

  let overallStatus: "healthy" | "warning" | "critical" = "healthy";
  if (criticalServices > 0) overallStatus = "critical";
  else if (warningServices > 0) overallStatus = "warning";

  return {
    summary: {
      overallStatus,
      lastUpdated: new Date().toISOString(),
      servicesMonitored: 5,
      healthyServices,
      warningServices,
      criticalServices,
    },
    neon: neonMetrics,
    clerk: clerkMetrics,
    cloudinary: cloudinaryMetrics,
    omise: omiseMetrics,
    hosting: hostingMetrics,
  };
}

// ─── Cached Service Usage (1 minute Cache) ───

export const getCachedServiceUsageMetrics = unstable_cache(
  async () => getServiceUsageMetrics(),
  ["admin-service-usage-metrics-report"],
  { revalidate: 60, tags: ["service-usage"] }
);
