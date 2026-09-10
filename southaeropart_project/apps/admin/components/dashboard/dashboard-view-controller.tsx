"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  RefreshCw,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Megaphone,
  Users,
  Package,
  Lightbulb,
  Globe,
  Calendar,
  Filter,
  CheckCircle2,
  Info,
  ArrowRight,
  Target,
  Download,
  Database,
} from "lucide-react";

import type { FullDashboardAnalytics } from "@/actions/analytics.actions";

// Deep-Dive Components
import { RevenueProfitTrendChart } from "./revenue-profit-trend-chart";
import { ProfitWaterfallChart } from "./profit-waterfall-chart";
import { ChannelBreakdownMatrix } from "./channel-breakdown-matrix";
import { CustomerFunnelAnalytics } from "./customer-funnel-analytics";
import { ProductsMerchandisingAnalytics } from "./products-merchandising-analytics";
import { GrowthSimulatorActionPlan } from "./growth-simulator-action-plan";
import { RootCauseDiagnostic } from "./root-cause-diagnostic";
import { StrategicMatrix } from "./strategic-matrix";
import { RealtimeSyncWidget } from "@/components/ui/realtime-sync-widget";

type DeepDiveTab = "sales" | "marketing" | "funnel" | "products" | "strategy";

interface DashboardViewControllerProps {
  initialData?: FullDashboardAnalytics;
}

export function DashboardViewController({ initialData }: DashboardViewControllerProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Filters
  const [selectedTimeframe, setSelectedTimeframe] = useState("month");
  const [selectedMarket, setSelectedMarket] = useState("all");

  // Active Deep-Dive Tab
  const [activeTab, setActiveTab] = useState<DeepDiveTab>("sales");

  // Tab 1 Sub-view: Waterfall vs Trend
  const [salesChartView, setSalesChartView] = useState<"trend" | "waterfall">("trend");

  // Tab 5 Sub-view: Simulator vs Diagnostics vs SWOT
  const [strategyView, setStrategyView] = useState<"simulator" | "diagnostic" | "swot">("simulator");

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Extract metrics from initialData or realistic benchmarks
  const exec = initialData?.executive;
  const isOrdersLive = initialData?.dataSource.orders === "live";
  const isProductsLive = initialData?.dataSource.products === "live";
  const isReviewsLive = initialData?.dataSource.reviews === "live";

  const totalRevenueFormatted = exec?.revenue.formatted ?? "฿1,280,000";
  const revenueGrowth = exec?.revenue.growthYoY ?? 12.6;
  const targetPct = exec?.revenue.targetPercent ?? 106.6;

  const netProfitFormatted = exec?.netProfit.formatted ?? "฿198,000";
  const netMarginPercent = exec?.netProfit.marginPercent ?? 15.5;
  const profitGrowth = exec?.netProfit.growthYoY ?? 18.4;

  const totalOrdersFormatted = (exec?.orders.total ?? 4320).toLocaleString();
  const ordersGrowth = exec?.orders.growthYoY ?? 8.2;
  const avgOrdersPerDay = exec?.orders.avgPerDay ?? 144;

  const aovFormatted = exec?.aov.formatted ?? "฿296";
  const aovNum = exec?.aov.value ?? 296;

  const cvrPercent = (exec?.cvr.percent ?? 3.80).toFixed(2);
  const totalVisitsFormatted = (exec?.cvr.totalVisits ?? 113684).toLocaleString();

  const blendedRoas = exec?.roas.blended ?? 4.6;
  const blendedCac = exec?.cac.blended ?? 48;

  const repeatPercent = (exec?.repeatRate.percent ?? 27.0).toFixed(1);
  const isRepeatRisk = exec?.repeatRate.isRisk ?? true;

  // Market Distribution
  const domesticShare = initialData?.marketSplit.domestic.sharePercent ?? 80;
  const domesticRev = (initialData?.marketSplit.domestic.revenue ?? 1024000).toLocaleString();
  const domesticOrders = (initialData?.marketSplit.domestic.orders ?? 3456).toLocaleString();

  const intlShare = initialData?.marketSplit.international.sharePercent ?? 20;
  const intlRev = (initialData?.marketSplit.international.revenue ?? 256000).toLocaleString();
  const intlOrders = (initialData?.marketSplit.international.orders ?? 864).toLocaleString();

  // 8 Core Marketing & Business KPIs
  const coreKpis = [
    {
      id: "revenue",
      title: "รายได้รวม (Total Revenue)",
      value: totalRevenueFormatted,
      change: `+${revenueGrowth}% YoY`,
      isPositive: true,
      subtext: `เป้าหมาย: ฿1.20M (${targetPct}%)`,
      status: "good",
      icon: DollarSign,
      color: "text-emerald-400",
      tooltip: "รายได้รวมสุทธิจากคำสั่งซื้อทางเว็บไซต์ทั้งหมด ทั้งในประเทศและต่างประเทศ",
    },
    {
      id: "net_profit",
      title: "กำไรสุทธิ (Net Profit)",
      value: netProfitFormatted,
      change: `+${profitGrowth}% YoY`,
      isPositive: true,
      subtext: `Net Margin ${netMarginPercent}%`,
      status: "good",
      icon: TrendingUp,
      color: "text-emerald-400",
      tooltip: "ผลลัพธ์สุทธิหลังหักต้นทุนสินค้า COGS (62%), ค่าโฆษณา (8.6%), ค่าขนส่ง (9.0%) และ OpEx (4.9%)",
    },
    {
      id: "orders",
      title: "คำสั่งซื้อ (Total Orders)",
      value: totalOrdersFormatted,
      change: `+${ordersGrowth}% YoY`,
      isPositive: true,
      subtext: `เฉลี่ย ${avgOrdersPerDay} ออเดอร์/วัน`,
      status: "good",
      icon: ShoppingCart,
      color: "text-blue-400",
      tooltip: "คำสั่งซื้อที่ชำระเงินสำเร็จผ่านระบบ Stripe (PromptPay, Credit/Debit, Wallet)",
    },
    {
      id: "aov",
      title: "ยอดซื้อเฉลี่ย (AOV)",
      value: aovFormatted,
      change: "+3.6% MoM",
      isPositive: true,
      subtext: aovNum >= 350 ? "บรรลุเป้าหมาย ฿350" : "เป้าหมาย ฿350 (⚠️ คอขวดสำคัญ)",
      status: aovNum >= 350 ? "good" : "warning",
      icon: Target,
      color: "text-amber-400",
      tooltip: "Average Order Value ยอดซื้อต่อออเดอร์ แนะนำผลักดันด้วย Bundle Deals",
    },
    {
      id: "cvr",
      title: "อัตราสั่งซื้อ (Conversion Rate)",
      value: `${cvrPercent}%`,
      change: "-0.2% MoM",
      isPositive: false,
      subtext: `จาก ${totalVisitsFormatted} Sessions`,
      status: "neutral",
      icon: Percent,
      color: "text-indigo-400",
      tooltip: "สัดส่วนผู้เข้าชมเว็บที่ทำการสั่งซื้อสำเร็จ (Paid Orders / Total Sessions)",
    },
    {
      id: "roas",
      title: "ผลตอบแทนแอด (Blended ROAS)",
      value: `${blendedRoas}x`,
      change: "+0.8x MoM",
      isPositive: true,
      subtext: "TikTok นำโด่ง 7.2x, Google 5.1x",
      status: "good",
      icon: Flame,
      color: "text-rose-400",
      tooltip: "ผลตอบแทนต่อค่าโฆษณารวม (Total Revenue / Total Ad Spend)",
    },
    {
      id: "cac",
      title: "ต้นทุนหาลูกค้า (Blended CAC)",
      value: `฿${blendedCac}`,
      change: "-฿6 MoM",
      isPositive: true,
      subtext: "TikTok ต่ำสุด ฿38, Google ฿52",
      status: "good",
      icon: Users,
      color: "text-teal-400",
      tooltip: "Customer Acquisition Cost ค่าโฆษณาเฉลี่ยเพื่อให้ได้ลูกค้าใหม่ 1 ราย",
    },
    {
      id: "repeat_rate",
      title: "อัตราซื้อซ้ำ (Repeat Rate)",
      value: `${repeatPercent}%`,
      change: "-1.8% MoM",
      isPositive: !isRepeatRisk,
      subtext: isRepeatRisk ? "🔴 จุดเสี่ยง (เป้าหมาย 35%)" : "อยู่ในเกณฑ์ดี",
      status: isRepeatRisk ? "danger" : "good",
      icon: RefreshCw,
      color: isRepeatRisk ? "text-rose-400" : "text-emerald-400",
      tooltip: "สัดส่วนลูกค้าที่กลับมาซื้อซ้ำ ควรทำ Loyalty / Email CRM เพื่อดึงกลับสู่ 35%",
    },
  ];

  return (
    <div className="space-y-6 text-white font-sans">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER & GLOBAL FILTER BAR (WITH LIVE DB SYNC STATUS)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Status Indicator */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                ศูนย์บัญชาการธุรกิจ &amp; การตลาด (Executive Cockpit)
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-bold">
                D2C DIRECT E-COMMERCE
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Neon DB Live Sync</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
              <span>South Aero Performance •</span>
              <span className={isOrdersLive ? "text-emerald-400" : "text-gray-400"}>
                ออเดอร์: {isOrdersLive ? "ฐานข้อมูลจริง" : "ระบบจำลองรองรับ"}
              </span>
              <span>•</span>
              <span className={isProductsLive ? "text-emerald-400" : "text-gray-400"}>
                สินค้า &amp; สต็อก: {isProductsLive ? "ฐานข้อมูลจริง" : "ระบบจำลองรองรับ"}
              </span>
              <span>•</span>
              <span className={isReviewsLive ? "text-emerald-400" : "text-gray-400"}>
                รีวิวลูกค้า: {isReviewsLive ? "ฐานข้อมูลจริง" : "ระบบจำลองรองรับ"}
              </span>
            </div>
          </div>

          {/* Controls: Timeframe, Market & Realtime Live Sync */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Realtime Live Sync Controller */}
            <RealtimeSyncWidget />

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 bg-[#181818] border border-[#303030] px-3 py-1.5 rounded-xl">
              <Calendar size={13} className="text-gray-400" />
              <span className="text-gray-400">ช่วงเวลา:</span>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="month" className="bg-[#1A1A1A]">เดือนนี้ (1 - 25 ส.ค. 2569)</option>
                <option value="7d" className="bg-[#1A1A1A]">7 วันล่าสุด</option>
                <option value="30d" className="bg-[#1A1A1A]">30 วันล่าสุด</option>
                <option value="q3" className="bg-[#1A1A1A]">ไตรมาส 3 (Q3)</option>
                <option value="ytd" className="bg-[#1A1A1A]">ทั้งปี (YTD 2569)</option>
              </select>
            </div>

            {/* Market Filter */}
            <div className="flex items-center gap-1.5 bg-[#181818] border border-[#303030] px-3 py-1.5 rounded-xl">
              <Globe size={13} className="text-gray-400" />
              <span className="text-gray-400">ตลาด:</span>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#1A1A1A]">ทั้งหมด (TH + Global)</option>
                <option value="domestic" className="bg-[#1A1A1A]">🇹🇭 ในประเทศ (Domestic 80%)</option>
                <option value="international" className="bg-[#1A1A1A]">🌏 ต่างประเทศ (Global 20%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: EXECUTIVE SUMMARY (สรุป 8 ตัวชี้วัดหลัก อ่านง่ายใน 30 วิ)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              สรุปผลการดำเนินงานหลัก (Executive Summary)
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            เชื่อมโยงสดกับ Neon Database
          </span>
        </div>

        {/* 8 Core KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {coreKpis.map((kpi) => {
            return (
              <div
                key={kpi.id}
                className="bg-[#121212] border border-[#222222] hover:border-gray-600 rounded-xl p-3 flex flex-col justify-between transition-all group relative"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-medium text-gray-400 truncate">
                    {kpi.title.split(" ")[0]}
                  </span>
                  <div className="relative group/tip cursor-pointer">
                    <Info size={12} className="text-zinc-500 hover:text-white" />
                    <div className="absolute top-5 right-0 w-48 p-2 rounded-lg bg-[#222] border border-white/10 text-[10px] text-gray-300 shadow-2xl opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-50">
                      {kpi.tooltip}
                    </div>
                  </div>
                </div>

                {/* Big Metric Value */}
                <div className="my-2">
                  <span className="text-base sm:text-lg font-extrabold font-mono text-white block truncate">
                    {kpi.value}
                  </span>
                </div>

                {/* Delta & Status Subtext */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold font-mono">
                    {kpi.isPositive ? (
                      <span className="text-emerald-400 flex items-center">
                        <ArrowUpRight size={11} />
                        {kpi.change}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center">
                        <ArrowDownRight size={11} />
                        {kpi.change}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono block truncate">
                    {kpi.subtext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Executive Urgent Strip (3 Critical Callouts) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Callout 1: Critical Risk */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/30 to-[#141414] border border-rose-500/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-300">🔴 จุดเตือนภัยเร่งด่วน: Repeat Rate {repeatPercent}%</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ลูกค้าเก่าซื้อซ้ำลดลงต่อเนื่อง เสี่ยงทำให้ต้นทุนหาลูกค้าสะสม (CAC) พุ่งสูง ต้องเร่งทำ Email Loyalty
              </p>
            </div>
          </div>

          {/* Callout 2: High Growth Opportunity */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/30 to-[#141414] border border-emerald-500/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Flame size={16} />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300">🟢 โอกาสสร้างสเกล: TikTok ROAS 7.2x</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ช่องทางค่าโฆษณาคุ้มค่าที่สุด CAC เพียง ฿38 แนะนำเพิ่มงบ 30-50% พร้อมทำ Lookalike Audience
              </p>
            </div>
          </div>

          {/* Callout 3: Funnel Leak Solution */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-[#141414] border border-amber-500/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <ShoppingCart size={16} />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">🟡 ลดรูรั่วตะกร้า: Cart Drop-off 44.6%</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ลูกค้าทิ้งตะกร้าก่อนชำระเงิน แนะนำส่ง Abandoned Cart Email ภายใน 1 ชม. ดึงยอดคืน ฿85k
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: 5 CATEGORIZED DEEP-DIVE TABS (เจาะลึกไม่ตาลาย)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Tab 1: Sales & Profit */}
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "sales"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 size={15} />
              <span>1. รายได้ &amp; โครงสร้างกำไร</span>
            </button>

            {/* Tab 2: Acquisition Channels */}
            <button
              onClick={() => setActiveTab("marketing")}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "marketing"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Megaphone size={15} />
              <span>2. ช่องทางโฆษณา &amp; การตลาด</span>
            </button>

            {/* Tab 3: Customer Funnel */}
            <button
              onClick={() => setActiveTab("funnel")}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "funnel"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users size={15} />
              <span>3. Funnel &amp; พฤติกรรมลูกค้า</span>
            </button>

            {/* Tab 4: Products & Merchandising */}
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Package size={15} />
              <span>4. สินค้า &amp; แคตตาล็อกขายดี</span>
            </button>

            {/* Tab 5: Growth Simulator & Action Plan */}
            <button
              onClick={() => setActiveTab("strategy")}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "strategy"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Lightbulb size={15} />
              <span>5. วินิจฉัยคอขวด &amp; แผนกลยุทธ์</span>
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-mono hidden md:inline">
            หมวดหมู่ที่เลือก: {activeTab.toUpperCase()}
          </span>
        </div>

        {/* ─── TAB 1: SALES & PROFITABILITY ─── */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            {/* Chart View Toggle Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-[#222] p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-white">การแสดงผลทางการเงิน:</span>
                <span className="text-gray-400">
                  {salesChartView === "trend"
                    ? "แนวโน้มยอดขายและมาร์จิ้น 6 เดือน"
                    : "สะพานกำไร Waterfall (รายได้ ➔ กำไรสุทธิ)"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#1C1C1C] p-1 rounded-lg border border-white/5 text-xs">
                <button
                  onClick={() => setSalesChartView("trend")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    salesChartView === "trend"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  แนวโน้ม 6 เดือน (Trajectory)
                </button>
                <button
                  onClick={() => setSalesChartView("waterfall")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    salesChartView === "waterfall"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  สะพานกำไร (Profit Waterfall)
                </button>
              </div>
            </div>

            {/* Selected Visual Chart */}
            {salesChartView === "trend" ? (
              <RevenueProfitTrendChart />
            ) : (
              <ProfitWaterfallChart />
            )}

            {/* Market Distribution Strip: Domestic vs International */}
            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    สัดส่วนตลาด: ในประเทศ (Domestic) vs ต่างประเทศ (International)
                  </h3>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  ยอดรวม {totalRevenueFormatted} ({totalOrdersFormatted} ออเดอร์)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Domestic */}
                <div className="p-4 rounded-xl bg-[#161616] border border-blue-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-300 font-bold flex items-center gap-1.5">
                      <span>🇹🇭 ตลาดในประเทศ (Domestic)</span>
                    </span>
                    <span className="font-mono text-white font-bold">{domesticShare}% (฿{domesticRev})</span>
                  </div>
                  <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${domesticShare}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 pt-1">
                    <span>{domesticOrders} ออเดอร์</span>
                    <span>ค่าส่งเฉลี่ย ฿32/กล่อง</span>
                  </div>
                </div>

                {/* International */}
                <div className="p-4 rounded-xl bg-[#161616] border border-emerald-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <span>🌏 ตลาดต่างประเทศ (International)</span>
                    </span>
                    <span className="font-mono text-white font-bold">{intlShare}% (฿{intlRev})</span>
                  </div>
                  <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${intlShare}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 pt-1">
                    <span>{intlOrders} ออเดอร์</span>
                    <span className="text-amber-400">ค่าส่ง ฿185/กล่อง (สูง)</span>
                  </div>
                  <div className="pt-2 text-[10px] text-gray-400 border-t border-white/5">
                    🇯🇵 ญี่ปุ่น 38% • 🇲🇾 มาเลเซีย 24% • 🇸🇬 สิงคโปร์ 18% • 🇦🇺 ออสเตรเลีย 12% • อื่นๆ 8%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MARKETING & ACQUISITION CHANNELS ─── */}
        {activeTab === "marketing" && <ChannelBreakdownMatrix />}

        {/* ─── TAB 3: CUSTOMER FUNNEL & BEHAVIOR ─── */}
        {activeTab === "funnel" && (
          <CustomerFunnelAnalytics
            funnelData={initialData?.funnel}
            reviewsData={initialData?.reviews}
            cohortData={initialData?.executive.repeatRate}
          />
        )}

        {/* ─── TAB 4: PRODUCTS & MERCHANDISING ─── */}
        {activeTab === "products" && (
          <ProductsMerchandisingAnalytics
            topSkus={initialData?.products.topSkus}
            lowStockAlerts={initialData?.products.lowStockAlerts}
            catalogDemandItems={initialData?.products.catalogDemandItems}
          />
        )}

        {/* ─── TAB 5: GROWTH SIMULATOR & STRATEGY ─── */}
        {activeTab === "strategy" && (
          <div className="space-y-6">
            {/* Strategy Sub-view Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-[#222] p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-white">เครื่องมือวิเคราะห์กลยุทธ์:</span>
                <span className="text-gray-400">
                  {strategyView === "simulator"
                    ? "เครื่องมือจำลองผลลัพธ์รายได้ & กำไร (Growth Simulator)"
                    : strategyView === "diagnostic"
                    ? "การวินิจฉัยสาเหตุที่แท้จริง (Root Cause Diagnostics)"
                    : "ตารางวิเคราะห์จุดแข็ง-จุดอ่อน (SWOT Matrix)"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#1C1C1C] p-1 rounded-lg border border-white/5 text-xs">
                <button
                  onClick={() => setStrategyView("simulator")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    strategyView === "simulator"
                      ? "bg-red-600 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Growth Simulator &amp; Action Plan
                </button>
                <button
                  onClick={() => setStrategyView("diagnostic")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    strategyView === "diagnostic"
                      ? "bg-red-600 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Root Cause Diagnostics
                </button>
                <button
                  onClick={() => setStrategyView("swot")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    strategyView === "swot"
                      ? "bg-red-600 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Strategic SWOT Matrix
                </button>
              </div>
            </div>

            {/* Render Selected Strategy Component */}
            {strategyView === "simulator" && <GrowthSimulatorActionPlan />}
            {strategyView === "diagnostic" && <RootCauseDiagnostic />}
            {strategyView === "swot" && <StrategicMatrix />}
          </div>
        )}
      </div>
    </div>
  );
}
