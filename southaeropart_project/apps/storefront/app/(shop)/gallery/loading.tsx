import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Header & Filter Bar */}
      <section className="bg-[#111111] border-b border-[#222222]">
        <div className="container-main py-8 md:py-10 space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
            <Skeleton className="h-8 sm:h-10 w-72 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-full max-w-xl mx-auto md:mx-0" />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-28 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-24 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-36 rounded-sm shrink-0" />
            <Skeleton className="h-9 w-44 rounded-sm shrink-0" />
          </div>
        </div>
      </section>

      {/* 2. Gallery Masonry / Grid Skeleton */}
      <section className="py-10 sm:py-16">
        <div className="container-main">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden flex flex-col shadow-xl"
              >
                <div className="relative aspect-[16/10] w-full bg-[#161616]">
                  <Skeleton className="w-full h-full rounded-none" />
                  <div className="absolute top-3 left-3">
                    <Skeleton className="h-5 w-24 rounded-sm bg-[#222222]" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
