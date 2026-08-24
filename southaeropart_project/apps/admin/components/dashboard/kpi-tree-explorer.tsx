"use client";

import React, { useState } from "react";
import {
  GitFork,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  DollarSign,
  Package,
  Truck,
  Flame,
} from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  category: "goal" | "revenue" | "cost";
  value: string;
  formula: string;
  health: "good" | "warning" | "danger";
  statusBadge: string;
  drivers: string[];
  rootCause: string;
  action: string;
}

export function KpiTreeExplorer() {
  const [selectedNode, setSelectedNode] = useState<string>("net_profit");
  const [activeTab, setActiveTab] = useState<"tree" | "formula">("tree");

  const nodeDetails: Record<string, NodeDetail> = {
    net_profit: {
      id: "net_profit",
      title: "Business Goal: Net Profit (กำไรสุทธิ)",
      category: "goal",
      value: "฿198,000 (15.5% Margin)",
      formula: "Net Profit = Total Revenue (฿1.28M) - Total Costs (฿1.082M)",
      health: "good",
      statusBadge: "+18.4% YoY (เติบโตดีเยี่ยม)",
      drivers: [
        "รายได้รวมเติบโต +12.6% จากแรงส่งของ Shopee & TikTok",
        "Gross Margin ยืนเหนือ 38% ควบคุมต้นทุนสินค้า (COGS) ได้ตามเป้า",
        "ประสิทธิภาพค่าโฆษณา TikTok Shop (ROAS 7.2x) ช่วยดัน Net Margin",
      ],
      rootCause:
        "แม้กำไรสุทธิจะโต +18.4% แต่ยังสามารถขยายตัวได้มากกว่านี้อีก 25-30% หากปลดล็อก 2 คอขวดสำคัญ: AOV ของ Shopee ที่ต่ำ (฿244) และอัตราตีกลับของ TikTok Shop (6.1%)",
      action:
        "มุ่งเน้นเพิ่ม AOV ผ่าน Bundle Promotions และลด Return Rate เพื่อดันกำไรแตะ ฿250,000/เดือน",
    },
    revenue: {
      id: "revenue",
      title: "Driver 1: Total Revenue (รายได้รวม)",
      category: "revenue",
      value: "฿1,280,000",
      formula: "Revenue = Total Orders (4,320) × AOV (฿296)",
      health: "good",
      statusBadge: "+12.6% YoY",
      drivers: [
        "Orders: 4,320 ออเดอร์ (Shopee 57%, TikTok 26%, Direct Store 17%)",
        "AOV: ฿296 (Direct ฿400, TikTok ฿342, Shopee ฿244)",
      ],
      rootCause:
        "ปริมาณคำสั่งซื้อเติบโตแข็งแกร่ง แต่ AOV เฉลี่ยรวมยังต่ำกว่า Benchmark สากลเนื่องจาก Shopee ครองสัดส่วนออเดอร์เกินครึ่งแต่มี AOV ต่ำที่สุด",
      action:
        "ใช้กลยุทธ์ Basket Building บน Shopee เพื่อดัน AOV ขึ้นเป็น ฿320+",
    },
    orders: {
      id: "orders",
      title: "Sub-Driver: Total Orders (จำนวนออเดอร์)",
      category: "revenue",
      value: "4,320 Orders",
      formula: "Orders = Traffic Visits (113,680) × Conversion Rate (3.8%)",
      health: "good",
      statusBadge: "CVR 3.8% (สูงกว่าตลาด)",
      drivers: [
        "Organic & Social Traffic: 65,400 visits",
        "Paid Ads Traffic: 48,280 visits",
        "Conversion Rate: 3.8% (เทียบกับค่าเฉลี่ย E-Commerce 2.5-3.0%)",
      ],
      rootCause:
        "สินค้าคุณภาพดีและคะแนนรีวิว 4.7/5 ช่วยเสริม Trust ทำให้ Conversion Rate แข็งแกร่ง",
      action:
        "รักษามาตรฐานรีวิว และเพิ่มช่องทาง Direct Storefront เพื่อลดค่าธรรมเนียม Platform",
    },
    aov: {
      id: "aov",
      title: "Sub-Driver: Average Order Value (AOV)",
      category: "revenue",
      value: "฿296 / Order",
      formula: "AOV = Items Per Order (1.42 ชิ้น) × Avg Item Price (฿208)",
      health: "warning",
      statusBadge: "⚠️ ต่ำกว่าเป้าหมาย ฿350",
      drivers: [
        "Shopee AOV: ฿244 (ลูกค้าซื้อชิ้นเดี่ยว ไม่มีชุดจับคู่)",
        "TikTok Shop AOV: ฿342 (คลิปป้ายยาเซ็ตคู่)",
        "Direct Storefront AOV: ฿400 (ลูกค้าซื้อเป็นเซ็ตแต่งรถ)",
      ],
      rootCause:
        "Shopee ยังไม่มีโปรโมชั่น Bundle หรือ Add-on Deal ทำให้ลูกค้าสั่งเฉพาะชิ้นที่ตั้งใจซื้อ ไม่หยิบของเสริมลงตะกร้า",
      action:
        "สร้างชุดเซ็ตโปรโมชั่น 'Aero Part Pack 3 ชิ้น' หรือตั้งขั้นต่ำส่งฟรี ฿499",
    },
    repeat_rate: {
      id: "repeat_rate",
      title: "Retention Driver: Repeat Customer Rate",
      category: "revenue",
      value: "27.0% (ลดลงจาก 34.0%)",
      formula: "Repeat Rate = Repeat Buyers (1,166) / Total Unique Customers (4,320)",
      health: "danger",
      statusBadge: "🔴 จุดเตือนภัยวิกฤต",
      drivers: [
        "New Customers: 73.0% (พึ่งพาการยิงแอดหาลูกค้าใหม่สูง)",
        "Repeat Customers: 27.0% (ขาด Retention Loop)",
      ],
      rootCause:
        "ไม่มีระบบ CRM, ไม่มี Line OA Automations ติดตามหลังการขาย 14 วัน และไม่มีโปรโมชั่นดึงลูกค้าเก่ากลับมาซื้อซ้ำ",
      action:
        "เร่งเชื่อมต่อระบบ Loyalty Program แจกคูปองซื้อซ้ำ 10% ภายใน 30 วันหลังได้รับสินค้า",
    },
    costs: {
      id: "costs",
      title: "Cost Structure: Total Costs (ต้นทุนรวม)",
      category: "cost",
      value: "฿1,082,000 (84.5% ของรายได้)",
      formula: "Total Costs = COGS (฿793.6k) + Marketing (฿110k) + Logistics (฿115k) + OpEx (฿63.4k)",
      health: "warning",
      statusBadge: "Logistics & Returns เสี่ยงกด Margin",
      drivers: [
        "COGS (ต้นทุนสินค้า): ฿793,600 (62% ของยอดขาย)",
        "Ad Spend (ค่าโฆษณา): ฿110,000 (Blended ROAS 4.6x)",
        "Logistics & Returns: ฿115,000 (TikTok Return 6.1% ดึงต้นทุน)",
        "Platform Fee & OpEx: ฿63,400",
      ],
      rootCause:
        "ต้นทุนสินค้า (COGS) อยู่ในเกณฑ์ดีที่ 38% Gross Margin แต่ต้นทุนค่าขนส่งและการตีกลับสินค้าจาก TikTok Shop เริ่มมีผลกดดันกำไร",
      action:
        "เจรจาเรทขนส่งแบบเหมาเดือน และลดอัตราตีกลับของ TikTok ให้ต่ำกว่า 3.0%",
    },
  };

  const activeNode = nodeDetails[selectedNode] || nodeDetails["net_profit"];

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400">
            <GitFork size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                แผนภูมิต้นไม้ตัวขับเคลื่อนธุรกิจ (Interactive KPI Tree)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-mono">
                Goal → Drivers
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              เชื่อมโยงเป้าหมายกำไรสุทธิ ➔ ตัวแปรรายได้และต้นทุน ➔ สาเหตุที่แท้จริง (Root Cause)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#181818] p-1 rounded-xl border border-white/5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("tree")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "tree"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            มุมมองโครงสร้างต้นไม้ (Visual Tree)
          </button>
          <button
            onClick={() => setActiveTab("formula")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "formula"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            มุมมองสมการตัวขับเคลื่อน (Formula)
          </button>
        </div>
      </div>

      {/* KPI Tree Visual Layout */}
      {activeTab === "tree" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Tree Nodes Hierarchy */}
            <div className="lg:col-span-7 space-y-4">
              {/* Level 0: Ultimate Goal (Net Profit) */}
              <div
                onClick={() => setSelectedNode("net_profit")}
                className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                  selectedNode === "net_profit"
                    ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg"
                    : "bg-[#161616] border-[#2A2A2A] hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🎯 ULTIMATE BUSINESS GOAL
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      Net Profit (กำไรสุทธิ)
                    </h4>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-base sm:text-lg">
                    ฿198,000
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>Net Profit Margin: 15.5%</span>
                  <span className="text-emerald-400 font-semibold">+18.4% YoY</span>
                </div>
              </div>

              {/* Branch Connection Line */}
              <div className="flex items-center justify-center">
                <div className="w-0.5 h-4 bg-gray-700" />
              </div>

              {/* Level 1: Revenue vs Costs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* (+) Total Revenue Branch */}
                <div
                  onClick={() => setSelectedNode("revenue")}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                    selectedNode === "revenue"
                      ? "bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
                      : "bg-[#161616] border-[#2A2A2A] hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      (+) REVENUE DRIVER
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">+12.6%</span>
                  </div>
                  <h5 className="text-xs font-semibold text-gray-200">Total Revenue (รายได้รวม)</h5>
                  <p className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">
                    ฿1,280,000
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">4,320 Orders × AOV ฿296</p>
                </div>

                {/* (-) Total Costs Branch */}
                <div
                  onClick={() => setSelectedNode("costs")}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                    selectedNode === "costs"
                      ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-md"
                      : "bg-[#161616] border-[#2A2A2A] hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                      (-) COST DRIVERS
                    </span>
                    <span className="text-xs font-semibold text-amber-400">84.5% Rev</span>
                  </div>
                  <h5 className="text-xs font-semibold text-gray-200">Total Costs (ต้นทุนรวม)</h5>
                  <p className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">
                    ฿1,082,000
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">COGS ฿793k + Ads ฿110k + Log ฿115k</p>
                </div>
              </div>

              {/* Branch Connection Line */}
              <div className="flex items-center justify-center">
                <div className="w-0.5 h-4 bg-gray-700" />
              </div>

              {/* Level 2: Sub-Drivers (Orders, AOV, Repeat Rate) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Orders Node */}
                <div
                  onClick={() => setSelectedNode("orders")}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${
                    selectedNode === "orders"
                      ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30"
                      : "bg-[#151515] border-[#262626] hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-blue-400 font-mono">Volume</span>
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  </div>
                  <p className="text-xs text-gray-300 font-semibold">Total Orders</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">4,320 Orders</p>
                  <p className="text-[10px] text-gray-400 mt-1">CVR 3.8% (113k Visits)</p>
                </div>

                {/* AOV Node */}
                <div
                  onClick={() => setSelectedNode("aov")}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${
                    selectedNode === "aov"
                      ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
                      : "bg-[#151515] border-[#262626] hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-amber-400 font-mono">Value</span>
                    <AlertCircle size={12} className="text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-300 font-semibold">Average Order (AOV)</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">฿296</p>
                  <p className="text-[10px] text-amber-400 mt-1">⚠️ Shopee ฿244 (ต่ำ)</p>
                </div>

                {/* Repeat Rate Node */}
                <div
                  onClick={() => setSelectedNode("repeat_rate")}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${
                    selectedNode === "repeat_rate"
                      ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30"
                      : "bg-[#151515] border-[#262626] hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-rose-400 font-mono">Retention</span>
                    <AlertCircle size={12} className="text-rose-400" />
                  </div>
                  <p className="text-xs text-gray-300 font-semibold">Repeat Rate</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">27.0%</p>
                  <p className="text-[10px] text-rose-400 mt-1">🔴 ลดลงจาก 34% (เสี่ยง)</p>
                </div>
              </div>
            </div>

            {/* Right: Selected Node Detail & Deep-Dive Root Cause Card */}
            <div className="lg:col-span-5 bg-[#161616] border border-[#2A2A2A] rounded-xl p-5 space-y-4 shadow-md">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                    Deep-Dive Diagnostic
                  </span>
                  <h4 className="text-base font-bold text-white mt-1.5">{activeNode.title}</h4>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-md shrink-0 ${
                    activeNode.health === "good"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : activeNode.health === "warning"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {activeNode.statusBadge}
                </span>
              </div>

              {/* Value & Formula */}
              <div className="bg-[#0E0E0E] rounded-lg p-3 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ค่าปัจจุบัน:</span>
                  <span className="font-mono font-bold text-white">{activeNode.value}</span>
                </div>
                <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/30 p-2 rounded border border-indigo-500/20">
                  {activeNode.formula}
                </div>
              </div>

              {/* Key Contributing Drivers */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-400" />
                  <span>ตัวขับเคลื่อนย่อย (Key Drivers):</span>
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  {activeNode.drivers.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Root Cause Analysis */}
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-1">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  <span>สาเหตุที่แท้จริง (Root Cause):</span>
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">{activeNode.rootCause}</p>
              </div>

              {/* Recommended Action */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>การกระทำที่แนะนำ (Recommended Action):</span>
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">{activeNode.action}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Formula View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Equation */}
            <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-400">
                  สมการฝั่งรายได้ (Revenue Tree Formula)
                </h4>
                <span className="text-xs font-mono text-white font-bold">฿1,280,000</span>
              </div>
              <div className="bg-[#0E0E0E] p-3 rounded-lg border border-white/5 text-xs font-mono space-y-2 text-gray-300">
                <div className="text-emerald-300 font-semibold">
                  Revenue = Total Orders × Average Order Value
                </div>
                <div className="text-gray-400">
                  ฿1,280,000 = 4,320 Orders × ฿296.29
                </div>
                <div className="pt-2 border-t border-white/5 text-gray-400">
                  └ Orders = 113,680 Visits × 3.80% Conversion Rate
                </div>
                <div className="text-gray-400">
                  └ AOV = 1.42 Items/Order × ฿208.65 Avg Price
                </div>
              </div>
              <p className="text-xs text-gray-400">
                💡 <strong className="text-white">จุดเพิ่มพลัง:</strong> หากดัน AOV จาก ฿296 ขึ้นเป็น ฿330 จะสร้างรายได้เพิ่มขึ้นทันที +฿146,880 โดยไม่ต้องหาลูกค้าใหม่
              </p>
            </div>

            {/* Profit Equation */}
            <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-400">
                  สมการฝั่งกำไรและต้นทุน (Profit & Cost Formula)
                </h4>
                <span className="text-xs font-mono text-white font-bold">฿198,000 (15.5%)</span>
              </div>
              <div className="bg-[#0E0E0E] p-3 rounded-lg border border-white/5 text-xs font-mono space-y-2 text-gray-300">
                <div className="text-indigo-300 font-semibold">
                  Net Profit = Revenue - (COGS + Ad Spend + Logistics + OpEx)
                </div>
                <div className="text-gray-400">
                  ฿198,000 = ฿1.28M - (฿793.6k + ฿110k + ฿115k + ฿63.4k)
                </div>
                <div className="pt-2 border-t border-white/5 text-gray-400">
                  └ COGS: 62.0% (Gross Margin 38.0% = ฿486.4k)
                </div>
                <div className="text-gray-400">
                  └ Blended ROAS: 4.6x (ยอดขายจากแอด ฿506k / งบ ฿110k)
                </div>
              </div>
              <p className="text-xs text-gray-400">
                💡 <strong className="text-white">จุดระวังต้นทุน:</strong> ค่าขนส่งและสินค้าตีกลับจาก TikTok (6.1%) กินกำไรไปแล้วกว่า ฿38,000 ในรอบนี้
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
