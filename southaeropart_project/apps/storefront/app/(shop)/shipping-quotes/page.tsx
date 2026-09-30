import { Metadata } from "next";
import { listShippingQuotes } from "@/actions/shipping.actions";
import {
  ShippingQuotesListClient,
  type CustomerShippingQuote,
} from "@/components/checkout/ShippingQuotesListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shipping Quotations | SOUTH AERO High-Performance Aerodynamics",
  description: "Track and review shipping quotes for custom and oversize aerodynamic performance parts.",
  robots: { index: false, follow: false },
};

export default async function ShippingQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const p = (await searchParams).page;
  const page = p && /^\d{1,4}$/.test(p) ? Math.max(1, Math.min(1000, Number(p))) : 1;
  const result = await listShippingQuotes(page);

  const quotes = result.success ? (result.quotes as unknown as CustomerShippingQuote[]) : [];
  const hasMore = result.success ? result.hasMore : false;

  return (
    <main className="container-main py-10 md:py-16 text-white min-h-[70vh]">
      <ShippingQuotesListClient
        initialQuotes={quotes}
        page={page}
        hasMore={hasMore}
      />
    </main>
  );
}
