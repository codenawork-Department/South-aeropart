import { getCategoriesAndBrandsAction } from "@/actions/product.actions";
import { ProductForm } from "@/components/products/product-form";

export const metadata = {
  title: "เพิ่มสินค้าใหม่ | South Aero Admin",
};

export default async function NewProductPage() {
  const { categories, brands, carModels, materials, installations } = await getCategoriesAndBrandsAction();

  return (
    <div className="py-2">
      <ProductForm
        categories={categories}
        brands={brands}
        carModels={carModels}
        materials={materials}
        installations={installations}
        isEdit={false}
      />
    </div>
  );
}
