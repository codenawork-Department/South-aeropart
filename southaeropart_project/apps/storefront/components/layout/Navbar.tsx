"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, User, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { CartSidebar } from "./CartSidebar";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "/products", label: "SHOP", active: true },
  { href: "/collection", label: "COLLECTION", active: false },
  { href: "/gallery", label: "GALLERY", active: false },
  { href: "/about", label: "ABOUT US", active: false },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount, toggleCart } = useCart();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        {/* Top Row: Hamburger — Logo — Icons */}
        <div className="container-main flex items-center justify-between h-14 md:h-16">
          {/* Left: Hamburger */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--accent-red)] transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Desktop nav links (left side on desktop) */}
          <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
            {/* Spacer for symmetry */}
          </nav>

          {/* Center: Logo */}
          <Link href="/" className="flex flex-col items-center group" id="logo-link">
            <span className="font-heading text-2xl md:text-3xl font-bold tracking-[0.15em] text-[var(--text-primary)] group-hover:text-[var(--accent-red)] transition-colors">
              SOUTH
            </span>
            <span className="text-[0.5rem] md:text-[0.6rem] font-heading tracking-[0.3em] text-[var(--text-secondary)] -mt-1">
              A E R O
            </span>
          </Link>

          {/* Right: Search, User, Cart */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Search */}
            <button
              id="search-toggle"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-[var(--text-primary)] hover:text-[var(--accent-red)] transition-colors"
              aria-label="Search"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* User Account */}
            <Link
              href="/account"
              id="account-link"
              className="p-2 text-[var(--text-primary)] hover:text-[var(--accent-red)] transition-colors hidden sm:block"
              aria-label="Account"
            >
              <User size={20} />
            </Link>

            {/* Cart */}
            <button
              id="cart-toggle"
              onClick={toggleCart}
              className="relative p-2 text-[var(--text-primary)] hover:text-[var(--accent-red)] transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 badge-red">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Row: Nav Links (Desktop) */}
        <nav
          className="hidden lg:flex items-center justify-center gap-10 h-10 border-t border-[var(--border-subtle)]"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${link.active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar (expandable) */}
        {searchOpen && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
            <div className="container-main py-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="search-input"
                  type="search"
                  placeholder="Search products..."
                  className="input-dark pl-10 w-full"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer for fixed navbar */}
      <div className="h-14 md:h-16 lg:h-[104px]" />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={NAV_LINKS}
      />

      {/* Cart Sidebar */}
      <CartSidebar />
    </>
  );
}
