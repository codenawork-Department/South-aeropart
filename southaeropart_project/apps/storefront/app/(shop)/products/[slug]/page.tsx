"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Award,
  Settings,
  Gauge,
  Headphones,
  ArrowUpRight,
  Wind,
  Shield,
  Layers,
  Zap,
} from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { useCart } from "@/components/providers/CartProvider";
import { FeatureBadges } from "@/components/home/FeatureBadges";

function ProductDetailClient({ slug }: { slug: string }) {
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug) || MOCK_PRODUCTS[0];
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFinish, setSelectedFinish] = useState(product.finish);
  const { addItem } = useCart();

  const nextImage = () =>
    setCurrentImage((prev) => (prev + 1) % product.imageCount);
  const prevImage = () =>
    setCurrentImage((prev) => (prev - 1 + product.imageCount) % product.imageCount);

  const compatibility = product.compatibility[0];

  const FEATURE_ICONS = [Wind, Shield, Zap, Layers];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="container-main py-3 border-b border-[var(--border-color)]" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs">
          <li>
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider">
              Home
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li>
            <Link href="/products" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider">
              Shop
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li>
            <Link href="/products?category=accord-g9" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider">
              Accord G9
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li className="text-[var(--accent-red)] font-semibold uppercase tracking-wider">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main Product Section */}
      <div className="container-main py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-[4/3] bg-[var(--bg-secondary)] rounded-sm overflow-hidden border border-[var(--border-color)]">
              <div className="placeholder-image w-full h-full">
                <span>{product.imagePlaceholders[currentImage]}</span>
              </div>

              {/* Fullscreen Toggle */}
              <button
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm rounded-sm"
                aria-label="View fullscreen"
              >
                <Maximize2 size={16} />
              </button>

              {/* Navigation */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-sm font-heading font-bold">
                  {String(currentImage + 1).padStart(2, "0")} / {String(product.imageCount).padStart(2, "0")}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={prevImage}
                    className="w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                    aria-label="Next image"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-2 mt-3">
              {Array.from({ length: product.imageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-16 h-16 md:w-20 md:h-20 placeholder-image rounded-sm border-2 transition-all flex-shrink-0 ${
                    currentImage === i
                      ? "border-[var(--accent-red)] opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="text-[0.5rem]">Thumb {i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div>
            {/* Compatible Badge */}
            {compatibility && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  Compatible with :
                </span>
                <span className="text-xs font-semibold px-3 py-1 border border-[var(--border-color)] rounded-sm">
                  {compatibility.make} {compatibility.model} | {compatibility.yearFrom} - {compatibility.yearTo}
                </span>
              </div>
            )}

            {/* Brand + Name */}
            <p className="font-heading text-sm font-bold tracking-[0.15em] text-[var(--accent-red)] uppercase">
              {product.brand}
            </p>
            <h1 className="heading-lg mt-1">{product.name}</h1>

            {/* Description */}
            <p className="body-md mt-4">
              {product.shortDescription}
            </p>

            {/* Price + Variant + Quantity + Actions */}
            <div className="mt-6 space-y-4">
              {/* Price */}
              <div className="flex items-center justify-between py-3 border-y border-[var(--border-color)]">
                <span className="font-heading text-sm tracking-wider uppercase text-[var(--text-secondary)]">
                  Price
                </span>
                <span className="font-heading text-xl font-bold">
                  ฿{parseFloat(product.price).toLocaleString()} THB
                </span>
              </div>

              {/* Finish */}
              <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
                <span className="font-heading text-sm tracking-wider uppercase text-[var(--text-secondary)]">
                  Finish
                </span>
                <select
                  value={selectedFinish}
                  onChange={(e) => setSelectedFinish(e.target.value)}
                  className="select-dark w-auto min-w-[160px]"
                  id="product-finish"
                >
                  <option value="Gloss Black">Gloss Black</option>
                  <option value="Matte Black">Matte Black</option>
                  <option value="Carbon Look">Carbon Look</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
                <span className="font-heading text-sm tracking-wider uppercase text-[var(--text-secondary)]">
                  Quantity
                </span>
                <div className="flex items-center border border-[var(--border-color)]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center text-sm font-medium border-x border-[var(--border-color)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={() => {
                  for (let i = 0; i < quantity; i++) {
                    addItem(product, selectedFinish);
                  }
                }}
                className="btn-primary w-full justify-center gap-3 py-4 text-base"
                id="add-to-cart"
              >
                ADD TO CART
                <ShoppingCart size={18} />
              </button>

              {/* Add to Wishlist */}
              <button
                className="btn-outline w-full justify-center gap-3"
                id="add-to-wishlist"
              >
                ADD TO WISHLIST
                <Heart size={18} />
              </button>
            </div>

            {/* Performance Stats */}
            {product.downforceN !== undefined && (
              <div className="mt-6 card p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                      Downforce Δ
                    </p>
                    <p className="font-heading text-2xl font-bold text-[var(--success)] mt-1">
                      +{product.downforceN} N
                    </p>
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                      <span className="uppercase tracking-wider">Downforce (N)</span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span>{product.downforceBefore}</span>
                        <span>›</span>
                        <span className="text-[var(--success)]">{product.downforceAfter}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center border-l border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                      Drag Δ
                    </p>
                    <p className="font-heading text-2xl font-bold text-[var(--accent-red)] mt-1">
                      {product.dragN} N
                    </p>
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                      <span className="uppercase tracking-wider">Drag (N)</span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span>{product.dragBefore}</span>
                        <span>›</span>
                        <span className="text-[var(--accent-red)]">{product.dragAfter}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mini Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-6 py-4 border-t border-[var(--border-color)]">
              {[
                { icon: Award, label: "High Quality\nMaterials" },
                { icon: Settings, label: "Precision\nEngineered" },
                { icon: Gauge, label: "Performance\nFocused" },
                { icon: Headphones, label: "Dedicated\nSupport" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center text-center">
                  <Icon size={16} className="text-[var(--text-muted)]" />
                  <span className="text-[0.6rem] text-[var(--text-muted)] mt-1 leading-tight whitespace-pre-line uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="border-t border-[var(--border-color)]">
        <div className="container-main py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Description */}
            <div>
              <h2 className="heading-md">
                TRANSFORM YOUR ACCORD
                <br />
                WITH THE SOUTH AERO {product.name.toUpperCase()}
              </h2>
              <div className="w-8 h-0.5 bg-[var(--accent-red)] mt-4 mb-6" />
              <p className="body-md">{product.description}</p>

              {/* Specs Table */}
              <div className="mt-8 space-y-0">
                {[
                  { label: "Material", value: product.material },
                  { label: "Finish", value: product.finish },
                  { label: "Installation", value: product.installation },
                  { label: "Weight", value: `${product.weightKg} kg` },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
                  >
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      {label}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{value}</span>
                  </div>
                ))}
              </div>

              <p className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                Professional installation is recommended.
              </p>
            </div>

            {/* Right: Key Features */}
            <div>
              <h2 className="heading-md">KEY FEATURES</h2>
              <div className="mt-6 space-y-6">
                {product.features.map((feature, i) => {
                  const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                  return (
                    <div key={feature.title} className="flex gap-4">
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-[var(--border-color)]">
                        <Icon size={18} className="text-[var(--accent-red)]" />
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-bold tracking-wider uppercase">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Product Image */}
      <div className="placeholder-image w-full aspect-[21/9]">
        <span>Honda Accord G9 — Full Width Banner with Body Kit</span>
      </div>

      {/* Bottom Feature Badges */}
      <div className="border-t border-[var(--border-color)]">
        <div className="container-main py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Gauge, title: "DESIGNED FOR PERFORMANCE", desc: "Engineered to improve aerodynamics and stability." },
              { icon: Award, title: "PREMIUM QUALITY MATERIALS", desc: "Built with durable materials for long-lasting performance." },
              { icon: Settings, title: "PRECISION FITMENT GUARANTEED", desc: "Custom designed for a perfect and seamless fit." },
              { icon: Headphones, title: "DEDICATED SUPPORT", desc: "Our team is here to help you before and after your purchase." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 flex items-center justify-center rounded-full border border-[var(--border-color)] mb-3">
                  <Icon size={20} className="text-[var(--text-secondary)]" />
                </div>
                <h3 className="font-heading text-xs font-bold tracking-[0.08em] uppercase">{title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-[200px]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ProductDetailClient slug={params.slug} />;
}
