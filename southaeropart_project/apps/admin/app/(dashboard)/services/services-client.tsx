"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Database,
  Users,
  HardDrive,
  CreditCard,
  Server,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  UserCheck,
  Sparkles,
  Clock,
  Layers,
  Zap,
  Globe,
  ImageIcon,
  BarChart3,
  TrendingUp,
  Shield,
  Cpu,
  Search,
  ExternalLink,
  Info,
  Mail,
  Send,
} from "lucide-react";
import {
  getServiceUsageMetrics,
  type ServiceUsageReport,
} from "@/actions/service-usage.actions";

interface ServicesClientProps {
  initialReport: ServiceUsageReport;
}

// ─── Sub-components ───────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "bg-emerald-400"
      : status === "warning"
      ? "bg-amber-400"
      : status === "critical"
      ? "bg-red-400"
      : status === "local"
      ? "bg-blue-400"
      : "bg-gray-500";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`}
      />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const map = {
    healthy: {
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      text: "ปกติ",
    },
    local: {
      cls: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      text: "Localhost",
    },
    warning: {
      cls: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      text: "เตือน",
    },
    critical: {
      cls: "bg-red-500/10 text-red-400 border-red-500/25",
      text: "วิกฤต",
    },
    unconfigured: {
      cls: "bg-gray-700/40 text-gray-400 border-gray-600/30",
      text: "ยังไม่ตั้งค่า",
    },
  } as Record<string, { cls: string; text: string }>;

  const cfg = map[status] ?? map["unconfigured"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.68rem] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}
    >
      <StatusDot status={status} />
      {label ?? cfg.text}
    </span>
  );
}

function QuotaBar({
  percent,
  colorClass,
  animated = true,
}: {
  percent: number;
  colorClass: string;
  animated?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor =
    clamped >= 90
      ? "from-red-600 to-red-400"
      : clamped >= 75
      ? "from-amber-500 to-amber-400"
      : colorClass;

  return (
    <div className="relative w-full h-2.5 bg-[#1C1C1C] rounded-full overflow-hidden border border-[#282828]">
      {/* Track shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
      <div
        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
        style={{ width: `${Math.max(2, clamped)}%` }}
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-3 flex flex-col gap-0.5">
      <span className="text-[0.62rem] text-gray-500 uppercase tracking-widest font-medium">
        {label}
      </span>
      <span className={`text-sm font-bold ${accent ?? "text-white"} leading-tight`}>
        {value}
      </span>
      {sub && <span className="text-[0.65rem] text-gray-500 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function ServicesClient({ initialReport }: ServicesClientProps) {
  const [report, setReport] = useState<ServiceUsageReport>(initialReport);
  const [isPending, startTransition] = useTransition();
  const [showTables, setShowTables] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "db-auth" | "media-email" | "analytics-infra"
  >("all");
  const [tableSearch, setTableSearch] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(
    new Date(initialReport.summary.lastUpdated)
  );

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const updated = await getServiceUsageMetrics();
        setReport(updated);
        setLastRefreshed(new Date());
      } catch (err) {
        console.error("Failed to refresh metrics:", err);
      }
    });
  };

  const filteredTables = report.neon.tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const clerkRemainingUsers = Math.max(0, report.clerk.limitUsers - report.clerk.totalUsers);
  const neonRemainingMb = (
    Math.max(0, report.neon.limitBytes - report.neon.usedBytes) /
    (1024 * 1024)
  ).toFixed(1);

  // Summary bar across 7 services
  const totalServices = 7;
  const healthCount = report.summary.healthyServices;
  const warnCount = report.summary.warningServices;
  const criticalCount = report.summary.criticalServices;
  const unconfiguredCount = totalServices - healthCount - warnCount - criticalCount;

  return (
    <div className="space-y-7 pb-16">

      {/* ─────────── Page Header ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 shadow-inner shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                สถานะบริการ &amp; โควต้าการใช้งาน
              </h1>
              <p className="text-[0.65rem] sm:text-[0.7rem] text-gray-500 font-mono">
                Service Usage &amp; Free-Tier Quotas (7 Core Tech Stacks)
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 sm:ml-11">
            ตรวจสอบการใช้งานทรัพยากรแบบ Real-time เทียบกับขอบเขต Free Tier ของแต่ละบริการในระบบ South Aero
          </p>
        </div>

        {/* Refresh controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1A1A1A]">
          <div className="text-left sm:text-right">
            <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">
              อัปเดตล่าสุด
            </p>
            <p className="text-xs text-gray-300 font-mono flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock size={11} className="text-gray-500" />
              {lastRefreshed.toLocaleTimeString("th-TH")}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#252525] hover:border-[#353535] text-xs font-semibold text-gray-300 hover:text-white transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw
              size={13}
              className={`text-red-400 transition-transform ${isPending ? "animate-spin" : "group-hover:rotate-45"}`}
            />
            {isPending ? "กำลังดึงข้อมูล..." : "รีเฟรช"}
          </button>
        </div>
      </div>

      {/* ─────────── Overall Status Banner ─────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
          report.summary.overallStatus === "healthy"
            ? "bg-gradient-to-br from-emerald-950/25 to-[#0E1210] border-emerald-800/30"
            : report.summary.overallStatus === "warning"
            ? "bg-gradient-to-br from-amber-950/25 to-[#131008] border-amber-800/30"
            : "bg-gradient-to-br from-red-950/25 to-[#130D0D] border-red-800/30"
        }`}
      >
        {/* Decorative glow */}
        <div
          className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none ${
            report.summary.overallStatus === "healthy"
              ? "bg-emerald-400"
              : report.summary.overallStatus === "warning"
              ? "bg-amber-400"
              : "bg-red-400"
          }`}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          {/* Left: status text */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                report.summary.overallStatus === "healthy"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : report.summary.overallStatus === "warning"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "bg-red-500/15 text-red-400 border border-red-500/20"
              }`}
            >
              {report.summary.overallStatus === "healthy" ? (
                <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
              ) : report.summary.overallStatus === "warning" ? (
                <AlertTriangle size={20} className="sm:w-[22px] sm:h-[22px]" />
              ) : (
                <AlertOctagon size={20} className="sm:w-[22px] sm:h-[22px]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs sm:text-sm font-bold text-white">
                  {report.summary.overallStatus === "healthy"
                    ? "ทุกบริการทำงานปกติ (7 บริการหลัก)"
                    : report.summary.overallStatus === "warning"
                    ? "มีบางบริการใช้งานเกิน 75% ของโควต้า"
                    : "เตือน: มีบริการใกล้เต็มเพดาน Free Tier"}
                </p>
                <StatusDot status={report.summary.overallStatus} />
              </div>
              <p className="text-[0.68rem] sm:text-xs text-gray-400">
                ติดตาม {report.summary.servicesMonitored} บริการหลัก ·{" "}
                {healthCount} ปกติ · {warnCount} เตือน · {criticalCount} วิกฤต
                {unconfiguredCount > 0 && ` · ${unconfiguredCount} ยังไม่ตั้งค่า`}
              </p>
            </div>
          </div>

          {/* Right: quick badges for all services */}
          <div className="flex flex-wrap gap-2 text-[0.68rem] sm:text-[0.7rem]">
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/30 border border-white/8 backdrop-blur-sm">
              <Database size={12} className="text-teal-400" />
              <span className="text-gray-400">Neon</span>
              <span className="font-bold text-white font-mono">{report.neon.clusterTotalGb} GB</span>
              <span className="text-gray-600">/</span>
              <span className="text-gray-500 font-mono">0.5 GB</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/30 border border-white/8 backdrop-blur-sm">
              <Users size={12} className="text-blue-400" />
              <span className="text-gray-400">Clerk</span>
              <span className="font-bold text-white font-mono">{report.clerk.totalUsers.toLocaleString()}</span>
              <span className="text-gray-500 font-mono">/ 50K MAU</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/30 border border-white/8 backdrop-blur-sm">
              <ImageIcon size={12} className="text-amber-400" />
              <span className="text-gray-400">Cloudinary</span>
              <span className="font-bold text-white font-mono">
                {report.cloudinary.liveUsage?.creditsUsedPretty != null
                  ? `${report.cloudinary.liveUsage.creditsUsedPretty} / 25`
                  : report.cloudinary.liveUsage?.creditsUsed != null
                  ? `${report.cloudinary.liveUsage.creditsUsed} / 25`
                  : "25 Credits"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/30 border border-white/8 backdrop-blur-sm">
              <Mail size={12} className="text-rose-400" />
              <span className="text-gray-400">Resend</span>
              <span className="font-bold text-white font-mono">
                {report.resend.sentMonthlyEmails.toLocaleString()}
              </span>
              <span className="text-gray-600">/</span>
              <span className="text-gray-500 font-mono">3K เมล</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/30 border border-white/8 backdrop-blur-sm">
              <BarChart3 size={12} className="text-orange-400" />
              <span className="text-gray-400">GA4</span>
              <span className="font-bold text-white font-mono">
                {report.ga4.activeUsersRealtime}
              </span>
              <span className="text-gray-500 font-mono">Active (10M Limit)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────── Category Filter Tabs ─────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: "all", label: "ทั้งหมด (7 บริการ)" },
          { id: "db-auth", label: "ฐานข้อมูล & สมาชิก (Neon, Clerk)" },
          { id: "media-email", label: "สื่อ & การสื่อสาร (Cloudinary, Resend)" },
          { id: "analytics-infra", label: "การเงิน & วิเคราะห์ & โฮสติ้ง (GA4, Stripe, Vercel)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeCategory === tab.id
                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                : "bg-[#111111] text-gray-400 hover:text-white border border-[#222222] hover:border-[#333333]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────── Service Cards Grid (1 col mobile, 2 col tablet/desktop, 4 col 21:9 ultrawide) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-5 2xl:gap-6">


        {/* ── 1. NEON POSTGRESQL ── */}
        {(activeCategory === "all" || activeCategory === "db-auth") && (
        <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-teal-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-teal-500/5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:bg-teal-500/15 transition-colors">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Neon PostgreSQL</h3>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                    DB
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-500 mt-0.5">
                  Serverless Postgres · {report.neon.region.split("(")[1]?.replace(")", "") ?? report.neon.region}
                </p>
              </div>
            </div>
            <StatusBadge
              status={report.neon.status}
              label={`${report.neon.percentClusterUsed}% used`}
            />
          </div>

          {/* Storage Visual */}
          <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-1">
                  Project Storage (รวม WAL + System)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">
                    {report.neon.clusterTotalGb}
                  </span>
                  <span className="text-sm text-gray-500 font-mono">GB</span>
                  <span className="text-xs text-gray-600">/ 0.5 GB Free Tier</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-400 font-mono">
                  {neonRemainingMb} MB
                </p>
                <p className="text-[0.65rem] text-gray-600">เหลืออยู่</p>
              </div>
            </div>

            <QuotaBar
              percent={report.neon.percentClusterUsed}
              colorClass="from-teal-600 to-emerald-400"
            />

            {/* Percentage labels */}
            <div className="flex justify-between mt-1.5 text-[0.6rem] text-gray-600 font-mono">
              <span>0%</span>
              <span className={report.neon.percentClusterUsed >= 75 ? "text-amber-500" : "text-gray-600"}>75%</span>
              <span className={report.neon.percentClusterUsed >= 90 ? "text-red-500" : "text-gray-600"}>90%</span>
              <span>100%</span>
            </div>

            {/* neondb row */}
            <div className="mt-3 flex items-center justify-between bg-[#111111] border border-[#202020] rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                <code className="text-teal-300 font-mono">neondb</code>
                <span>(ข้อมูลจริงของเว็บ)</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">{report.neon.usedPretty}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">{report.neon.totalTables} tables</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCell label="Compute" value="0.25 CU" sub="Autosuspend" accent="text-teal-300" />
            <StatCell label="Tables" value={`${report.neon.totalTables}`} sub="ใน public schema" />
            <StatCell label="PG Version" value={report.neon.pgVersion.split(" ")[1] ?? report.neon.pgVersion} sub={report.neon.pgVersion.split(" ")[0]} accent="text-teal-300" />
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-[#181818] flex items-center justify-between gap-2">
            <p className="text-[0.68rem] text-gray-500 truncate flex-1">{report.neon.message}</p>
            <button
              onClick={() => setShowTables(!showTables)}
              className="flex items-center gap-1 text-[0.72rem] font-semibold text-teal-400 hover:text-teal-300 transition-colors shrink-0 cursor-pointer"
            >
              {showTables ? "ซ่อน" : "ดูตาราง"}
              {showTables ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
        )}

        {/* ── 2. CLERK AUTH ── */}
        {(activeCategory === "all" || activeCategory === "db-auth") && (
        <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-blue-500/5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                <Users size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Clerk Authentication</h3>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    Auth
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-500 mt-0.5">
                  Google OAuth · Email OTP · Monthly Active Users
                </p>
              </div>
            </div>
            <StatusBadge
              status={report.clerk.status}
              label={`${report.clerk.percentUsed}% used`}
            />
          </div>

          {/* MAU Visual */}
          <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-1">
                  Monthly Active Users (MAU)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">
                    {report.clerk.totalUsers.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-600">/ 50,000 Free Tier</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-400 font-mono">
                  {clerkRemainingUsers.toLocaleString()}
                </p>
                <p className="text-[0.65rem] text-gray-600">รองรับอีก</p>
              </div>
            </div>

            <QuotaBar
              percent={report.clerk.percentUsed}
              colorClass="from-blue-600 to-indigo-400"
            />

            <div className="flex justify-between mt-1.5 text-[0.6rem] text-gray-600 font-mono">
              <span>0</span>
              <span>12,500</span>
              <span>25,000</span>
              <span>50K</span>
            </div>

            {/* DB synced row */}
            <div className="mt-3 flex items-center justify-between bg-[#111111] border border-[#202020] rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>DB Synced Users</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-blue-300">{report.clerk.dbSyncedUsers}</span>
                <span className="text-gray-600">/ {report.clerk.totalUsers} Clerk users</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCell label="Limit" value="50K" sub="MAU / เดือน" />
            <StatCell label="Auth Methods" value="Google" sub="+ Email OTP" accent="text-blue-300" />
            <StatCell label="เหลือ" value={`${(100 - report.clerk.percentUsed).toFixed(2)}%`} sub="ของ quota" accent="text-emerald-400" />
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-[#181818] flex items-center justify-between gap-2">
            <p className="text-[0.68rem] text-gray-500 truncate flex-1">{report.clerk.message}</p>
            {report.clerk.recentUsers.length > 0 && (
              <button
                onClick={() => setShowUsers(!showUsers)}
                className="flex items-center gap-1 text-[0.72rem] font-semibold text-blue-400 hover:text-blue-300 transition-colors shrink-0 cursor-pointer"
              >
                {showUsers ? "ซ่อนรายชื่อ" : "ดูล่าสุด"}
                {showUsers ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>
        )}

        {/* ── 3. CLOUDINARY ── */}
        {(activeCategory === "all" || activeCategory === "media-email") && (
        <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-amber-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-amber-500/5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500/15 transition-colors">
                <ImageIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Cloudinary Media</h3>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    CDN
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-500 mt-0.5">
                  Product Images · WebP · CDN Delivery
                </p>
              </div>
            </div>
            <StatusBadge status={report.cloudinary.status} />
          </div>

          {/* Credit usage OR placeholder info */}
          {report.cloudinary.liveUsage ? (
            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-1">
                    Monthly Credits Used
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {report.cloudinary.liveUsage.creditsUsedPretty || report.cloudinary.liveUsage.creditsUsed || "0"}
                    </span>
                    <span className="text-xs text-gray-600">/ 25 Credits</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-400">
                    {report.cloudinary.liveUsage.resourcesCount ?? "—"} files
                  </p>
                  <p className="text-[0.65rem] text-gray-600">ไฟล์ทั้งหมด</p>
                </div>
              </div>
              <QuotaBar
                percent={((report.cloudinary.liveUsage.creditsUsed ?? 0) / 25) * 100}
                colorClass="from-amber-500 to-yellow-400"
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-[#111111] border border-[#202020] rounded-lg px-3 py-2 text-xs">
                  <p className="text-[0.6rem] text-gray-600 uppercase tracking-wider">Storage</p>
                  <p className="font-mono font-bold text-white mt-0.5">
                    {report.cloudinary.liveUsage.storagePretty ?? "—"}
                  </p>
                </div>
                <div className="bg-[#111111] border border-[#202020] rounded-lg px-3 py-2 text-xs">
                  <p className="text-[0.6rem] text-gray-600 uppercase tracking-wider">Bandwidth</p>
                  <p className="font-mono font-bold text-white mt-0.5">
                    {report.cloudinary.liveUsage.bandwidthPretty ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-2">
                Free Tier Monthly Quota (25 Credits)
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center bg-[#101010] rounded-lg p-2.5 border border-[#1E1E1E]">
                  <p className="text-[0.6rem] text-gray-600 mb-1">Storage</p>
                  <p className="font-bold text-amber-300">25 GB</p>
                </div>
                <div className="text-center bg-[#101010] rounded-lg p-2.5 border border-[#1E1E1E]">
                  <p className="text-[0.6rem] text-gray-600 mb-1">Bandwidth</p>
                  <p className="font-bold text-amber-300">25 GB</p>
                </div>
                <div className="text-center bg-[#101010] rounded-lg p-2.5 border border-[#1E1E1E]">
                  <p className="text-[0.6rem] text-gray-600 mb-1">Transforms</p>
                  <p className="font-bold text-amber-300">25K</p>
                </div>
              </div>
              {report.cloudinary.isPlaceholder && (
                <div className="mt-3 flex items-start gap-2 text-[0.68rem] text-gray-500 bg-[#0D0D0D] rounded-lg p-2.5 border border-[#1A1A1A]">
                  <Info size={12} className="text-amber-500/60 mt-0.5 shrink-0" />
                  <span>API Key ยังไม่ได้ตั้งค่าจริง · ใช้ค่า placeholder ใน .env</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatCell label="Cloud Name" value={report.cloudinary.cloudName} sub="Cloudinary Account" accent="text-amber-300" />
            <StatCell label="Format" value="WebP Auto" sub="f_auto, q_auto" />
          </div>

          <div className="mt-auto pt-4 border-t border-[#181818]">
            <p className="text-[0.68rem] text-gray-500">{report.cloudinary.message}</p>
          </div>
        </div>
        )}

        {/* ── 4. RESEND EMAIL PLATFORM ── */}
        {(activeCategory === "all" || activeCategory === "media-email") && (
          <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-rose-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-rose-500/5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:bg-rose-500/15 transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Resend Email</h3>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                      SMTP / API
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-gray-500 mt-0.5">
                    Transactional · Alerts · Newsletter
                  </p>
                </div>
              </div>
              <StatusBadge status={report.resend.status} />
            </div>

            {/* Monthly email usage bar */}
            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-1">
                    Monthly Emails Sent
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {report.resend.sentMonthlyEmails.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600">/ 3,000 ฉบับ/ด.</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    {report.resend.percentMonthlyUsed}%
                  </span>
                  <p className="text-[0.65rem] text-gray-600">โควต้าเดือนนี้</p>
                </div>
              </div>
              <QuotaBar
                percent={report.resend.percentMonthlyUsed}
                colorClass="from-rose-500 to-pink-400"
              />

              {/* Daily sending quota */}
              <div className="mt-3.5 pt-3 border-t border-[#161616]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[0.68rem] text-gray-400 flex items-center gap-1.5">
                    <Clock size={11} className="text-gray-500" />
                    โควต้ารายวัน (Daily Limit)
                  </span>
                  <span className="font-mono text-xs font-semibold text-gray-300">
                    {report.resend.sentTodayEmails} / 100 ฉบับ ({report.resend.percentDailyUsed}%)
                  </span>
                </div>
                <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-rose-600 to-amber-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(2, report.resend.percentDailyUsed)}%` }}
                  />
                </div>
              </div>

              {/* Domain Mode */}
              <div className="mt-3 flex items-center justify-between bg-[#111111] border border-[#202020] rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      report.resend.isSandboxDomain ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span>โหมดโดเมน</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[0.7rem]">
                  {report.resend.isSandboxDomain ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      Sandbox (@resend.dev)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      Verified Production Domain
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCell
                label="Audience"
                value={report.resend.subscribersCount.toLocaleString()}
                sub="Subscribers"
                accent="text-rose-300"
              />
              <StatCell
                label="แคมเปญ"
                value={String(report.resend.totalCampaignsSent)}
                sub="Sent Campaigns"
              />
              <StatCell
                label="Rate Limit"
                value={`${report.resend.rateLimitPerSec}/s`}
                sub="Requests/sec"
                accent="text-emerald-400"
              />
            </div>

            {/* Sender and destination */}
            <div className="bg-[#0B0B0B] border border-[#181818] rounded-xl p-2.5 text-[0.68rem] font-mono text-gray-400 space-y-1 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sender:</span>
                <span className="text-gray-300 truncate max-w-[180px]" title={report.resend.fromEmail}>
                  {report.resend.fromEmail}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Alert To:</span>
                <span className="text-gray-300 truncate max-w-[180px]" title={report.resend.alertEmail}>
                  {report.resend.alertEmail}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Key:</span>
                <span className="text-gray-400">{report.resend.apiKeyPrefix}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-[#181818] flex items-center justify-between gap-2">
              <p className="text-[0.68rem] text-gray-500 truncate flex-1">{report.resend.message}</p>
              {report.resend.recentCampaigns.length > 0 && (
                <button
                  onClick={() => setShowCampaigns(!showCampaigns)}
                  className="flex items-center gap-1 text-[0.72rem] font-semibold text-rose-400 hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                >
                  {showCampaigns ? "ซ่อนแคมเปญ" : "ดูแคมเปญ"}
                  {showCampaigns ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 5. GOOGLE ANALYTICS 4 ── */}
        {(activeCategory === "all" || activeCategory === "analytics-infra") && (
          <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-orange-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-orange-500/5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:bg-orange-500/15 transition-colors">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Google Analytics 4</h3>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                      GA4
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-gray-500 mt-0.5">
                    Storefront · E-Commerce Tracking · Realtime
                  </p>
                </div>
              </div>
              <StatusBadge status={report.ga4.status} />
            </div>

            {/* Realtime Active Users + Measurement ID */}
            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusDot status="healthy" />
                  <span className="text-xs font-semibold text-white font-mono">
                    {report.ga4.activeUsersRealtime} Active Users
                  </span>
                  <span className="text-[0.62rem] text-gray-500">(Realtime 30 นาที)</span>
                </div>
                <span className="text-[0.68rem] font-mono px-2 py-0.5 rounded bg-[#151515] text-orange-300 border border-[#252525]">
                  {report.ga4.measurementId}
                </span>
              </div>

              {/* Monthly events quota */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[0.65rem] text-gray-500 uppercase tracking-widest mb-1">
                    Monthly Events Quota
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {report.ga4.monthlyEventsEstimate.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600">/ 10,000,000 Events</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-orange-400 font-mono">
                    {report.ga4.percentEventsUsed}%
                  </span>
                  <p className="text-[0.65rem] text-gray-600">ของเพดาน Free Tier</p>
                </div>
              </div>
              <QuotaBar
                percent={report.ga4.percentEventsUsed}
                colorClass="from-orange-500 to-amber-400"
              />

              {/* Free Tier parameters */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-[#111111] border border-[#202020] rounded-lg px-3 py-2">
                  <p className="text-[0.6rem] text-gray-600 uppercase tracking-wider">BigQuery Export</p>
                  <p className="font-mono font-bold text-white mt-0.5">1M events / วัน</p>
                </div>
                <div className="bg-[#111111] border border-[#202020] rounded-lg px-3 py-2">
                  <p className="text-[0.6rem] text-gray-600 uppercase tracking-wider">Data Retention</p>
                  <p className="font-mono font-bold text-white mt-0.5">14 เดือน</p>
                </div>
              </div>
            </div>

            {/* Key Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCell label="Dimensions" value="50" sub="Custom Free" accent="text-orange-300" />
              <StatCell label="Conversions" value="30" sub="Key Events" />
              <StatCell label="E-Commerce" value="Active" sub="view/cart/buy" accent="text-emerald-400" />
            </div>

            {/* E-commerce & Deep Link */}
            <div className="bg-[#0B0B0B] border border-[#181818] rounded-xl p-3 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-orange-400 shrink-0" />
                <span className="text-xs text-gray-300">รายงานพฤติกรรมลูกค้า &amp; Funnel</span>
              </div>
              <Link
                href="/analytics"
                className="flex items-center gap-1 text-[0.72rem] font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                <span>เปิดหน้า Analytics</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-[#181818]">
              <p className="text-[0.68rem] text-gray-500">{report.ga4.message}</p>
            </div>
          </div>
        )}

        {/* ── 6. STRIPE PAYMENTS ── */}
        {(activeCategory === "all" || activeCategory === "analytics-infra") && (
          <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-purple-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-purple-500/5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/15 transition-colors">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Stripe Payments</h3>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                      Pay-as-you-go
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-gray-500 mt-0.5">
                    Cards · PromptPay QR · Apple/Google Pay
                  </p>
                </div>
              </div>
              <StatusBadge status={report.stripe.status} />
            </div>

            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[0.62rem] text-gray-500 uppercase tracking-widest">Gateway Mode</p>
                  <p className="text-sm font-bold text-white mt-0.5">{report.stripe.mode}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                    0 THB / เดือน
                  </span>
                  <p className="text-[0.62rem] text-gray-500 mt-1">ไม่มีค่าบำรุงรักษา</p>
                </div>
              </div>

              <div className="bg-[#111111] border border-[#202020] rounded-lg p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ค่าธรรมเนียมบัตรเครดิต:</span>
                  <span className="font-mono text-purple-300 font-semibold">3.65% + 10 THB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ค่าธรรมเนียม PromptPay:</span>
                  <span className="font-mono text-emerald-300 font-semibold">1.50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Public Key:</span>
                  <span className="font-mono text-gray-500">{report.stripe.publicKeyPrefix}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCell label="ชำระเงิน" value="พร้อมใช้งาน" sub="PromptPay + Cards" accent="text-purple-300" />
              <StatCell label="Webhooks" value="เข้ารหัส" sub="HMAC SHA-256" accent="text-emerald-400" />
            </div>

            <div className="mt-auto pt-4 border-t border-[#181818]">
              <p className="text-[0.68rem] text-gray-500">{report.stripe.message}</p>
            </div>
          </div>
        )}

        {/* ── 7. VERCEL & CLOUDFLARE EDGE ── */}
        {(activeCategory === "all" || activeCategory === "analytics-infra") && (
          <div className="group bg-[#0F0F0F] border border-[#1E1E1E] hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-blue-500/5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                  <Server size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Vercel &amp; Cloudflare Edge</h3>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      Edge CDN
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-gray-500 mt-0.5">
                    {report.hosting.platform} · Node {report.hosting.nodeVersion}
                  </p>
                </div>
              </div>
              <StatusBadge
                status={report.hosting.status}
                label={report.hosting.statusLabel}
              />
            </div>

            <div className="bg-[#080808] border border-[#1A1A1A] rounded-xl p-4 mb-4">
              <p className="text-[0.62rem] text-gray-500 uppercase tracking-widest mb-2">
                Vercel Cloud Free Quotas
              </p>
              <div className="grid grid-cols-3 gap-2 text-[0.68rem]">
                <div className="bg-[#101010] rounded-lg p-2.5 text-center border border-[#1E1E1E]">
                  <p className="text-gray-500 mb-0.5">Bandwidth</p>
                  <p className="font-bold text-blue-300 font-mono">100 GB / ด.</p>
                </div>
                <div className="bg-[#101010] rounded-lg p-2.5 text-center border border-[#1E1E1E]">
                  <p className="text-gray-500 mb-0.5">Edge Req</p>
                  <p className="font-bold text-blue-300 font-mono">1,000,000</p>
                </div>
                <div className="bg-[#101010] rounded-lg p-2.5 text-center border border-[#1E1E1E]">
                  <p className="text-gray-500 mb-0.5">Serverless</p>
                  <p className="font-bold text-blue-300 font-mono">100 GB-hr</p>
                </div>
              </div>

              {/* Cloudflare Edge proxy section */}
              <div className="mt-3 bg-[#111111] border border-[#202020] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-cyan-400" />
                    <span className="text-xs font-semibold text-white">Cloudflare Edge Proxy</span>
                  </div>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold font-mono">
                    {report.hosting.cloudflareProxy?.tier || "Free Tier"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[0.65rem] text-gray-400 font-mono mt-2">
                  <div className="bg-[#0C0C0C] rounded p-2 border border-[#1C1C1C]">
                    <span className="text-gray-600 block text-[0.58rem]">DDoS Shield</span>
                    <span className="text-gray-200">L3/L4/L7 Mitigation</span>
                  </div>
                  <div className="bg-[#0C0C0C] rounded p-2 border border-[#1C1C1C]">
                    <span className="text-gray-600 block text-[0.58rem]">Zero Trust Tunnels</span>
                    <span className="text-gray-200">50 Tunnels Free</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCell label="Platform" value={report.hosting.isDeployed ? "Vercel" : "Localhost"} sub="Runtime" accent="text-blue-300" />
              <StatCell label="SSL / TLS" value="Universal" sub="Automatic HTTPS" accent="text-emerald-400" />
            </div>

            <div className="mt-auto pt-4 border-t border-[#181818]">
              <p className="text-[0.68rem] text-gray-500">
                โครงสร้างพื้นฐาน Vercel Hobby + Cloudflare Edge ฟรี 100% สำหรับการใช้งานเริ่มต้น
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────── DB Tables Breakdown ─────────── */}
      {showTables && (
        <div className="bg-[#0A0A0A] border border-[#1D1D1D] rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 border-b border-[#181818]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                <TableIcon size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Database Tables ({report.neon.tables.length})
                </h3>
                <p className="text-[0.68rem] text-gray-500 mt-0.5">
                  ขนาด Data + Index ของแต่ละตารางใน <code className="text-teal-400">neondb</code>
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อตาราง..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#111111] border border-[#222222] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 w-full transition-colors"
              />
            </div>
          </div>

          {/* Table with custom scrollbar */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-[#181818] text-[0.62rem] text-gray-600 uppercase tracking-widest bg-[#0C0C0C]">
                  <th className="py-3 px-4 sm:px-5 font-semibold">Table Name</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right">Rows</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right">Data</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right">Index</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold min-w-[8rem] sm:min-w-[9rem]">% of DB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {filteredTables.map((t) => (
                  <tr
                    key={t.name}
                    className="hover:bg-[#111111] transition-colors group/row"
                  >
                    <td className="py-3 px-4 sm:px-5 font-mono text-gray-300 group-hover/row:text-teal-400 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Layers size={12} className="text-gray-600 shrink-0" />
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-400 whitespace-nowrap">
                      {t.rowCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-500 whitespace-nowrap">
                      {t.dataPretty}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-mono text-gray-500 whitespace-nowrap">
                      {t.indexPretty}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {t.totalPretty}
                    </td>
                    <td className="py-3 px-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden max-w-[80px]">
                          <div
                            className="bg-gradient-to-r from-teal-600 to-emerald-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.max(2, t.percentOfDb)}%` }}
                          />
                        </div>
                        <span className="font-mono text-gray-500 w-9 text-right shrink-0">
                          {t.percentOfDb}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTables.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-600">
                      ไม่พบตารางที่ตรงกับ &ldquo;{tableSearch}&rdquo;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────── Recent Clerk Users ─────────── */}
      {showUsers && report.clerk.recentUsers.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#1D1D1D] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[#181818]">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <UserCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                ผู้ใช้งานล่าสุด ({report.clerk.recentUsers.length} รายการ)
              </h3>
              <p className="text-[0.68rem] text-gray-500 mt-0.5">
                ซิงค์กับตาราง <code className="text-blue-400">users</code> ในฐานข้อมูล Neon
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#141414]">
            {report.clerk.recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-[#0E0E0E] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-900/30 border border-blue-700/30 flex items-center justify-center font-bold text-blue-300 text-xs sm:text-sm shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-gray-200 truncate">{u.name}</p>
                    <p className="text-[0.65rem] sm:text-[0.68rem] text-gray-500 font-mono truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-[0.65rem] sm:text-[0.68rem] ml-11 sm:ml-0 shrink-0">
                  <div className="text-gray-500">
                    <span className="text-gray-600">สมัครเมื่อ </span>
                    {new Date(u.createdAt).toLocaleDateString("th-TH")}
                  </div>
                  {u.lastSignInAt && (
                    <div className="text-emerald-500">
                      <span className="text-gray-600">เข้าใช้ล่าสุด </span>
                      {new Date(u.lastSignInAt).toLocaleDateString("th-TH")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────── Recent Email Campaigns Breakdown ─────────── */}
      {showCampaigns && report.resend.recentCampaigns.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#1D1D1D] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[#181818]">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                แคมเปญอีเมลล่าสุด ({report.resend.recentCampaigns.length} รายการ)
              </h3>
              <p className="text-[0.68rem] text-gray-500 mt-0.5">
                ประวัติการส่งจดหมายข่าวและการใช้อีเมลเทียบกับโควต้า 3,000 ฉบับ/เดือน
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#141414]">
            {report.resend.recentCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-[#0E0E0E] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-900/30 border border-rose-700/30 flex items-center justify-center font-bold text-rose-300 text-xs shrink-0">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-gray-200 truncate">{c.subject}</p>
                    <p className="text-[0.65rem] sm:text-[0.68rem] text-gray-500 font-mono">
                      ผู้รับ: {c.recipientCount.toLocaleString()} ฉบับ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-[0.65rem] sm:text-[0.68rem] ml-11 sm:ml-0 shrink-0">
                  {c.sentAt && (
                    <div className="text-gray-400 font-mono">
                      <span className="text-gray-600">ส่งเมื่อ </span>
                      {new Date(c.sentAt).toLocaleString("th-TH")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────── Pro Tips ─────────── */}
      <div className="bg-[#0A0A0A] border border-[#1D1D1D] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            คำแนะนำการบริหารจัดการ Free Tier ทั้ง 7 บริการ
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-teal-500/20 transition-colors">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs mb-3">
              <Database size={14} />
              <span>Neon Database (512 MB)</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              ตาราง <code className="text-teal-400 text-[0.68rem]">admin_audit_logs</code> และ{" "}
              <code className="text-teal-400 text-[0.68rem]">admin_sessions</code> จะเติบโตตามการใช้งาน
              ตั้ง Auto-Clean ลบ Log เก่ากว่า 90 วันเพื่อประหยัดพื้นที่จัดเก็บ
            </p>
          </div>

          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-blue-500/20 transition-colors">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-3">
              <Users size={14} />
              <span>Clerk Auth (50,000 MAU)</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              Clerk คิดโควต้าเฉพาะผู้ใช้ที่ Sign-in ในเดือนนั้น (Active Users)
              หากมีผู้ใช้สะสมเกิน 50K แต่ Active ไม่เกิน — ยังคงฟรี 100% ไม่มีค่าบริการแอบแฝง
            </p>
          </div>

          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-amber-500/20 transition-colors">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-3">
              <ImageIcon size={14} />
              <span>Cloudinary (25 Credits)</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              ใช้{" "}
              <code className="text-amber-400 text-[0.68rem]">f_auto, q_auto</code>{" "}
              แปลงภาพเป็น WebP อัตโนมัติ ลดขนาดไฟล์ลงได้ 60-80%
              ประหยัดทั้ง Storage และ Net Bandwidth
            </p>
          </div>

          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-rose-500/20 transition-colors">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs mb-3">
              <Mail size={14} />
              <span>Resend Email (3,000 / ด. &amp; 100 / วัน)</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              จำกัดการส่งอีเมลไม่เกิน 100 ฉบับ/วัน หากจัดแคมเปญ Newsletter ขนาดใหญ่
              ควรแบ่ง Batch ส่งทีละกลุ่ม หรืออัปเกรดโดเมนเพื่อเพิ่มอัตราการส่ง
            </p>
          </div>

          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-orange-500/20 transition-colors">
            <div className="flex items-center gap-2 text-orange-400 font-semibold text-xs mb-3">
              <BarChart3 size={14} />
              <span>GA4 Analytics (10M Events / ด.)</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              ตั้งค่า Data Retention ในหน้า GA4 Admin เป็น 14 เดือน (ค่าเริ่มต้นคือ 2 เดือน)
              และสามารถส่งออกข้อมูลไปยัง Google BigQuery ได้ฟรีสูงสุด 1 ล้าน Events/วัน
            </p>
          </div>

          <div className="bg-[#070707] border border-[#181818] rounded-xl p-4 hover:border-purple-500/20 transition-colors">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-3">
              <CreditCard size={14} />
              <span>Stripe &amp; Vercel Edge</span>
            </div>
            <p className="text-[0.72rem] text-gray-500 leading-relaxed">
              ไม่มีค่าธรรมเนียมรักษารายเดือน (0 THB) จ่ายเฉพาะเมื่อมีการทำธุรกรรมจริง
              พร้อมระบบ Edge Caching และ Cloudflare DDoS Shield ป้องกันการโจมตีฟรี
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
