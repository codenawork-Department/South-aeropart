import {
  getProductsAction,
  getCategoriesAndBrandsAction,
} from "@/actions/product.actions";
import { ProductsTable } from "@/components/products/products-table";

export const metadata = {
  title: "จัดการสินค้า | South Aero Admin",
};

export default async function ProductsPage() {
  const [{ items, pagination }, { categories, brands }] = await Promise.all([
    getProductsAction({ limit: 50 }),
    getCategoriesAndBrandsAction(),
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
