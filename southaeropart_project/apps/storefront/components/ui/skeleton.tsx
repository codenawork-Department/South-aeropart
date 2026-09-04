import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "default" | "subtle" | "red";
}

/**
 * Base Skeleton block with smooth motorsport dark shimmer wave animation
 */
export function Skeleton({
  className = "",
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantClass =
    variant === "subtle"
      ? "skeleton-shimmer-subtle"
      : variant === "red"
      ? "skeleton-shimmer-red"
      : "skeleton-shimmer";

  return (
    <div
      className={`${variantClass} rounded-sm ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for a Single Product Card
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-[#121212] border border-[#222222] rounded-sm overflow-hidden flex flex-col h-full shadow-lg">
      {/* Product Image Frame */}
      <div className="relative aspect-[4/3] w-full bg-[#161616] p-4 flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-sm" />
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-sm bg-[#222222]" />
        </div>
        <div className="absolute top-3 right-3">
          <Skeleton className="w-7 h-7 rounded-full bg-[#222222]" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Category & Fitment */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Title */}
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          {/* Material / Specs */}
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-20 rounded-sm" />
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-24 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Product Catalog Grid
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/**
 * Skeleton for Vehicle Selector Bar
 */
export function VehicleSelectorSkeleton() {
  return (
    <div className="bg-[#111111] border-b border-[#222222] py-4">
      <div className="container-main">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-2 h-2 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>

          {/* Selector Dropdown Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-2xl">
            <Skeleton className="h-10 w-full rounded-sm" />
            <Skeleton className="h-10 w-full rounded-sm" />
            <Skeleton className="h-10 w-full rounded-sm" />
          </div>

          {/* CTA / Garage Button */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-sm" />
            <Skeleton className="h-10 w-10 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Homepage Hero Section
 */
export function HeroSectionSkeleton() {
  return (
    <div className="relative min-h-[500px] md:min-h-[620px] bg-[#0C0C0C] border-b border-[#222222] flex items-center overflow-hidden py-16 md:py-24">
      <div className="container-main w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 sm:h-14 w-full max-w-xl" />
              <Skeleton className="h-10 sm:h-14 w-3/4 max-w-lg" />
            </div>
            <div className="space-y-2 max-w-lg">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Skeleton className="h-12 w-44 rounded-sm" />
              <Skeleton className="h-12 w-36 rounded-sm" />
            </div>
          </div>

          {/* Right Column Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md aspect-video sm:aspect-square bg-[#141414] border border-[#222222] rounded-lg p-6 flex flex-col justify-between">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="w-3/4 h-36 mx-auto rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8 rounded-sm" />
                <Skeleton className="h-8 rounded-sm" />
                <Skeleton className="h-8 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Featured Bundles Slider Card
 */
export function BundleCardSkeleton() {
  return (
    <div className="min-w-[300px] sm:min-w-[380px] bg-[#121212] border border-[#222222] rounded-sm overflow-hidden flex flex-col shadow-xl">
      <Skeleton className="w-full aspect-[16/9] bg-[#161616]" />
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="space-y-3 pt-3 border-t border-[#1E1E1E]">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-sm" />
            <Skeleton className="h-5 w-20 rounded-sm" />
            <Skeleton className="h-5 w-16 rounded-sm" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-9 w-28 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Cart Row Item
 */
export function CartItemSkeleton() {
  return (
    <div className="p-4 sm:p-5 bg-[#121212] border border-[#222222] rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm shrink-0 bg-[#181818]" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-[#1E1E1E]">
        <Skeleton className="h-8 w-24 rounded-sm" />
        <div className="text-right">
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-3 w-14 ml-auto" />
        </div>
        <Skeleton className="w-8 h-8 rounded-sm shrink-0" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Cart Page
 */
export function CartPageSkeleton() {
  return (
    <div className="container-main py-10 md:py-16">
      {/* Title */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 sm:h-10 w-48" />
        <Skeleton className="h-3 w-64" />
        {/* Shipping progress bar */}
        <div className="p-4 bg-[#121212] border border-[#222222] rounded-sm space-y-2 max-w-3xl">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Grid: Items + Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items column */}
        <div className="lg:col-span-8 space-y-4">
          <CartItemSkeleton />
          <CartItemSkeleton />
          <CartItemSkeleton />
        </div>

        {/* Summary column */}
        <div className="lg:col-span-4 bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-5 shadow-xl">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="pt-4 border-t border-[#1E1E1E] flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
          <Skeleton className="h-12 w-full rounded-sm" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Checkout Page
 */
export function CheckoutPageSkeleton() {
  return (
    <div className="container-main py-10 md:py-16">
      {/* Steps Header */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-10 rounded-sm" />
          <Skeleton className="h-10 rounded-sm" />
          <Skeleton className="h-10 rounded-sm" />
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-[#121212] border border-[#222222] rounded-sm p-6 sm:p-8 space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-sm" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full rounded-sm" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full rounded-sm" />
            <Skeleton className="h-10 w-full rounded-sm" />
            <Skeleton className="h-10 w-full rounded-sm" />
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-5 bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-6 shadow-xl">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="w-14 h-14 rounded-sm shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="w-14 h-14 rounded-sm shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-20" />
              </div>
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
          <Skeleton className="h-12 w-full rounded-sm" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Customer Order History Card
 */
export function OrderCardSkeleton() {
  return (
    <div className="bg-[#121212] border border-[#222222] rounded-sm p-5 sm:p-6 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E1E1E] gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="text-left sm:text-right">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="w-12 h-12 rounded-sm" />
          <Skeleton className="w-12 h-12 rounded-sm" />
          <Skeleton className="h-4 w-20 ml-2" />
        </div>
        <Skeleton className="h-9 w-28 rounded-sm" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Order Detail View
 */
export function OrderDetailSkeleton() {
  return (
    <div className="container-main py-10 md:py-16">
      {/* Back Link */}
      <Skeleton className="h-4 w-32 mb-6" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between pb-6 border-b border-[#222222] gap-4 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-sm" />
      </div>

      {/* Timeline Stepper */}
      <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 mb-8">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-12 rounded-sm" />
          <Skeleton className="h-12 rounded-sm" />
          <Skeleton className="h-12 rounded-sm" />
          <Skeleton className="h-12 rounded-sm" />
        </div>
      </div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-[#1E1E1E]">
              <div className="flex gap-4">
                <Skeleton className="w-16 h-16 rounded-sm" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Skeleton className="w-16 h-16 rounded-sm" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between pt-2 border-t border-[#1E1E1E]">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Profile Page
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-24 md:pt-28 pb-20">
      <div className="container-main space-y-8">
        {/* User Card Header */}
        <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 flex flex-col sm:flex-row items-center gap-6">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="space-y-2 text-center sm:text-left flex-1">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
            <Skeleton className="h-3 w-36 mx-auto sm:mx-0" />
          </div>
          <Skeleton className="h-9 w-32 rounded-sm" />
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-3 border-b border-[#222222] pb-2 overflow-x-auto">
          <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
          <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
          <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
          <Skeleton className="h-10 w-36 rounded-sm shrink-0" />
        </div>

        {/* Tab Content Box */}
        <div className="bg-[#121212] border border-[#222222] rounded-sm p-6 sm:p-8 space-y-6">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
