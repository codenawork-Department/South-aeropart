import {
  getBrandsAction,
  getCarModelsAction,
  getCategoriesAction,
} from "@/actions/catalog.actions";
import { getIconsAction } from "@/actions/icon.actions";
import { CatalogClient } from "./catalog-client";

export const metadata = {
  title: "แคตตาล็อก & คลังไอคอน | South Aero Admin",
};

export default async function CatalogPage() {
  const [brands, carModels, categories, iconsRes] = await Promise.all([
    getBrandsAction(),
    getCarModelsAction(),
    getCategoriesAction(),
    getIconsAction(),
  ]);

  return (
    <div className="py-2">
      <CatalogClient
        initialBrands={brands}
        initialCarModels={carModels}
        initialCategories={categories}
        initialIcons={iconsRes.success && iconsRes.data ? iconsRes.data : []}
      />
    </div>
  );
}
