import { getOrdersAction, getOrderStatsAction } from "@/actions/order.actions";
import { OrdersDashboardClient } from "@/components/orders/OrdersDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
    status?: string;
    page?: string;
  };
}) {
  const search = searchParams?.search || "";
  const status = searchParams?.status || "all";
  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;

  const [ordersRes, statsRes] = await Promise.all([
    getOrdersAction({ search, status, page, limit: 20 }),
    getOrderStatsAction(),
  ]);

  const ordersData = ordersRes.success && ordersRes.data ? ordersRes.data : { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  const statsData = statsRes.success && statsRes.data ? statsRes.data : {
    totalOrders: 0,
    pendingOrders: 0,
    paidOrProcessing: 0,
    shippedOrDelivered: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
  };

  return (
    <OrdersDashboardClient
      initialOrders={ordersData.items as any}
      stats={statsData}
      pagination={ordersData.pagination}
      currentSearch={search}
      currentStatus={status}
    />
  );
}
