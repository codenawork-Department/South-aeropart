import { CartPageSkeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <CartPageSkeleton />
    </div>
  );
}
