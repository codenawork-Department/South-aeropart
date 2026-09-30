import { getProductShipping } from "@/actions/shipping.actions";
import { ProductShippingForm } from "./ShippingForms";
export async function ProductShippingCard({ productId }: { productId: string }) {
  const result = await getProductShipping(productId);
  return result.success ? <ProductShippingForm initial={result.data} /> : <p className="p-4 text-neutral-400">{result.error}</p>;
}
