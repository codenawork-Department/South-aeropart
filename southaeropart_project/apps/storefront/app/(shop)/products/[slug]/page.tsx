import { notFound } from "next/navigation";
import { getProductBySlug } from "@/actions/bundle.actions";
import { ProductDetailClient } from "@/components/products/ProductDetailClient";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    // Check mock fallback
    const mock = MOCK_PRODUCTS.find((p) => p.slug === slug);
    if (mock) {
      return <ProductDetailClient product={mock} />;
    }
    return notFound();
  }

  return <ProductDetailClient product={product} />;
}
