import { Suspense } from "react";
import { VehicleSelector } from "@/components/home/VehicleSelector";
import { VehicleSelectorSkeleton } from "@/components/ui/skeleton";
import {
  getVehicleSelectorData,
  getUserGarageVehicles,
} from "@/actions/vehicle.actions";
import { getHomepageHeroCards } from "@/actions/homepage.actions";
import { getFeaturedBundles } from "@/actions/bundle.actions";
import { getFeaturedProducts } from "@/actions/product.actions";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSlider } from "@/components/home/FeaturedSlider";
import { FeaturedProductsSection } from "@/components/home/FeaturedProductsSection";
import { InfoSections } from "@/components/home/InfoSections";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [vehicleData, garageVehicles, heroCards, featuredBundles, featuredProducts] =
    await Promise.all([
      getVehicleSelectorData(),
      getUserGarageVehicles(),
      getHomepageHeroCards(),
      getFeaturedBundles(),
      getFeaturedProducts(),
    ]);

  return (
    <>
      <Suspense fallback={<VehicleSelectorSkeleton />}>
        <VehicleSelector
          initialBrands={vehicleData}
          initialGarageVehicles={garageVehicles}
        />
      </Suspense>
      <HeroSection initialCards={heroCards} />
      <FeaturedSlider initialBundles={featuredBundles} />
      <FeaturedProductsSection initialProducts={featuredProducts} />
      <InfoSections />
      <FeatureBadges />
      <NewsletterSection />
    </>
  );
}
