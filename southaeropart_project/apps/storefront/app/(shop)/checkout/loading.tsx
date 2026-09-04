import { CheckoutPageSkeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <CheckoutPageSkeleton />
    </div>
  );
}
