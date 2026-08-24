"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Truck,
  RotateCcw,
  Zap,
  Target,
  Globe,
  ShoppingBag,
} from "lucide-react";

interface DiagnosticQnA {
  id: string;
  question: string;
  category: string;
  metricBadge: string;
  badgeColor: string;
  icon: React.ElementType;
  dataFact: string;
  rootCause: string;
  actionSolutions: string[];
  expectedImpact: string;
}

export function RootCauseDiagnostic() {
  const [expandedId, setExpandedId] = useState<string>("q1");

  const diagnostics: DiagnosticQnA[] = [
    {
      id: "q1",
      question: "1. ทำอย่างไรให้ AOV (Average Order Value) บนเว็บไซต์สูงขึ้นจาก ฿296 เป็น ฿350+?",
      category: "Basket Size Optimization",
      metricBadge: "AOV ฿296 ⚠️",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      icon: DollarSign,
      dataFact:
        "ลูกค้าส่วนใหญ่ซื้อสินค้าชิ้นเดี่ยว (เช่น สเกิร์ตหน้า 1 ชิ้น) ไม่ได้ซื้อชิ้นส่วนรอบคันพร้อมกัน ทำให้เสียโอกาสในการดัน Basket Size ต่อคำสั่งซื้อ",
      rootCause:
        "หน้าเว็บยังไม่มี Bundle Deals แนะนำชิ้นส่วนแต่งรอบคันที่เข้าชุดกัน และไม่มี Free Shipping Threshold เพื่อกระตุ้นให้เพิ่มสินค้า",
      actionSolutions: [
        "จัดทำ 'Complete Aero Pack 3 ชิ้น (หน้า+ข้าง+หลัง)' พร้อมส่วนลดแพ็กเกจ 8%",
        "ตั้งเกณฑ์ Free Shipping Threshold ที่ยอดซื้อ ฿3,500 ขึ้นไป",
        "เปิดระบบ Cart Drawer In-Cart Upsell เสนออุปกรณ์เสริม เช่น กาว 3M แท้, น้ำยาเคลือบเซรามิก เพิ่ม ฿199",
      ],
      expectedImpact: "เพิ่มรายได้รวมทันที +฿192,000/เดือน โดยใช้จำนวนผู้เข้าชมเว็บเท่าเดิม",
    },
    {
      id: "q2",
      question: "2. ทำไมลูกค้าซื้อซ้ำน้อยลง (Repeat Rate หล่นเหลือ 27%)?",
      category: "Customer Retention & CRM",
      metricBadge: "Repeat Rate 27.0% 🔴",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      icon: RotateCcw,
      dataFact:
        "สัดส่วนลูกค้าซื้อซ้ำลดลงจาก 34% เหลือ 27% ทำให้ธุรกิจต้องพึ่งพาเม็ดเงินโฆษณาตลอดเวลา ส่งผลให้ Blended CAC ค่อยๆ เพิ่มขึ้น",
      rootCause:
        "ยังไม่มีระบบ Email Marketing Automation ติดตามผลหลังการขาย และไม่มี Loyalty Program จูงใจให้ลูกค้ากลับมาซื้อชิ้นส่วนอื่น",
      actionSolutions: [
        "ตั้งค่า Email Automation หลังส่งมอบสินค้า 14 วันเพื่อถามความพึงพอใจ พร้อมมอบโค้ดส่วนลด 10% สำหรับชิ้นถัดไป",
        "สร้าง 'South Aero Club' สะสมคะแนนแลกส่วนลดสินค้าคัสตอม",
        "ส่งการแจ้งเตือนเปิดตัวชุดแต่งรุ่นใหม่ตรงรุ่นรถที่ลูกค้าเคยสั่งซื้อ (Segmented Email)",
      ],
      expectedImpact: "ดึง Repeat Rate กลับมาแตะ 35% ลดต้นทุน CAC ลง 25% และเพิ่ม LTV กำไรสุทธิ +฿45,000/เดือน",
    },
    {
      id: "q3",
      question: "3. ทำไม Checkout Drop-off ถึงสูงถึง 44.6% ในขั้นตอนชำระเงิน?",
      category: "Website Funnel & UX",
      metricBadge: "Drop-off 44.6% 🔴",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      icon: ShoppingBag,
      dataFact:
        "จาก 7,982 Sessions ที่กด Add to Cart มีผู้ที่ชำระเงินสำเร็จเพียง 4,320 ออเดอร์ (เกิด Drop-off 44.6% ระหว่างทาง)",
      rootCause:
        "ลูกค้าตกใจกับค่าจัดส่งที่เพิ่งแสดงในขั้นตอนสุดท้าย และแบบฟอร์ม Checkout มีขั้นตอนกรอกข้อมูลมากเกินไป",
      actionSolutions: [
        "แสดงค่าจัดส่งโดยประมาณตั้งแต่หน้า Product Page และ Cart Drawer",
        "ติดตั้ง One-Page Checkout และรองรับการชำระเงินหลากหลาย (PromptPay, บัตรเครดิต, SpayLater, PayPal/Stripe สำหรับต่างประเทศ)",
        "เปิดระบบ Abandoned Cart Recovery Email ภายใน 1 ชั่วโมงหลังลูกค้าละทิ้งตะกร้า",
      ],
      expectedImpact: "ลด Drop-off ลงเหลือ <30% ดึงยอดขายกลับมาได้กว่า ฿85,000/เดือน",
    },
    {
      id: "q4",
      question: "4. ควรจัดสรรงบประมาณยิงแอดสู่เว็บไซต์ (Ad Budget Allocation) อย่างไร?",
      category: "Growth & Traffic Scaling",
      metricBadge: "TikTok ROAS 7.2x 🚀",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      icon: Zap,
      dataFact:
        "TikTok Ads มี ROAS สูงถึง 7.2x (CAC ฿38) ในขณะที่ Google Ads อยู่ที่ 5.1x และ Facebook Ads อยู่ที่ 3.8x",
      rootCause:
        "คอนเทนต์วิดีโอแต่งรถบน TikTok ดึงดูดสายซิ่งได้รวดเร็วและมีอัตรา Engagement สูง แต่ปัจจุบันยังจัดสรรงบไว้เพียง 15%",
      actionSolutions: [
        "เพิ่มงบยิงแอด TikTok Ads อีก 30-50% เน้นวิดีโอ Before & After และคลิปทดสอบความทนทาน",
        "รักษา Google Ads (Search & Shopping) ไว้เป็น Core Channel เพื่อเก็บ Intent-based Traffic",
        "ใช้ Facebook/IG Ads เน้น Retargeting ผู้ที่เข้าชมเว็บไซต์แล้วแต่ยังไม่กดสั่งซื้อ",
      ],
      expectedImpact: "ขยายรายได้รวมเป็น ฿1.65 ล้านบาท โดยคุม Blended ROAS ให้อยู่เหนือ 5.0x",
    },
    {
      id: "q5",
      question: "5. ค่าจัดส่งต่างประเทศ (International Freight) ส่งผลกระทบต่อกำไรอย่างไร?",
      category: "Global Logistics & Margin",
      metricBadge: "INTL Shipping ฿185/กล่อง ⚠️",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      icon: Globe,
      dataFact:
        "ยอดขายต่างประเทศคิดเป็น 20% (฿256,000) มีค่าส่งเฉลี่ย ฿185/กล่อง และปรับตัวขึ้น +4.2% ตามค่าระวางแอร์คาร์โก้",
      rootCause:
        "พัสดุชิ้นส่วนแอโร่พาร์ทมีขนาด Oversized (คิดตามมิติกล่อง Volume Weight) และส่งแบบรายชิ้น",
      actionSolutions: [
        "ออกแบบบรรจุภัณฑ์แบบ Flat-pack / Modular เพื่อลด Dimension Weight",
        "ทำสัญญา Volume Rate กับผู้ให้บริการขนส่งด่วนระหว่างประเทศ (DHL Express, FedEx)",
        "ตั้งราคาสินค้าตลาดต่างประเทศแบบ รวมค่าส่งพรีเมียม (All-Inclusive Pricing)",
      ],
      expectedImpact: "ขยาย Net Margin ของตลาด International ขึ้น +3.5% (เพิ่มกำไร ฿35,000/เดือน)",
    },
  ];

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
              <HelpCircle size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              การวิเคราะห์เจาะลึก 5 คำถามกลยุทธ์ (Executive Diagnostic Engine)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            เปลี่ยนตัวเลขรายงานผลให้กลายเป็นการค้นหาสาเหตุ (Root Cause) และแผนการตัดสินใจแก้ปัญหาสำหรับเว็บไซต์ D2C
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono self-start sm:self-auto">
          Business Analytics Core
        </span>
      </div>

      {/* Accordion List of 5 Questions */}
      <div className="space-y-3">
        {diagnostics.map((item) => {
          const isExpanded = expandedId === item.id;
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`border rounded-xl transition-all overflow-hidden ${
                isExpanded
                  ? "bg-[#161616] border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20"
                  : "bg-[#131313] border-[#242424] hover:border-gray-600"
              }`}
            >
              {/* Question Clickable Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? "" : item.id)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 border ${
                      isExpanded
                        ? "bg-indigo-600 text-white border-indigo-400"
                        : "bg-[#1C1C1C] text-gray-400 border-white/5"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-mono">
                      {item.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate sm:text-clip">
                      {item.question}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.metricBadge}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Diagnostic Details */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-3.5 text-xs border-t border-white/5 mt-1">
                  {/* Data Fact & Root Cause Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    <div className="p-3 rounded-lg bg-[#0E0E0E] border border-white/5 space-y-1">
                      <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-blue-400" />
                        <span>ข้อเท็จจริงจากข้อมูล (Data Fact):</span>
                      </span>
                      <p className="text-gray-400 leading-relaxed">{item.dataFact}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        <span>สาเหตุที่แท้จริง (Root Cause):</span>
                      </span>
                      <p className="text-gray-300 leading-relaxed">{item.rootCause}</p>
                    </div>
                  </div>

                  {/* Action Solutions */}
                  <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>แนวทางปฏิบัติเพื่อแก้ปัญหาทันที (Action Steps):</span>
                    </span>
                    <ul className="space-y-1.5 text-gray-300 pl-1">
                      {item.actionSolutions.map((sol, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold">👉</span>
                          <span>{sol}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expected Business Impact */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 font-medium">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                      <span>ผลลัพธ์ที่คาดหวังต่อกำไร:</span>
                    </div>
                    <span className="font-mono font-bold">{item.expectedImpact}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
