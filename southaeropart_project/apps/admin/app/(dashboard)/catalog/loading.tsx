import { CatalogTabSkeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="py-2 animate-in fade-in duration-150">
      <CatalogTabSkeleton />
    </div>
  );
}
