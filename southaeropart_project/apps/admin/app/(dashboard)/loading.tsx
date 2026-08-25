import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Header Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Cloudinary / Service Usage Skeleton */}
      <div className="p-5 rounded-2xl bg-[#121212] border border-[#202020] space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
