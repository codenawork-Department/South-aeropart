import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen py-10 md:py-16">
      <div className="container-main space-y-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <span className="text-[#333333]">/</span>
          <Skeleton className="h-3 w-20" />
          <span className="text-[#333333]">/</span>
          <Skeleton className="h-3 w-24" />
          <span className="text-[#333333]">/</span>
          <Skeleton className="h-3 w-40" />
        </div>

        {/* 2-Column Product Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Visuals (Image Gallery / 3D Viewer) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-[#121212] border border-[#222222] rounded-sm p-4 flex items-center justify-center overflow-hidden">
              <Skeleton className="w-full h-full rounded-sm" />
              <div className="absolute top-4 left-4 flex gap-2">
                <Skeleton className="h-6 w-20 rounded-sm bg-[#1E1E1E]" />
                <Skeleton className="h-6 w-24 rounded-sm bg-[#1E1E1E]" />
              </div>
              <div className="absolute bottom-4 right-4">
                <Skeleton className="w-9 h-9 rounded-sm bg-[#1E1E1E]" />
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <Skeleton className="aspect-square w-full rounded-sm bg-[#141414] border border-[#262626]" />
              <Skeleton className="aspect-square w-full rounded-sm bg-[#141414] border border-[#262626]" />
              <Skeleton className="aspect-square w-full rounded-sm bg-[#141414] border border-[#262626]" />
              <Skeleton className="aspect-square w-full rounded-sm bg-[#141414] border border-[#262626]" />
              <Skeleton className="aspect-square w-full rounded-sm bg-[#141414] border border-[#262626] hidden sm:block" />
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Brand & Category */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>

            {/* Title & SKU */}
            <div className="space-y-2">
              <Skeleton className="h-8 sm:h-10 w-full" />
              <Skeleton className="h-8 sm:h-10 w-3/4" />
              <Skeleton className="h-3 w-32" />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>

            {/* Price Box */}
            <div className="p-4 bg-[#121212] border border-[#222222] rounded-sm space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>

            {/* Finish Options */}
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-28" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
              </div>
            </div>

            {/* Action Buttons: Quantity + Add to Cart + Wishlist */}
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-12 w-28 rounded-sm shrink-0" />
              <Skeleton className="h-12 flex-1 rounded-sm" />
              <Skeleton className="h-12 w-12 rounded-sm shrink-0" />
            </div>

            {/* Compatibility Box */}
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-sm space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Specifications Accordion Placeholders */}
            <div className="space-y-2 pt-2 border-t border-[#1E1E1E]">
              <div className="p-3 bg-[#111111] border border-[#222222] rounded-sm flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="p-3 bg-[#111111] border border-[#222222] rounded-sm flex justify-between items-center">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
