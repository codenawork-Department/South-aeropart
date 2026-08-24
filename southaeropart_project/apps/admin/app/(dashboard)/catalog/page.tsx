import {
  getBrandsAction,
  getCarModelsAction,
  getCategoriesAction,
} from "@/actions/catalog.actions";
import { CatalogClient } from "./catalog-client";

export const metadata = {
  title: "แคตตาล็อก & หมวดหมู่ | South Aero Admin",
};

export default async function CatalogPage() {
  const [brands, carModels, categories] = await Promise.all([
    getBrandsAction(),
    getCarModelsAction(),
    getCategoriesAction(),
  ]);

  return (
    <div className="py-2">
      <CatalogClient
        initialBrands={brands}
        initialCarModels={carModels}
        initialCategories={categories}
      />
    </div>
  );
}
