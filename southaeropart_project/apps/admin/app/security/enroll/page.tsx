import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import { EnrollmentForm } from "./enrollment-form";

export const dynamic = "force-dynamic";

export default async function EnrollmentPage() {
  const admin = await validateSession(true);
  if (!admin) redirect("/login");
  if (admin.mfaEnabled) redirect("/");
  return <main className="max-w-lg mx-auto p-8 space-y-6">
    <h1 className="text-xl font-bold">ตั้งค่าการยืนยันตัวตนสองขั้นตอน</h1>
    <p>บัญชีผู้ดูแลต้องเปิด MFA ก่อนใช้งานระบบ production</p>
    <EnrollmentForm />
  </main>;
}
