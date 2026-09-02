import { notFound } from "next/navigation";
import { getOrderByIdAction, getAdminStaffListAction } from "@/actions/order.actions";
import { OrderDetailAdminClient } from "@/components/orders/OrderDetailAdminClient";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const [orderRes, staffList] = await Promise.all([
    getOrderByIdAction(params.id),
    getAdminStaffListAction(),
  ]);

  if (!orderRes.success || !orderRes.data) {
    notFound();
  }

  const { order, customer, items, history } = orderRes.data;

  return (
    <OrderDetailAdminClient
      order={order}
      customer={customer}
      items={items}
      history={history}
      staffList={staffList}
    />
  );
}
