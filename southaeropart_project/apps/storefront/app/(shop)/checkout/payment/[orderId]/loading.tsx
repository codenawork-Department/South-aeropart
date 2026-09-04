import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen py-10 md:py-16">
      <div className="container-main max-w-4xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-3 pb-6 border-b border-[#222222]">
          <Skeleton className="h-6 w-40 rounded-full mx-auto" />
          <Skeleton className="h-8 sm:h-10 w-72 mx-auto" />
          <div className="flex items-center justify-center gap-4 pt-1">
            <Skeleton className="h-4 w-36" />
            <span className="text-[#333333]">•</span>
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* 2-Column Payment Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* QR Code Container */}
          <div className="md:col-span-7 bg-[#121212] border border-[#222222] rounded-sm p-6 sm:p-8 space-y-6 flex flex-col items-center text-center shadow-2xl">
            {/* Bank Header */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>

            {/* QR Box */}
            <div className="w-64 h-64 bg-white/5 border-2 border-dashed border-[#333333] rounded-lg flex items-center justify-center p-6">
              <Skeleton className="w-full h-full rounded-sm" />
            </div>

            {/* Countdown timer pill */}
            <Skeleton className="h-7 w-48 rounded-full" />

            {/* Amount */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-20 mx-auto" />
              <Skeleton className="h-8 w-36 mx-auto" />
            </div>

            {/* CTA buttons */}
            <div className="w-full space-y-3 pt-2">
              <Skeleton className="h-11 w-full rounded-sm" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
          </div>

          {/* Order Summary & Security */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-4 shadow-xl">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-sm shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <div className="pt-4 border-t border-[#1E1E1E] space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between pt-2 border-t border-[#1E1E1E]">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-7 w-28" />
                </div>
              </div>
            </div>

            {/* Secure badge */}
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-sm flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
