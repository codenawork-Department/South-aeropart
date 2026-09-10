"use client";

import React, { useState } from "react";
import {
  Users,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Star,
  Sparkles,
  UserPlus,
  RefreshCw,
  Heart,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

interface CustomerFunnelAnalyticsProps {
  funnelData?: {
    sessions: number;
    productViews: number;
    addToCart: number;
    checkout: number;
    paidOrders: number;
  };
  reviewsData?: {
    totalCount: number;
    avgRating: number;
    starDistribution: Array<{ stars: string; pct: number; count: number }>;
  };
  cohortData?: {
    percent: number;
    isRisk: boolean;
    newCustomersCount: number;
    repeatCustomersCount: number;
  };
}

export function CustomerFunnelAnalytics({
  funnelData,
  reviewsData,
  cohortData,
}: CustomerFunnelAnalyticsProps) {
  const [selectedFunnelStep, setSelectedFunnelStep] = useState<number>(3); // Default to Cart -> Checkout step (the bottleneck)

  const sessionsCount = funnelData?.sessions ?? 113684;
  const viewsCount = funnelData?.productViews ?? 64200;
  const cartCount = funnelData?.addToCart ?? 7982;
  const checkoutCount = funnelData?.checkout ?? 4423;
  const paidCount = funnelData?.paidOrders ?? 4320;

  const funnelSteps = [
    {
      id: 1,
      title: "1. เข้าชมเว็บไซต์ (Sessions)",
      count: sessionsCount,
      countFormatted: sessionsCount.toLocaleString(),
      conversionFromTop: "100%",
      dropoffRate: "—",
      color: "from-blue-500 to-indigo-500",
      textColor: "text-blue-400",
      bgSubtle: "bg-blue-500/10 border-blue-500/20",
      subtext: "Traffic รวมจาก Search, Ads, Social & Direct",
      insight: "ปริมาณ Traffic แข็งแกร่ง โดย 71% เป็น Paid Traffic (Google, Meta, TikTok) และ 29% เป็น Organic/Direct",
    },
    {
      id: 2,
      title: "2. เข้าดูหน้าสินค้า (Product Views)",
      count: viewsCount,
      countFormatted: viewsCount.toLocaleString(),
      conversionFromTop: `${((viewsCount / sessionsCount) * 100).toFixed(1)}%`,
      dropoffRate: `${(100 - (viewsCount / sessionsCount) * 100).toFixed(1)}%`,
      color: "from-indigo-500 to-purple-500",
      textColor: "text-indigo-400",
      bgSubtle: "bg-indigo-500/10 border-indigo-500/20",
      subtext: "ผู้เข้าชมที่คลิกดูรายละเอียดสินค้าหรือ 3D Preview",
      insight: "ผู้เข้าชมกว่าครึ่งเข้ามาดูสินค้าตรงรุ่น หน้าเว็บ 3D Configurator ช่วยดึงเวลาใช้งานเฉลี่ยบนหน้าเว็บสูงขึ้น",
    },
    {
      id: 3,
      title: "3. เพิ่มลงตะกร้า (Add to Cart)",
      count: cartCount,
      countFormatted: cartCount.toLocaleString(),
      conversionFromTop: `${((cartCount / sessionsCount) * 100).toFixed(2)}%`,
      dropoffRate: `${(100 - (cartCount / viewsCount) * 100).toFixed(1)}%`,
      color: "from-purple-500 to-pink-500",
      textColor: "text-purple-400",
      bgSubtle: "bg-purple-500/10 border-purple-500/20",
      subtext: `${((cartCount / viewsCount) * 100).toFixed(1)}% ของผู้ดูสินค้ากดใส่ตะกร้า`,
      insight: "อัตรา Add-to-Cart อยู่ในระดับปกติของสินค้าแต่งรถ High-Involvement แต่ส่วนใหญ่เลือกเพียง 1 ชิ้นเดี่ยว",
    },
    {
      id: 4,
      title: "4. ดำเนินการชำระเงิน (Checkout)",
      count: checkoutCount,
      countFormatted: checkoutCount.toLocaleString(),
      conversionFromTop: `${((checkoutCount / sessionsCount) * 100).toFixed(2)}%`,
      dropoffRate: `${(100 - (checkoutCount / cartCount) * 100).toFixed(1)}%`,
      isBottleneck: true,
      color: "from-amber-500 to-orange-500",
      textColor: "text-amber-400",
      bgSubtle: "bg-amber-500/10 border-amber-500/30",
      subtext: `⚠️ เกิด Drop-off ${(100 - (checkoutCount / cartCount) * 100).toFixed(1)}% จากหน้าตะกร้าไปชำระเงิน`,
      insight: "จุดคอขวดวิกฤติ! ลูกค้าทิ้งตะกร้า สาเหตุหลักมาจากค่าจัดส่งที่ยังไม่คำนวณล่วงหน้า และความกังวลเรื่องการติดตั้ง",
    },
    {
      id: 5,
      title: "5. ชำระเงินสำเร็จ (Paid Orders)",
      count: paidCount,
      countFormatted: paidCount.toLocaleString(),
      conversionFromTop: `${((paidCount / sessionsCount) * 100).toFixed(2)}%`,
      dropoffRate: `${(100 - (paidCount / checkoutCount) * 100).toFixed(1)}%`,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-400",
      bgSubtle: "bg-emerald-500/10 border-emerald-500/30",
      subtext: `CVR รวม ${((paidCount / sessionsCount) * 100).toFixed(2)}% (อัตราสั่งซื้อสำเร็จสูงมากเมื่อถึง Checkout)`,
      insight: "เมื่อลูกค้าเข้าสู่หน้าชำระเงิน Stripe ระบบ PromptPay & Card ทำงานได้ราบรื่น มี Drop-off ต่ำมาก",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── SECTION 1: FULL CONVERSION FUNNEL ─── */}
      <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShoppingCart size={16} />
              </span>
              <h3 className="text-base font-bold text-white">
                ช่องทางการสั่งซื้อและการแปลงสภาพ (Full E-Commerce Conversion Funnel)
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ติดตามเส้นทางลูกค้าตั้งแต่ก้าวแรกที่เข้าสู่เว็บไซต์ จนถึงการชำระเงินสำเร็จ 4,320 ออเดอร์
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
              CVR รวม: 3.80%
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-semibold">
              Cart Drop-off: 44.6%
            </span>
          </div>
        </div>

        {/* Funnel Progress Bars (Connected Steps) */}
        <div className="space-y-3">
          {funnelSteps.map((step, idx) => {
            const widthPct = Math.max(12, (step.count / funnelSteps[0].count) * 100);
            const isSelected = selectedFunnelStep === idx;

            return (
              <div
                key={step.id}
                onClick={() => setSelectedFunnelStep(idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white/[0.04] border-white/20 shadow-md ring-1 ring-white/10"
                    : "bg-[#161616] border-white/5 hover:border-white/15"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold ${step.textColor}`}>{step.title}</span>
                    {step.isBottleneck && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse flex items-center gap-1">
                        <AlertTriangle size={11} />
                        จุดคอขวด (Bottleneck)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-white font-extrabold text-sm">{step.countFormatted}</span>
                    <span className="text-gray-400">({step.conversionFromTop})</span>
                    {step.dropoffRate !== "—" && (
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown size={12} />
                        หลุด {step.dropoffRate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full bg-[#202020] h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${step.color} transition-all duration-500`}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{step.subtext}</span>
                  <span className="text-zinc-500 text-[10px]">คลิกเพื่อดูบทวิเคราะห์</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Drill-Down Detail Box */}
        {funnelSteps[selectedFunnelStep] && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#181818] to-[#141414] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <span>บทวิเคราะห์เชิงลึก: {funnelSteps[selectedFunnelStep].title}</span>
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                สัดส่วน: {funnelSteps[selectedFunnelStep].conversionFromTop} ของผู้เข้าชม
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {funnelSteps[selectedFunnelStep].insight}
            </p>
            {funnelSteps[selectedFunnelStep].isBottleneck && (
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  โซลูชันแนะนำ:
                </span>
                <span className="text-gray-300">1. ส่ง Abandoned Cart Email ภายใน 1 ชั่วโมง</span>
                <span className="text-zinc-500">•</span>
                <span className="text-gray-300">2. แสดงตัวคำนวณค่าส่งทันทีในตะกร้า</span>
                <span className="text-zinc-500">•</span>
                <span className="text-gray-300">3. เพิ่มป้ายการันตีความพอใจ & คืนสินค้า 14 วัน</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SECTION 2: NEW VS RETURNING CUSTOMERS & REVIEW CSAT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): New vs Returning Customers Cohort */}
        <div className="lg:col-span-7 bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users size={16} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                โครงสร้างลูกค้า: ลูกค้าใหม่ vs ลูกค้าซื้อซ้ำ (New vs Returning Cohort)
              </h3>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Repeat {cohortData?.percent ?? 27.0}% (ต้องปรับปรุง)
            </span>
          </div>

          {/* Comparative Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* New Customers */}
            <div className="p-4 rounded-xl bg-[#161616] border border-blue-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400 font-bold flex items-center gap-1.5">
                  <UserPlus size={14} />
                  ลูกค้าใหม่ (New Customers)
                </span>
                <span className="font-mono text-white font-bold">
                  {(100 - (cohortData?.percent ?? 27.0)).toFixed(0)}% ({(cohortData?.newCustomersCount ?? 3154).toLocaleString()} ราย)
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>ยอดขายโดยประมาณ:</span>
                  <span className="text-white font-bold">฿934,000</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>AOV ต่อออเดอร์:</span>
                  <span className="text-blue-300">฿296</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ต้นทุนได้ลูกค้า (CAC):</span>
                  <span className="text-amber-400">฿48/ราย</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 pt-1 border-t border-white/5 leading-relaxed">
                ขับเคลื่อนด้วย TikTok Ads และ Google Search มีอัตราการเติบโตของลูกค้าใหม่ +14.2% YoY
              </p>
            </div>

            {/* Returning Customers */}
            <div className="p-4 rounded-xl bg-[#161616] border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <RefreshCw size={14} />
                  ลูกค้าซื้อซ้ำ (Repeat Customers)
                </span>
                <span className="font-mono text-white font-bold">
                  {(cohortData?.percent ?? 27.0).toFixed(0)}% ({(cohortData?.repeatCustomersCount ?? 1166).toLocaleString()} ราย)
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>ยอดขายโดยประมาณ:</span>
                  <span className="text-white font-bold">฿346,000</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>AOV ต่อออเดอร์:</span>
                  <span className="text-emerald-300 font-bold">฿325 (+9.8%)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ต้นทุนโฆษณา (CAC):</span>
                  <span className="text-emerald-400 font-bold">฿0 (Organic)</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 pt-1 border-t border-white/5 leading-relaxed">
                มีมูลค่าสั่งซื้อเฉลี่ยสูงกว่าลูกค้าใหม่ 9.8% เป็นกลุ่มที่สร้างกำไรสุทธิสูงสุด
              </p>
            </div>
          </div>

          {/* Retention Strategy Callout */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300">
                เป้าหมายกลยุทธ์: ดึง Repeat Rate จาก {(cohortData?.percent ?? 27.0).toFixed(0)}% กลับสู่ 35%
              </span>
              <p className="text-gray-400 leading-relaxed">
                หากดันอัตราซื้อซ้ำได้แตะ 35% ยอดขายจะเพิ่มขึ้นอีก ฿102,000/เดือน โดยแทบไม่ต้องเพิ่มงบโฆษณา CAC
                แนะนำเปิดใช้ Email Loyalty Automation ส่งรหัสส่วนลด 10% หลังได้รับสินค้า 14 วัน
              </p>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Review Score & CSAT Breakdown */}
        <div className="lg:col-span-5 bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star size={16} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                ความพึงพอใจลูกค้า (CSAT &amp; Reviews)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp size={13} />
              ▲ 0.1 จากเดือนก่อน
            </span>
          </div>

          {/* Big Score Header */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#161616] border border-white/5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                  {reviewsData?.avgRating ?? 4.7}
                </span>
                <span className="text-sm font-normal text-gray-400">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    fill={i < Math.round(reviewsData?.avgRating ?? 4.7) ? "#F59E0B" : "none"}
                  />
                ))}
              </div>
            </div>
            <div className="text-right text-xs font-mono space-y-0.5">
              <span className="text-white font-bold block">
                {(reviewsData?.totalCount ?? 1248).toLocaleString()} รีวิวสะสม
              </span>
              <span className="text-emerald-400 font-semibold block">94% ผู้ซื้อแนะนำ</span>
              <span className="text-gray-500 text-[10px] block">Verified Buyers</span>
            </div>
          </div>

          {/* Rating Distribution Bars */}
          <div className="space-y-1.5 text-xs font-mono">
            {(
              reviewsData?.starDistribution ?? [
                { stars: "5 ดาว", pct: 82, count: 1023 },
                { stars: "4 ดาว", pct: 12, count: 150 },
                { stars: "3 ดาว", pct: 4, count: 50 },
                { stars: "2 ดาว", pct: 1, count: 13 },
                { stars: "1 ดาว", pct: 1, count: 12 },
              ]
            ).map((r) => (
              <div key={r.stars} className="flex items-center gap-2 text-gray-400">
                <span className="w-12 text-[11px] text-gray-300">{r.stars}</span>
                <div className="flex-1 bg-[#202020] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${r.pct}%` }}
                    className="h-full rounded-full bg-amber-400 transition-all"
                  />
                </div>
                <span className="w-10 text-right text-[11px] text-white font-semibold">{r.pct}%</span>
              </div>
            ))}
          </div>

          {/* Customer Voice Tags */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <span className="text-[11px] font-semibold text-gray-400 block">
              สิ่งที่ลูกค้าชื่นชอบมากที่สุด (Key Sentiment Drivers):
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                ✨ งานคาร์บอนเนียนกริบ (92%)
              </span>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                🏎️ ใส่พอดีจุดยึดเดิม (88%)
              </span>
              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                📦 แพ็กแน่นหนา ไม่เสียหาย (84%)
              </span>
              <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ⚡ ส่งไวใน 48 ชม. (80%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
