"use client";

import Link from "next/link";
import { X, User, Search } from "lucide-react";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string; active: boolean }[];
};

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-[var(--bg-primary)] border-r border-[var(--border-color)] animate-slide-in-right flex flex-col"
        style={{ animation: "slideInLeft 0.3s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <Link href="/" onClick={onClose} className="flex flex-col items-center">
            <span className="font-heading text-xl font-bold tracking-[0.15em]">SOUTH</span>
            <span className="text-[0.45rem] font-heading tracking-[0.3em] text-[var(--text-secondary)] -mt-0.5">
              A E R O
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search products..."
              className="input-dark pl-9 text-sm"
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`block py-3 px-4 font-heading text-sm font-semibold tracking-[0.1em] uppercase transition-colors rounded ${
                link.active
                  ? "text-[var(--text-primary)] bg-[var(--bg-elevated)] border-l-2 border-[var(--accent-red)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-2">
          <Link
            href="/account"
            onClick={onClose}
            className="flex items-center gap-3 py-3 px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <User size={18} />
            <span className="font-heading text-sm tracking-wider uppercase">Account</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
