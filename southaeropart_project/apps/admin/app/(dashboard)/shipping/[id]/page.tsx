import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { getAdminShippingQuote } from "@/actions/shipping.actions";
import { ShippingOfferForm } from "@/components/shipping/ShippingForms";

export const dynamic = "force-dynamic";

export default async function AdminShippingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAdminShippingQuote(id);

  if (!result.success) {
    return (
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
        <Link
          href="/shipping"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้ารายการค่าจัดส่ง
        </Link>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-rose-200">ไม่พบคำขอราคาจัดส่ง</h3>
            <p className="text-xs text-rose-300/80 mt-1">{result.error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <ShippingOfferForm key={result.quote.version} data={result} />
    </main>
  );
}
