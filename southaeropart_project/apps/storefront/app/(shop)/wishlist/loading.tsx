import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen py-10 md:py-16">
      <div className="container-main space-y-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <span className="text-[#333333]">/</span>
          <Skeleton className="h-3 w-28" />
        </div>

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#222222] gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 sm:h-10 w-72" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pb-2">
          <Skeleton className="h-9 w-20 rounded-sm" />
          <Skeleton className="h-9 w-32 rounded-sm" />
          <Skeleton className="h-9 w-32 rounded-sm" />
        </div>

        {/* Wishlist Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden flex flex-col shadow-lg"
            >
              <div className="relative aspect-[4/3] w-full bg-[#161616] p-4 flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-sm" />
                <div className="absolute top-3 right-3">
                  <Skeleton className="w-8 h-8 rounded-full bg-[#222222]" />
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
                <div className="pt-3 border-t border-[#1C1C1C] space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
