import { listAdminShippingQuotes, getShippingSettings, getShippingStatsAction } from "@/actions/shipping.actions";
import { ShippingDashboardClient, type ShippingQuoteRow } from "@/components/shipping/ShippingDashboardClient";

export const dynamic = "force-dynamic";

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const page = typeof p.page === "string" && /^\d{1,4}$/.test(p.page) ? Math.max(1, Math.min(1000, Number(p.page))) : 1;
  const status = typeof p.status === "string" ? p.status : "all";
  const sort = typeof p.sort === "string" ? p.sort : "newest";
  const search = typeof p.search === "string" ? p.search : "";

  const [quotesResult, statsResult, settingsResult] = await Promise.all([
    listAdminShippingQuotes({ page, status, sort, search }),
    getShippingStatsAction(),
    getShippingSettings(),
  ]);

  const quotes = quotesResult.success ? (quotesResult.rows as unknown as ShippingQuoteRow[]) : [];
  const pagination = quotesResult.success && quotesResult.pagination
    ? quotesResult.pagination
    : { page: 1, limit: 20, total: quotes.length, totalPages: 1 };

  const stats = statsResult.success
    ? statsResult.data
    : { requested: 0, offered: 0, converted: 0, declined: 0, cancelled: 0, total: 0 };

  const settings = settingsResult.success ? settingsResult.data : null;

  return (
    <main className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <ShippingDashboardClient
        initialQuotes={quotes}
        stats={stats}
        pagination={pagination}
        currentSearch={search}
        currentStatus={status}
        currentSort={sort}
        settings={settings}
      />
    </main>
  );
}
