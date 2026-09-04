"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Wind,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  PackageOpen,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { getShopProducts } from "@/actions/product.actions";
import type {
  ShopProductItem,
  ShopProductsResult,
  ActiveCategory,
} from "@/actions/product.actions";
import { AddToCartButton } from "./AddToCartButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";
import { ProductGridSkeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductsGridProps {
  /** Pre-fetched from RSC on first render */
  initialData: ShopProductsResult;
  /** Active DB categories for filter pills */
  categories: ActiveCategory[];
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "newest-desc", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "name-asc", label: "Name: A → Z" },
  { value: "name-desc", label: "Name: Z → A" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductsGrid({ initialData, categories }: ProductsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t, lang } = useLanguage();

  // --- Derive initial state from URL search params ---
  const categoryParam = searchParams.get("category") || "all";
  const searchParam = searchParams.get("q") || "";
  const pageParam = Number(searchParams.get("page") || "1");
  const sortParam = searchParams.get("sort") || "newest-desc";
  const makeParam = searchParams.get("make") || "";
  const modelParam = searchParams.get("model") || "";

  // --- Local UI state ---
  const [data, setData] = useState<ShopProductsResult>(initialData);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [currentSort, setCurrentSort] = useState(sortParam);
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [error, setError] = useState<string | null>(null);

  // --- Sync data state whenever server-provided initialData updates ---
  useEffect(() => {
    setData(initialData);
    setError(null);
  }, [initialData]);

  // --- Sync URL → state when browser navigates (back/forward) or searchParams change ---
  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "all");
    setSearchInput(searchParams.get("q") || "");
    setCurrentPage(Number(searchParams.get("page") || "1"));
    setCurrentSort(searchParams.get("sort") || "newest-desc");
  }, [searchParams]);

  // --- Core data-fetch helper ---
  const fetchProducts = useCallback(
    (params: {
      category?: string;
      search?: string;
      sort?: string;
      page?: number;
    }) => {
      const cat = params.category ?? selectedCategory;
      const q = params.search ?? searchInput;
      const sort = params.sort ?? currentSort;
      const pg = params.page ?? 1;

      const [sortBy, sortDir] = sort.split("-") as [string, string];

      setError(null);

      startTransition(async () => {
        try {
          const result = await getShopProducts({
            category: cat === "all" ? undefined : cat,
            search: q || undefined,
            brandSlug: makeParam || undefined,
            modelSlug: modelParam || undefined,
            sortBy: sortBy as "name" | "price" | "newest",
            sortDir: sortDir as "asc" | "desc",
            page: pg,
            pageSize: 12,
          });
          setData(result);
          setCurrentPage(result.page);
        } catch (err) {
          console.error("[ProductsGrid] fetch error:", err);
          setError("Failed to load products. Please try again.");
        }

        // Update URL without full navigation (shallow)
        const query = new URLSearchParams();
        if (makeParam) query.set("make", makeParam);
        if (modelParam) query.set("model", modelParam);
        if (cat && cat !== "all") query.set("category", cat);
        if (q) query.set("q", q);
        if (sort !== "newest-desc") query.set("sort", sort);
        if (pg > 1) query.set("page", String(pg));

        const qs = query.toString();
        router.replace(`/products${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [selectedCategory, searchInput, currentSort, makeParam, modelParam, router]
  );

  // --- Event handlers ---
  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    fetchProducts({ category: slug, page: 1 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts({ search: searchInput, page: 1 });
  };

  const handleSortChange = (value: string) => {
    setCurrentSort(value);
    fetchProducts({ sort: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    fetchProducts({ page });
    // Scroll to top of grid
    document.getElementById("products-grid-anchor")?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Derived labels ---
  const makeLabel = makeParam ? makeParam.replace(/-/g, " ").toUpperCase() : null;
  const modelLabel = modelParam ? modelParam.replace(/-/g, " ").toUpperCase() : null;

  return (
    <section className="py-10 md:py-14" id="products-grid-anchor">
      <div className="container-main">
        {/* ---- Section Header ---- */}
        <div className="flex flex-col gap-5 mb-8">
          {/* Title + Active Vehicle */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="heading-lg text-white">
                EXPLORE <span className="text-[var(--accent-red)]">ACCESSORIES</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-heading uppercase tracking-wider">
                {makeLabel && modelLabel
                  ? `Showing parts for ${makeLabel} ${modelLabel}`
                  : "Precision-engineered individual aerodynamic components"}
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={13} className="text-[var(--text-muted)]" />
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="select-dark bg-[#141414] border-[#262626] text-xs font-semibold py-2 pr-8 pl-3 min-w-[160px]"
                id="sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Bar + Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative flex-shrink-0 sm:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search parts, SKU..."
                className="w-full bg-[#141414] border border-[#262626] rounded-sm py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)] transition-colors"
                id="product-search"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </form>

            {/* Category Pills - Smooth horizontal scroll on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-nowrap scrollbar-none max-w-full">
              <button
                onClick={() => handleCategoryChange("all")}
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-[var(--accent-red)] text-white shadow-md shadow-[var(--accent-red)]/30"
                    : "bg-[#141414] border border-[#262626] text-[var(--text-secondary)] hover:text-white hover:border-[#3A3A3A]"
                }`}
                id="filter-all"
              >
                {lang === "en" ? "ALL PARTS" : "สินค้าทั้งหมด"}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all whitespace-nowrap shrink-0 ${
                    selectedCategory === cat.slug
                      ? "bg-[var(--accent-red)] text-white shadow-md shadow-[var(--accent-red)]/30"
                      : "bg-[#141414] border border-[#262626] text-[var(--text-secondary)] hover:text-white hover:border-[#3A3A3A]"
                  }`}
                  id={`filter-${cat.slug}`}
                >
                  {lang === "en" && cat.nameEn ? cat.nameEn : cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Loading State ---- */}
        {isPending && (
          <div className="py-4">
            <ProductGridSkeleton count={8} />
          </div>
        )}

        {/* ---- Error State ---- */}
        {!isPending && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="text-sm text-red-400 font-heading uppercase tracking-wider">
              {error}
            </p>
            <button
              onClick={() => fetchProducts({ page: currentPage })}
              className="btn-primary text-xs px-5 py-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* ---- Empty State ---- */}
        {!isPending && !error && data.products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center">
              <PackageOpen size={28} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] font-heading uppercase tracking-wider">
              No products found.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Try adjusting your filters or search query.
            </p>
            {(selectedCategory !== "all" || searchInput) && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchInput("");
                  fetchProducts({ category: "all", search: "", page: 1 });
                }}
                className="text-xs text-[var(--accent-red)] font-heading font-bold uppercase tracking-wider hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ---- Product Grid (Active listing) ---- */}
        {!isPending && !error && data.products.length > 0 && (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--text-muted)] font-heading">
                {data.total} {data.total === 1 ? "product" : "products"} found
              </p>
              <p className="text-xs text-[var(--text-muted)] font-heading">
                Page {data.page} of {data.totalPages}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-sm border border-[#262626] bg-[#141414] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {generatePageNumbers(data.page, data.totalPages).map((pg, idx) =>
                  pg === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-9 h-9 flex items-center justify-center text-xs text-[var(--text-muted)]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={pg}
                      onClick={() => handlePageChange(pg as number)}
                      className={`w-9 h-9 flex items-center justify-center rounded-sm text-xs font-heading font-bold transition-all ${
                        pg === data.page
                          ? "bg-[var(--accent-red)] text-white shadow-md shadow-[var(--accent-red)]/30"
                          : "border border-[#262626] bg-[#141414] text-[var(--text-secondary)] hover:text-white hover:border-[#3A3A3A]"
                      }`}
                    >
                      {pg}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-sm border border-[#262626] bg-[#141414] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product Card sub-component
// ---------------------------------------------------------------------------

function ProductCard({ product }: { product: ShopProductItem }) {
  const { t, lang } = useLanguage();
  const localizedName = getLocalizedField(product.name, product.nameEn, lang);
  const localizedCat = lang === "en" && product.categoryNameEn ? product.categoryNameEn : product.categoryName;

  return (
    <div className="group flex flex-col bg-[#121212] border border-[#202020] hover:border-[var(--accent-red)] rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black">
      {/* Product Image Link */}
      <Link
        href={`/products/${product.slug}`}
        className="aspect-square relative overflow-hidden bg-[#161616] block"
      >
        <Image
          src={product.primaryImage}
          alt={localizedName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        {product.compareAtPrice && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-[var(--accent-red)] text-white text-[0.6rem] font-heading font-extrabold uppercase px-2 py-0.5 rounded-sm">
              SPECIAL
            </span>
          </div>
        )}
        {product.downforceN && product.downforceN > 0 && (
          <div className="absolute bottom-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="telemetry-pill text-[0.6rem] py-0.5 px-2 bg-black/80">
              +{product.downforceN} N DOWNFORCE
            </span>
          </div>
        )}
        {product.stockQuantity <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-white bg-[#333] px-3 py-1 rounded-sm">
              {t.product.outOfStock}
            </span>
          </div>
        )}
      </Link>

      {/* Info & Cart Action */}
      <div className="p-3 sm:p-3.5 md:p-4 flex-1 flex flex-col justify-between bg-[#121212] border-t border-[#1C1C1C]">
        <div>
          <p className="text-[0.6rem] sm:text-[0.65rem] text-[var(--accent-red)] font-heading font-bold uppercase tracking-widest">
            {product.brandName}
          </p>
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.06em] uppercase text-white group-hover:text-[var(--accent-red)] transition-colors leading-tight mt-0.5 line-clamp-1">
              {localizedName}
            </h3>
          </Link>
          {localizedCat && (
            <p className="text-[0.6rem] text-[var(--text-muted)] mt-0.5 font-sans truncate">
              {localizedCat}
            </p>
          )}
        </div>

        <div className="mt-3 sm:mt-3.5 pt-2 sm:pt-2.5 border-t border-[#1A1A1A] flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <p className="font-heading text-xs sm:text-sm md:text-base font-bold text-white truncate">
              ฿{parseFloat(product.price).toLocaleString()}
            </p>
            {product.compareAtPrice && (
              <p className="text-[0.62rem] sm:text-[0.7rem] text-[var(--text-muted)] line-through -mt-0.5 font-sans truncate">
                ฿{parseFloat(product.compareAtPrice).toLocaleString()}
              </p>
            )}
          </div>

          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
