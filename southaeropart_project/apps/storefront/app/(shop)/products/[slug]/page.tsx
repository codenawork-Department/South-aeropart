import { notFound } from "next/navigation";
import { getProductBySlug } from "@/actions/bundle.actions";
import { ProductDetailClient } from "@/components/products/ProductDetailClient";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export const revalidate = 60;

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    // Check mock fallback
    const mock = MOCK_PRODUCTS.find((p) => p.slug === params.slug);
    if (mock) {
      return <ProductDetailClient product={mock} />;
    }
    return notFound();
  }

  return <ProductDetailClient product={product} />;
}
