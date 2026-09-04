import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Collection Hero Header */}
      <section className="bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E]">
        <div className="container-main py-12 md:py-16 text-center max-w-3xl mx-auto space-y-3">
          <Skeleton className="h-6 w-36 rounded-full mx-auto" />
          <Skeleton className="h-10 sm:h-12 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>
      </section>

      {/* 2. Flagship Kits Showcase */}
      <section className="py-12 md:py-20">
        <div className="container-main space-y-12 md:space-y-16">
          {/* Kit Card 1 */}
          <div className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 sm:h-10 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                {/* Parts included chips */}
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-3 w-28" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-6 w-28 rounded-sm" />
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-6 w-20 rounded-sm" />
                  </div>
                </div>
                {/* Pricing & CTA */}
                <div className="pt-4 border-t border-[#1E1E1E] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-32" />
                  </div>
                  <Skeleton className="h-11 w-40 rounded-sm" />
                </div>
              </div>
              <div className="lg:col-span-5">
                <Skeleton className="w-full aspect-[16/10] rounded-sm bg-[#161616]" />
              </div>
            </div>
          </div>

          {/* Kit Card 2 */}
          <div className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5 order-2 lg:order-1">
                <Skeleton className="w-full aspect-[16/10] rounded-sm bg-[#161616]" />
              </div>
              <div className="lg:col-span-7 space-y-5 order-1 lg:order-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 sm:h-10 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-3 w-28" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-6 w-28 rounded-sm" />
                    <Skeleton className="h-6 w-24 rounded-sm" />
                  </div>
                </div>
                <div className="pt-4 border-t border-[#1E1E1E] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-32" />
                  </div>
                  <Skeleton className="h-11 w-40 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
