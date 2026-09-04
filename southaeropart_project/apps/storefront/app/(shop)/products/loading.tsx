import {
  VehicleSelectorSkeleton,
  ProductGridSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Vehicle Selector Skeleton */}
      <VehicleSelectorSkeleton />

      {/* 2. Bundle Hero Banner Skeleton */}
      <div className="border-b border-[#222222] bg-[#0E0E0E] py-10 sm:py-14">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-36 rounded-full" />
              </div>
              <Skeleton className="h-9 sm:h-12 w-full max-w-lg" />
              <Skeleton className="h-4 w-3/4 max-w-md" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 w-36 rounded-sm" />
                <Skeleton className="h-10 w-28 rounded-sm" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <Skeleton className="w-full aspect-[16/9] rounded-sm bg-[#161616]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Catalog Controls & Grid Skeleton */}
      <div className="container-main py-10 sm:py-14 space-y-8">
        {/* Controls Toolbar (Search, Filter Pills, Sort) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
          <Skeleton className="h-10 w-full md:w-80 rounded-sm" />
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <Skeleton className="h-9 w-20 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-28 rounded-sm shrink-0" />
          </div>
          <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
        </div>

        {/* 4. Products Grid Skeleton */}
        <ProductGridSkeleton count={8} />

        {/* 5. Pagination Bar */}
        <div className="pt-8 flex justify-center gap-2">
          <Skeleton className="w-10 h-10 rounded-sm" />
          <Skeleton className="w-10 h-10 rounded-sm" />
          <Skeleton className="w-10 h-10 rounded-sm" />
          <Skeleton className="w-10 h-10 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
