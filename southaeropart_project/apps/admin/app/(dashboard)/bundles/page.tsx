import { getBundlesAction } from "@/actions/bundle.actions";
import { getCategoriesAndBrandsAction } from "@/actions/product.actions";
import { BundlesTable } from "@/components/bundles/bundles-table";

export const metadata = {
  title: "จัดการชุดเซ็ตสินค้า (Aero Kits) | South Aero Admin",
};

export default async function BundlesPage() {
  const [{ items, pagination }, { carModels, brands }] = await Promise.all([
    getBundlesAction({ limit: 50 }),
    getCategoriesAndBrandsAction(),
  ]);

  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const enrichedModels = carModels.map((m) => ({
    ...m,
    brandName: brandMap.get(m.brandId) || "",
  }));

  return (
    <div className="py-2">
      <BundlesTable
        bundles={items as any}
        pagination={pagination}
        carModels={enrichedModels}
      />
    </div>
  );
}
