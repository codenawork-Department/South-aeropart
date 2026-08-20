import { redirect } from "next/navigation";
import { db, adminUsers, sql } from "@repo/db";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "South Aero Admin — สร้าง Super Admin",
  description: "ตั้งค่า Super Admin คนแรกสำหรับระบบจัดการ",
};

/**
 * Server Component guard — if any admin user exists,
 * redirect to /login immediately. This page is one-time only.
 */
export default async function SetupPage() {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(adminUsers);

  if (result.count > 0) {
    redirect("/login");
  }

  return <SetupForm />;
}
