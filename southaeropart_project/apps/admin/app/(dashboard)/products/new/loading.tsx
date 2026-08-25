import { ProductFormSkeleton } from "@/components/ui/skeleton";

export default function NewProductLoading() {
  return (
    <div className="py-2 animate-in fade-in duration-150">
      <ProductFormSkeleton />
    </div>
  );
}
