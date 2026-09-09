"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log exception for debugging in admin client console
    console.error("[Admin Boundary Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#0A0A0A]">
      <div className="max-w-md w-full text-center space-y-6 bg-[#141414] border border-[#262626] p-8 sm:p-10 rounded-xl shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1F1F1F] text-[#E51D24] mx-auto flex items-center justify-center ring-1 ring-[#333333]">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#E51D24]">
            ADMIN SYSTEM ERROR
          </span>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
            เกิดข้อผิดพลาดในระบบแอดมิน
          </h1>
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            ระบบพบข้อขัดข้องขณะประมวลผลหน้านี้ ข้อมูลสำคัญของคุณไม่ได้รับผลกระทบ กรุณากดลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
          </p>
          {error.digest && (
            <p className="text-[10px] text-[#6B7280] font-mono">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#E51D24] hover:bg-[#FF2E36] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
          >
            <RefreshCw size={15} />
            ลองใหม่อีกครั้ง
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <LayoutDashboard size={15} />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
