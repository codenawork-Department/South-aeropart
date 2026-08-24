import { notFound } from "next/navigation";
import {
  getProductByIdAction,
  getCategoriesAndBrandsAction,
} from "@/actions/product.actions";
import { ProductForm } from "@/components/products/product-form";

export const metadata = {
  title: "แก้ไขสินค้า | South Aero Admin",
};

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [product, { categories, brands, carModels }] = await Promise.all([
    getProductByIdAction(params.id),
    getCategoriesAndBrandsAction(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="py-2">
      <ProductForm
        initialData={product}
        categories={categories}
        brands={brands}
        carModels={carModels}
        isEdit={true}
      />
    </div>
  );
}
