import { notFound } from "next/navigation";
import { getBundleDetailAction } from "@/actions/bundle.actions";
import { getCategoriesAndBrandsAction } from "@/actions/product.actions";
import { BundleForm } from "@/components/bundles/bundle-form";

export const metadata = {
  title: "แก้ไขชุดเซ็ตสินค้า | South Aero Admin",
};

interface EditBundlePageProps {
  params: {
    id: string;
  };
}

export default async function EditBundlePage({ params }: EditBundlePageProps) {
  const [bundleRes, { brands, carModels, materials, installations }] = await Promise.all([
    getBundleDetailAction(params.id),
    getCategoriesAndBrandsAction(),
  ]);

  if (!bundleRes.success || !bundleRes.bundle) {
    notFound();
  }

  return (
    <div className="py-2">
      <BundleForm
        brands={brands}
        carModels={carModels}
        materials={materials}
        installations={installations}
        initialData={bundleRes.bundle as any}
        isEdit={true}
      />
    </div>
  );
}
