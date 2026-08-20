"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Menu, Search, ShoppingCart, X, LogOut, User as UserIcon, Package, ChevronDown } from "lucide-react";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { itemCount, toggleCart } = useCart();
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

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
            {isLoaded && (
              <>
                {isSignedIn ? (
                  /* ── Signed-in: Avatar + Dropdown ── */
                  <div className="relative hidden sm:block" ref={userMenuRef}>
                    <button
                      id="user-menu-toggle"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-1.5 p-1 rounded-sm hover:bg-white/5 transition-colors"
                      aria-label="User menu"
                      aria-expanded={userMenuOpen}
                    >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.fullName ?? "User avatar"}
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover border border-[var(--border-color)]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white text-xs font-bold">
                          {user?.firstName?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      )}
                      <ChevronDown
                        size={14}
                        className={`text-[var(--text-muted)] transition-transform duration-200 ${
                          userMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-sm shadow-xl shadow-black/30 animate-fade-in overflow-hidden">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {user?.fullName ?? "User"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            {user?.primaryEmailAddress?.emailAddress}
                          </p>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                          >
                            <UserIcon size={16} />
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                          >
                            <Package size={16} />
                            My Orders
                          </Link>
                        </div>

                        {/* Sign out */}
                        <div className="border-t border-[var(--border-subtle)] py-1">
                          <button
                            id="sign-out-button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              signOut({ redirectUrl: "/" });
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Not signed-in: Sign In link ── */
                  <Link
                    href="/sign-in"
                    id="sign-in-link"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-all rounded-sm"
                  >
                    <UserIcon size={14} />
                    Sign In
                  </Link>
                )}
              </>
            )}

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
