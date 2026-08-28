"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Wind,
  Shield,
  Layers,
  Zap,
  Check,
  X,
  Boxes,
} from "lucide-react";
import { MockProduct } from "@/lib/mock-data";
import { useCart } from "@/components/providers/CartProvider";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { KitIncludedParts } from "@/components/products/KitIncludedParts";

export function ProductDetailClient({ product }: { product: MockProduct }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFinish, setSelectedFinish] = useState(
    product.finishOptions?.[0] || product.finish
  );
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const { addItem, openCart } = useCart();

  const isBundle =
    product.productType === "bundle" ||
    (product.bundleItems && product.bundleItems.length > 0);

  const totalImages = product.images.length;
  const nextImage = () => setCurrentImage((prev) => (prev + 1) % totalImages);
  const prevImage = () =>
    setCurrentImage((prev) => (prev - 1 + totalImages) % totalImages);

  const compatibility = product.compatibility?.[0];
  const FEATURE_ICONS = [Wind, Shield, Zap, Layers];

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedFinish);
    }
    setAddedAnimation(true);
    openCart();
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Breadcrumb Navigation */}
      <nav
        className="container-main py-3.5 border-b border-[#1E1E1E]"
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-2 text-xs font-heading font-semibold tracking-wider">
          <li>
            <Link
              href="/"
              className="text-[var(--text-muted)] hover:text-white transition-colors uppercase"
            >
              HOME
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li>
            <Link
              href="/products"
              className="text-[var(--text-muted)] hover:text-white transition-colors uppercase"
            >
              SHOP
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li>
            <Link
              href={isBundle ? "/collection" : `/products?category=${product.categorySlug}`}
              className="text-[var(--text-muted)] hover:text-white transition-colors uppercase"
            >
              {isBundle ? "AERO KITS" : (compatibility ? `${compatibility.model}` : product.categoryName)}
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">&gt;</li>
          <li className="text-[var(--accent-red)] uppercase truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* 2. Main Product Hero Section (Gallery + Purchase Box) */}
      <div className="container-main py-8 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Interactive Image Gallery (7 cols) */}
          <div className="lg:col-span-7">
            {/* Main Stage Image */}
            <div className="relative aspect-[4/3] bg-[#121212] rounded-sm overflow-hidden border border-[#242424] shadow-2xl group">
              <Image
                src={product.images[currentImage] || "/images/FRONT.png"}
                alt={`${product.name} - View ${currentImage + 1}`}
                fill
                priority
                className="object-cover transition-all duration-500 ease-out"
                sizes="(max-width: 1024px) 100vw, 700px"
              />

              {/* Fullscreen Modal Toggle Button */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black/60 text-white hover:bg-[var(--accent-red)] transition-colors backdrop-blur-sm rounded-sm z-10"
                aria-label="View fullscreen image"
                title="Expand image"
              >
                <Maximize2 size={16} />
              </button>

              {/* Bottom Controls Bar (Counter & Navigation) */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                <span className="telemetry-pill text-xs font-bold text-white bg-black/75">
                  {String(currentImage + 1).padStart(2, "0")} /{" "}
                  {String(totalImages || 1).padStart(2, "0")}
                </span>

                <div className="flex gap-2 pointer-events-auto">
                  <button
                    onClick={prevImage}
                    className="w-8 h-8 flex items-center justify-center bg-black/70 text-white hover:bg-[var(--accent-red)] transition-colors backdrop-blur-sm rounded-sm"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="w-8 h-8 flex items-center justify-center bg-black/70 text-white hover:bg-[var(--accent-red)] transition-colors backdrop-blur-sm rounded-sm"
                    aria-label="Next image"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {product.images.length > 1 && (
              <div className="flex gap-2.5 mt-3.5 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-20 h-20 relative rounded-sm overflow-hidden border-2 transition-all flex-shrink-0 bg-[#141414] ${
                      currentImage === i
                        ? "border-[var(--accent-red)] opacity-100 shadow-md shadow-[var(--accent-red)]/30"
                        : "border-[#262626] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Purchasing Details (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Compatibility Badge */}
            {compatibility && (
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] text-[var(--text-muted)] font-heading font-bold uppercase tracking-widest">
                  COMPATIBLE WITH :
                </span>
                <span className="text-xs font-heading font-bold tracking-wider px-2.5 py-1 bg-[#181818] border border-[#2B2B2B] text-white rounded-sm">
                  {compatibility.make} {compatibility.model} |{" "}
                  {compatibility.yearFrom} - {compatibility.yearTo}
                </span>
              </div>
            )}

            {/* Brand & Title */}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-xs font-bold tracking-[0.2em] text-[var(--accent-red)] uppercase">
                  {product.brand}
                </p>
                {isBundle && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Boxes size={12} />
                    FULL AERO KIT
                  </span>
                )}
              </div>
              <h1 className="heading-lg text-white mt-1 uppercase">
                {product.name}
              </h1>
            </div>

            {/* Short Description */}
            <p className="body-md text-[var(--text-secondary)]">
              {product.shortDescription}
            </p>

            {/* Configuration Form & Actions */}
            <div className="space-y-4 pt-2">
              {/* Price Row */}
              <div className="flex items-center justify-between py-3 border-y border-[#202020]">
                <span className="font-heading text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)]">
                  PRICE
                </span>
                <div className="text-right">
                  <span className="font-heading text-2xl font-bold text-white">
                    ฿{parseFloat(product.price).toLocaleString()} THB
                  </span>
                  {product.compareAtPrice && (
                    <span className="text-xs text-[var(--text-muted)] line-through ml-2">
                      ฿{parseFloat(product.compareAtPrice).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Finish Selector */}
              <div className="flex items-center justify-between py-2.5 border-b border-[#202020]">
                <span className="font-heading text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)]">
                  FINISH
                </span>
                <select
                  value={selectedFinish}
                  onChange={(e) => setSelectedFinish(e.target.value)}
                  className="select-dark w-auto min-w-[170px] bg-[#161616] text-xs font-semibold py-2"
                  id="product-finish"
                >
                  {(product.finishOptions || [product.finish]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between py-2.5 border-b border-[#202020]">
                <span className="font-heading text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)]">
                  QUANTITY
                </span>
                <div className="flex items-center border border-[#2E2E2E] rounded-sm bg-[#141414]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-10 h-9 flex items-center justify-center text-xs font-heading font-bold text-white border-x border-[#2E2E2E]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleAddToCart}
                  className="btn-primary w-full justify-center gap-3 py-3.5 text-sm"
                  id="add-to-cart"
                >
                  {addedAnimation ? (
                    <>
                      <Check size={18} /> ADDED TO CART!
                    </>
                  ) : (
                    <>
                      ADD TO CART <ShoppingCart size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`btn-outline w-full justify-center gap-2 py-3 text-xs ${
                    isWishlisted
                      ? "border-[var(--accent-red)] text-[var(--accent-red)] bg-[var(--accent-red)]/10"
                      : ""
                  }`}
                  id="add-to-wishlist"
                >
                  {isWishlisted ? "SAVED IN WISHLIST" : "ADD TO WISHLIST"}
                  <Heart
                    size={16}
                    className={isWishlisted ? "fill-current" : ""}
                  />
                </button>
              </div>
            </div>

            {/* Aerodynamic Telemetry Box */}
            {product.downforceN !== undefined && (
              <div className="card p-4 bg-[#141414] border-[#242424] mt-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Downforce Delta */}
                  <div className="text-center">
                    <p className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      DOWNFORCE &Delta;
                    </p>
                    <p className="font-heading text-2xl font-black text-[var(--success)] mt-0.5">
                      +{product.downforceN} N
                    </p>
                    {product.downforceBefore !== undefined && product.downforceAfter !== undefined && (
                      <div className="text-[0.65rem] text-[var(--text-muted)] mt-1.5 font-heading">
                        <span>DOWNFORCE (L/B)</span>
                        <div className="flex items-center justify-center gap-1 text-white font-bold mt-0.5">
                          <span>{product.downforceBefore}</span>
                          <span className="text-[var(--accent-red)]">&rsaquo;</span>
                          <span className="text-[var(--success)]">
                            {product.downforceAfter}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Drag Delta */}
                  <div className="text-center border-l border-[#242424]">
                    <p className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      DRAG &Delta;
                    </p>
                    <p className="font-heading text-2xl font-black text-[var(--accent-red)] mt-0.5">
                      {product.dragN} N
                    </p>
                    {product.dragBefore !== undefined && product.dragAfter !== undefined && (
                      <div className="text-[0.65rem] text-[var(--text-muted)] mt-1.5 font-heading">
                        <span>DRAG (CD)</span>
                        <div className="flex items-center justify-center gap-1 text-white font-bold mt-0.5">
                          <span>{product.dragBefore}</span>
                          <span className="text-[var(--accent-red)]">&rsaquo;</span>
                          <span className="text-[var(--accent-red)]">
                            {product.dragAfter}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4 Mini Trust Badges */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-[#202020]">
              {[
                { icon: Award, label: "HIGH QUALITY\nMATERIALS" },
                { icon: Settings, label: "PRECISE\nENGINEERING" },
                { icon: Gauge, label: "PERFORMANCE\nFOCUSED" },
                { icon: Headphones, label: "DEDICATED\nSUPPORT" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center text-center"
                >
                  <Icon size={16} className="text-[var(--accent-red)]" />
                  <span className="text-[0.6rem] font-heading font-semibold text-[var(--text-muted)] mt-1 whitespace-pre-line leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Included Parts in Kit (If product is an Aero Kit / Bundle) */}
      {isBundle && product.bundleItems && product.bundleItems.length > 0 && (
        <div className="container-main pb-12">
          <KitIncludedParts
            items={product.bundleItems}
            kitName={product.name}
          />
        </div>
      )}

      {/* 3. Detailed Description & Specifications Section */}
      <div className="border-t border-[#1C1C1C] bg-[#0D0D0D]">
        <div className="container-main py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left: Detailed Story & Specs Table */}
            <div className="lg:col-span-7">
              <h2 className="heading-md text-white uppercase">
                TRANSFORM YOUR {compatibility?.model || "VEHICLE"} WITH THE
                SOUTH AERO {product.name.toUpperCase()}
              </h2>
              <div className="w-10 h-0.5 bg-[var(--accent-red)] mt-3 mb-5" />

              <p className="body-md text-[var(--text-secondary)] leading-relaxed">
                {product.description}
              </p>

              {/* Specifications Table */}
              <div className="mt-8 border-t border-[#242424]">
                {[
                  { label: "MATERIAL", value: product.material },
                  { label: "FINISH", value: product.finish },
                  { label: "INSTALLATION", value: product.installation },
                  { label: "WEIGHT", value: `${product.weightKg} kg` },
                  {
                    label: "COMPATIBILITY",
                    value: compatibility
                      ? `${compatibility.make} ${compatibility.model} (${compatibility.yearFrom}-${compatibility.yearTo})`
                      : "Universal / Model Specific",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 border-b border-[#202020]"
                  >
                    <span className="text-xs font-heading font-bold uppercase tracking-wider text-white">
                      {label}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[0.7rem] text-[var(--text-muted)] mt-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />
                Professional installation is recommended for optimal aerodynamic seal.
              </p>
            </div>

            {/* Right: Key Features List */}
            <div className="lg:col-span-5">
              <h2 className="heading-md text-white uppercase mb-6">
                KEY FEATURES
              </h2>
              <div className="space-y-5">
                {product.features.map((feature, i) => {
                  const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                  return (
                    <div
                      key={feature.title}
                      className="flex gap-4 p-4 bg-[#141414] border border-[#222222] rounded-sm"
                    >
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1C1C1C] border border-[#2B2B2B]">
                        <Icon size={18} className="text-[var(--accent-red)]" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xs md:text-sm font-bold tracking-wider uppercase text-white">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
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

      {/* 4. Full-Width Installed Cinematic Car Banner */}
      <div className="relative aspect-[21/9] sm:aspect-[2.6/1] w-full overflow-hidden border-y border-[#1E1E1E] bg-[#0E0E0E]">
        <Image
          src="/images/BACK.png"
          alt="Installed Rear Profile View"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute bottom-6 left-6 md:left-12">
          <p className="font-heading text-lg md:text-2xl font-bold uppercase text-white">
            {product.name} &bull; REAR AERO INTEGRATION
          </p>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-heading mt-0.5">
            SOUTH AERO PERFORMANCE LAB
          </p>
        </div>
      </div>

      {/* 5. Feature Badges */}
      <FeatureBadges />

      {/* 6. Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 text-white hover:text-[var(--accent-red)] transition-colors"
            aria-label="Close fullscreen view"
          >
            <X size={28} />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-[var(--accent-red)] text-white rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-[var(--accent-red)] text-white rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          <div className="relative w-full max-w-5xl aspect-[4/3] max-h-[85vh]">
            <Image
              src={product.images[currentImage] || "/images/FRONT.png"}
              alt={product.name}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
