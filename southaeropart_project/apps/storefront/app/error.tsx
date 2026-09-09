"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log exception for debugging in client console without leaking sensitive internal state
    console.error("[Storefront Boundary Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[var(--bg-primary,#0A0A0A)]">
      <div className="max-w-md w-full text-center space-y-6 bg-[#121212] border border-[#222222] p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1A1A1A] text-[var(--accent-red,#E51D24)] mx-auto flex items-center justify-center ring-1 ring-[#333333]">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-red,#E51D24)] font-heading">
            SYSTEM ERROR
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white font-heading">
            SOMETHING WENT WRONG
          </h1>
          <p className="text-sm text-[var(--text-secondary,#9CA3AF)] leading-relaxed">
            เกิดข้อผิดพลาดขึ้นในระบบขณะโหลดหน้านี้ กรุณากดลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
          </p>
          {error.digest && (
            <p className="text-[10px] text-[var(--text-muted,#6B7280)] font-mono">
              Error Code: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-[var(--accent-red,#E51D24)] hover:bg-[var(--accent-red-hover,#FF2E36)] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
          >
            <RefreshCw size={15} />
            ลองใหม่อีกครั้ง
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Home size={15} />
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
