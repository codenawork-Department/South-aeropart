import { listReconciliationJobsAction } from "@/actions/reconciliation.actions";
import { ReconciliationDashboardClient } from "@/components/orders/ReconciliationDashboardClient";
import { validateSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Reconciliation Queue | South Aero Admin",
  description: "จัดการและตรวจสอบรายการชำระเงินที่ต้องการการยืนยันจากเจ้าหน้าที่",
};

export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    search?: string;
    state?: string;
    page?: string;
  }>;
}) {
  const admin = await validateSession();
  if (!admin) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || "";
  const state = resolvedParams.state || "all";
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const result = await listReconciliationJobsAction({
    search,
    state: state as any,
    page: isNaN(page) ? 1 : page,
    limit: 20,
  });

  const fallbackData = {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    counts: { all: 0, pendingReview: 0, refunded: 0, fulfilledManually: 0, dismissed: 0 },
  };

  const data = result.success && result.data ? result.data : fallbackData;

  return (
    <ReconciliationDashboardClient
      initialItems={data.items}
      pagination={data.pagination}
      counts={data.counts}
      currentSearch={search}
      currentState={state}
      adminRole={admin.role}
    />
  );
}
