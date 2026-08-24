"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Globe,
  Megaphone,
  Tv,
  Zap,
  TrendingDown,
} from "lucide-react";
import { ProfitWaterfallChart } from "./profit-waterfall-chart";
import { RevenueProfitTrendChart } from "./revenue-profit-trend-chart";

interface SimpleDashboardViewProps {
  onSwitchToAnalyst: () => void;
}

export function SimpleDashboardView({ onSwitchToAnalyst }: SimpleDashboardViewProps) {
  const [activeChart, setActiveChart] = useState<"waterfall" | "trend">("waterfall");

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP 4 CORE HERO CARDS (Quick Glance in 30 Seconds) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Revenue */}
        <div className="bg-[#121212] border border-[#222222] hover:border-emerald-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">รายได้รวม (Total Revenue)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-3">
            ฿1,280,000
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight size={13} /> +12.6% YoY
            </span>
            <span className="text-zinc-400 font-mono">เป้า: ฿1.20M (106%)</span>
          </div>
        </div>

        {/* 2. Net Profit */}
        <div className="bg-[#121212] border border-[#222222] hover:border-emerald-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">กำไรสุทธิ (Net Profit)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-3">
            ฿198,000
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight size={13} /> +18.4% YoY
            </span>
            <span className="text-zinc-400 font-mono">Margin 15.5%</span>
          </div>
        </div>

        {/* 3. Total Orders */}
        <div className="bg-[#121212] border border-[#222222] hover:border-blue-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">คำสั่งซื้อ (Total Orders)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShoppingCart size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-3">
            4,320 <span className="text-xs font-normal text-zinc-400 font-sans">ออเดอร์</span>
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="text-blue-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight size={13} /> +8.2% YoY
            </span>
            <span className="text-zinc-400 font-mono">AOV ฿296</span>
          </div>
        </div>

        {/* 4. Business Health Status Alert */}
        <div className="bg-gradient-to-br from-[#1E1414] to-[#121212] border border-amber-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">จุดเตือนภัยเร่งด่วน</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white mt-3">
            3 ประเด็นต้องแก้ไข
          </p>
          <div className="mt-2 text-xs text-zinc-400 line-clamp-1">
            Repeat Rate 27% • Drop-off 44.6% • ค่าส่ง INTL สูง
          </div>
        </div>
      </div>

      {/* ─── 2. QUICK MARKET & TRAFFIC STRIP (D2C Direct Storefront Context) ─── */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <Globe size={15} className="text-blue-400" />
          <span className="font-semibold text-white">ตลาดการขาย:</span>
          <span className="text-blue-300 font-mono font-bold">🇹🇭 ในประเทศ 80% (฿1.02M)</span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-mono font-bold">🌏 ต่างประเทศ 20% (฿256k)</span>
        </div>

        <div className="flex items-center gap-2 text-gray-300">
          <Megaphone size={15} className="text-rose-300" />
          <span className="font-semibold text-white">แหล่ง Traffic หลัก:</span>
          <span className="text-gray-300 font-mono">Google Ads 35%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-gray-300 font-mono">FB/IG 21%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-rose-300 font-mono font-bold">TikTok 15% (ROAS 7.2x)</span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-mono">SEO 16%</span>
        </div>
      </div>

      {/* ─── 3. MAIN SPLIT: Financial Visual Chart + Executive Action Items ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (7 cols): Main Selected Chart */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                <BarChart3 size={15} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                โครงสร้างการเงิน &amp; การเติบโต (Financial Visual)
              </h3>
            </div>

            {/* Chart Switcher */}
            <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-white/5 text-xs font-medium">
              <button
                onClick={() => setActiveChart("waterfall")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChart === "waterfall"
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                สะพานกำไร (Waterfall)
              </button>
              <button
                onClick={() => setActiveChart("trend")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChart === "trend"
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                แนวโน้ม 6 เดือน (Trend)
              </button>
            </div>
          </div>

          {/* Render Active Chart */}
          {activeChart === "waterfall" ? (
            <ProfitWaterfallChart />
          ) : (
            <RevenueProfitTrendChart />
          )}
        </div>

        {/* Right (5 cols): 3 Action Items & Direct Link to Deep Analyst Mode */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles size={16} />
                </div>
                <h3 className="text-sm font-bold text-white">
                  3 สิ่งที่ควรทำทันที (Executive Actions)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 font-mono font-bold">
                High Impact
              </span>
            </div>

            {/* Action Item 1: Bundle Upsell + Free Shipping Threshold */}
            <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1 hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  1. เพิ่ม Bundle Set &amp; Free Shipping เมื่อยอด ฿3,500+
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">+฿192k</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ดัน AOV จาก ฿296 ให้แตะ ฿350+ ด้วยชุดแต่ง Aero Pack พร้อมส่งฟรีเมื่อถึงเกณฑ์
              </p>
            </div>

            {/* Action Item 2: Reduce Checkout Drop-off */}
            <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1 hover:border-rose-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">
                  2. ลด Checkout Drop-off 44.6% ด้วย Abandoned Cart Email
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">ลดเสีย ฿85k</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ส่ง Email อัตโนมัติ 1 ชม. หลังทิ้ง Cart พร้อมแสดงสินค้า + ค่าส่งชัดเจน
              </p>
            </div>

            {/* Action Item 3: Repeat Customer Email CRM */}
            <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">
                  3. สร้าง Email CRM ดึง Repeat Rate กลับสู่ 35%
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Repeat 35%</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ยิง Automation หลังซื้อ 14 วัน มอบคูปอง 10% สำหรับชิ้นถัดไป ลดพึ่งพาค่าแอด
              </p>
            </div>

            {/* Button to Switch to Deep Analyst Mode */}
            <button
              onClick={onSwitchToAnalyst}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <Tv size={16} />
              <span>เปิดโหมด KPIs Master Cockpit (วิเคราะห์เจาะลึก 1:1)</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
