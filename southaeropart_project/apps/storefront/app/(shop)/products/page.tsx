"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Wind, Gauge } from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { VehicleSelector } from "@/components/home/VehicleSelector";
import { AddToCartButton } from "@/components/products/AddToCartButton";

const CATEGORY_FILTERS = [
  { id: "all", label: "ALL PARTS" },
  { id: "front-lips", label: "FRONT LIPS" },
  { id: "side-skirts", label: "SIDE SKIRTS" },
  { id: "diffusers", label: "REAR DIFFUSERS" },
  { id: "spoilers", label: "SPOILERS" },
  { id: "body-kits", label: "FULL BODY KITS" },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const makeParam = searchParams.get("make");
  const modelParam = searchParams.get("model");

  const [selectedCategory, setSelectedCategory] = useState("all");

  const makeLabel = makeParam ? makeParam.toUpperCase() : "HONDA";
  const modelLabel = modelParam
    ? modelParam.replace(/-/g, " ").toUpperCase()
    : "ACCORD G9 (2013-2017)";

  // Filter products by category and vehicle if matched
  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchCategory = selectedCategory === "all" || p.categorySlug === selectedCategory;
    return matchCategory;
  });

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Select Your Vehicle Bar */}
      <Suspense fallback={<VehicleSelector />}>
        <VehicleSelector />
      </Suspense>

      {/* 2. Flagship Model Feature Hero Banner */}
      <section className="bg-gradient-to-b from-[#121212] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E]">
        <div className="container-main py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold tracking-[0.2em] text-[var(--accent-red)] uppercase">
                  {makeLabel}
                </span>
                <span className="text-[var(--text-muted)]">&bull;</span>
                <span className="text-xs font-heading font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                  {modelLabel}
                </span>
              </div>

              <h1 className="heading-xl text-white">
                {modelLabel.split(" ")[0]} <br />
                <span className="text-[var(--text-primary)]">BODY KIT </span>
                <span className="text-[var(--accent-red)]">02</span>
              </h1>

              <p className="body-md text-[var(--text-secondary)] max-w-lg">
                Precision engineered to elevate the stance and aerodynamic downforce of your{" "}
                {makeLabel} {modelLabel}. Functional, track-tested, and built to stand out.
              </p>

              {/* Aerodynamic Telemetry Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="telemetry-pill bg-[#161616] border-[#2A2A2A]">
                  <Wind size={15} className="text-[var(--success)]" />
                  <div>
                    <span className="text-[var(--success)] font-bold text-sm">+155 N</span>
                    <span className="text-[var(--text-muted)] text-[0.65rem] ml-1.5 font-sans hidden sm:inline">
                      (DOWNFORCE L/B: 50 &rarr; 147)
                    </span>
                  </div>
                </div>

                <div className="telemetry-pill bg-[#161616] border-[#2A2A2A]">
                  <Gauge size={15} className="text-[var(--accent-red)]" />
                  <div>
                    <span className="text-[var(--accent-red)] font-bold text-sm">-4 N</span>
                    <span className="text-[var(--text-muted)] text-[0.65rem] ml-1.5 font-sans hidden sm:inline">
                      (DRAG CD: 1.05 &rarr; 1.01)
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Action */}
              <div className="pt-3">
                <Link
                  href="/products/accord-g9-complete-body-kit-02"
                  className="btn-primary gap-2 text-xs"
                >
                  VIEW COMPLETE PACKAGE <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Right Hero Car Render */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-sm overflow-hidden border border-[#242424] bg-[#141414] shadow-2xl group">
                <Image
                  src="/images/FRONT.png"
                  alt={`${makeLabel} ${modelLabel} Body Kit 02`}
                  fill
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 right-3">
                  <span className="telemetry-pill text-[0.65rem]">
                    FULL KIT INSTALLED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Explore Accessories Section */}
      <section className="py-12 md:py-16">
        <div className="container-main">
          {/* Section Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="heading-lg text-white">
                EXPLORE <span className="text-[var(--accent-red)]">ACCESSORIES</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-heading uppercase tracking-wider">
                Precision-engineered individual aerodynamic components
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all ${
                    selectedCategory === cat.id
                      ? "bg-[var(--accent-red)] text-white shadow-md shadow-[var(--accent-red)]/30"
                      : "bg-[#141414] border border-[#262626] text-[var(--text-secondary)] hover:text-white hover:border-[#3A3A3A]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col bg-[#121212] border border-[#202020] hover:border-[var(--accent-red)] rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black"
              >
                {/* Product Image Link */}
                <Link
                  href={`/products/${product.slug}`}
                  className="aspect-square relative overflow-hidden bg-[#161616] block"
                >
                  <Image
                    src={product.images[0]}
                    alt={product.name}
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
                  {product.downforceN && (
                    <div className="absolute bottom-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="telemetry-pill text-[0.6rem] py-0.5 px-2 bg-black/80">
                        +{product.downforceN} N DOWNFORCE
                      </span>
                    </div>
                  )}
                </Link>

                {/* Info & Cart Action */}
                <div className="p-3.5 md:p-4 flex-1 flex flex-col justify-between bg-[#121212] border-t border-[#1C1C1C]">
                  <div>
                    <p className="text-[0.65rem] text-[var(--accent-red)] font-heading font-bold uppercase tracking-widest">
                      {product.brand}
                    </p>
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.06em] uppercase text-white group-hover:text-[var(--accent-red)] transition-colors leading-tight mt-0.5 line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#1A1A1A] flex items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-sm md:text-base font-bold text-white">
                        ฿{parseFloat(product.price).toLocaleString()} THB
                      </p>
                      {product.compareAtPrice && (
                        <p className="text-[0.7rem] text-[var(--text-muted)] line-through -mt-1 font-sans">
                          ฿{parseFloat(product.compareAtPrice).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <AddToCartButton product={product} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--text-muted)] font-heading uppercase">
                No products found in this category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Newsletter & 5. Feature Badges */}
      <NewsletterSection />
      <FeatureBadges />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="bg-[#0A0A0A] min-h-screen" />}>
      <ProductsContent />
    </Suspense>
  );
}
