"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Menu, Search, ShoppingCart, X, LogOut, User as UserIcon, Package, ChevronDown } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { CartSidebar } from "./CartSidebar";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "/products", label: "SHOP", match: (p: string) => p.startsWith("/products") },
  { href: "/collection", label: "COLLECTION", match: (p: string) => p.startsWith("/collection") },
  { href: "/gallery", label: "GALLERY", match: (p: string) => p.startsWith("/gallery") },
  { href: "/about", label: "ABOUT US", match: (p: string) => p.startsWith("/about") },
];

export function Navbar() {
  const pathname = usePathname();
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#1E1E1E]">
        {/* Main Row: Hamburger (mobile) — Logo — Desktop Links — Actions */}
        <div className="container-main flex items-center justify-between h-16 md:h-20">
          {/* Left: Mobile Hamburger Toggle */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-white hover:text-[var(--accent-red)] transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Center/Left: Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex flex-col items-center group py-1" id="logo-link">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-2xl md:text-3xl font-extrabold tracking-[0.2em] text-white group-hover:text-[var(--accent-red)] transition-colors">
                  SOUTH
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
              </div>
              <span className="text-[0.55rem] md:text-[0.65rem] font-heading font-medium tracking-[0.45em] text-[var(--text-secondary)] -mt-1 uppercase">
                A E R O
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-10" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive ? "active text-white" : "text-[var(--text-secondary)]"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search, User, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Toggle */}
            <button
              id="search-toggle"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
              aria-label="Search"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* User Account / Sign In */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="relative hidden sm:block" ref={userMenuRef}>
                    <button
                      id="user-menu-toggle"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-1.5 p-1 rounded hover:bg-white/5 transition-colors"
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
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded shadow-2xl shadow-black/80 animate-fade-in overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                          <p className="text-sm font-medium text-white truncate">
                            {user?.fullName ?? "User"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            {user?.primaryEmailAddress?.emailAddress}
                          </p>
                        </div>

                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <UserIcon size={16} />
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Package size={16} />
                            My Orders
                          </Link>
                        </div>

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
                  <Link
                    href="/sign-in"
                    id="sign-in-link"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold tracking-wider uppercase text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    <UserIcon size={16} />
                  </Link>
                )}
              </>
            )}

            {/* Cart Button with Count Badge */}
            <button
              id="cart-toggle"
              onClick={toggleCart}
              className="relative p-2 text-white hover:text-[var(--accent-red)] transition-colors flex items-center"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={21} />
              {itemCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 badge-red">
                  {itemCount}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 bg-[var(--border-color)] text-white text-[0.6rem] font-bold min-w-[1.1rem] h-[1.1rem] rounded-full flex items-center justify-center">
                  0
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {searchOpen && (
          <div className="border-t border-[var(--border-color)] bg-[#0D0D0D] animate-fade-in">
            <div className="container-main py-3">
              <div className="relative flex items-center">
                <Search
                  size={18}
                  className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  id="search-input"
                  type="search"
                  placeholder="Search parts by name (e.g. Accord G9 Ducktail, Front Lip, Diffuser)..."
                  className="input-dark pl-10 w-full bg-[#161616]"
                  autoFocus
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 text-xs uppercase font-heading text-[var(--text-muted)] hover:text-white"
                >
                  ESC
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer to prevent content overlapping fixed navbar */}
      <div className="h-16 md:h-20" />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={NAV_LINKS}
      />

      {/* Cart Sidebar Slide-over */}
      <CartSidebar />
    </>
  );
}
