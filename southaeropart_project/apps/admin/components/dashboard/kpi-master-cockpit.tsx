"use client";

import React, { useState } from "react";
import {
  Info,
  TrendingUp,
  TrendingDown,
  Star,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Calendar,
  Store,
  Video,
  Globe,
  Package,
  ShieldAlert,
  Search,
  Megaphone,
  Share2,
  Link2,
  Eye,
  Layers,
  MapPin,
  DollarSign,
} from "lucide-react";

export function KpiMasterCockpit() {
  // Filter States
  const [selectedTimeframe, setSelectedTimeframe] = useState("1 - 25 ส.ค. 2569");
  const [selectedSource, setSelectedSource] = useState("ทั้งหมด");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedMarket, setSelectedMarket] = useState("ทั้งหมด");

  // 8 Top Metrics
  const topMetrics = [
    {
      title: "รายได้รวม",
      value: "1,280,000 บาท",
      delta: "+12.6% จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "รายได้รวม = จำนวนออเดอร์ x มูลค่าต่อออเดอร์ (AOV) จากเว็บไซต์ทั้ง Domestic และ International",
    },
    {
      title: "กำไรสุทธิ",
      value: "198,000 บาท",
      delta: "+18.4% จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "ผลลัพธ์สุดท้ายของธุรกิจ หลังหักต้นทุนสินค้า ค่าการตลาด ค่าจัดส่ง (ในประเทศ+ต่างประเทศ) และค่าใช้จ่ายดำเนินงาน",
    },
    {
      title: "Gross Margin",
      value: "38%",
      delta: "+2.1% จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "อัตรากำไรขั้นต้น = (รายได้ - ต้นทุนสินค้า) / รายได้",
    },
    {
      title: "จำนวนออเดอร์",
      value: "4,320",
      delta: "+8.7% จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "คำสั่งซื้อสำเร็จจากเว็บไซต์ (Domestic 3,456 + International 864)",
    },
    {
      title: "AOV",
      value: "296 บาท",
      delta: "+3.6% จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "Average Order Value ยอดซื้อเฉลี่ยต่อออเดอร์ ต่างประเทศมี AOV สูงกว่า Domestic 1.8 เท่า",
    },
    {
      title: "อัตราซื้อซ้ำ",
      value: "27%",
      delta: "-1.8% จากช่วงก่อนหน้า",
      isPositive: false,
      tooltip: "สัดส่วนลูกค้าที่กลับมาสั่งซื้อซ้ำ (ลดลงจากเดิม 34% ต้องเร่งสร้าง Loyalty Program)",
    },
    {
      title: "Conversion Rate",
      value: "3.8%",
      delta: "-0.2% จากช่วงก่อนหน้า",
      isPositive: false,
      tooltip: "อัตราการตัดสินใจซื้อจากผู้เข้าชมเว็บไซต์ทั้งหมด 113,684 Sessions",
    },
    {
      title: "ROAS",
      value: "4.6x",
      delta: "+0.8x จากช่วงก่อนหน้า",
      isPositive: true,
      tooltip: "ผลตอบแทนค่าโฆษณาเฉลี่ย (Google Ads 5.1x, Facebook Ads 3.8x, TikTok Ads 7.2x)",
    },
  ];

  // Channel Table = Traffic Sources (Website-Only Model)
  const sourceTable = [
    {
      source: "Google Ads (Search & Shopping)",
      color: "text-blue-400",
      revenue: "448,000",
      share: "35%",
      orders: "1,490",
      aov: "300",
      cvr: "4.2%",
      roas: "5.1x",
      cac: "฿52",
      repeatRate: "31%",
    },
    {
      source: "Facebook & Instagram Ads",
      color: "text-indigo-400",
      revenue: "269,000",
      share: "21%",
      orders: "920",
      aov: "292",
      cvr: "3.1%",
      roas: "3.8x",
      cac: "฿68",
      repeatRate: "24%",
    },
    {
      source: "TikTok Ads",
      color: "text-rose-400",
      revenue: "192,000",
      share: "15%",
      orders: "640",
      aov: "300",
      cvr: "5.0%",
      roas: "7.2x",
      cac: "฿38",
      repeatRate: "18%",
    },
    {
      source: "Organic SEO (Google Search)",
      color: "text-emerald-400",
      revenue: "205,000",
      share: "16%",
      orders: "720",
      aov: "285",
      cvr: "3.8%",
      roas: "—",
      cac: "฿0",
      repeatRate: "35%",
    },
    {
      source: "Direct / Referral / Social Organic",
      color: "text-amber-400",
      revenue: "166,000",
      share: "13%",
      orders: "550",
      aov: "302",
      cvr: "3.2%",
      roas: "—",
      cac: "฿0",
      repeatRate: "38%",
    },
  ];

  return (
    <div className="space-y-4 text-white font-sans">
      {/* ─── 1. TOP HEADER & FILTER BAR ─── */}
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              KPIs Tree Dashboard — South Aero Performance (D2C E-Commerce)
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-bold">
              WEBSITE-ONLY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            วิเคราะห์ธุรกิจ D2C ขายผ่านเว็บไซต์เท่านั้น • ตลาดในประเทศ &amp; ต่างประเทศ • KPI Tree ➔ Root Cause ➔ Action
          </p>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-lg">
            <Calendar size={13} className="text-gray-400" />
            <span className="text-gray-400">ช่วงเวลา:</span>
            <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none cursor-pointer">
              <option value="1 - 25 ส.ค. 2569" className="bg-[#1A1A1A]">1 - 25 ส.ค. 2569</option>
              <option value="เดือนนี้" className="bg-[#1A1A1A]">เดือนนี้ (เต็มเดือน)</option>
              <option value="ไตรมาสนี้" className="bg-[#1A1A1A]">ไตรมาสนี้ (Q3)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-lg">
            <Megaphone size={13} className="text-gray-400" />
            <span className="text-gray-400">แหล่ง Traffic:</span>
            <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none cursor-pointer">
              <option value="ทั้งหมด" className="bg-[#1A1A1A]">ทั้งหมด</option>
              <option value="Google Ads" className="bg-[#1A1A1A]">Google Ads</option>
              <option value="Facebook Ads" className="bg-[#1A1A1A]">Facebook &amp; IG Ads</option>
              <option value="TikTok Ads" className="bg-[#1A1A1A]">TikTok Ads</option>
              <option value="Organic SEO" className="bg-[#1A1A1A]">Organic SEO</option>
              <option value="Direct" className="bg-[#1A1A1A]">Direct / Referral</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-lg">
            <Package size={13} className="text-gray-400" />
            <span className="text-gray-400">สินค้า:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none cursor-pointer">
              <option value="ทั้งหมด" className="bg-[#1A1A1A]">ทั้งหมด</option>
              <option value="Front Lip" className="bg-[#1A1A1A]">สเกิร์ตหน้า / Front Lip</option>
              <option value="Side Skirt" className="bg-[#1A1A1A]">สเกิร์ตข้าง / Side Skirt</option>
              <option value="Rear Diffuser" className="bg-[#1A1A1A]">ชายล่างหลัง / Rear Diffuser</option>
              <option value="Spoiler" className="bg-[#1A1A1A]">สปอยเลอร์ / Spoiler</option>
              <option value="Bundle" className="bg-[#1A1A1A]">เซ็ตของแต่ง Bundle</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-lg">
            <Globe size={13} className="text-gray-400" />
            <span className="text-gray-400">ตลาด/Market:</span>
            <select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none cursor-pointer">
              <option value="ทั้งหมด" className="bg-[#1A1A1A]">ทั้งหมด (TH + INTL)</option>
              <option value="Domestic" className="bg-[#1A1A1A]">🇹🇭 Domestic (ในประเทศ)</option>
              <option value="International" className="bg-[#1A1A1A]">🌏 International (ต่างประเทศ)</option>
              <option value="SEA" className="bg-[#1A1A1A]">SEA (MY, SG, ID, PH)</option>
              <option value="Japan" className="bg-[#1A1A1A]">🇯🇵 Japan</option>
              <option value="Australia" className="bg-[#1A1A1A]">🇦🇺 Australia</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── 2. TOP METRICS RIBBON (8 HORIZONTAL CARDS) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {topMetrics.map((m, idx) => (
          <div key={idx} className="bg-[#141414] border border-[#242424] hover:border-gray-600 rounded-xl p-3 flex flex-col justify-between relative group transition-all">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-medium truncate">{m.title}</span>
              <div className="relative group/tip cursor-pointer">
                <Info size={12} className="text-gray-500 hover:text-white" />
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-52 p-2 rounded-lg bg-[#222222] border border-white/10 text-[10px] text-gray-300 shadow-xl opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-50">
                  {m.tooltip}
                </div>
              </div>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-white block">{m.value}</span>
            </div>
            <div className="text-[10px] font-medium font-mono">
              <span className={m.isPositive ? "text-emerald-400" : "text-rose-400"}>{m.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. MAIN COCKPIT: KPI TREE (LEFT) & 6 CHARTS (RIGHT) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ── LEFT: KPI TREE (5 cols) ── */}
        <div className="xl:col-span-5 bg-[#121212] border border-[#242424] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Layers size={15} /></span>
                <h2 className="text-sm sm:text-base font-bold text-white">KPI Tree: แตกตัวชี้วัดจากเป้าหมายสูงสุด</h2>
              </div>
              <div className="relative group/tree cursor-pointer">
                <Info size={14} className="text-gray-400 hover:text-white" />
                <div className="absolute top-5 right-0 w-64 p-2.5 rounded-lg bg-[#222222] border border-white/10 text-[11px] text-gray-300 shadow-xl opacity-0 group-hover/tree:opacity-100 pointer-events-none transition-opacity z-50">
                  KPI Tree ช่วยแตกตัวชี้วัดจากเป้าหมายกำไรสุทธิ ลงไปหาสาเหตุระดับปฏิบัติการ เพื่อแก้ปัญหาได้ตรงจุด
                </div>
              </div>
            </div>

            {/* Level 0: Ultimate Goal */}
            <div className="flex justify-center my-3">
              <div className="bg-gradient-to-b from-[#1C2A3A] to-[#121E2A] border border-blue-500/40 rounded-xl p-3 text-center w-60 shadow-md">
                <span className="text-[11px] text-blue-300 font-semibold block">กำไรสุทธิ ⓘ</span>
                <span className="text-xl font-bold font-mono text-white mt-0.5 block">198,000 บาท</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">▲ +18.4% YoY</span>
              </div>
            </div>
            <div className="w-0.5 h-3 bg-gray-700 mx-auto" />

            {/* Level 1: 5 Branches */}
            <div className="grid grid-cols-5 gap-1.5 my-2">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2 text-center">
                <span className="text-[10px] text-emerald-300 font-bold block">รายได้</span>
                <span className="text-[11px] font-mono font-bold text-white block mt-0.5">1.28M</span>
                <span className="text-[9px] font-mono text-emerald-400 block">▲ 12.6%</span>
              </div>
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-2 text-center">
                <span className="text-[10px] text-rose-300 font-bold block">ต้นทุนสินค้า</span>
                <span className="text-[11px] font-mono font-bold text-white block mt-0.5">-640k</span>
                <span className="text-[9px] font-mono text-rose-400 block">▼ -6.3%</span>
              </div>
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 text-center">
                <span className="text-[10px] text-amber-300 font-bold block">ค่าการตลาด</span>
                <span className="text-[11px] font-mono font-bold text-white block mt-0.5">-210k</span>
                <span className="text-[9px] font-mono text-amber-400 block">▼ -4.7%</span>
              </div>
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-2 text-center">
                <span className="text-[10px] text-blue-300 font-bold block">ค่าจัดส่ง</span>
                <span className="text-[11px] font-mono font-bold text-white block mt-0.5">-170k</span>
                <span className="text-[9px] font-mono text-rose-400 block">▼ -2.1%</span>
              </div>
              <div className="bg-teal-950/40 border border-teal-500/30 rounded-lg p-2 text-center">
                <span className="text-[10px] text-teal-300 font-bold block">Retention</span>
                <span className="text-[11px] font-mono font-bold text-white block mt-0.5">+228k</span>
                <span className="text-[9px] font-mono text-emerald-400 block">▲ 9.5%</span>
              </div>
            </div>

            {/* Level 2: Sub-Drivers */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              <div className="space-y-1.5">
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">ออเดอร์</span>
                  <span className="text-[10px] font-mono font-bold text-white block">4,320</span>
                  <span className="text-[8px] text-emerald-400 block">▲ 8.7%</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">AOV</span>
                  <span className="text-[10px] font-mono font-bold text-white block">฿296</span>
                  <span className="text-[8px] text-emerald-400 block">▲ 3.6%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">วัตถุดิบ</span>
                  <span className="text-[10px] font-mono font-bold text-white block">-420k</span>
                  <span className="text-[8px] text-rose-400 block">▼ -5.8%</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">บรรจุภัณฑ์</span>
                  <span className="text-[10px] font-mono font-bold text-white block">-220k</span>
                  <span className="text-[8px] text-rose-400 block">▼ -7.1%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">Google Ads</span>
                  <span className="text-[10px] font-mono font-bold text-white block">88k</span>
                  <span className="text-[8px] text-emerald-400 block">ROAS 5.1x</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">FB + TikTok</span>
                  <span className="text-[10px] font-mono font-bold text-white block">122k</span>
                  <span className="text-[8px] text-amber-400 block">ROAS 4.8x</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">ส่งในปท.</span>
                  <span className="text-[10px] font-mono font-bold text-white block">฿32/กล่อง</span>
                  <span className="text-[8px] text-emerald-400 block">▼ -2.0%</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">ส่ง INTL</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 block">฿185/กล่อง</span>
                  <span className="text-[8px] text-rose-400 block">▲ 4.2%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">ซื้อซ้ำ</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 block">27%</span>
                  <span className="text-[8px] text-rose-400 block">▼ -1.8%</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[9px] text-gray-400 block">Review</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 block">4.7/5</span>
                  <span className="text-[8px] text-emerald-400 block">▲ 0.1</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>South Aero Performance • D2C Website-Only Cockpit</span>
          </div>
        </div>

        {/* ── RIGHT: 6 DIAGNOSTIC CHARTS (7 cols) ── */}
        <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Chart 1: Weekly Revenue & Profit Trend */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">แนวโน้มรายได้และกำไร รายสัปดาห์ ⓘ</span>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-blue-400">● รายได้</span>
                <span className="text-emerald-400">● กำไร</span>
              </div>
            </div>
            <div className="h-28 w-full pt-2 flex items-end justify-between px-2 border-b border-white/5">
              {[
                { w: "W18", rev: "980K", rh: 60, ph: 35 },
                { w: "W19", rev: "1.05M", rh: 70, ph: 40 },
                { w: "W20", rev: "1.12M", rh: 80, ph: 55 },
                { w: "W21", rev: "1.28M", rh: 95, ph: 70 },
              ].map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-blue-300">{d.rev}</span>
                  <div className="flex items-end gap-1 h-20">
                    <div style={{ height: `${d.rh}%` }} className="w-2.5 bg-blue-500 rounded-t" />
                    <div style={{ height: `${d.ph}%` }} className="w-2.5 bg-emerald-400 rounded-t" />
                  </div>
                  <span className="text-[9px] font-mono text-gray-500 mt-1">{d.w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Market Split (Domestic vs International) */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">สัดส่วนยอดขาย: ในประเทศ vs ต่างประเทศ ⓘ</span>
              <span className="text-[10px] font-mono text-gray-400">รวม 1,280,000 บาท</span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="relative w-20 h-20 rounded-full border-4 border-blue-500 flex items-center justify-center shrink-0" style={{ background: "conic-gradient(#3B82F6 0% 80%, #10B981 80% 100%)" }}>
                <div className="absolute inset-1.5 rounded-full bg-[#121212] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white text-center leading-tight">1.28M<br /><span className="text-[8px] text-gray-400">บาท</span></span>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono flex-1">
                <div className="flex justify-between items-center text-gray-300">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> 🇹🇭 Domestic (ในประเทศ)</span>
                  <span className="font-bold">80% (1,024K)</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 🌏 International</span>
                  <span className="font-bold">20% (256K)</span>
                </div>
                <div className="pt-1 border-t border-white/5 text-[10px] text-gray-400">
                  <span>INTL Markets: 🇯🇵 JP 38% • 🇲🇾 MY 24% • 🇸🇬 SG 18% • 🇦🇺 AU 12% • อื่นๆ 8%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: สินค้าขายดี (Top SKUs by Revenue) */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-white block">สินค้าขายดี (จัดอันดับตามยอดขาย) ⓘ</span>
            <div className="space-y-1.5 pt-1">
              {[
                { name: "Front Lip V1 (สเกิร์ตหน้า)", sales: "480,000", pct: 37.5 },
                { name: "Side Skirt V2 (สเกิร์ตข้าง)", sales: "300,000", pct: 23.4 },
                { name: "Rear Diffuser ชายล่างหลัง", sales: "200,000", pct: 15.6 },
                { name: "Ducktail Spoiler คาร์บอน", sales: "160,000", pct: 12.5 },
                { name: "Complete Aero Pack (Bundle)", sales: "140,000", pct: 10.9 },
              ].map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[10px] text-gray-300">
                    <span className="truncate max-w-[65%]">{item.name}</span>
                    <span className="font-mono font-semibold">{item.sales} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-[#1F1F1F] rounded-full h-1.5 overflow-hidden">
                    <div style={{ width: `${item.pct * 2.5}%` }} className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 4: Website Funnel (Sessions → Cart → Checkout → Paid) */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-white block">Website Funnel: Sessions ➔ ออเดอร์สำเร็จ ⓘ</span>
            <div className="space-y-1 pt-1 text-[10px] font-mono">
              <div className="bg-[#181818] p-1.5 rounded flex items-center justify-between">
                <span className="text-gray-300">Website Sessions (ทุกแหล่ง)</span>
                <span className="font-bold text-white">113,684</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-1.5 rounded flex items-center justify-between">
                <span className="text-blue-300">Add to Cart (7.02%)</span>
                <span>7,982 <span className="text-rose-400 text-[9px]">Drop -93%</span></span>
              </div>
              <div className="bg-indigo-950/30 border border-indigo-500/20 p-1.5 rounded flex items-center justify-between">
                <span className="text-indigo-300">Initiate Checkout (3.89%)</span>
                <span>4,423 <span className="text-rose-400 text-[9px]">Drop -44.6%</span></span>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-1.5 rounded flex items-center justify-between">
                <span className="text-emerald-300 font-bold">Paid Orders (3.80% CVR)</span>
                <span className="font-bold text-emerald-400">4,320 Orders</span>
              </div>
            </div>
          </div>

          {/* Chart 5: Traffic Source Mix (Paid vs Organic) */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">แหล่งที่มา Traffic (Paid vs Organic) ⓘ</span>
              <span className="text-[10px] font-mono text-gray-400">113,684 Sessions</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono pt-1">
              <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Google Ads (Search &amp; Shopping)</span>
                <span className="font-bold">35% (39.8K)</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Facebook &amp; Instagram Ads</span>
                <span>21% (23.9K)</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> TikTok Ads</span>
                <span>15% (17.1K)</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Organic SEO</span>
                <span>16% (18.2K)</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 text-[10px]">
                <span>Direct 8% (9.1K) • Referral 5% (5.6K)</span>
                <span>14.7K</span>
              </div>
            </div>
          </div>

          {/* Chart 6: Review Score (CSAT) */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 flex flex-col items-center justify-center text-center space-y-1.5">
            <span className="text-xs font-bold text-white">คะแนนรีวิวเฉลี่ย (CSAT) ⓘ</span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1">
              4.7 <span className="text-sm font-normal text-gray-400 font-sans">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={16} fill="#F59E0B" /><Star size={16} fill="#F59E0B" /><Star size={16} fill="#F59E0B" /><Star size={16} fill="#F59E0B" /><Star size={16} fill="#F59E0B" />
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              จาก 1,248 รีวิว • <span className="text-emerald-400 font-semibold">▲ 0.1 จากช่วงก่อนหน้า</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. BOTTOM ROW: TABLE | ALERTS | RECOMMENDATIONS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Table: Traffic Source Performance */}
        <div className="lg:col-span-6 bg-[#121212] border border-[#242424] rounded-xl p-4 space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Megaphone size={14} className="text-blue-400" />
              <span>สรุป KPI ตามแหล่ง Traffic (Website-Only D2C) ⓘ</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400">Acquisition Matrix</span>
          </div>
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-white/5 text-[10px]">
                <th className="pb-1.5 font-medium">แหล่ง Traffic</th>
                <th className="pb-1.5 font-medium text-right">รายได้</th>
                <th className="pb-1.5 font-medium text-right">สัดส่วน</th>
                <th className="pb-1.5 font-medium text-right">ออเดอร์</th>
                <th className="pb-1.5 font-medium text-right">AOV</th>
                <th className="pb-1.5 font-medium text-right">CVR</th>
                <th className="pb-1.5 font-medium text-right">ROAS</th>
                <th className="pb-1.5 font-medium text-right">CAC</th>
                <th className="pb-1.5 font-medium text-right">Repeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sourceTable.map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className={`py-2 font-sans font-semibold ${r.color}`}>{r.source}</td>
                  <td className="py-2 text-right text-gray-200">{r.revenue}</td>
                  <td className="py-2 text-right text-gray-300 font-bold">{r.share}</td>
                  <td className="py-2 text-right text-gray-300">{r.orders}</td>
                  <td className="py-2 text-right text-gray-200">฿{r.aov}</td>
                  <td className="py-2 text-right text-gray-300">{r.cvr}</td>
                  <td className={`py-2 text-right font-bold ${r.roas !== "—" && parseFloat(r.roas) >= 5 ? "text-emerald-400" : "text-gray-300"}`}>{r.roas}</td>
                  <td className="py-2 text-right text-gray-300">{r.cac}</td>
                  <td className={`py-2 text-right font-bold ${parseInt(r.repeatRate) >= 35 ? "text-emerald-400" : "text-gray-300"}`}>{r.repeatRate}</td>
                </tr>
              ))}
              <tr className="font-bold text-white border-t border-white/20 bg-white/[0.02]">
                <td className="py-2 font-sans">รวม (Total)</td>
                <td className="py-2 text-right text-emerald-400">1,280,000</td>
                <td className="py-2 text-right">100%</td>
                <td className="py-2 text-right">4,320</td>
                <td className="py-2 text-right">฿296</td>
                <td className="py-2 text-right">3.8%</td>
                <td className="py-2 text-right text-emerald-400">4.6x</td>
                <td className="py-2 text-right">฿48</td>
                <td className="py-2 text-right">27%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-3 bg-[#121212] border border-rose-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /><span>Alerts / ประเด็นที่ต้องจับตา</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">3 Alerts</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 space-y-1">
              <span className="text-[11px] font-bold text-rose-300">🔴 Repeat Rate ลดลงเหลือ 27% (จากเดิม 34%)</span>
              <p className="text-[10px] text-gray-400 leading-relaxed">ลูกค้าซื้อครั้งเดียวแล้วไม่กลับมา ธุรกิจต้องพึ่งค่าแอดหาลูกค้าใหม่ตลอด CAC จะสูงขึ้นเรื่อยๆ</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 space-y-1">
              <span className="text-[11px] font-bold text-amber-300">⚠️ ค่าจัดส่งต่างประเทศ ฿185/กล่อง สูงขึ้น +4.2%</span>
              <p className="text-[10px] text-gray-400 leading-relaxed">ส่งกล่องใหญ่ไป JP, AU ค่าส่งกินกำไรเกือบ 30% ของ AOV ต่างประเทศ ต้องเจรจาเรทหรือปรับ Pricing</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#181818] border border-white/5 space-y-1">
              <span className="text-[11px] font-bold text-gray-300">📊 Checkout Drop-off สูง 44.6% (Cart ➔ Paid)</span>
              <p className="text-[10px] text-gray-400 leading-relaxed">ลูกค้าใส่ตะกร้าแต่ไม่กดชำระ อาจเกิดจากค่าส่งแพง ช่องทางชำระเงินไม่เพียงพอ หรือ UX Checkout ยุ่งยาก</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-3 bg-[#121212] border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Lightbulb size={14} /><span>Recommendations / ข้อแนะนำ</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Actions</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-start gap-1"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /><span>สร้าง Loyalty / Email CRM เพื่อดึง Repeat Rate กลับสู่ 35%</span></span>
              <p className="text-[10px] text-gray-400 pl-4">ยิง Automation หลังซื้อ 14 วัน มอบคูปอง 10% สำหรับชิ้นถัดไป</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-start gap-1"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /><span>เพิ่ม Bundle Set &amp; Free Shipping Threshold ฿3,500</span></span>
              <p className="text-[10px] text-gray-400 pl-4">ดัน AOV ขึ้น +15% โดยตั้งเงื่อนไขส่งฟรีเมื่อยอดถึงเกณฑ์</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-start gap-1"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /><span>เร่ง Scale TikTok Ads (ROAS 7.2x สูงสุด)</span></span>
              <p className="text-[10px] text-gray-400 pl-4">ช่องทาง CAC ต่ำสุด ฿38 ควรเพิ่มงบ 30-50% พร้อมทำ Lookalike</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-start gap-1"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /><span>ปรับ Pricing ตลาดต่างประเทศ (Include Shipping)</span></span>
              <p className="text-[10px] text-gray-400 pl-4">ตั้งราคา &quot;Delivered Price&quot; รวมค่าส่งแล้วสำหรับ INTL ลด Cart Abandonment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
