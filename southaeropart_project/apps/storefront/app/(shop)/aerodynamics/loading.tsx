import { Skeleton } from "@/components/ui/skeleton";

export default function AerodynamicsLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Aero Hero Section */}
      <section className="bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E] py-14 sm:py-20">
        <div className="container-main space-y-6 text-center max-w-3xl mx-auto">
          <Skeleton className="h-6 w-44 rounded-full mx-auto" />
          <Skeleton className="h-10 sm:h-14 w-full mx-auto" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-4 w-4/6 mx-auto" />
        </div>
      </section>

      {/* 2. Telemetry Quick Metrics Bar */}
      <section className="border-b border-[#222222] bg-[#0E0E0E] py-8">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#121212] border border-[#222222] rounded-sm p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="w-5 h-5 rounded-full" />
                </div>
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Tab Nav & CFD Showcase */}
      <section className="py-12 md:py-16">
        <div className="container-main space-y-8">
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
            <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
            <Skeleton className="h-10 w-44 rounded-sm shrink-0" />
            <Skeleton className="h-10 w-40 rounded-sm shrink-0" />
            <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
          </div>

          <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 sm:p-10 space-y-6 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-8 sm:h-10 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-10 w-full rounded-sm" />
                  <Skeleton className="h-10 w-full rounded-sm" />
                </div>
              </div>
              <div className="lg:col-span-6">
                <Skeleton className="w-full aspect-[16/10] rounded-sm bg-[#161616]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
