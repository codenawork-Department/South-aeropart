import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, AlertCircle, LogIn } from "lucide-react";
import { getShippingQuote } from "@/actions/shipping.actions";
import { ShippingQuoteClient } from "@/components/checkout/ShippingQuoteClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review Shipping Quote | SOUTH AERO High-Performance Aerodynamics",
  description: "Review and approve your shipping quotation for South Aero aerodynamic performance parts.",
  robots: { index: false, follow: false },
};

export default async function ShippingQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getShippingQuote(id);

  if (!r.success) {
    return (
      <main className="container-main py-12 md:py-20 text-white max-w-2xl mx-auto space-y-6">
        <Link
          href="/shipping-quotes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้ารายการคำขอราคา
        </Link>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h2 className="text-lg font-bold text-white">ไม่สามารถเข้าถึงคำขอราคานี้ได้</h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
            คำขอนี้อาจเป็นของบัญชีผู้ใช้อื่น หรือลิงก์หมดอายุแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างคำขอ หรือตรวจสอบรายการคำขอของคุณ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/shipping-quotes"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition-colors"
            >
              ดูรายการคำขอราคาของคุณ
            </Link>
            <Link
              href="/orders"
              className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white font-semibold text-xs hover:bg-neutral-700 transition-colors border border-neutral-700"
            >
              ดูคำสั่งซื้อ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-main py-10 md:py-16 text-white min-h-[70vh]">
      <ShippingQuoteClient key={`${r.quote.id}:${r.quote.version}`} quote={r.quote} />
    </main>
  );
}
