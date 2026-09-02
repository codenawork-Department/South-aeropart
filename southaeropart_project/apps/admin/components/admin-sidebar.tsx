"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/components/layout/navigation-context";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Layers,
  Sparkles,
  ShoppingCart,
  Star,
  Activity,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Mail,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";

interface AdminSidebarProps {
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
}

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

export function AdminSidebar({
  adminEmail = "admin@southaero.com",
  adminName = "Super Admin",
  adminRole = "super_admin",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { pendingPathname } = useNavigation();
  const activePath = pendingPathname || pathname;

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsMobileOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileOpen]);

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: "Hero Showcase หน้าแรก",
      sublabel: "Homepage 3D & 3 Cards",
      href: "/homepage",
      icon: Sparkles,
      badge: "NEW",
      badgeColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
    {
      label: "Products",
      sublabel: "ชิ้นส่วนเดี่ยว (Single Parts)",
      href: "/products",
      icon: Package,
      badge: null,
    },
    {
      label: "ชุดเซ็ต / Aero Kits",
      sublabel: "Full Body Kits & Sets",
      href: "/bundles",
      icon: Boxes,
      badge: "KIT",
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      label: "แคตตาล็อก & หมวดหมู่",
      sublabel: "Brands, Models & Categories",
      href: "/catalog",
      icon: Layers,
      badge: null,
    },
    {
      label: "Orders",
      href: "/orders",
      icon: ShoppingCart,
      badge: null,
    },
    {
      label: "Reviews",
      href: "/reviews",
      icon: Star,
      badge: null,
    },
    {
      label: "ข่าวสาร & จดหมายข่าว",
      sublabel: "Subscribers & Email Drops",
      href: "/newsletters",
      icon: Mail,
      badge: "NEW",
      badgeColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
    {
      label: "สถานะบริการ & โควต้า",
      sublabel: "Service Usage & Quotas",
      href: "/services",
      icon: Activity,
      badge: "LIVE",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
  ];

  // Helper render function for navigation links
  const renderNavLinks = (onItemClick?: () => void) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? activePath === "/"
            : activePath.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-gradient-to-r from-red-950/40 to-neutral-900 text-white border border-red-800/40 shadow-sm"
                : "text-gray-400 hover:text-gray-100 hover:bg-[#181818]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon
                size={18}
                className={`transition-colors shrink-0 ${
                  isActive
                    ? "text-red-500"
                    : "text-gray-400 group-hover:text-gray-200"
                }`}
              />
              <div className="truncate">
                <span className="block truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="block text-[0.65rem] text-gray-400 -mt-0.5">
                    {item.sublabel}
                  </span>
                )}
              </div>
            </div>

            {item.badge && (
              <span
                className={`text-[0.58rem] font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0 flex items-center gap-1 ${
                  item.badgeColor || "bg-[#252525] text-gray-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  // Helper render function for profile and logout footer
  const renderFooter = () => (
    <div className="p-4 border-t border-[#1E1E1E] bg-[#0A0A0A] safe-bottom">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0">
          {adminName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-200 truncate">
              {adminName}
            </p>
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
          </div>
          <p className="text-[0.65rem] text-gray-500 truncate" title={adminEmail}>
            {adminEmail}
          </p>
        </div>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-300 hover:bg-red-950/30 border border-red-900/20 hover:border-red-800/40 transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          <span>ออกจากระบบ</span>
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ──────────────────────────────────────────────────────────
          1. Mobile & Tablet Top App Bar (< lg screens)
      ────────────────────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F0F0F]/95 backdrop-blur-md border-b border-[#222222] z-30 flex items-center justify-between px-4 sm:px-6 safe-top select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="สลับเมนูนำทาง"
            className="p-2 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A] transition-colors cursor-pointer"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-md shadow-red-900/30">
              SA
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-[0.15em] text-white flex items-center gap-1">
                SOUTH <span className="text-red-500">AERO</span>
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[0.62rem] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ADMIN</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-gray-600 flex items-center justify-center text-[0.7rem] font-bold text-gray-200">
            {adminName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. Mobile Slide-over Drawer & Backdrop
      ────────────────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="lg:hidden">
          {/* Dark Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 backdrop-animate-in"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide Drawer Content */}
          <aside className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-[#0F0F0F] border-r border-[#222222] z-50 flex flex-col justify-between drawer-animate-in shadow-2xl safe-top">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {/* Brand Header & Close Button */}
              <div className="p-5 border-b border-[#1E1E1E] flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileOpen(false)}
                  className="group flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-sm tracking-wider shadow-lg shadow-red-900/30">
                    SA
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-[0.18em] text-white flex items-center gap-1.5">
                      SOUTH <span className="text-red-500">AERO</span>
                    </h1>
                    <p className="text-[0.58rem] tracking-[0.25em] text-gray-400 font-medium">
                      PERFORMANCE ADMIN
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="ปิดเมนู"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1C1C] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <div className="px-3 py-4">
                <p className="px-3 mb-2 text-[0.65rem] font-semibold text-gray-500 uppercase tracking-widest">
                  Main Menu
                </p>
                {renderNavLinks(() => setIsMobileOpen(false))}

                {/* Storefront Link */}
                <div className="mt-6 pt-4 border-t border-[#1C1C1C] px-1">
                  <p className="px-2 mb-2 text-[0.65rem] font-semibold text-gray-500 uppercase tracking-widest">
                    Quick Actions
                  </p>
                  <a
                    href={STOREFRONT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#181818] transition-colors border border-transparent hover:border-[#282828]"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink size={14} className="text-gray-500" />
                      <span>ไปหน้าร้านค้า Storefront</span>
                    </div>
                    <span className="text-[0.6rem] text-gray-600 font-mono">{new URL(STOREFRONT_URL).port ? `:${new URL(STOREFRONT_URL).port}` : ""}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile Footer */}
            {renderFooter()}
          </aside>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          3. Desktop & Ultrawide (21:9) Fixed Sidebar (>= lg screens)
      ────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-[#0F0F0F] border-r border-[#222222] flex-col justify-between z-30 select-none">
        {/* Top Section */}
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-[#1E1E1E]">
            <Link href="/" className="group block">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-sm tracking-wider shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
                  SA
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-[0.18em] text-white flex items-center gap-1.5">
                    SOUTH <span className="text-red-500">AERO</span>
                  </h1>
                  <p className="text-[0.62rem] tracking-[0.25em] text-gray-400 font-medium -mt-0.5">
                    PERFORMANCE ADMIN
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-5">
            <p className="px-3 mb-2 text-[0.65rem] font-semibold text-gray-500 uppercase tracking-widest">
              Main Menu
            </p>
            {renderNavLinks()}

            {/* Storefront Link */}
            <div className="mt-6 pt-4 border-t border-[#1C1C1C] px-1">
              <p className="px-2 mb-2 text-[0.65rem] font-semibold text-gray-500 uppercase tracking-widest">
                Quick Actions
              </p>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#181818] transition-colors border border-transparent hover:border-[#282828]"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-gray-500" />
                  <span>ไปหน้าร้านค้า Storefront</span>
                </div>
                <span className="text-[0.6rem] text-gray-600 font-mono">:3000</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer / User Profile & Logout */}
        {renderFooter()}
      </aside>
    </>
  );
}

