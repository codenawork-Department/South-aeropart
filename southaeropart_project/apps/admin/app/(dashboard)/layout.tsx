import { validateSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await validateSession();

  if (!admin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col lg:flex-row">
      {/* Shared Admin Sidebar (Mobile Header + Drawer + Desktop Sidebar) */}
      <AdminSidebar
        adminEmail={admin.email}
        adminName={admin.fullName}
        adminRole={admin.role}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 min-w-0 pt-16 lg:pt-0 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10 max-w-7xl 2xl:max-w-[1720px] 3xl:max-w-[2160px] 4xl:max-w-[2560px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

