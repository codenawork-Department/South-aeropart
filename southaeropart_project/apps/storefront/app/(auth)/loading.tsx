import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="w-full max-w-md bg-[#121212] border border-[#222222] rounded-2xl p-8 space-y-6 shadow-2xl">
      {/* Brand / Title Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-28 rounded-full mx-auto" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-3 w-64 mx-auto" />
      </div>

      {/* Social / Google Button Placeholder */}
      <Skeleton className="h-11 w-full rounded-xl" />

      <div className="flex items-center gap-3">
        <div className="h-px bg-[#222222] flex-1" />
        <Skeleton className="h-3 w-8" />
        <div className="h-px bg-[#222222] flex-1" />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Footer link */}
      <Skeleton className="h-3.5 w-40 mx-auto" />
    </div>
  );
}
