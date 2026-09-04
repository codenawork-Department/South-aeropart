import {
  getProductsAction,
  getProductFiltersAction,
} from "@/actions/product.actions";
import { ProductsTable } from "@/components/products/products-table";

export const metadata = {
  title: "จัดการสินค้า | South Aero Admin",
};

export default async function ProductsPage() {
  // D-1 fix: use lightweight filter (only categories + brands, no carModels/materials/installations)
  // D-3 fix: reduce default limit from 50 → 20 to shrink RSC payload
  const [{ items, pagination }, { categories, brands }] = await Promise.all([
    getProductsAction({ limit: 20 }),
    getProductFiltersAction(),
  ]);

  return (
    <div className="py-2">
      <ProductsTable
        products={items}
        pagination={pagination}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
