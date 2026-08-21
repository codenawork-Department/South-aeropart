import type { Metadata } from "next";
import { getServiceUsageMetrics } from "@/actions/service-usage.actions";
import { ServicesClient } from "./services-client";

export const metadata: Metadata = {
  title: "สถานะบริการ & โควต้า Free Tier — South Aero Admin",
  description: "รายงานการใช้งานบริการภายนอกและการใช้โควต้า Free Tier ของระบบ",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const initialReport = await getServiceUsageMetrics();

  return <ServicesClient initialReport={initialReport} />;
}
