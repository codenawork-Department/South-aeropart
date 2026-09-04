"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Menu, Search, ShoppingCart, X, LogOut, User as UserIcon, Package, ChevronDown, Heart, ArrowRight, Loader2 } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { quickSearchAction, ShopProductItem } from "@/actions/product.actions";
import { CartSidebar } from "./CartSidebar";
import { MobileMenu } from "./MobileMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";

const POPULAR_SEARCHES = ["Accord G9", "Civic FE", "Front Lip", "Diffuser", "Ducktail", "Dry Carbon"];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang } = useLanguage();

  const navLinks = [
    { href: "/products", label: t.nav.shop, match: (p: string) => p.startsWith("/products") },
    { href: "/collection", label: t.nav.collection, match: (p: string) => p.startsWith("/collection") },
    { href: "/gallery", label: t.nav.gallery, match: (p: string) => p.startsWith("/gallery") },
    { href: "/about", label: t.nav.about, match: (p: string) => p.startsWith("/about") },
  ];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ShopProductItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { itemCount, toggleCart } = useCart();
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Route change: close search & menus
  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Auto-focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [searchOpen]);

  // Outside click & ESC & Ctrl+K shortcut for search
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        !document.getElementById("search-toggle")?.contains(target)
      ) {
        setSearchOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  // Live debounced search as user types
  useEffect(() => {
    if (!searchOpen) return;

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await quickSearchAction(trimmed);
        setSearchResults(res.products);
        setSearchTotal(res.total);
        setHasSearched(true);
      } catch (err) {
        console.error("[Navbar search] error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
      setSearchOpen(false);
    } else {
      router.push("/products");
      setSearchOpen(false);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    router.push(`/products?q=${encodeURIComponent(tag)}`);
    setSearchOpen(false);
  };

  const handleSelectProduct = (slug: string) => {
    router.push(`/products/${slug}`);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#1E1E1E]">
        {/* Main Row: Hamburger (mobile) — Logo — Desktop Links — Actions */}
        <div className="container-main flex items-center justify-between h-16 md:h-20">
          {/* Left: Mobile Hamburger Toggle */}
          <div className="flex items-center gap-4 md:hidden">
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

          {/* Desktop Nav Links - Visible on Tablets (iPad Mini, Air, Gen) & Desktop */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link text-xs lg:text-sm font-heading font-semibold tracking-wider ${
                    isActive ? "active text-white" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search, User, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Language Switcher */}
            <div className="hidden sm:flex items-center">
              <LanguageSwitcher variant="navbar" />
            </div>

            {/* Search Toggle */}
            <button
              id="search-toggle"
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-2 transition-colors rounded ${
                searchOpen
                  ? "text-[var(--accent-red)] bg-white/5"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              }`}
              aria-label="Search"
              title="Search products (Ctrl+K)"
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
                            {t.common.myProfile}
                          </Link>
                          <Link
                            href="/wishlist"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Heart size={16} />
                            {t.common.myWishlist}
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Package size={16} />
                            {t.common.myOrders}
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
                            {t.common.signOut}
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

        {/* Expandable Search Input Bar & Live Results */}
        {searchOpen && (
          <div
            ref={searchContainerRef}
            className="border-t border-[var(--border-color)] bg-[#0C0C0C]/98 backdrop-blur-xl animate-fade-in shadow-2xl relative"
          >
            <div className="container-main py-4">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search
                  size={18}
                  className="absolute left-3.5 text-[var(--accent-red)] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  id="search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.common.searchPlaceholder}
                  className="input-dark pl-11 pr-28 sm:pr-32 w-full bg-[#161616] text-sm py-3 border-[#2A2A2A] focus:border-[var(--accent-red)]"
                  autoFocus
                />
                
                <div className="absolute right-3 flex items-center gap-2">
                  {isSearching ? (
                    <Loader2 size={16} className="animate-spin text-[var(--accent-red)]" />
                  ) : searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-[var(--text-muted)] hover:text-white p-1"
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-1.5 bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-colors"
                  >
                    {t.common.search}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="text-[0.65rem] uppercase font-heading text-[var(--text-muted)] hover:text-white px-1.5 py-0.5 border border-[#333] rounded hidden md:inline-block"
                  >
                    {t.common.pressEsc}
                  </button>
                </div>
              </form>

              {/* Popular quick tags when query is empty */}
              {!searchQuery.trim() && (
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[var(--text-muted)] font-heading text-[0.7rem] uppercase tracking-wider">
                    {t.common.popularSearches}
                  </span>
                  {POPULAR_SEARCHES.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleQuickTagClick(tag)}
                      className="px-2.5 py-1 rounded bg-[#161616] border border-[#262626] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 text-xs transition-all font-mono"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Live search results overlay */}
              {searchQuery.trim().length >= 2 && (
                <div className="mt-3 border-t border-[#1F1F1F] pt-3">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] font-heading uppercase tracking-wider">
                      <Loader2 size={16} className="animate-spin text-[var(--accent-red)]" />
                      <span>{t.common.searching}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2.5">
                        <span className="font-heading uppercase tracking-wider text-[var(--text-muted)] text-[0.7rem]">
                          {t.common.matchingParts} ({searchTotal})
                        </span>
                        <span className="text-[0.7rem] text-[var(--text-muted)] hidden sm:inline-block">
                          {t.common.pressEnter}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {searchResults.map((product) => {
                          const localizedName = getLocalizedField(product.name, product.nameEn, lang);
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleSelectProduct(product.slug)}
                              className="group flex items-center gap-3 p-2.5 rounded bg-[#141414] hover:bg-[#1A1A1A] border border-[#222] hover:border-[var(--accent-red)] cursor-pointer transition-all"
                            >
                              <div className="w-14 h-14 bg-[#1C1C1C] rounded overflow-hidden flex-shrink-0 relative">
                                <Image
                                  src={product.primaryImage || "/images/FRONT.png"}
                                  alt={localizedName}
                                  fill
                                  sizes="56px"
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[0.6rem] font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider truncate">
                                  {product.brandName} {product.carModelName ? `• ${product.carModelName}` : ""}
                                </p>
                                <h4 className="font-heading text-xs font-bold text-white group-hover:text-[var(--accent-red)] transition-colors truncate">
                                  {localizedName}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-bold text-white font-mono">
                                    ฿{parseFloat(product.price).toLocaleString()}
                                  </span>
                                  {(product.categoryNameEn && lang === "en" ? product.categoryNameEn : product.categoryName) && (
                                    <span className="text-[0.65rem] text-[var(--text-muted)] uppercase truncate max-w-[90px]">
                                      {product.categoryNameEn && lang === "en" ? product.categoryNameEn : product.categoryName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* View all results button */}
                      <button
                        type="button"
                        onClick={() => handleSearchSubmit()}
                        className="mt-3 w-full py-2.5 px-4 bg-[#161616] hover:bg-[var(--accent-red)] text-[var(--text-secondary)] hover:text-white border border-[#262626] hover:border-[var(--accent-red)] rounded text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>{t.common.viewAllResults.replace("{total}", String(searchTotal))} &quot;{searchQuery}&quot;</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : hasSearched && !isSearching ? (
                    <div className="py-6 text-center">
                      <p className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                        {t.common.noResultsFound} &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                        {t.common.noResultsHint}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          router.push("/products");
                          setSearchOpen(false);
                        }}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-heading font-bold uppercase tracking-wider rounded border border-[#333] transition-colors"
                      >
                        <span>{t.common.viewDetails}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer to prevent content overlapping fixed navbar */}
      <div className="h-16 md:h-20" />

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
        onOpenSearch={() => {
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }}
      />

      {/* Cart Sidebar Slide-over */}
      <CartSidebar />
    </>
  );
}
