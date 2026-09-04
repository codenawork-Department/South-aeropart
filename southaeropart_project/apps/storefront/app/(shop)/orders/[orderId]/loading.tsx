import { OrderDetailSkeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <OrderDetailSkeleton />
    </div>
  );
}
