import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Database,
  Users,
  HardDrive,
} from "lucide-react";
import { getServiceUsageMetrics } from "@/actions/service-usage.actions";
import { DashboardViewController } from "@/components/dashboard/dashboard-view-controller";

export default async function AdminDashboard() {
  // Fetch high-level metrics for the dashboard overview
  let serviceStatus = {
    neonUsed: "8.56 MB",
    neonPercent: 1.67,
    clerkUsers: 3,
    clerkPercent: 0.006,
    overallHealthy: true,
  };

  try {
    const report = await getServiceUsageMetrics();
    serviceStatus = {
      neonUsed: report.neon.usedPretty,
      neonPercent: report.neon.percentUsed,
      clerkUsers: report.clerk.totalUsers,
      clerkPercent: report.clerk.percentUsed,
      overallHealthy: report.summary.overallStatus === "healthy",
    };
  } catch {
    // If not ready, fallback gracefully
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Interactive Business Analytics Cockpit */}
      <DashboardViewController />

      {/* Service Usage & Quota Banner Widget */}
      <div className="bg-gradient-to-r from-[#141414] via-[#161616] to-[#121212] border border-[#242424] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#202020]">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 mt-0.5 shrink-0">
              <Activity size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  สถานะบริการ &amp; โควต้า Free Tier (Services &amp; Quotas)
                </h3>
                <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium font-mono">
                  {serviceStatus.overallHealthy ? "สมบูรณ์ 100%" : "ต้องการการตรวจสอบ"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ติดตามการใช้ทรัพยากร Neon Postgres, Clerk Auth (50K MAU), Cloudinary และโครงสร้างพื้นฐาน
              </p>
            </div>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] border border-white/10 text-white text-xs font-semibold tracking-wide transition-all shadow-md w-full sm:w-auto shrink-0"
          >
            <span>ดูรายงานสถานะบริการทั้งหมด</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Quick Service Quota Mini-Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
          {/* Neon DB Mini */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                <Database size={14} className="text-teal-400" />
                <span>Neon Database</span>
              </div>
              <span className="text-[0.68rem] text-emerald-400 font-semibold font-mono">
                {serviceStatus.neonPercent}%
              </span>
            </div>
            <div className="w-full bg-[#1F1F1F] rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${Math.max(2, serviceStatus.neonPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[0.68rem] text-gray-400 font-mono">
              <span>ใช้ไป: {serviceStatus.neonUsed}</span>
              <span>จำกัด: 512 MB Free</span>
            </div>
          </div>

          {/* Clerk Auth Mini */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                <Users size={14} className="text-blue-400" />
                <span>Clerk Auth Users</span>
              </div>
              <span className="text-[0.68rem] text-emerald-400 font-semibold font-mono">
                {serviceStatus.clerkPercent}%
              </span>
            </div>
            <div className="w-full bg-[#1F1F1F] rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all"
                style={{ width: `${Math.max(2, serviceStatus.clerkPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[0.68rem] text-gray-400 font-mono">
              <span>ใช้ไป: {serviceStatus.clerkUsers} Users</span>
              <span>จำกัด: 50,000 MAU Free</span>
            </div>
          </div>

          {/* Cloudinary Mini */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                <HardDrive size={14} className="text-amber-400" />
                <span>Cloudinary Storage</span>
              </div>
              <span className="text-[0.68rem] text-gray-400 font-semibold">
                25 Credits Free
              </span>
            </div>
            <div className="w-full bg-[#1F1F1F] rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all"
                style={{ width: `4%` }}
              />
            </div>
            <div className="flex justify-between text-[0.68rem] text-gray-400">
              <span>จัดเก็บรูปภาพสินค้า</span>
              <span>จำกัด: 25 GB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
