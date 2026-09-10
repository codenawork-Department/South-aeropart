"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Bell,
  BellOff,
  ChevronDown,
  Check,
  Volume2,
  ExternalLink,
  X,
  Radio,
  Zap,
  Clock,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useRealtimeSync } from "@/components/providers/realtime-provider";

const INTERVAL_OPTIONS = [
  { label: "⚡ เรียลไทม์ 5 วิ (Hyper)", value: 5000, desc: "เหมาะสำหรับช่วงทดสอบ หรือแคมเปญ" },
  { label: " 15 วินาที (มาตรฐาน)", value: 15000, desc: "สมดุลและแนะนำสำหรับการทำงานประจำวัน" },
  { label: "⏳ 30 วินาที (ประหยัด)", value: 30000, desc: "ประหยัดเน็ตและทรัพยากรเครื่อง" },
  { label: "⏹️ ปิดการดึงอัตโนมัติ", value: 0, desc: "กดรีเฟรชเฉพาะเวลาที่ต้องการ" },
];

export function RealtimeSyncWidget({ compact = false }: { compact?: boolean }) {
  const {
    syncInterval,
    setSyncInterval,
    isSyncing,
    lastSyncedAt,
    isSoundEnabled,
    setIsSoundEnabled,
    syncNow,
    newOrderAlerts,
    dismissAlert,
    dismissAllAlerts,
  } = useRealtimeSync();

  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Smart toggle with collision detection
  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 380);
      setAlignLeft(rect.left < 260);
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Dynamic 1-second ticker for "seconds ago" and order age calculations
  useEffect(() => {
    const updateTicker = () => {
      setCurrentTimeMs(Date.now());
      if (!lastSyncedAt) {
        setSecondsAgo(0);
        return;
      }
      const diff = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      setSecondsAgo(Math.max(0, diff));
    };

    updateTicker();
    const timer = setInterval(updateTicker, 1000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  const activeOption = INTERVAL_OPTIONS.find((opt) => opt.value === syncInterval) || INTERVAL_OPTIONS[0];

  // Up to 5 orders
  const displayOrders = newOrderAlerts.slice(0, 5);
  const freshCount = displayOrders.filter(
    (order) => currentTimeMs - order.createdAtMs < 60000
  ).length;

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {/* Main Trigger Pill */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggle}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-white/10 hover:border-emerald-500/40 text-xs text-gray-200 transition-all cursor-pointer shadow-sm group"
            title="ตั้งค่าการดึงข้อมูลสด (Realtime Live Sync)"
          >
            {/* Status Beacon Indicator */}
            <span className="relative flex h-2 w-2">
              {syncInterval > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500" />
              )}
            </span>

            {/* Label */}
            <span className="font-mono text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              {isSyncing ? (
                <span className="text-emerald-300 flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin text-emerald-400" />
                  <span>กำลังดึงข้อมูล...</span>
                </span>
              ) : syncInterval > 0 ? (
                <span>LIVE ({syncInterval / 1000}s)</span>
              ) : (
                <span className="text-gray-400">MANUAL</span>
              )}
            </span>

            {!compact && (
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                {secondsAgo === 0 ? "เมื่อสักครู่" : `${secondsAgo}วิที่แล้ว`}
              </span>
            )}

            <ChevronDown
              size={12}
              className={`text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-emerald-400" : "group-hover:text-gray-200"
              }`}
            />
          </button>

          {/* Quick Manual Sync Button */}
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="p-1.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="ดึงข้อมูลล่าสุดจากฐานข้อมูลทันที"
          >
            <RefreshCw
              size={12}
              className={isSyncing ? "animate-spin text-emerald-400" : ""}
            />
          </button>
        </div>

        {/* Dropdown Menu with Smart Dynamic Positioning */}
        {isOpen && (
          <div
            className={`absolute z-50 w-72 sm:w-80 rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto ${
              openUpward ? "bottom-full mb-2" : "top-full mt-2"
            } ${alignLeft ? "left-0" : "right-0"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Radio size={13} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    ระบบดึงข้อมูลเรียลไทม์ (Live Sync)
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    อัปเดตจากฐานข้อมูล Neon Postgres อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            {/* Sync Interval Options */}
            <div className="space-y-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block px-1 mb-1">
                ความถี่ในการดึงข้อมูลอัตโนมัติ
              </span>
              {INTERVAL_OPTIONS.map((option) => {
                const isSelected = syncInterval === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSyncInterval(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-white"
                        : "hover:bg-[#1E1E1E] text-gray-300 border border-transparent"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-medium block">
                        {option.label}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {option.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sound Toggle */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                {isSoundEnabled ? (
                  <Volume2 size={14} className="text-emerald-400" />
                ) : (
                  <BellOff size={14} className="text-gray-500" />
                )}
                <div>
                  <span className="text-xs font-medium text-gray-200 block">
                    เสียงเตือนออเดอร์ใหม่
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    {isSoundEnabled ? "เปิดใช้งาน (Web Audio Chime)" : "ปิดเสียง"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSoundEnabled ? "bg-emerald-600" : "bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSoundEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Force Sync Action Button */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  syncNow();
                  setIsOpen(false);
                }}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all cursor-pointer"
              >
                <RefreshCw
                  size={13}
                  className={isSyncing ? "animate-spin" : ""}
                />
                <span>{isSyncing ? "กำลังดึงข้อมูลล่าสุด..." : "ซิงค์ข้อมูลเดี๋ยวนี้ (Sync Now)"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          Floating Luxury Multi-Order Notification Toast (Max 5)
      ────────────────────────────────────────────────────────── */}
      {displayOrders.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#101010]/95 backdrop-blur-2xl border-2 border-emerald-500/80 rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.2)] relative overflow-hidden">
            {/* Glowing Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce shrink-0">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-extrabold border border-emerald-500/40 flex items-center gap-1">
                      <ShoppingBag size={11} />
                      <span>
                        {displayOrders.length === 1
                          ? "NEW ORDER ARRIVED"
                          : `${displayOrders.length} NEW ORDERS`}
                      </span>
                    </span>

                    {freshCount > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1 animate-pulse">
                        <Sparkles size={11} />
                        <span>สดใหม่ {freshCount} รายการ (&lt; 1 นาที)</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-1">
                    {displayOrders.length === 1
                      ? "มีคำสั่งซื้อใหม่เข้ามา!"
                      : `มีคำสั่งซื้อใหม่เข้ามา ${displayOrders.length} รายการพร้อมกัน!`}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissAllAlerts()}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="ปิดการแจ้งเตือนทั้งหมด"
              >
                <X size={15} />
              </button>
            </div>

            {/* Order Items Stack (Max 5) */}
            <div className="mt-3.5 space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
              {displayOrders.map((order) => {
                const ageMs = currentTimeMs - order.createdAtMs;
                const isUnderOneMinute = ageMs < 60000;
                const secondsOld = Math.max(0, Math.floor(ageMs / 1000));
                const remainingFreshSec = Math.max(0, 60 - secondsOld);

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl p-3 transition-all relative overflow-hidden border ${
                      isUnderOneMinute
                        ? "bg-gradient-to-r from-emerald-950/40 to-[#14231E] border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : "bg-white/[0.04] hover:bg-white/[0.07] border-white/10"
                    }`}
                  >
                    {/* Visual left accent bar for < 1 minute */}
                    {isUnderOneMinute && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-400" />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 pl-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white tracking-wider">
                            #{order.orderNumber}
                          </span>

                          {/* Highlight Badge for < 1 min */}
                          {isUnderOneMinute ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>✨ สดใหม่ ({remainingFreshSec}s)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              <Clock size={10} />
                              <span>{order.formattedTime}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span>เวลาสั่งซื้อ: {order.formattedTime}</span>
                        </div>
                      </div>

                      {/* Right Amount & Single Dismiss */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-mono font-extrabold text-emerald-400 block">
                            ฿{Number(order.total || 0).toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => dismissAlert(order.id)}
                          className="text-gray-500 hover:text-gray-300 p-1 rounded-md hover:bg-white/10 transition-colors"
                          title="ปิดรายการนี้"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2">
              <Link
                href="/orders"
                onClick={() => dismissAllAlerts()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/60"
              >
                <span>เปิดดูในหน้ารายการสั่งซื้อ (Orders)</span>
                <ExternalLink size={13} />
              </Link>
              <button
                type="button"
                onClick={() => dismissAllAlerts()}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
              >
                รับทราบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
