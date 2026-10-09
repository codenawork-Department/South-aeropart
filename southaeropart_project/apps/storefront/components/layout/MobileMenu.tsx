"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  User,
  Search,
  ArrowRight,
  Heart,
  Package,
  FileText,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string; match: (pathname: string) => boolean }[];
  onOpenSearch?: () => void;
};

export function MobileMenu({ isOpen, onClose, links, onOpenSearch }: MobileMenuProps) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Drawer */}
      <div
        className="absolute inset-y-0 left-0 w-full max-w-xs bg-[#0E0E0E] border-r border-[#222222] flex flex-col shadow-2xl z-10 animate-slide-in-left max-h-screen safe-area-pb"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#202020] flex-shrink-0">
          <Link href="/" onClick={onClose} className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="font-heading text-xl font-bold tracking-[0.2em] text-white">
                SOUTH
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />
            </div>
            <span className="text-[0.5rem] font-heading font-medium tracking-[0.35em] text-[var(--text-secondary)] -mt-1 uppercase">
              A E R O
            </span>
          </Link>

          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[var(--text-secondary)] hover:text-white transition-colors rounded hover:bg-white/5"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Member Auth Header / CTA Block */}
        {isLoaded && (
          <div className="p-3.5 border-b border-[#202020] bg-[#141414] flex-shrink-0">
            {isSignedIn ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName ?? "User"}
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user?.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-heading font-bold text-white truncate">
                      {user?.fullName || "Member"}
                    </p>
                    <p className="text-[0.65rem] text-[var(--text-muted)] truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    signOut({ redirectUrl: "/" });
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                  title={t.common.signOut}
                  aria-label={t.common.signOut}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[0.65rem] font-heading font-semibold text-[var(--text-muted)] tracking-wider uppercase">
                  {lang === "th" ? "กรุณาเข้าสู่ระบบเพื่อสั่งซื้อสินค้า" : "Sign in to complete your orders"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/sign-in"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[var(--accent-red)] text-white text-xs font-heading font-bold tracking-wider uppercase rounded-sm hover:bg-[var(--accent-red-hover)] transition-colors min-h-[44px]"
                  >
                    <LogIn size={15} />
                    <span>{t.common.signIn}</span>
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#202020] text-white text-xs font-heading font-bold tracking-wider uppercase rounded-sm border border-[#333333] hover:border-white/40 transition-colors min-h-[44px]"
                  >
                    <UserPlus size={15} />
                    <span>{lang === "th" ? "สมัครสมาชิก" : "Sign Up"}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Quick Search Button */}
        {onOpenSearch && (
          <div className="p-3 border-b border-[#1E1E1E] bg-[#121212]/50 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded bg-[#161616] border border-[#262626] text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] transition-all font-heading tracking-wider min-h-[44px]"
            >
              <Search size={14} className="text-[var(--accent-red)]" />
              <span>{t.common.searchPlaceholder}</span>
            </button>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
          {links.map((link) => {
            const isActive = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center justify-between py-3 px-4 font-heading text-sm font-bold tracking-[0.1em] uppercase transition-all rounded-sm min-h-[44px] ${
                  isActive
                    ? "text-white bg-[#1A1A1A] border-l-2 border-[var(--accent-red)]"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-[#161616]"
                }`}
              >
                <span>{link.label}</span>
                {isActive && <ArrowRight size={14} className="text-[var(--accent-red)]" />}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Language & Currency Switchers */}
        <div className="p-3 border-t border-[#1E1E1E] bg-[#0C0C0C] space-y-2 flex-shrink-0">
          <CurrencySwitcher variant="mobile" />
          <LanguageSwitcher variant="mobile" />
        </div>

        {/* Bottom User / Account Row */}
        <div className="p-3 border-t border-[#202020] bg-[#0A0A0A] space-y-1 flex-shrink-0">
          <Link
            href="/orders"
            onClick={onClose}
            className="flex items-center gap-3 py-2 px-3 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors min-h-[40px]"
          >
            <Package size={16} />
            <span>{t.common.myOrders}</span>
          </Link>
          <Link
            href="/shipping-quotes"
            onClick={onClose}
            className="flex items-center gap-3 py-2 px-3 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors min-h-[40px]"
          >
            <FileText size={16} />
            <span>{lang === "th" ? "คำขอราคาจัดส่ง" : "Shipping Quotes"}</span>
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="flex items-center gap-3 py-2 px-3 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors min-h-[40px]"
          >
            <Heart size={16} />
            <span>{t.common.myWishlist}</span>
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 py-2 px-3 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors min-h-[40px]"
          >
            <User size={16} />
            <span>{t.common.myProfile}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
