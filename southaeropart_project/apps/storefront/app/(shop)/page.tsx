import { Suspense } from "react";
import { VehicleSelector } from "@/components/home/VehicleSelector";
import { getVehicleSelectorData } from "@/actions/vehicle.actions";
import { getHomepageHeroCards } from "@/actions/homepage.actions";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSlider } from "@/components/home/FeaturedSlider";
import { ProductCategories } from "@/components/home/ProductCategories";
import { InfoSections } from "@/components/home/InfoSections";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export const revalidate = 60;

export default async function HomePage() {
  const [vehicleData, heroCards] = await Promise.all([
    getVehicleSelectorData(),
    getHomepageHeroCards(),
  ]);

  return (
    <>
      <Suspense fallback={<VehicleSelector initialBrands={vehicleData} />}>
        <VehicleSelector initialBrands={vehicleData} />
      </Suspense>
      <HeroSection initialCards={heroCards} />
      <FeaturedSlider />
      <ProductCategories />
      <InfoSections />
      <FeatureBadges />
      <NewsletterSection />
    </>
  );
}
