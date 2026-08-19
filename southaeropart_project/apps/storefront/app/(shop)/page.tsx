import { VehicleSelector } from "@/components/home/VehicleSelector";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedSlider } from "@/components/home/FeaturedSlider";
import { ProductCategories } from "@/components/home/ProductCategories";
import { InfoSections } from "@/components/home/InfoSections";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export default function HomePage() {
  return (
    <>
      <VehicleSelector />
      <HeroSection />
      <FeaturedSlider />
      <ProductCategories />
      <InfoSections />
      <FeatureBadges />
      <NewsletterSection />
    </>
  );
}
