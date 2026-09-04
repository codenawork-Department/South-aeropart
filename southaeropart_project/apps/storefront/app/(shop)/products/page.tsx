import { Suspense } from "react";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { VehicleSelector } from "@/components/home/VehicleSelector";
import { ProductsGrid } from "@/components/products/ProductsGrid";
import { VehicleBundleHero } from "@/components/products/VehicleBundleHero";
import {
  VehicleSelectorSkeleton,
  ProductGridSkeleton,
} from "@/components/ui/skeleton";
import {
  getShopProducts,
  getActiveCategories,
} from "@/actions/product.actions";
import {
  getVehicleSelectorData,
  getUserGarageVehicles,
} from "@/actions/vehicle.actions";
import { getFeaturedBundleForVehicle } from "@/actions/bundle.actions";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams?: {
    make?: string;
    model?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
  } | Promise<{
    make?: string;
    model?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = (await searchParams) || {};
  const makeParam = params.make || "";
  const modelParam = params.model || "";
  const categoryParam = params.category || "all";
  const searchParam = params.q || "";
  const sortParam = params.sort || "newest-desc";
  const pageParam = Number(params.page || "1");

  const [sortBy, sortDir] = sortParam.split("-") as [string, string];

  const hasFilter = Boolean(makeParam);

  // Prefetch all data in parallel on the server from database
  const [initialProducts, activeCategories, vehicleData, garageVehicles, featuredBundle] =
    await Promise.all([
      getShopProducts({
        category: categoryParam === "all" ? undefined : categoryParam,
        search: searchParam || undefined,
        brandSlug: makeParam || undefined,
        modelSlug: modelParam || undefined,
        sortBy: (sortBy as "name" | "price" | "newest") || "newest",
        sortDir: (sortDir as "asc" | "desc") || "desc",
        page: pageParam,
        pageSize: 12,
      }),
      getActiveCategories(),
      getVehicleSelectorData(),
      getUserGarageVehicles(),
      getFeaturedBundleForVehicle(makeParam || undefined, modelParam || undefined),
    ]);

  const currentBrandObj = makeParam ? vehicleData.find((b) => b.slug === makeParam) : undefined;
  const currentModelObj = currentBrandObj?.models.find((m) => m.slug === modelParam);

  const makeLabel = currentBrandObj?.name.toUpperCase() || (makeParam ? makeParam.replace(/-/g, " ").toUpperCase() : "");
  const modelLabel = currentModelObj
    ? `${currentModelObj.name} ${currentModelObj.generation ? `(${currentModelObj.generation})` : ""}`.toUpperCase()
    : (modelParam ? modelParam.replace(/-/g, " ").toUpperCase() : "");

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Select Your Vehicle Bar with My Garage Quick-Select */}
      <Suspense fallback={<VehicleSelectorSkeleton />}>
        <VehicleSelector
          initialBrands={vehicleData}
          initialGarageVehicles={garageVehicles}
        />
      </Suspense>

      {/* 2. Flagship Model Feature Hero Banner (Dynamic DB-Driven Bundle / Set) */}
      <VehicleBundleHero
        bundle={featuredBundle}
        makeLabel={makeLabel}
        modelLabel={modelLabel}
        hasFilter={hasFilter}
      />

      {/* 3. Products Grid (search, filter, sort, pagination — DB connected) */}
      <Suspense
        key={`suspense-grid-${makeParam}-${modelParam}`}
        fallback={
          <div className="container-main py-10">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <ProductsGrid
          key={`products-grid-${makeParam}-${modelParam}`}
          initialData={initialProducts}
          categories={activeCategories}
        />
      </Suspense>

      {/* 4. Newsletter & 5. Feature Badges */}
      <NewsletterSection />
      <FeatureBadges />
    </div>
  );
}

