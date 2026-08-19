import { LayoutDashboard, Package, ShoppingCart, Star } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Admin Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 w-64 bg-[#111111] border-r border-[#2A2A2A] p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-[0.15em]">SOUTH</h1>
          <p className="text-[0.5rem] tracking-[0.3em] text-gray-400 -mt-0.5">A E R O</p>
          <p className="text-xs text-gray-500 mt-2">Admin Dashboard</p>
        </div>

        <nav className="space-y-1">
          {[
            { icon: LayoutDashboard, label: "Dashboard", href: "/", active: true },
            { icon: Package, label: "Products", href: "/products" },
            { icon: ShoppingCart, label: "Orders", href: "/orders" },
            { icon: Star, label: "Reviews", href: "/reviews" },
          ].map(({ icon: Icon, label, active }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                active
                  ? "bg-[#1A1A1A] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
              }`}
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Products", value: "4", change: "+2 this week" },
            { label: "Total Orders", value: "0", change: "No orders yet" },
            { label: "Revenue", value: "฿0", change: "—" },
            { label: "Pending Reviews", value: "0", change: "—" },
          ].map(({ label, value, change }) => (
            <div
              key={label}
              className="bg-[#141414] border border-[#2A2A2A] rounded p-5"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold mt-2">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{change}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded p-8 text-center">
          <p className="text-gray-400">
            Admin dashboard is ready. Connect your database to start managing products, orders, and reviews.
          </p>
        </div>
      </main>
    </div>
  );
}
