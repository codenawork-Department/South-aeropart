import { Suspense } from "react";
import { DashboardViewController } from "@/components/dashboard/dashboard-view-controller";
import { ServiceUsageBanner } from "@/components/dashboard/service-usage-banner";
import { ServiceUsageSkeleton } from "@/components/dashboard/service-usage-skeleton";

export default function AdminDashboard() {
  return (
    <div className="space-y-8 pb-10">
      {/* Interactive Business Analytics Cockpit (Renders instantly) */}
      <DashboardViewController />

      {/* Service Usage & Quota Banner Widget (Streamed concurrently via Suspense) */}
      <Suspense fallback={<ServiceUsageSkeleton />}>
        <ServiceUsageBanner />
      </Suspense>
    </div>
  );
}
