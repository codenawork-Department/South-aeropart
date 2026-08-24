"use client";

import React, { useState } from "react";
import {
  Calculator,
  CheckSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  DollarSign,
  Zap,
  Target,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface ActionTask {
  id: string;
  title: string;
  category: string;
  priority: "P0" | "P1" | "P2";
  priorityLabel: string;
  effort: "Low" | "Medium" | "High";
  impact: string;
  owner: string;
  deadline: string;
  done: boolean;
}

export function GrowthSimulatorActionPlan() {
  // Simulator State
  const [targetAov, setTargetAov] = useState<number>(350); // current 296
  const [repeatRate, setRepeatRate] = useState<number>(35); // current 27
  const [checkoutDropoff, setCheckoutDropoff] = useState<number>(28); // current 44.6

  // Action Tasks State
  const [tasks, setTasks] = useState<ActionTask[]>([
    {
      id: "t1",
      title: "สร้างชุด Bundle 'Aero Complete Pack 3 ชิ้น' พร้อมโปรส่งฟรีเมื่อซื้อครบ ฿3,500",
      category: "AOV & Basket Size",
      priority: "P0",
      priorityLabel: "Quick Win (ด่วนที่สุด)",
      effort: "Low",
      impact: "+฿192,000 รายได้",
      owner: "ทีม Product & Web Merchandising",
      deadline: "ภายใน 3 วัน",
      done: false,
    },
    {
      id: "t2",
      title: "เปิดระบบ Abandoned Cart Email 1 ชม. หลังทิ้งตะกร้า พร้อมแสดงค่าส่งชัดเจน",
      category: "Funnel Optimization",
      priority: "P0",
      priorityLabel: "Quick Win (ด่วนที่สุด)",
      effort: "Low",
      impact: "ลดสูญเสีย ฿85,000",
      owner: "ทีม Dev & Marketing Tech",
      deadline: "ภายใน 5 วัน",
      done: false,
    },
    {
      id: "t3",
      title: "ตั้งค่า Email Automation หลังส่งมอบสินค้า 14 วัน พร้อมมอบคูปองซื้อซ้ำ 10%",
      category: "Retention & CRM",
      priority: "P1",
      priorityLabel: "High Impact",
      effort: "Medium",
      impact: "ดัน Repeat Rate สู่ 35%",
      owner: "ทีม CRM & Customer Service",
      deadline: "ภายใน 10 วัน",
      done: true,
    },
    {
      id: "t4",
      title: "เจรจาสัญญาเหมาค่าส่งระหว่างประเทศ (DHL/FedEx) และปรับราคา All-Inclusive สำหรับ INTL",
      category: "International Logistics",
      priority: "P1",
      priorityLabel: "High Impact",
      effort: "Medium",
      impact: "ประหยัดค่าส่ง ฿35,000",
      owner: "ทีม Logistics & Export",
      deadline: "ภายใน 14 วัน",
      done: false,
    },
    {
      id: "t5",
      title: "สเกลงบโฆษณา TikTok Ads เพิ่ม 40% สำหรับคลิปทดสอบแรงลมและความทนทาน",
      category: "Traffic Acquisition",
      priority: "P2",
      priorityLabel: "Strategic Scale",
      effort: "High",
      impact: "ROAS 7.2x (สเกลรายได้)",
      owner: "ฝ่ายโฆษณา & Creator Partner",
      deadline: "ภายใน 30 วัน",
      done: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Calculations for What-If Simulator:
  // 1. Total Orders = 4,320. If AOV increases from 296 to targetAov:
  const additionalAovRevenue = 4320 * (targetAov - 296);
  const additionalAovProfit = additionalAovRevenue * 0.38; // Gross Margin 38%

  // 2. Repeat Rate increases from 27% to repeatRate%:
  const additionalRepeatCustomers = Math.round(4320 * ((repeatRate - 27) / 100));
  const savedCacProfit = additionalRepeatCustomers * 58; // Blended CAC saved

  // 3. Checkout Drop-off decreases from 44.6% to checkoutDropoff%:
  const recoveredCheckouts = Math.round(4423 * ((44.6 - checkoutDropoff) / 100));
  const recoveredRevenue = recoveredCheckouts * 296;
  const recoveredProfit = recoveredRevenue * 0.38;

  const totalPotentialProfitUplift =
    additionalAovProfit + savedCacProfit + recoveredProfit;

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-6">
      {/* Section 1: Interactive Growth Scenario Simulator */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                ตัวจำลองผลลัพธ์ทางธุรกิจ (Interactive What-If Growth Simulator)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                ทดลองปรับเปลี่ยนตัวแปร AOV, Repeat Rate และ Checkout Drop-off เพื่อดูผลกระทบต่อกำไรสุทธิแบบ Real-time
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono self-start sm:self-auto">
            Sensitivity Analysis
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Slider 1: Website AOV */}
          <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">1. ดัน AOV บนเว็บไซต์</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                เป้าหมาย: ฿{targetAov}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">ปัจจุบัน: ฿296 (คำสั่งซื้อ 4,320 Orders)</p>
            <input
              type="range"
              min={296}
              max={450}
              step={5}
              value={targetAov}
              onChange={(e) => setTargetAov(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-[#222222] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>ปัจจุบัน ฿296</span>
              <span>เป้าหมาย ฿450</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-xs text-emerald-400 font-mono flex items-center justify-between">
              <span>กำไรเพิ่มขึ้น:</span>
              <span className="font-bold">+฿{Math.round(additionalAovProfit).toLocaleString()}</span>
            </div>
          </div>

          {/* Slider 2: Repeat Customer Rate */}
          <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">2. ดึง Repeat Rate ฟื้นตัว</span>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                เป้าหมาย: {repeatRate}%
              </span>
            </div>
            <p className="text-[11px] text-gray-500">ปัจจุบัน: 27% (เคยทำได้สูงสุด 34%)</p>
            <input
              type="range"
              min={27}
              max={45}
              step={1}
              value={repeatRate}
              onChange={(e) => setRepeatRate(Number(e.target.value))}
              className="w-full accent-indigo-500 h-2 bg-[#222222] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>ปัจจุบัน 27%</span>
              <span>เป้าหมาย 45%</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-xs text-emerald-400 font-mono flex items-center justify-between">
              <span>ประหยัดค่า CAC:</span>
              <span className="font-bold">+฿{Math.round(savedCacProfit).toLocaleString()}</span>
            </div>
          </div>

          {/* Slider 3: Checkout Drop-off Rate */}
          <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">3. ลด Checkout Drop-off</span>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                เป้าหมาย: {checkoutDropoff}%
              </span>
            </div>
            <p className="text-[11px] text-gray-500">ปัจจุบัน: 44.6% Drop-off Rate</p>
            <input
              type="range"
              min={15}
              max={44.6}
              step={0.5}
              value={checkoutDropoff}
              onChange={(e) => setCheckoutDropoff(Number(e.target.value))}
              className="w-full accent-rose-500 h-2 bg-[#222222] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>เป้าหมาย 15%</span>
              <span>ปัจจุบัน 44.6%</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-xs text-emerald-400 font-mono flex items-center justify-between">
              <span>กู้คืนกำไรกลับมา:</span>
              <span className="font-bold">+฿{Math.round(recoveredProfit).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Total Impact Summary Result Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#15201A] to-[#121212] border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-xs uppercase font-bold text-emerald-300 font-mono">
                Total Projected Profit Impact
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              ศักยภาพการเพิ่มกำไรสุทธิรวม (Monthly Net Profit Uplift):
            </h4>
            <p className="text-xs text-gray-400">
              จากการปลดล็อก 3 จุดขวดคอของเว็บไซต์ D2C โดยไม่ต้องเพิ่มงบโฆษณา
            </p>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              +฿{Math.round(totalPotentialProfitUplift).toLocaleString()}{" "}
              <span className="text-xs text-emerald-300 font-sans">/เดือน</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              (กำไรสุทธิจะขยายตัวจาก ฿198k เป็น ฿{Math.round(198000 + totalPotentialProfitUplift).toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Prioritized Action Plan Checklist */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-400">
                <CheckSquare size={16} />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                แผนปฏิบัติการขับเคลื่อนกลยุทธ์ (Prioritized Action Plan Checklist)
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              ภารกิจจัดลำดับตามผลกระทบ (High Impact / Low Effort) สำหรับทีมงาน D2C
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
            <span>ความคืบหน้า:</span>
            <span className="font-bold text-emerald-400">
              {completedCount} / {tasks.length} สำเร็จ
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>

        {/* Tasks List */}
        <div className="space-y-2.5 pt-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`cursor-pointer border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                task.done
                  ? "bg-[#141414]/60 border-emerald-500/30 opacity-75"
                  : "bg-[#151515] border-[#262626] hover:border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        task.priority === "P0"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : task.priority === "P1"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {task.priorityLabel}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      • {task.category}
                    </span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm font-semibold transition-all ${
                      task.done ? "line-through text-gray-500" : "text-white"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
              </div>

              {/* Task Metadata */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs shrink-0 self-end sm:self-auto font-mono pl-7 sm:pl-0">
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">ผู้รับผิดชอบ:</span>
                  <span className="text-gray-300 font-sans text-xs">{task.owner}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">ผลกระทบ:</span>
                  <span className="text-emerald-400 font-bold text-xs">{task.impact}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">กำหนดการ:</span>
                  <span className="text-gray-400 text-[11px]">{task.deadline}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
