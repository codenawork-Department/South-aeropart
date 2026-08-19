"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORY_TABS, PRODUCT_CATEGORIES } from "@/lib/mock-data";

export function ProductCategories() {
  const [activeTab, setActiveTab] = useState("shop");

  return (
    <section className="py-12 md:py-16">
      <div className="container-main">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-8 md:gap-12 mb-10">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-heading text-sm md:text-base font-bold tracking-[0.15em] uppercase pb-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "text-[var(--text-primary)] border-[var(--accent-red)]"
                  : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {PRODUCT_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group"
            >
              <div className="aspect-square placeholder-image rounded-sm overflow-hidden group-hover:opacity-90 transition-opacity">
                <span className="text-xs">{category.placeholder}</span>
              </div>
              <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.1em] uppercase mt-3 group-hover:text-[var(--accent-red)] transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="flex justify-end mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-heading tracking-wider uppercase"
          >
            VIEW ALL <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
