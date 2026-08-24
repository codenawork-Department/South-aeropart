"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

interface KpiItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "warning";
  benchmark: string;
  status: "good" | "warning" | "danger";
  statusText: string;
  icon: React.ElementType;
  color: string;
  bgGlow: string;
  tooltip: string;
}

export function BusinessOverviewKPIs() {
  const kpis: KpiItem[] = [
    {
      id: "revenue",
      title: "รายได้รวม (Total Revenue)",
      subtitle: "ยอดขายรวมทุกช่องทาง",
      value: "฿1,280,000",
      change: "+12.6% YoY",
      changeType: "positive",
      benchmark: "เป้าหมาย: ฿1.20M (106.6%)",
      status: "good",
      statusText: "ทะลุเป้าหมาย",
      icon: DollarSign,
      color: "text-emerald-400",
      bgGlow: "from-emerald-500/10 to-transparent border-emerald-500/20",
      tooltip: "รายได้รวมเติบโตแข็งแกร่งจากแรงหนุนของ Shopee และ TikTok Shop",
    },
    {
      id: "net_profit",
      title: "กำไรสุทธิ (Net Profit)",
      subtitle: "Net Profit Margin 15.5%",
      value: "฿198,000",
      change: "+18.4% YoY",
      changeType: "positive",
      benchmark: "ช่วงก่อนหน้า: ฿167,200",
      status: "good",
      statusText: "ประสิทธิภาพดีเยี่ยม",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgGlow: "from-emerald-500/10 to-transparent border-emerald-500/20",
      tooltip: "กำไรเติบโตเร็วกว่ารายได้ (+18.4% vs +12.6%) สะท้อนการคุมต้นทุนที่มีประสิทธิภาพ",
    },
    {
      id: "gross_margin",
      title: "Gross Margin (อัตรากำไรขั้นต้น)",
      subtitle: "กำไรขั้นต้น ฿486,400",
      value: "38.0%",
      change: "+1.2% MoM",
      changeType: "positive",
      benchmark: "Industry Standard: 35-40%",
      status: "good",
      statusText: "อยู่ในเกณฑ์ดี",
      icon: Percent,
      color: "text-teal-400",
      bgGlow: "from-teal-500/10 to-transparent border-teal-500/20",
      tooltip: "COGS อยู่ที่ 62% (฿793,600) ยังคงรักษาระดับกำไรขั้นต้นได้อย่างมั่นคง",
    },
    {
      id: "orders",
      title: "จำนวนออเดอร์ (Total Orders)",
      subtitle: "เฉลี่ย 144 ออเดอร์/วัน",
      value: "4,320",
      change: "+8.2% YoY",
      changeType: "positive",
      benchmark: "ช่วงก่อนหน้า: 3,992 ออเดอร์",
      status: "good",
      statusText: "ยอดสั่งซื้อเพิ่มขึ้น",
      icon: ShoppingCart,
      color: "text-blue-400",
      bgGlow: "from-blue-500/10 to-transparent border-blue-500/20",
      tooltip: "ปริมาณออเดอร์เพิ่มขึ้นต่อเนื่อง โดยมี Shopee เป็นสัดส่วนหลัก 57% ของออเดอร์ทั้งหมด",
    },
    {
      id: "aov",
      title: "AOV เฉลี่ย (Average Order Value)",
      subtitle: "ยอดใช้จ่ายเฉลี่ยต่อออเดอร์",
      value: "฿296",
      change: "-2.4% MoM",
      changeType: "warning",
      benchmark: "เป้าหมาย: ฿350 (Shopee เพียง ฿244)",
      status: "warning",
      statusText: "ต่ำกว่าเป้าหมาย (มีคอขวด)",
      icon: TrendingDown,
      color: "text-amber-400",
      bgGlow: "from-amber-500/10 to-transparent border-amber-500/20",
      tooltip: "AOV ถูกกดจากช่องทาง Shopee (฿244) ที่ลูกค้าซื้อสินค้าชิ้นเดี่ยว ขาดการทำ Bundle",
    },
    {
      id: "cvr",
      title: "Conversion Rate (อัตราปิดการขาย)",
      subtitle: "จากผู้เข้าชม 113,680 Visits",
      value: "3.8%",
      change: "+0.4% MoM",
      changeType: "positive",
      benchmark: "Benchmark ตลาด: 2.5% - 3.0%",
      status: "good",
      statusText: "สูงกว่าค่าเฉลี่ยตลาด",
      icon: Zap,
      color: "text-indigo-400",
      bgGlow: "from-indigo-500/10 to-transparent border-indigo-500/20",
      tooltip: "หน้าสินค้าและโปรโมชั่นดึงดูดลูกค้าได้ดี มีอัตราตัดสินใจซื้อสูง",
    },
    {
      id: "repeat_rate",
      title: "Repeat Rate (สัดส่วนซื้อซ้ำ)",
      subtitle: "ลูกค้าเก่ากลับมาซื้อซ้ำ",
      value: "27.0%",
      change: "-7.0% YoY",
      changeType: "negative",
      benchmark: "เคยทำได้: 34.0% (🔴 ต้องเฝ้าระวัง)",
      status: "danger",
      statusText: "ลดลงต่อเนื่อง (ความเสี่ยงสูง)",
      icon: RefreshCw,
      color: "text-rose-400",
      bgGlow: "from-rose-500/10 to-transparent border-rose-500/20",
      tooltip: "อัตราซื้อซ้ำลดลง เสี่ยงทำให้ธุรกิจต้องพึ่งพาแต่ลูกค้าใหม่และค่าโฆษณา CAC สูงขึ้น",
    },
    {
      id: "roas",
      title: "Blended ROAS (ผลตอบแทนค่าแอด)",
      subtitle: "งบโฆษณา ฿110,000 / ยอดขาย ฿506k",
      value: "4.6x",
      change: "+0.8x YoY",
      changeType: "positive",
      benchmark: "TikTok Shop พุ่งสูง 7.2x 🚀",
      status: "good",
      statusText: "การตลาดมีประสิทธิภาพสูง",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgGlow: "from-emerald-500/10 to-transparent border-emerald-500/20",
      tooltip: "TikTok Shop ROAS สูงถึง 7.2x เป็นช่องทางประสิทธิภาพการตลาดสูงสุด",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">
            ตัวชี้วัดภาพรวมธุรกิจ (Business Executive Metrics)
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
            8 Core KPIs
          </span>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>รอบการประเมิน: เดือนปัจจุบัน</span>
          <span className="text-gray-600">•</span>
          <span className="text-emerald-400 font-medium">สถานะ: ธุรกิจกำลังเติบโต (Scaling Phase)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 2xl:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className={`relative overflow-hidden bg-[#111111] hover:bg-[#151515] border rounded-xl p-4 transition-all duration-200 group shadow-sm bg-gradient-to-b ${kpi.bgGlow}`}
            >
              {/* Top Row: Title and Status Icon */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-gray-400 line-clamp-1">
                    {kpi.title}
                  </span>
                  <p className="text-[11px] text-gray-500 line-clamp-1">{kpi.subtitle}</p>
                </div>
                <div
                  className={`p-2 rounded-lg bg-black/40 border border-white/5 ${kpi.color} shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <Icon size={16} />
                </div>
              </div>

              {/* Middle Row: Big Value & Growth % */}
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
                  {kpi.value}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${
                    kpi.changeType === "positive"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : kpi.changeType === "warning"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {kpi.changeType === "positive" && <ArrowUpRight size={12} />}
                  {kpi.changeType === "negative" && <TrendingDown size={12} />}
                  {kpi.changeType === "warning" && <AlertTriangle size={12} />}
                  {kpi.change}
                </span>
              </div>

              {/* Bottom Row: Benchmark & Status Alert */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-mono truncate max-w-[65%]">
                  {kpi.benchmark}
                </span>
                <span
                  className={`font-medium shrink-0 ${
                    kpi.status === "good"
                      ? "text-emerald-400"
                      : kpi.status === "warning"
                      ? "text-amber-400"
                      : "text-rose-400 font-semibold"
                  }`}
                >
                  {kpi.statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
