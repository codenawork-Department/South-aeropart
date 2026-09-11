import { Skeleton } from "@/components/ui/skeleton";

export default function RootGlobalLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen relative overflow-hidden flex flex-col justify-start">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Realtime Telemetry Pulse Bar */}
      <div className="w-full border-b border-[#1C1C1C] bg-[#0D0D0D]/90 py-2.5 px-4">
        <div className="container-main flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-heading text-[0.65rem] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              SOUTH AERO // LIVE STREAMING...
            </span>
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Main Content Skeleton Frame */}
      <div className="container-main py-10 sm:py-16 space-y-8 flex-1">
        {/* Header Skeleton */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
          <Skeleton className="h-9 sm:h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Dynamic Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden flex flex-col p-4 space-y-4 shadow-xl"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-sm bg-[#181818]" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="pt-3 border-t border-[#1C1C1C] flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-24 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
