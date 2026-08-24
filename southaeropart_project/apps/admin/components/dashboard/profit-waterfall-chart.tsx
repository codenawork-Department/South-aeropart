"use client";

import React, { useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Info,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";

interface WaterfallItem {
  id: string;
  name: string;
  category: "revenue" | "cogs" | "ads" | "logistics" | "opex" | "profit";
  type: "total" | "deduction";
  amount: number;
  percentOfRev: number;
  remainingAmount: number;
  color: string;
  barColor: string;
  note: string;
  leakWarning?: boolean;
}

export function ProfitWaterfallChart() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const steps: WaterfallItem[] = [
    {
      id: "revenue",
      name: "รายได้รวม (Gross Revenue)",
      category: "revenue",
      type: "total",
      amount: 1280000,
      percentOfRev: 100.0,
      remainingAmount: 1280000,
      color: "text-emerald-400",
      barColor: "from-emerald-500 to-teal-400",
      note: "ยอดขายรวม 3 ช่องทาง (Shopee 47%, TikTok 30%, Storefront 23%)",
    },
    {
      id: "cogs",
      name: "(-) ต้นทุนสินค้า (COGS)",
      category: "cogs",
      type: "deduction",
      amount: 793600,
      percentOfRev: 62.0,
      remainingAmount: 486400,
      color: "text-rose-300",
      barColor: "from-rose-500 to-red-600",
      note: "คงระดับ Gross Margin 38.0% (กำไรขั้นต้น ฿486,400)",
    },
    {
      id: "ads",
      name: "(-) งบโฆษณา (Ad Spend)",
      category: "ads",
      type: "deduction",
      amount: 110000,
      percentOfRev: 8.6,
      remainingAmount: 376400,
      color: "text-amber-400",
      barColor: "from-amber-500 to-orange-500",
      note: "Blended ROAS 4.6x (TikTok 7.2x, Shopee 3.8x, Meta 3.2x)",
    },
    {
      id: "logistics",
      name: "(-) ค่าส่ง & สินค้าตีกลับ",
      category: "logistics",
      type: "deduction",
      amount: 115000,
      percentOfRev: 9.0,
      remainingAmount: 261400,
      color: "text-rose-300",
      barColor: "from-red-600 to-rose-700",
      note: "⚠️ รูรั่วกำไร: TikTok Return Rate 6.1% ดึงต้นทุนค่าขนส่งสูญเปล่า",
      leakWarning: true,
    },
    {
      id: "opex",
      name: "(-) ค่าระบบ & OpEx",
      category: "opex",
      type: "deduction",
      amount: 63400,
      percentOfRev: 4.9,
      remainingAmount: 198000,
      color: "text-purple-400",
      barColor: "from-purple-500 to-indigo-600",
      note: "Platform Fee, แพ็กเกจจิ้ง และการดำเนินงาน 4.9%",
    },
    {
      id: "net_profit",
      name: "(=) กำไรสุทธิ (Net Profit)",
      category: "profit",
      type: "total",
      amount: 198000,
      percentOfRev: 15.5,
      remainingAmount: 198000,
      color: "text-emerald-400",
      barColor: "from-emerald-400 to-teal-300",
      note: "Net Profit Margin 15.5% (+18.4% YoY) เติบโตแข็งแกร่ง",
    },
  ];

  const maxVal = 1280000;

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-teal-500/20 text-teal-400">
              <DollarSign size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              กราฟสะพานกำไรสุทธิ (Net Profit Waterfall Bridge Chart)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            สะท้อนการไหลของเม็ดเงิน: จากรายได้ 100% ถูกหักลบจุดใดบ้าง จนกลายเป็นกำไรสุทธิ 15.5%
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-gray-400">Net Profit Margin:</span>
          <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            15.5% (฿198,000)
          </span>
        </div>
      </div>

      {/* Visual Waterfall Chart Bars Container */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end min-h-[220px] pt-8 pb-2 border-b border-white/10">
          {steps.map((step) => {
            const heightPercent = Math.max(12, (step.amount / maxVal) * 100);
            const isHovered = hoveredItem === step.id;

            return (
              <div
                key={step.id}
                onMouseEnter={() => setHoveredItem(step.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex flex-col items-center h-full justify-end group cursor-pointer transition-all"
              >
                {/* Floating Value Tag */}
                <div className="mb-2 text-center">
                  {step.leakWarning && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40 font-mono block mb-1 animate-pulse">
                      จุดรั่วไหล!
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold font-mono block transition-transform ${
                      isHovered ? "scale-110 " + step.color : "text-white"
                    }`}
                  >
                    {step.type === "deduction" ? "-" : ""}฿{(step.amount / 1000).toFixed(0)}k
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {step.percentOfRev}%
                  </span>
                </div>

                {/* Pillar Bar */}
                <div className="w-full max-w-[64px] bg-[#1A1A1A] rounded-t-lg overflow-hidden flex flex-col justify-end h-40 relative">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg bg-gradient-to-t ${step.barColor} transition-all duration-300 ${
                      isHovered ? "opacity-100 shadow-lg shadow-white/10" : "opacity-85"
                    }`}
                  />
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center w-full">
                  <span
                    className={`text-xs font-semibold block transition-colors ${
                      isHovered ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {step.name.split(" ")[1] || step.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                    ฿{(step.remainingAmount / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Executive Insight Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-[#151515] border border-white/5 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">
              1. Gross Margin Pillar
            </span>
            <p className="text-xs text-gray-200 font-semibold">
              กำไรขั้นต้น ฿486,400 (38.0%)
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              ต้นทุนสินค้า (COGS) คุมได้ที่ 62% จากการสั่งผลิตล็อตใหญ่ ทำให้มีพื้นที่ทำการตลาดได้ต่อเนื่อง
            </p>
          </div>

          <div className="bg-[#151515] border border-white/5 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 font-mono">
              2. Marketing Efficiency
            </span>
            <p className="text-xs text-gray-200 font-semibold">
              งบโฆษณา ฿110,000 (ROAS 4.6x)
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              สัดส่วนค่าแอดอยู่ที่ 8.6% ของรายได้ โดยมี TikTok Shop (ROAS 7.2x) เป็นหัวหอกที่คุ้มค่าที่สุด
            </p>
          </div>

          <div className="bg-[#151515] border border-rose-500/30 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-300 font-mono">
              3. Critical Margin Leak
            </span>
            <p className="text-xs text-gray-200 font-semibold text-rose-300">
              ค่าขนส่ง & ตีกลับ ฿115,000 (9.0%)
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              การตีกลับของ TikTok (6.1%) กินกำไรไปแล้วกว่า ฿38,000 หากลดเหลือ 2.5% จะคืนกำไรสุทธิทันที +฿22,000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
