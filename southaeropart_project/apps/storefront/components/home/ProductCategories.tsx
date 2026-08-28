import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/mock-data";

export function ProductCategories() {
  return (
    <section className="py-12 md:py-16 bg-[#0A0A0A]">
      <div className="container-main">
        {/* 4 Product Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {PRODUCT_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={category.href}
              className="group flex flex-col bg-[#121212] border border-[#202020] hover:border-[var(--accent-red)] rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black"
            >
              {/* Product Image */}
              <div className="aspect-square relative overflow-hidden bg-[#161616]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Title & Subtitle */}
              <div className="p-3 md:p-4 bg-[#121212] flex items-center justify-between border-t border-[#1C1C1C]">
                <div>
                  <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.12em] uppercase text-white group-hover:text-[var(--accent-red)] transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-[0.65rem] text-[var(--text-muted)] font-heading mt-0.5">
                    {category.productCount}
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#1C1C1C] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent-red)] group-hover:text-white transition-colors">
                  <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="flex justify-end mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs md:text-sm text-[var(--text-secondary)] hover:text-white transition-colors font-heading font-semibold tracking-widest uppercase group"
          >
            VIEW ALL PRODUCTS
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
