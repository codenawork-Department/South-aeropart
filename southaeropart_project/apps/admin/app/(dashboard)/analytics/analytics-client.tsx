"use client";

import { useState, useEffect, useTransition } from "react";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  ShoppingCart,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  Info,
  X,
  Copy,
  Check,
  HelpCircle,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  getGA4AnalyticsReport,
  type GA4AnalyticsReport,
} from "@/actions/ga4-analytics.actions";

interface GA4AnalyticsClientProps {
  initialReport: GA4AnalyticsReport;
}

export function GA4AnalyticsClient({ initialReport }: GA4AnalyticsClientProps) {
  const [report, setReport] = useState<GA4AnalyticsReport>(initialReport);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">(initialReport.timeRange);
  const [contentTab, setContentTab] = useState<"pages" | "products">("products");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"native" | "looker">("native");
  const [lookerUrl, setLookerUrl] = useState<string>("");
  const [lookerInput, setLookerInput] = useState<string>("");
  const [isEditingLooker, setIsEditingLooker] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("south_aero_looker_studio_url") || "";
      setLookerUrl(saved);
      setLookerInput(saved);
    }
  }, []);

  const handleSaveLookerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookerInput.trim();
    setLookerUrl(clean);
    setIsEditingLooker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("south_aero_looker_studio_url", clean);
    }
  };

  const handleClearLookerUrl = () => {
    setLookerUrl("");
    setLookerInput("");
    setIsEditingLooker(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("south_aero_looker_studio_url");
    }
  };

  const handleTimeRangeChange = (range: "7d" | "30d" | "90d") => {
    setTimeRange(range);
    startTransition(async () => {
      try {
        const nextReport = await getGA4AnalyticsReport(range);
        setReport(nextReport);
      } catch (err) {
        console.error("Failed to load GA4 analytics:", err);
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const nextReport = await getGA4AnalyticsReport(timeRange);
        setReport(nextReport);
      } catch (err) {
        console.error("Failed to refresh GA4 analytics:", err);
      }
    });
  };

  const copyEnvSnippet = () => {
    const snippet = `GA_PROPERTY_ID="123456789"\nGA_CLIENT_EMAIL="south-aero-ga4@your-project.iam.gserviceaccount.com"\nGA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`;
    navigator.clipboard.writeText(snippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-white font-medium">Google Analytics 4</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <BarChart3 className="text-[#DC2626]" size={28} />
              GA4 Analytics & Telemetry
            </h1>

            {/* Live Status Badge */}
            {report.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Data API สด (Live)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                โหมดพรีวิวเสมือนจริง (Demo Mode)
              </span>
            )}

            {/* Measurement ID Chip */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-white/5 text-gray-300 border border-white/10">
              ID: {report.measurementId}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
            สถิติผู้เข้าชมเว็บไซต์ ช่องทางการเข้าชม (Acquisition) และ E-Commerce Conversion Funnel จาก Storefront
          </p>
        </div>

        {/* Action Buttons & Time Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Tabs */}
          <div className="flex items-center bg-[#141414] border border-white/10 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => handleTimeRangeChange("7d")}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === "7d"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("30d")}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === "30d"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              30 วัน
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange("90d")}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === "90d"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              90 วัน
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            title="รีเฟรชข้อมูล"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isPending ? "animate-spin text-[#DC2626]" : ""} />
          </button>

          {/* Setup Guide Button */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 border border-white/10 transition-colors"
          >
            <HelpCircle size={14} className="text-[#DC2626]" />
            <span>วิธีเชื่อมต่อ API</span>
          </button>

          {/* Official GA4 Console Link */}
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 text-xs font-semibold text-blue-300 border border-blue-500/30 transition-all shadow-sm shadow-blue-500/10"
          >
            <span>เปิด GA4 Console</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ─── View Mode Switcher (Native Analytics vs Looker Studio Embed) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] border border-white/10 rounded-xl p-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("native")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "native"
                ? "bg-[#DC2626] text-white shadow-md shadow-[#DC2626]/20"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart3 size={15} />
            <span>1. แดชบอร์ดระบบ (Telemetry & Conversion)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("looker")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "looker"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Globe size={15} />
            <span>2. Looker Studio (GA4 Live Embed)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
              0 บาท / ไม่ต้องใช้บัตร
            </span>
          </button>
        </div>

        <div className="text-xs text-gray-400 px-2 hidden sm:block">
          {viewMode === "looker"
            ? "⚡ ดึงกราฟ GA4 สดผ่าน Google Looker Studio โดยตรง (ไม่ต้องผ่าน Google Cloud Console)"
            : "⚡ แดชบอร์ดวิเคราะห์สถิติและการซื้อขายของ South Aero"}
        </div>
      </div>

      {/* ─── Looker Studio View ───────────────────────────────────────────── */}
      {viewMode === "looker" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {lookerUrl && !isEditingLooker ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#121212] border border-white/10 rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>กำลังแสดงผลรายงานจาก:</span>
                  <code className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded font-mono max-w-xs truncate">
                    {lookerUrl}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setLookerInput(lookerUrl);
                      setIsEditingLooker(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    <Edit2 size={13} />
                    <span>เปลี่ยน URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearLookerUrl}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>ลบ</span>
                  </button>
                  <a
                    href={lookerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>เปิดเต็มจอ</span>
                  </a>
                </div>
              </div>

              {/* Iframe */}
              <div className="w-full bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative min-h-[850px]">
                <iframe
                  src={lookerUrl}
                  title="Google Analytics Looker Studio Dashboard"
                  className="w-full h-[850px] border-0"
                  allowFullScreen
                  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>
          ) : (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Globe size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    เชื่อมต่อแดชบอร์ด Google Looker Studio ฟรี (ไม่ต้องใช้บัตรเครดิต)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  หากติดปัญหาการสมัคร Google Cloud Console หรือถูกปฏิเสธบัตรเครดิต คุณสามารถใช้{" "}
                  <strong className="text-white">Google Looker Studio (เดิมคือ Google Data Studio)</strong>{" "}
                  ซึ่งเป็นบริการอย่างเป็นทางการของ Google เพื่อดึงข้อมูลสดจาก GA4 มาแสดงผลเป็นชาร์ตกราฟที่สวยงามได้{" "}
                  <span className="text-emerald-400 font-semibold">ฟรี 100% โดยไม่ต้องใช้บัตรเครดิตเลยแม้แต่บาทเดียว</span>
                </p>
              </div>

              {/* URL Input Form */}
              <form onSubmit={handleSaveLookerUrl} className="max-w-2xl space-y-3">
                <label className="block text-xs font-semibold text-gray-300">
                  วาง Looker Studio Embed URL ของคุณที่นี่:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://lookerstudio.google.com/embed/reporting/xxxx..."
                    value={lookerInput}
                    onChange={(e) => setLookerInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shrink-0 shadow-lg shadow-blue-600/20"
                  >
                    บันทึกและแสดงรายงาน
                  </button>
                  {isEditingLooker && (
                    <button
                      type="button"
                      onClick={() => setIsEditingLooker(false)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-colors shrink-0"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>

              {/* Steps to get Looker Studio Embed URL */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-400" />
                  3 ขั้นตอนง่ายๆ ในการสร้างรายงานและรับ Embed URL (ใช้เวลา 2 นาที):
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#181818] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <h4 className="text-xs font-bold text-white">เปิด Looker Studio</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      เข้าไปที่{" "}
                      <a
                        href="https://lookerstudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-white"
                      >
                        lookerstudio.google.com ↗
                      </a>{" "}
                      แล้วล็อกอินด้วยบัญชี Gmail เดียวกับที่สร้าง GA4
                    </p>
                  </div>

                  <div className="bg-[#181818] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <h4 className="text-xs font-bold text-white">สร้างรายงานจาก GA4</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      กดปุ่ม <strong>Create &gt; Report</strong> &gt; เลือก Data Source เป็น{" "}
                      <strong>Google Analytics</strong> &gt; เลือก Account และ Property ของคุณ (ID: {report.measurementId})
                    </p>
                  </div>

                  <div className="bg-[#181818] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <h4 className="text-xs font-bold text-white">คัดลอก Embed URL</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      ไปที่เมนู <strong>File (ไฟล์) &gt; Embed report (ฝังรายงาน)</strong> &gt; ติ๊กเลือก{" "}
                      <strong>Enable embedding</strong> แล้วก๊อปปี้ลิงก์ในช่อง <strong>Embed URL</strong> มาวางข้างบนนี้ได้ทันที!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Native Telemetry View ─────────────────────────────────────────── */}
      {viewMode === "native" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Mode Notification Banner (if not live) */}
          {!report.isLive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-start gap-3">
            <Info className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-amber-300">
                ระบบกำลังทำงานในโหมดตัวอย่าง (Demo Simulation Mode):
              </span>{" "}
              {report.statusMessage}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-200 border border-amber-500/40 transition-colors"
          >
            ดูขั้นตอนเปิดใช้งาน Live Data
          </button>
        </div>
      )}

      {/* ─── Realtime Active Users Strip (30 Min Snapshot) ─────────────────── */}
      <div className="bg-gradient-to-r from-[#141414] via-[#161616] to-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-4 w-4 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-md shadow-emerald-500/50" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>เรียลไทม์ (30 นาทีย้อนหลัง)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">LIVE</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {report.realtime.activeUsersLast30Min.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">ผู้ใช้งานกำลังออนไลน์บน Storefront</span>
              </div>
            </div>
          </div>

          {/* Realtime Device & Top Page */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-gray-400" />
              <span className="text-gray-400">มือถือ:</span>
              <span className="font-semibold text-white font-mono">{report.realtime.deviceBreakdown.mobile}</span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor size={15} className="text-gray-400" />
              <span className="text-gray-400">เดสก์ท็อป:</span>
              <span className="font-semibold text-white font-mono">{report.realtime.deviceBreakdown.desktop}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tablet size={15} className="text-gray-400" />
              <span className="text-gray-400">แท็บเล็ต:</span>
              <span className="font-semibold text-white font-mono">{report.realtime.deviceBreakdown.tablet}</span>
            </div>
            {report.realtime.topPages[0] && (
              <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-white/10 text-gray-400">
                <span>หน้ายอดนิยมตอนนี้:</span>
                <code className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {report.realtime.topPages[0].path} ({report.realtime.topPages[0].users} คน)
                </code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 6 Primary KPI Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Active Users */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>ผู้ใช้งาน (Active Users)</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Users size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.activeUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +{report.overview.activeUsersChange}%
            </span>
            <span className="text-gray-500">เทียบช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* 2. Sessions */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>จำนวนการเข้าชม (Sessions)</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.sessions.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +{report.overview.sessionsChange}%
            </span>
            <span className="text-gray-500">เทียบช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* 3. Page Views */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>ยอดดูหน้าเว็บ (Page Views)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Eye size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.pageViews.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +{report.overview.pageViewsChange}%
            </span>
            <span className="text-gray-500">เทียบช่วงก่อนหน้า</span>
          </div>
        </div>

        {/* 4. Avg Engagement Time */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>เวลาเฉลี่ยบนเว็บ</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.avgEngagementTimeFormatted}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +9.4%
            </span>
            <span className="text-gray-500">Engagement</span>
          </div>
        </div>

        {/* 5. Engagement Rate */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Engagement Rate</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.engagementRate}%
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +{report.overview.engagementRateChange}%
            </span>
            <span className="text-gray-500">มีส่วนร่วมสูง</span>
          </div>
        </div>

        {/* 6. E-commerce Conversion Rate */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 sm:p-5 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Conversion Rate</span>
            <div className="p-1.5 rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
              <ShoppingCart size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {report.overview.conversionRate}%
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-400 flex items-center font-semibold">
              <TrendingUp size={12} className="mr-0.5" />
              +{report.overview.conversionsChange}%
            </span>
            <span className="text-gray-500">{report.overview.conversions} คำสั่งซื้อ</span>
          </div>
        </div>
      </div>

      {/* ─── E-Commerce Funnel Section ─────────────────────────────────────── */}
      <div className="bg-[#121212] border border-white/10 rounded-xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="text-[#DC2626]" size={20} />
              GA4 E-Commerce Conversion Funnel
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              การเดินทางของผู้ใช้จากขั้นตอนค้นหาสินค้าไปจนถึงการสั่งซื้อสำเร็จ (ตามมาตรฐาน GA4 E-Commerce Events)
            </p>
          </div>
          <div className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start sm:self-auto font-mono">
            Overall Conversion: <strong className="text-white">{report.overview.conversionRate}%</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {report.funnel.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === report.funnel.length - 1;
            return (
              <div
                key={step.stepIndex}
                className="bg-[#181818] border border-white/5 rounded-xl p-4 flex flex-col justify-between relative group hover:border-[#DC2626]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">Step {step.stepIndex}</span>
                    <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-1.5 py-0.5 rounded">
                      {step.eventName}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-1">{step.stepName}</h3>
                  <div className="text-lg sm:text-xl font-bold font-mono text-white mt-2">
                    {step.count.toLocaleString()}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                    <span>คงเหลือจากหน้าแรก</span>
                    <span className="font-semibold text-white font-mono">{step.conversionRatePercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLast ? "bg-emerald-500" : "bg-[#DC2626]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, step.conversionRatePercent))}%` }}
                    />
                  </div>

                  {!isFirst && (
                    <div className="text-[10px] text-rose-400 mt-2 flex items-center justify-between">
                      <span>Drop-off</span>
                      <span className="font-mono">-{step.dropOffRatePercent}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Traffic Acquisition & Sources ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Traffic Sources Table & Visual Bars */}
        <div className="lg:col-span-2 bg-[#121212] border border-white/10 rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Globe className="text-blue-400" size={18} />
                ช่องทางทราฟฟิก (Traffic Acquisition)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                ที่มาของผู้เข้าชมเว็บไซต์ จำแนกตาม Channel Grouping ของ Google Analytics
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {report.trafficSources.map((source) => (
              <div key={source.channel} className="bg-[#181818] border border-white/5 rounded-lg p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{source.channel}</span>
                    <span className="font-mono text-gray-400">({source.sharePercent}%)</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 font-mono">
                    <span>{source.users.toLocaleString()} ผู้ใช้</span>
                    <span>{source.sessions.toLocaleString()} เซสชัน</span>
                    <span className="text-emerald-400">Conv. {source.conversionRate}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-[#DC2626] h-full rounded-full transition-all duration-500"
                    style={{ width: `${source.sharePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Device & Geographic Distribution */}
        <div className="bg-[#121212] border border-white/10 rounded-xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Smartphone className="text-purple-400" size={18} />
              อุปกรณ์ที่ใช้งาน (Device Breakdown)
            </h2>
            <p className="text-xs text-gray-400 mb-4">สัดส่วนผู้ใช้ตามประเภทอุปกรณ์</p>

            <div className="space-y-3">
              {report.devices.map((device) => {
                const Icon =
                  device.category === "mobile"
                    ? Smartphone
                    : device.category === "desktop"
                    ? Monitor
                    : Tablet;
                return (
                  <div key={device.category} className="bg-[#181818] border border-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white font-medium flex items-center gap-2">
                        <Icon size={14} className="text-gray-400" />
                        {device.label}
                      </span>
                      <span className="font-mono text-white font-bold">{device.percentage}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${device.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-400" />
                พื้นที่ที่มีการเข้าชมสูงสุด (Top Locations)
              </h3>
              <div className="space-y-2 text-xs">
                {report.locations.slice(0, 4).map((loc) => (
                  <div key={loc.city} className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-gray-300">{loc.city}</span>
                    <span className="font-mono text-gray-400">{loc.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top Content & Products Tabs ───────────────────────────────────── */}
      <div className="bg-[#121212] border border-white/10 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Package className="text-[#DC2626]" size={18} />
              ประสิทธิภาพเนื้อหาและสินค้า (Content & Catalog)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              หน้าเว็บและชิ้นส่วนแอโรพาร์ทที่มีการเข้าชมและสร้างยอดขายสูงสุดในรอบ {timeRange}
            </p>
          </div>

          <div className="flex items-center bg-[#181818] border border-white/10 rounded-lg p-1 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setContentTab("products")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                contentTab === "products"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              สินค้าเข้าชมสูงสุด ({report.topProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setContentTab("pages")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                contentTab === "pages"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              หน้าเว็บยอดนิยม ({report.topPages.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Products */}
        {contentTab === "products" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] text-gray-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ชื่อสินค้า / พาร์ท</th>
                  <th className="py-3 px-4">หมวดหมู่</th>
                  <th className="py-3 px-4 text-right">ยอดดู (Views)</th>
                  <th className="py-3 px-4 text-right">หยิบใส่ตะกร้า</th>
                  <th className="py-3 px-4 text-right">สั่งซื้อสำเร็จ</th>
                  <th className="py-3 px-4 text-right">View → Cart Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.topProducts.map((prod, idx) => (
                  <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                      <span className="w-5 text-gray-500 font-mono text-[11px]">{idx + 1}.</span>
                      <span className="line-clamp-1">{prod.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white">
                      {prod.views.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-300">
                      {prod.addToCart.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-semibold">
                      {prod.purchases.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        {prod.cartToViewRatePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Pages */}
        {contentTab === "pages" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] text-gray-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">เส้นทาง (URL Path)</th>
                  <th className="py-3 px-4">ชื่อหัวข้อหน้าเว็บ (Title)</th>
                  <th className="py-3 px-4 text-right">ยอดดู (Views)</th>
                  <th className="py-3 px-4 text-right">ผู้เข้าชม (Users)</th>
                  <th className="py-3 px-4 text-right">เวลาเฉลี่ย</th>
                  <th className="py-3 px-4 text-right">Bounce Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.topPages.map((page) => (
                  <tr key={page.path} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-white font-medium">
                      <code>{page.path}</code>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 line-clamp-1 max-w-xs">{page.title}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-white">
                      {page.views.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-400">
                      {page.users.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-300">{page.avgDurationFormatted}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                      {page.bounceRatePercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

      {/* ─── Modal: GA4 Setup Guide ────────────────────────────────────────── */}
      {isGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="bg-[#141414] border border-white/15 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">คู่มือการเชื่อมต่อ Google Analytics Data API</h3>
                  <p className="text-xs text-gray-400">เชื่อมต่อเพื่อดึงสถิติสดจาก Google Analytics เข้าสู่แอดมิน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 my-5 text-xs text-gray-300 leading-relaxed">
              {/* Credit Card Issues & Free Alternatives Notice */}
              <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-300">
                  <CreditCard size={16} />
                  <span>ติดปัญหาบัตรเครดิตตอนสมัคร Google Cloud? (วิธีแก้ & ทางเลือก 0 บาท)</span>
                </div>
                <div className="text-gray-300 space-y-1.5 ml-6">
                  <p>
                    <strong className="text-white">ทำไมบัตรเดบิตไทยถึงถูกปฏิเสธ:</strong> Google Cloud ทดลองหักเงิน $1 USD เพื่อยืนยันตัวตน หากบัตรของคุณยังไม่ได้เปิด <em>&quot;ช้อปออนไลน์ / ซื้อสินค้าต่างประเทศ&quot;</em> ในแอปธนาคาร ระบบจะปฏิเสธบัตรทันที
                  </p>
                  <p>
                    <strong className="text-white">วิธีแก้ถ้าต้องการใช้ Google Cloud:</strong> เข้าแอปธนาคาร (K PLUS, SCB EASY, Krungthai NEXT) &gt; เมนูจัดการบัตร &gt; เปิดใช้งานช้อปออนไลน์ต่างประเทศ หรือใช้บัตรเสมือน เช่น <em>TrueMoney Mastercard</em> หรือ <em>YouTrip</em>
                  </p>
                  <p>
                    <strong className="text-emerald-400 font-semibold">ทางเลือกแนะนำ 100% ฟรี ไม่ต้องใช้บัตร:</strong> สลับไปใช้แท็บ <strong>&quot;Looker Studio&quot;</strong> ด้านบน คุณสามารถสร้างรายงานดึงข้อมูลจาก GA4 มาแสดงผลได้สดๆ โดยไม่ต้องสมัคร Google Cloud Console และไม่ต้องกรอกเลขบัตรแม้แต่บาทเดียว!
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-[#181818] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>หาเลข Property ID ของ GA4</span>
                </div>
                <p className="text-gray-400 ml-7">
                  ไปที่{" "}
                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#DC2626] underline hover:text-white"
                  >
                    Google Analytics Console
                  </a>{" "}
                  &gt; เมนู <strong>Admin (รูปฟันเฟือง)</strong> &gt; <strong>Property Settings</strong> &gt; จะพบเลข{" "}
                  <strong>Property ID (เลขล้วน เช่น 123456789)</strong>
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#181818] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>สร้าง Service Account ใน Google Cloud (ถ้าสมัครผ่านแล้ว)</span>
                </div>
                <p className="text-gray-400 ml-7">
                  ไปที่ <strong>Google Cloud Console</strong> &gt; IAM &amp; Admin &gt; <strong>Service Accounts</strong> &gt; สร้างบัญชีและกดสร้างคีย์ประเภท <strong>JSON</strong> จากนั้นเปิดไฟล์ JSON เพื่อคัดลอก <code>client_email</code> และ <code>private_key</code>
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#181818] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>เพิ่มสิทธิ์ Viewer ใน GA4</span>
                </div>
                <p className="text-gray-400 ml-7">
                  กลับไปที่ GA4 Admin &gt; <strong>Property Access Management</strong> &gt; กดเพิ่มผู้ใช้ (+) &gt; ใส่อีเมลของ Service Account และเลือกบทบาทเป็น <strong>Viewer (ผู้อ่าน)</strong>
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-[#181818] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[10px]">
                      4
                    </span>
                    <span>เพิ่ม Environment Variables ในไฟล์ .env</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyEnvSnippet}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                  >
                    {copiedEnv ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedEnv ? "คัดลอกแล้ว" : "คัดลอกโค้ด"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-gray-300 overflow-x-auto">
{`# ─── GA4 Data API (Admin Live Reports) ───
GA_PROPERTY_ID="123456789"
GA_CLIENT_EMAIL="south-aero-ga4@your-project.iam.gserviceaccount.com"
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\\n"`}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                เข้าใจแล้ว / ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
