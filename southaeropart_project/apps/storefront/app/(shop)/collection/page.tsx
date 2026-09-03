import { Metadata } from "next";
import { getActiveBundles } from "@/actions/bundle.actions";
import { CollectionClient } from "@/components/collection/CollectionClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aero Collections & Flagship Kits | South Aeropart",
  description:
    "Explore complete high-performance aerodynamic kits and packages engineered with Computational Fluid Dynamics (CFD) by South Aeropart.",
  keywords: [
    "aerodynamic kits",
    "body kits",
    "Accord G9 aero kit",
    "CFD aero packages",
    "South Aeropart collection",
    "ชุดแต่งรอบคัน",
  ],
};

export default async function CollectionPage() {
  const activeBundles = await getActiveBundles();

  return <CollectionClient activeBundles={activeBundles} />;
}
