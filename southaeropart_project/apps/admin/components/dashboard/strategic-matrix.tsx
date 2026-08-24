"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  Star,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  Globe,
  Truck,
} from "lucide-react";

export function StrategicMatrix() {
  const strengths = [
    {
      id: "growth_efficiency",
      title: "รายได้และกำไรเติบโตพร้อมกัน",
      metric: "Revenue +12.6% | Net Profit +18.4%",
      description:
        "การเติบโตไม่ได้มาจากการปั๊มยอดขายเพียงอย่างเดียว แต่กำไรสุทธิโตเร็วกว่ายอดขาย (+18.4% vs +12.6%) สะท้อนว่าประสิทธิภาพการดำเนินงานและการคุม Margin ดีขึ้น",
      tag: "Profitability Surge",
      icon: TrendingUp,
      action: "รักษามาตรฐาน Gross Margin 38% และขยายขนาดกำลังผลิตอย่างเป็นระบบ",
    },
    {
      id: "tiktok_roas",
      title: "TikTok Ads ประสิทธิภาพการยิงแอดสูงลิ่ว",
      metric: "ROAS สูงถึง 7.2x (CAC เพียง ฿38)",
      description:
        "TikTok Ads เป็นช่องทางที่มีความคุ้มค่าด้านค่าโฆษณาสูงที่สุด ทุกๆ 1 บาทที่ลงโฆษณาสร้างยอดขายกลับมา 7.2 บาท เป็นหัวหอกสำคัญในการดึง Traffic เข้าสู่เว็บไซต์",
      tag: "Growth Engine",
      icon: Flame,
      action: "สเกลงบโฆษณา TikTok Ads เพิ่ม 30-50% พร้อมทำ Lookalike Audience",
    },
    {
      id: "high_reviews",
      title: "คะแนนรีวิวและความพึงพอใจสูง 4.7 / 5.0",
      metric: "CSAT Score 94% (จากรีวิว 1,248 รายการ)",
      description:
        "สะท้อนว่าสินค้า South Aero Performance คุณภาพตรงปก ตอบโจทย์ลูกค้าทั้งในไทยและต่างประเทศ สามารถนำ Social Proof นี้ไปโปรโมทบนเว็บไซต์ได้ทันที",
      tag: "Brand Loyalty Asset",
      icon: Star,
      action: "ดึง Social Proof และรีวิว 5 ดาวไปแสดงในหน้า Product Page และใช้ยิงแอด Retargeting",
    },
  ];

  const weaknesses = [
    {
      id: "repeat_rate_drop",
      title: "Repeat Rate ลดลงเหลือ 27% (จากเดิม 34%)",
      metric: "Retention Rate: 27.0% (🔴 Danger)",
      description:
        "แม้ยอดขายรวมจะโต แต่สัดส่วนลูกค้าเก่าที่ซื้อซ้ำลดลงต่อเนื่อง หากปล่อยทิ้งไว้ ธุรกิจจะต้องเสียเงินยิงแอดหาลูกค้าใหม่อยู่ตลอดเวลา ทำให้ต้นทุน CAC สะสมพุ่งสูง",
      tag: "CAC Risk",
      icon: RotateCcw,
      action: "เร่งทำระบบ Email CRM, Follow-up 14 วันหลังซื้อ, และคูปองกระตุ้นการซื้อซ้ำ 10%",
    },
    {
      id: "checkout_dropoff",
      title: "Checkout Drop-off สูง 44.6% (จาก Cart สู่ Paid)",
      metric: "Cart Drop: 44.6% Abandonment Rate",
      description:
        "ลูกค้ากดเพิ่มสินค้าลงตะกร้าแล้ว แต่ 44.6% ไม่ทำการชำระเงินให้เสร็จสมบูรณ์ มักเกิดจากความไม่ชัดเจนเรื่องค่าจัดส่ง หรือกระบวนการ Checkout มีขั้นตอนมากเกินไป",
      tag: "Conversion Leak",
      icon: ShoppingBag,
      action: "ทำ Abandoned Cart Recovery Email 1 ชม. หลังทิ้งตะกร้า และแสดงค่าส่งตั้งแต่หน้าตะกร้า",
    },
    {
      id: "intl_shipping_cost",
      title: "ค่าจัดส่งต่างประเทศ ฿185/กล่อง เพิ่มขึ้น +4.2%",
      metric: "INTL Shipping: ฿185/กล่อง (20% of Orders)",
      description:
        "ออเดอร์ส่งไปต่างประเทศ (JP, MY, SG, AU) มีขนาดกล่องใหญ่ ค่าระวางขนส่งทางอากาศขยับขึ้น กดดัน Margin ของตลาด International",
      tag: "Margin Pressure",
      icon: Truck,
      action: "เจรจาเรทขนส่งแบบเหมากับ DHL/FedEx และปรับราคาสินค้าต่างประเทศเป็นแบบ All-Inclusive",
    },
  ];

  const risks = [
    {
      title: "Traffic Acquisition Cost Inflation",
      desc: "หาก Repeat Rate ยังต่ำต่อเนื่อง งบยิงแอดจะต้องเพิ่มขึ้นทุกเดือนเพื่อรักษาระดับยอดขายเดิม",
      level: "High",
    },
    {
      title: "Cart Abandonment Leakage",
      desc: "การทิ้งตะกร้า 44.6% ทำให้สูญเสียรายได้ที่ควรจะได้ไปกว่า ฿85,000 ต่อเดือน",
      level: "High",
    },
    {
      title: "International Freight Fluctuations",
      desc: "ความผันผวนของค่าขนส่งระหว่างประเทศและอัตราแลกเปลี่ยนกระทบกำไรของตลาดส่งออก",
      level: "Medium",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
              <Layers size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              การวินิจฉัยเชิงกลยุทธ์ (Strategic Diagnosis: Strengths vs Bottlenecks)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            วิเคราะห์เชิงลึกสำหรับธุรกิจ D2C ขายผ่านเว็บไซต์ เพื่อระบุ &quot;จุดที่ต้องขยายพลัง (Lever)&quot; และ &quot;จุดที่ต้องรีบอุดรูรั่ว (Bottleneck)&quot;
          </p>
        </div>
      </div>

      {/* Grid of Strengths vs Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ✅ Strengths Column */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>✅ 3 จุดเด่นสำคัญ (Key Growth Levers)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Leverage &amp; Scale
            </span>
          </div>

          <div className="space-y-3">
            {strengths.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-[#141414] hover:bg-[#181818] border border-emerald-500/20 rounded-xl p-4 transition-all shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                          {item.metric}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold uppercase tracking-wider shrink-0">
                      {item.tag}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mt-2.5 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[11px] text-emerald-300">
                    <Sparkles size={13} className="shrink-0" />
                    <span><strong>กลยุทธ์ต่อยอด:</strong> {item.action}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ⚠️ Weaknesses & Bottlenecks Column */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>⚠️ 3 จุดด้อย &amp; ประเด็นต้องจับตา (Bottlenecks)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              Action Required
            </span>
          </div>

          <div className="space-y-3">
            {weaknesses.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-[#141414] hover:bg-[#181818] border border-rose-500/20 rounded-xl p-4 transition-all shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                        <span className="text-[11px] font-mono text-rose-400 font-semibold">
                          {item.metric}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold uppercase tracking-wider shrink-0">
                      {item.tag}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mt-2.5 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[11px] text-rose-300">
                    <ArrowRight size={13} className="shrink-0" />
                    <span><strong>แนวทางแก้ไข:</strong> {item.action}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk Alert Warning Bar */}
      <div className="bg-gradient-to-r from-rose-950/30 via-[#181212] to-[#121212] border border-rose-500/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
            <ShieldAlert size={16} />
            <span>🔴 แผงตรวจจับความเสี่ยงทางธุรกิจ (Risk Alerts &amp; Monitoring Matrix)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
            3 Active Risk Factors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {risks.map((risk, index) => (
            <div
              key={index}
              className="bg-black/40 border border-white/5 rounded-lg p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{risk.title}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    risk.level === "High"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {risk.level} Risk
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">{risk.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
