"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Percent,
} from "lucide-react";

export function RevenueProfitTrendChart() {
  const [selectedMonth, setSelectedMonth] = useState<string>("มิ.ย.");

  const dataPoints = [
    { month: "ม.ค.", revenue: 940000, profit: 132000, margin: 14.0, orders: 3240 },
    { month: "ก.พ.", revenue: 980000, profit: 140000, margin: 14.3, orders: 3410 },
    { month: "มี.ค.", revenue: 1050000, profit: 152000, margin: 14.5, orders: 3680 },
    { month: "เม.ย.", revenue: 1120000, profit: 168000, margin: 15.0, orders: 3890 },
    { month: "พ.ค.", revenue: 1210000, profit: 182000, margin: 15.0, orders: 4120 },
    { month: "มิ.ย.", revenue: 1280000, profit: 198000, margin: 15.5, orders: 4320 },
  ];

  const maxRev = 1400000;
  const activeData =
    dataPoints.find((d) => d.month === selectedMonth) || dataPoints[dataPoints.length - 1];

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/20 text-blue-400">
              <TrendingUp size={16} />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              แนวโน้มการเติบโตของรายได้และกำไรสุทธิ (6-Month Revenue & Profit Trajectory)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            เปรียบเทียบการขยายตัวของรายได้ (+12.6%) ควบคู่กับ Net Margin Expansion (จาก 14.0% ➔ 15.5%)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            รายได้รวม
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            กำไรสุทธิ
          </span>
        </div>
      </div>

      {/* Visual Chart Bars & Growth Curve */}
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end min-h-[200px] pt-6 pb-2 border-b border-white/10">
          {dataPoints.map((point) => {
            const revHeight = Math.max(20, (point.revenue / maxRev) * 100);
            const profitHeight = Math.max(10, (point.profit / 250000) * 100);
            const isSelected = selectedMonth === point.month;

            return (
              <div
                key={point.month}
                onClick={() => setSelectedMonth(point.month)}
                className={`flex flex-col items-center h-full justify-end cursor-pointer group transition-all p-1.5 rounded-xl ${
                  isSelected ? "bg-white/5 ring-1 ring-white/20" : "hover:bg-white/[0.02]"
                }`}
              >
                {/* Top Label */}
                <div className="mb-2 text-center">
                  <span
                    className={`text-[10px] sm:text-xs font-bold font-mono block ${
                      isSelected ? "text-emerald-400" : "text-gray-400 group-hover:text-white"
                    }`}
                  >
                    ฿{(point.revenue / 1000).toFixed(0)}k
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono hidden sm:block">
                    +{point.margin}% Margin
                  </span>
                </div>

                {/* Double Bar Group */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-36">
                  {/* Revenue Bar */}
                  <div className="w-1/2 max-w-[28px] bg-[#1A1A1A] rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${revHeight}%` }}
                      className={`w-full rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-400 transition-all ${
                        isSelected ? "opacity-100 shadow-md shadow-blue-500/20" : "opacity-75"
                      }`}
                    />
                  </div>

                  {/* Profit Bar */}
                  <div className="w-1/2 max-w-[28px] bg-[#1A1A1A] rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${profitHeight}%` }}
                      className={`w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400 transition-all ${
                        isSelected ? "opacity-100 shadow-md shadow-emerald-500/20" : "opacity-75"
                      }`}
                    />
                  </div>
                </div>

                {/* Month Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-semibold block ${
                      isSelected ? "text-white font-bold" : "text-gray-400"
                    }`}
                  >
                    {point.month}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Month Summary Card */}
        {activeData && (
          <div className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-sm">
                {activeData.month}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  ผลประกอบการเดือน {activeData.month}
                </h4>
                <p className="text-xs text-gray-400">
                  คำสั่งซื้อ {activeData.orders.toLocaleString()} Orders • อัตรากำไรสุทธิ {activeData.margin}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">รายได้รวม:</span>
                <span className="text-sm font-bold text-blue-400">
                  ฿{activeData.revenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">กำไรสุทธิ:</span>
                <span className="text-sm font-bold text-emerald-400">
                  ฿{activeData.profit.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Net Margin:</span>
                <span className="text-sm font-bold text-white">
                  {activeData.margin}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
