import {
  VehicleSelectorSkeleton,
  HeroSectionSkeleton,
  BundleCardSkeleton,
  ProductCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Vehicle Selector Skeleton */}
      <VehicleSelectorSkeleton />

      {/* 2. Hero Section Skeleton */}
      <HeroSectionSkeleton />

      {/* 3. Featured Bundles Slider Skeleton */}
      <section className="py-14 sm:py-20 border-b border-[#222222] bg-[#0E0E0E]">
        <div className="container-main space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 sm:h-10 w-64 sm:w-80" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-10 h-10 rounded-sm" />
              <Skeleton className="w-10 h-10 rounded-sm" />
            </div>
          </div>
          <div className="flex gap-6 overflow-hidden">
            <BundleCardSkeleton />
            <BundleCardSkeleton />
            <BundleCardSkeleton />
          </div>
        </div>
      </section>

      {/* 4. Featured Products Grid Skeleton */}
      <section className="py-16 sm:py-24 border-b border-[#222222]">
        <div className="container-main space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 sm:h-10 w-72" />
            </div>
            <Skeleton className="h-10 w-36 rounded-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </div>
      </section>

      {/* 5. Telemetry & Feature Badges Skeleton */}
      <div className="py-12 bg-[#0D0D0D] border-b border-[#222222]">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
