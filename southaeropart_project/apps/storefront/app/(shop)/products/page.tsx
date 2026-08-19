import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { VehicleSelector } from "@/components/home/VehicleSelector";
import { AddToCartButton } from "@/components/products/AddToCartButton";

export default function ProductsPage() {
  return (
    <>
      <VehicleSelector />

      <div className="container-main py-10 md:py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="heading-lg">
            EXPLORE <span className="text-[var(--accent-red)]">ACCESSORIES</span>
          </h1>
          <Link
            href="/products"
            className="hidden md:inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-heading tracking-wider uppercase"
          >
            VIEW ALL CATEGORIES <ArrowRight size={16} />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {MOCK_PRODUCTS.map((product) => (
            <div key={product.id} className="group">
              <Link href={`/products/${product.slug}`}>
                <div className="aspect-square placeholder-image rounded-sm overflow-hidden border border-[var(--border-color)] group-hover:border-[var(--accent-red)] transition-colors">
                  <span className="text-xs">{product.imagePlaceholders[0]}</span>
                </div>
              </Link>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.08em] uppercase group-hover:text-[var(--accent-red)] transition-colors leading-tight">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 font-heading">
                    ฿{parseFloat(product.price).toLocaleString()} THB
                  </p>
                </div>
                <AddToCartButton product={product} />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link href="/products" className="btn-outline gap-2">
            VIEW ALL CATEGORIES <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <NewsletterSection />
      <FeatureBadges />
    </>
  );
}
