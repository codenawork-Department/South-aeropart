import { DashboardViewController } from "@/components/dashboard/dashboard-view-controller";
import { getFullDashboardAnalytics } from "@/actions/analytics.actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const analyticsData = await getFullDashboardAnalytics();

  return (
    <div className="pb-10">
      <DashboardViewController initialData={analyticsData} />
    </div>
  );
}

