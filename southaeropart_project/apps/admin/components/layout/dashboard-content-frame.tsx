"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "./navigation-context";
import DashboardLoading from "@/app/(dashboard)/loading";
import ProductsLoading from "@/app/(dashboard)/products/loading";
import CatalogLoading from "@/app/(dashboard)/catalog/loading";
import { ProductFormSkeleton, TableSkeleton } from "@/components/ui/skeleton";

interface DashboardContentFrameProps {
  children: React.ReactNode;
}

export function DashboardContentFrame({ children }: DashboardContentFrameProps) {
  const pathname = usePathname();
  const { pendingPathname } = useNavigation();

  // If user has clicked a new route that is different from current page
  if (pendingPathname && pendingPathname !== pathname) {
    if (pendingPathname === "/") {
      return <DashboardLoading />;
    }

    if (
      pendingPathname.startsWith("/products/new") ||
      pendingPathname.includes("/edit")
    ) {
      return (
        <div className="py-2 animate-in fade-in duration-100">
          <ProductFormSkeleton />
        </div>
      );
    }

    if (pendingPathname.startsWith("/products")) {
      return <ProductsLoading />;
    }

    if (pendingPathname.startsWith("/catalog")) {
      return <CatalogLoading />;
    }

    if (pendingPathname.startsWith("/orders") || pendingPathname.startsWith("/reviews")) {
      return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <div className="h-7 w-48 bg-[#181818] rounded-xl skeleton-shimmer" />
            <div className="h-9 w-32 bg-[#181818] rounded-xl skeleton-shimmer" />
          </div>
          <TableSkeleton rows={6} columns={5} />
        </div>
      );
    }

    if (pendingPathname.startsWith("/services")) {
      return <DashboardLoading />;
    }

    // Default skeleton fallback
    return <ProductsLoading />;
  }

  // Real rendered page content
  return <>{children}</>;
}
