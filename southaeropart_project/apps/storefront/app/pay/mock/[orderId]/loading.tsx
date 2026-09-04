import { Skeleton } from "@/components/ui/skeleton";

export default function MockMobilePayLoading() {
  return (
    <div className="min-h-screen bg-[#070707] py-8 sm:py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Mobile Bank Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#222222]">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Amount Box */}
        <div className="bg-[#1C1C1C] rounded-xl p-5 text-center space-y-2">
          <Skeleton className="h-3 w-24 mx-auto" />
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-3 w-36 mx-auto" />
        </div>

        {/* Order Details List */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-[#222222]">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
