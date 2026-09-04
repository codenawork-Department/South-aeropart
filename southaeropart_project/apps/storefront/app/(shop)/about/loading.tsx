import { Skeleton } from "@/components/ui/skeleton";

export default function AboutLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. About Hero Section */}
      <section className="bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E] py-16 sm:py-24">
        <div className="container-main space-y-6 text-center max-w-3xl mx-auto">
          <Skeleton className="h-6 w-32 rounded-full mx-auto" />
          <Skeleton className="h-10 sm:h-14 w-full mx-auto" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>
      </section>

      {/* 2. Process Steps Grid */}
      <section className="py-14 sm:py-20 border-b border-[#222222]">
        <div className="container-main space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Skeleton className="h-4 w-28 mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-10" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Contact & Workshop Info */}
      <section className="py-14 sm:py-20">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <div className="space-y-4 pt-2">
                <Skeleton className="h-12 w-full rounded-sm" />
                <Skeleton className="h-12 w-full rounded-sm" />
                <Skeleton className="h-12 w-full rounded-sm" />
              </div>
            </div>
            <div className="lg:col-span-6 bg-[#121212] border border-[#222222] rounded-sm p-6 sm:p-8 space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-10 w-full rounded-sm" />
              <Skeleton className="h-10 w-full rounded-sm" />
              <Skeleton className="h-24 w-full rounded-sm" />
              <Skeleton className="h-11 w-36 rounded-sm" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
