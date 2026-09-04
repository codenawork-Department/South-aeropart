"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Wind } from "lucide-react";
import { FeaturedProductItem } from "@/actions/product.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";

interface FeaturedProductsSectionProps {
  initialProducts: FeaturedProductItem[];
}

export function FeaturedProductsSection({
  initialProducts,
}: FeaturedProductsSectionProps) {
  const { t, lang } = useLanguage();

  if (!initialProducts || initialProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 bg-[#0A0A0A] border-t border-[#181818]">
      <div className="container-main">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
              <span className="text-[0.65rem] font-heading font-bold tracking-[0.2em] text-[var(--accent-red)] uppercase">
                {t.home.recommendedBadge}
              </span>
            </div>
            <h2 className="heading-lg text-white">
              {t.home.featuredPartsTitle}{" "}
              <span className="text-[var(--accent-red)]">{t.home.featuredPartsHighlight}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-heading uppercase tracking-wider">
              {t.home.featuredPartsSubtitle}
            </p>
          </div>

          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-white transition-colors font-heading font-semibold tracking-widest uppercase group"
          >
            {t.home.viewAllProducts}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-[var(--accent-red)]" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {initialProducts.map((product) => {
            const hasDiscount =
              Boolean(product.compareAtPrice) &&
              Number(product.compareAtPrice) > Number(product.price);

            const localizedName = getLocalizedField(product.name, product.nameEn, lang);
            const localizedCat = lang === "en" && product.categoryNameEn ? product.categoryNameEn : product.categoryName;

            const displayCategory =
              product.carModelName
                ? `${product.brandName} • ${product.carModelName}`
                : localizedCat || product.brandName || "AEROPARTS";

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex flex-col bg-[#121212] border border-[#202020] hover:border-[var(--accent-red)] rounded-sm overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black"
              >
                {/* Product Image */}
                <div className="aspect-square relative overflow-hidden bg-[#161616]">
                  <Image
                    src={product.primaryImage}
                    alt={localizedName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Special / Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-[var(--accent-red)] text-white text-[0.6rem] font-heading font-extrabold uppercase px-2 py-0.5 rounded-sm shadow-md">
                        {t.home.special}
                      </span>
                    </div>
                  )}

                  {/* CFD Downforce pill on hover */}
                  {product.downforceN && (
                    <div className="absolute bottom-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="inline-flex items-center gap-1 text-[0.6rem] font-mono font-bold py-0.5 px-2 rounded-sm bg-black/90 text-[var(--success)] border border-[var(--success)]/30 backdrop-blur-sm">
                        <Wind size={10} />
                        +{product.downforceN} N
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-2.5 sm:p-3.5 md:p-4 bg-[#121212] flex-1 flex flex-col justify-between border-t border-[#1C1C1C]">
                  <div>
                    <p className="text-[0.6rem] sm:text-[0.65rem] text-[var(--accent-red)] font-heading font-bold uppercase tracking-wider truncate">
                      {displayCategory}
                    </p>
                    <h3 className="font-heading text-xs sm:text-xs md:text-sm font-bold tracking-[0.05em] sm:tracking-[0.08em] uppercase text-white group-hover:text-[var(--accent-red)] transition-colors line-clamp-1 mt-0.5">
                      {localizedName}
                    </h3>
                  </div>

                  <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-[#1C1C1C] flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <p className="font-heading text-[0.72rem] sm:text-xs md:text-sm font-bold text-white truncate">
                        ฿{Number(product.price).toLocaleString("th-TH")}
                      </p>
                      {hasDiscount && product.compareAtPrice && (
                        <p className="text-[0.6rem] sm:text-[0.65rem] text-[var(--text-muted)] line-through -mt-0.5 font-sans">
                          ฿{Number(product.compareAtPrice).toLocaleString("th-TH")}
                        </p>
                      )}
                    </div>

                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1C1C1C] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent-red)] group-hover:text-white transition-colors shrink-0">
                      <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Mobile Link */}
        <div className="flex sm:hidden justify-end mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-white transition-colors font-heading font-semibold tracking-widest uppercase group"
          >
            {t.home.viewAllProducts}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-[var(--accent-red)]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
