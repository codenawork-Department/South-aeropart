"use client";

import React, { useState } from "react";
import {
  Layers,
  Globe,
  TrendingUp,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Percent,
  Search,
  Megaphone,
  Share2,
} from "lucide-react";

interface SourceData {
  id: string;
  name: string;
  share: number; // percentage
  revenue: string;
  revenueNum: number;
  orders: number;
  aov: number;
  roas: string;
  cac: string;
  repeatRate: number;
  icon: React.ElementType;
  badgeColor: string;
  highlight: string;
  weakness: string;
  strategy: string;
}

export function ChannelBreakdownMatrix() {
  const sources: SourceData[] = [
    {
      id: "google_ads",
      name: "Google Ads (Search & Shopping)",
      share: 35.0,
      revenue: "฿448,000",
      revenueNum: 448000,
      orders: 1490,
      aov: 300,
      roas: "5.1x",
      cac: "฿52",
      repeatRate: 31.0,
      icon: Search,
      badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
      highlight: "ครองสัดส่วนยอดขายสูงสุด 35% ลูกค้ามีความตั้งใจซื้อสูงจากคำค้นหาตรงรุ่น",
      weakness: "Keyword แข่งขันสูงขึ้น ค่า CPC ขยับตัวขึ้นในกลุ่มคำค้นหายอดนิยม",
      strategy: "ขยาย Long-tail Keyword สำหรับสเกิร์ตรถยนต์รุ่นเฉพาะทาง และเน้น Google Shopping Feed",
    },
    {
      id: "meta_ads",
      name: "Facebook & Instagram Ads",
      share: 21.0,
      revenue: "฿269,000",
      revenueNum: 269000,
      orders: 920,
      aov: 292,
      roas: "3.8x",
      cac: "฿68",
      repeatRate: 24.0,
      icon: Megaphone,
      badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
      highlight: "สร้าง Brand Awareness ได้ดี และเป็นช่องทางหลักในการ Retargeting ผู้ที่เคยเข้าชมเว็บ",
      weakness: "CAC ค่อนข้างสูง ฿68 ต่อออเดอร์ และ CVR อยู่ที่ 3.1%",
      strategy: "ปรับ Creative วิดีโอโชว์การติดตั้งจริง และทำ Carousel Ad โชว์ชุดแต่งก่อน-หลัง",
    },
    {
      id: "tiktok_ads",
      name: "TikTok Ads (Short-form Video)",
      share: 15.0,
      revenue: "฿192,000",
      revenueNum: 192000,
      orders: 640,
      aov: 300,
      roas: "7.2x",
      cac: "฿38",
      repeatRate: 18.0,
      icon: Flame,
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      highlight: "ROAS สูงลิ่ว 7.2x และ CAC ต่ำสุดเพียง ฿38 ต่อออเดอร์ ประสิทธิภาพโฆษณาคุ้มค่าที่สุด",
      weakness: "Repeat Rate ต่ำเพียง 18% ลูกค้าส่วนใหญ่ซื้อแบบ Impulse Buy",
      strategy: "สเกลงบโฆษณาเพิ่ม 30-50% พร้อมดึงเข้าสู่ระบบ Email/SMS CRM หลังได้รับสินค้า",
    },
    {
      id: "organic_seo",
      name: "Organic Search (Google SEO)",
      share: 16.0,
      revenue: "฿205,000",
      revenueNum: 205000,
      orders: 720,
      aov: 285,
      roas: "Free",
      cac: "฿0",
      repeatRate: 35.0,
      icon: Globe,
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      highlight: "ไม่มีต้นทุนค่าโฆษณา (CAC ฿0) และมี Repeat Rate สูง 35%",
      weakness: "ต้องใช้เวลาทำ Content & Technical SEO ต่อเนื่อง",
      strategy: "ทำบทความรีวิวชุดแต่งรถยนต์แต่ละรุ่น และคู่มือการติดตั้งเพื่อดึง Organic Traffic ระยะยาว",
    },
    {
      id: "direct_referral",
      name: "Direct & Referral & Word-of-Mouth",
      share: 13.0,
      revenue: "฿166,000",
      revenueNum: 166000,
      orders: 550,
      aov: 302,
      roas: "Free",
      cac: "฿0",
      repeatRate: 38.0,
      icon: Share2,
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      highlight: "Repeat Rate สูงสุด 38% สะท้อน Brand Equity และความภักดีของฐานลูกค้าประจำ",
      weakness: "Traffic ส่วนใหญ่จำกัดอยู่เฉพาะกลุ่มลูกค้ารู้จักแบรนด์เดิม",
      strategy: "สร้าง Referral Program มอบส่วนลด ฿200 ให้ทั้งผู้แนะนำและเพื่อนที่สั่งซื้อชิ้นแรก",
    },
  ];

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/20 text-blue-400">
              <Layers size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              เมทริกซ์วิเคราะห์แหล่ง Traffic สู่เว็บไซต์ (Acquisition Performance Matrix)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            เปรียบเทียบสัดส่วนรายได้, AOV, ROAS, CAC และ Repeat Rate รายแหล่งที่มาของลูกค้า (D2C Model)
          </p>
        </div>

        {/* Traffic Diversification Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shrink-0">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Balanced Traffic Mix: มีทั้ง Paid &amp; Organic</span>
        </div>
      </div>

      {/* Revenue Share Visual Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>สัดส่วนรายได้รวม ฿1,280,000 (D2C Website Direct)</span>
          <span>100% Total Volume</span>
        </div>
        <div className="h-3 w-full rounded-full bg-[#1A1A1A] overflow-hidden flex">
          <div style={{ width: "35%" }} className="bg-blue-500 h-full" title="Google Ads 35%" />
          <div style={{ width: "21%" }} className="bg-indigo-500 h-full" title="FB Ads 21%" />
          <div style={{ width: "15%" }} className="bg-rose-500 h-full" title="TikTok Ads 15%" />
          <div style={{ width: "16%" }} className="bg-emerald-500 h-full" title="SEO 16%" />
          <div style={{ width: "13%" }} className="bg-amber-500 h-full" title="Direct 13%" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-300">Google Ads: 35% (฿448k)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-gray-300">FB/IG Ads: 21% (฿269k)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-300">TikTok Ads: 15% (฿192k)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-300">SEO: 16% (฿205k)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-300">Direct/Ref: 13% (฿166k)</span>
          </div>
        </div>
      </div>

      {/* Detailed Source Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.id}
              className="bg-[#151515] border border-[#262626] hover:border-gray-600 rounded-xl p-4 space-y-4 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg border ${source.badgeColor}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">{source.name}</h4>
                    <span className="text-xs text-gray-400 font-mono">
                      {source.share}% of Total Revenue
                    </span>
                  </div>
                </div>
                <span className="text-sm sm:text-base font-bold font-mono text-white">
                  {source.revenue}
                </span>
              </div>

              {/* Metrics Matrix */}
              <div className="grid grid-cols-2 gap-2 bg-[#0E0E0E] p-3 rounded-lg border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-gray-500 block text-[10px]">AOV (ยอดเฉลี่ย):</span>
                  <span className="font-bold text-white">฿{source.aov}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">ROAS:</span>
                  <span
                    className={`font-bold ${
                      source.roas.includes("7") ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {source.roas} {source.roas.includes("7") && "🚀"}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-gray-500 block text-[10px]">CAC ต่อออเดอร์:</span>
                  <span className="font-bold text-gray-300">{source.cac}</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-gray-500 block text-[10px]">Repeat Rate:</span>
                  <span
                    className={`font-bold ${
                      source.repeatRate >= 35 ? "text-emerald-400" : "text-gray-300"
                    }`}
                  >
                    {source.repeatRate}%
                  </span>
                </div>
              </div>

              {/* Insights & Strategy */}
              <div className="space-y-1.5 text-xs">
                <div className="text-gray-300">
                  <strong className="text-emerald-400">จุดเด่น:</strong> {source.highlight}
                </div>
                <div className="text-gray-300">
                  <strong className="text-rose-400">คอขวด:</strong> {source.weakness}
                </div>
                <div className="p-2 rounded bg-indigo-950/20 border border-indigo-500/20 text-indigo-200">
                  <strong className="text-indigo-400">กลยุทธ์:</strong> {source.strategy}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
