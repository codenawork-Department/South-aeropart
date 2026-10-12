import type { Metadata } from "next";
import { validateSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGA4AnalyticsReport } from "@/actions/ga4-analytics.actions";
import { GA4AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "GA4 Analytics — South Aero Admin",
  description: "สถิติผู้เข้าชมเว็บไซต์ ช่องทางทราฟฟิก และ E-commerce Conversion จาก Google Analytics 4",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const admin = await validateSession();
  if (!admin) {
    redirect("/login");
  }

  const initialReport = await getGA4AnalyticsReport("30d");

  return <GA4AnalyticsClient initialReport={initialReport} />;
}
