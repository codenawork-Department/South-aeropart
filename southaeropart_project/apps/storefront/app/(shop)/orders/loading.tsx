import { OrderCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen py-10 md:py-16">
      <div className="container-main space-y-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <span className="text-[#333333]">/</span>
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#222222] gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 sm:h-10 w-72 sm:w-80" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Orders List Skeleton */}
        <div className="space-y-4">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      </div>
    </div>
  );
}
