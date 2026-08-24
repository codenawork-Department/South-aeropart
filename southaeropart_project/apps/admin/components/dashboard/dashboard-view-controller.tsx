"use client";

import React, { useState } from "react";
import { Eye, Tv } from "lucide-react";
import { KpiMasterCockpit } from "./kpi-master-cockpit";
import { SimpleDashboardView } from "./simple-dashboard-view";

export function DashboardViewController() {
  // Only 2 Dashboard views: "simple" (Default) and "master" (KPIs Master Cockpit)
  const [viewMode, setViewMode] = useState<"simple" | "master">("simple");

  return (
    <div className="space-y-6">
      {/* Top Mode Selector Bar (2 Modes Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-[#262626] rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            โหมดการแสดงผล (View Mode):
          </span>
          <span className="text-[11px] text-gray-400 font-mono hidden md:inline">
            {viewMode === "simple"
              ? "⚡ สรุปผลด่วน 30 วินาที (Simple View)"
              : "📊 KPIs Master Cockpit (วิเคราะห์เจาะลึก 1:1)"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1C1C1C] p-1 rounded-lg border border-white/5 text-xs">
          {/* Mode 1: Simple View (Default First View) */}
          <button
            onClick={() => setViewMode("simple")}
            className={`px-3.5 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "simple"
                ? "bg-white text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Eye size={13} />
            <span>⚡ สรุปด่วน 30 วิ (Simple View)</span>
          </button>

          {/* Mode 2: Master Cockpit (โหมดเจาะลึก 1:1) */}
          <button
            onClick={() => setViewMode("master")}
            className={`px-3.5 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "master"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Tv size={13} />
            <span>📊 KPIs Master Cockpit (วิเคราะห์เจาะลึก)</span>
          </button>
        </div>
      </div>

      {/* Render Selected View (Only 2 Modes) */}
      {viewMode === "simple" ? (
        <SimpleDashboardView onSwitchToAnalyst={() => setViewMode("master")} />
      ) : (
        <KpiMasterCockpit />
      )}
    </div>
  );
}
