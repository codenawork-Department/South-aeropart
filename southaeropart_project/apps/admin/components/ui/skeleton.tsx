import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base Skeleton block with smooth dark-mode shimmer wave animation
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for Dashboard Metric / KPI Cards
 */
export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#121212] border border-[#202020] space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/**
 * Skeleton for Data Tables (e.g. Products, Orders)
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-[#121212] border border-[#202020] rounded-2xl overflow-hidden shadow-xl">
      {/* Table Top Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#1E1E1E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Table Header */}
      <div className="px-5 py-3.5 bg-[#161616] border-b border-[#1E1E1E] flex items-center justify-between gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={`h-4 ${idx === 0 ? "w-44" : idx === 1 ? "w-28" : "w-20"}`}
          />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[#1A1A1A]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-48">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-28 hidden sm:block" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full hidden md:block" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for 2-column Product Form
 */
export function ProductFormSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Basic Info */}
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>

          {/* Card 2: Key Features */}
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>

          {/* Card 3: Media Upload */}
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-32 w-full rounded-xl border-2 border-dashed border-[#262626]" />
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="p-6 rounded-2xl bg-[#121212] border border-[#202020] space-y-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Catalog Master Data & Icons
 */
export function CatalogTabSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#202020] pb-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#131313] border border-[#202020] flex flex-col items-center space-y-2.5"
          >
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
