import React from "react";

export function ServiceUsageSkeleton() {
  return (
    <div className="bg-gradient-to-r from-[#141414] via-[#161616] to-[#121212] border border-[#242424] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#202020]">
        <div className="flex items-start gap-3 sm:gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/5 shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-48 bg-white/10 rounded" />
              <div className="h-4 w-20 bg-emerald-500/10 rounded-full" />
            </div>
            <div className="h-3 w-72 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-9 w-44 bg-white/5 rounded-lg shrink-0" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-3.5 w-24 bg-white/10 rounded" />
            <div className="h-3.5 w-10 bg-white/10 rounded" />
          </div>
          <div className="h-2 w-full bg-[#1F1F1F] rounded-full" />
          <div className="flex justify-between">
            <div className="h-2.5 w-16 bg-white/5 rounded" />
            <div className="h-2.5 w-20 bg-white/5 rounded" />
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-3.5 w-24 bg-white/10 rounded" />
            <div className="h-3.5 w-10 bg-white/10 rounded" />
          </div>
          <div className="h-2 w-full bg-[#1F1F1F] rounded-full" />
          <div className="flex justify-between">
            <div className="h-2.5 w-16 bg-white/5 rounded" />
            <div className="h-2.5 w-20 bg-white/5 rounded" />
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 sm:col-span-2 lg:col-span-1 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-3.5 w-28 bg-white/10 rounded" />
            <div className="h-3.5 w-16 bg-white/10 rounded" />
          </div>
          <div className="h-2 w-full bg-[#1F1F1F] rounded-full" />
          <div className="flex justify-between">
            <div className="h-2.5 w-20 bg-white/5 rounded" />
            <div className="h-2.5 w-16 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
