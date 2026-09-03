"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, User, Search, ArrowRight, Heart } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string; match: (pathname: string) => boolean }[];
  onOpenSearch?: () => void;
};

export function MobileMenu({ isOpen, onClose, links, onOpenSearch }: MobileMenuProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Drawer */}
      <div
        className="absolute inset-y-0 left-0 w-full max-w-xs bg-[#0E0E0E] border-r border-[#222222] flex flex-col shadow-2xl z-10 animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#202020]">
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
            className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors rounded hover:bg-white/5"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Quick Search Button */}
        {onOpenSearch && (
          <div className="p-3 border-b border-[#1E1E1E] bg-[#121212]/50">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded bg-[#161616] border border-[#262626] text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] transition-all font-heading tracking-wider"
            >
              <Search size={14} className="text-[var(--accent-red)]" />
              <span>{t.common.searchPlaceholder}</span>
            </button>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto" aria-label="Mobile navigation">
          {links.map((link) => {
            const isActive = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center justify-between py-3 px-4 font-heading text-sm font-bold tracking-[0.1em] uppercase transition-all rounded-sm ${
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

        {/* Mobile Language Switcher */}
        <div className="p-3 border-t border-[#1E1E1E] bg-[#0C0C0C]">
          <LanguageSwitcher variant="mobile" />
        </div>

        {/* Bottom User / Account Row */}
        <div className="p-4 border-t border-[#202020] bg-[#0A0A0A] space-y-2">
          <Link
            href="/wishlist"
            onClick={onClose}
            className="flex items-center gap-3 py-2.5 px-4 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors"
          >
            <Heart size={16} />
            <span>{t.common.myWishlist}</span>
          </Link>
          <Link
            href="/sign-in"
            onClick={onClose}
            className="flex items-center gap-3 py-2.5 px-4 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white rounded hover:bg-white/5 transition-colors"
          >
            <User size={16} />
            <span>{t.common.signIn}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
