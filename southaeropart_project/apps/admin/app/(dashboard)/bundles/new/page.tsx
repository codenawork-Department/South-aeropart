import { getCategoriesAndBrandsAction } from "@/actions/product.actions";
import { BundleForm } from "@/components/bundles/bundle-form";

export const metadata = {
  title: "สร้างชุดเซ็ตสินค้าใหม่ | South Aero Admin",
};

export default async function NewBundlePage() {
  const { brands, carModels, materials, installations } = await getCategoriesAndBrandsAction();

  return (
    <div className="py-2">
      <BundleForm
        brands={brands}
        carModels={carModels}
        materials={materials}
        installations={installations}
        isEdit={false}
      />
    </div>
  );
}
