"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Wind,
  Gauge,
  Boxes,
  Layers,
  Check,
  PackageOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { WishlistItem } from "@/actions/wishlist.actions";
import { removeFromWishlist } from "@/actions/wishlist.actions";
import { useCart } from "@/components/providers/CartProvider";

interface WishlistClientProps {
  initialItems: WishlistItem[];
}

export function WishlistClient({ initialItems }: WishlistClientProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "single" | "bundle">("all");

  const { addItem, openCart } = useCart();

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const res = await removeFromWishlist(productId);
      if (res.success) {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      }
    } catch (err) {
      console.error("Failed to remove item from wishlist:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    setAddingId(item.productId);
    addItem(
      {
        id: item.productId,
        slug: item.slug,
        name: item.name,
        price: item.price,
        primaryImage: item.primaryImage || undefined,
        images: item.primaryImage ? [item.primaryImage] : [],
        brandName: item.brandName,
        brand: item.brandName || "South Aero",
      },
      "Gloss Black"
    );
    openCart();
    setTimeout(() => {
      setAddingId(null);
    }, 1200);
  };

  const bundleCount = items.filter((i) => i.productType === "bundle").length;
  const singleCount = items.filter((i) => i.productType === "single").length;

  const filteredItems = items.filter((item) => {
    if (filterType === "all") return true;
    return item.productType === filterType;
  });

  return (
    <div className="bg-[#0A0A0A] min-h-screen pb-16 md:pb-20">
      {/* Header Banner */}
      <section className="border-b border-[#1E1E1E] bg-gradient-to-b from-[#141414] to-[#0A0A0A]">
        <div className="container-main py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded-full text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase mb-3">
                <Heart size={12} className="fill-current text-[var(--accent-red)]" />
                SAVED PERFORMANCE PARTS
              </div>
              <h1 className="heading-xl text-white">
                MY <span className="text-[var(--accent-red)]">WISHLIST</span>
              </h1>
              <p className="body-md text-[var(--text-secondary)] mt-2">
                รายการชิ้นส่วนและชุดเซ็ตแอโรไดนามิกส์ที่คุณบันทึกไว้สำหรับรถคู่ใจ
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="bg-[#121212] border border-[#222222] px-3 sm:px-4 py-2 sm:py-2.5 rounded-sm">
                <span className="text-[0.6rem] sm:text-[0.65rem] font-heading text-[var(--text-muted)] tracking-wider uppercase block">
                  TOTAL SAVED
                </span>
                <span className="text-lg sm:text-xl font-heading font-bold text-white">
                  {items.length} <span className="text-xs font-normal text-[var(--text-secondary)]">รายการ</span>
                </span>
              </div>
              <div className="bg-[#121212] border border-[#222222] px-3 sm:px-4 py-2 sm:py-2.5 rounded-sm">
                <span className="text-[0.6rem] sm:text-[0.65rem] font-heading text-[var(--text-muted)] tracking-wider uppercase block">
                  BUNDLES / ชุดเซ็ต
                </span>
                <span className="text-lg sm:text-xl font-heading font-bold text-[var(--accent-red)]">
                  {bundleCount} <span className="text-xs font-normal text-[var(--text-secondary)]">เซ็ต</span>
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs if items exist */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 mt-6 sm:mt-8 border-t border-[#1C1C1C] pt-4 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 text-xs font-heading tracking-wider uppercase rounded-sm transition-colors shrink-0 ${
                  filterType === "all"
                    ? "bg-[var(--accent-red)] text-white font-bold"
                    : "bg-[#141414] text-[var(--text-secondary)] hover:text-white border border-[#242424]"
                }`}
              >
                ทั้งหมด ({items.length})
              </button>
              <button
                onClick={() => setFilterType("bundle")}
                className={`px-3 py-1.5 text-xs font-heading tracking-wider uppercase rounded-sm transition-colors flex items-center gap-1.5 ${
                  filterType === "bundle"
                    ? "bg-[var(--accent-red)] text-white font-bold"
                    : "bg-[#141414] text-[var(--text-secondary)] hover:text-white border border-[#242424]"
                }`}
              >
                <Boxes size={14} />
                ชุดเซ็ต / Bundles ({bundleCount})
              </button>
              <button
                onClick={() => setFilterType("single")}
                className={`px-3 py-1.5 text-xs font-heading tracking-wider uppercase rounded-sm transition-colors flex items-center gap-1.5 ${
                  filterType === "single"
                    ? "bg-[var(--accent-red)] text-white font-bold"
                    : "bg-[#141414] text-[var(--text-secondary)] hover:text-white border border-[#242424]"
                }`}
              >
                <Layers size={14} />
                ชิ้นส่วนเดี่ยว ({singleCount})
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <section className="container-main py-12">
        {items.length === 0 ? (
          /* Empty State */
          <div className="card p-12 md:p-16 bg-[#111111] border border-[#222222] text-center max-w-xl mx-auto rounded-sm shadow-2xl space-y-5 my-8">
            <div className="w-16 h-16 rounded-full bg-[#181818] border border-[#2A2A2A] text-[var(--text-muted)] mx-auto flex items-center justify-center">
              <Heart size={28} className="stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h2 className="heading-md text-white">
                ยังไม่มีสินค้าใน WISHLIST ของคุณ
              </h2>
              <p className="body-sm text-[var(--text-secondary)] max-w-md mx-auto">
                เลือกสำรวจชิ้นส่วนแอโรพาร์ทคาร์บอนไฟเบอร์หรือชุดแต่งแพ็กเกจเต็มระบบ แล้วกดปุ่มหัวใจเพื่อบันทึกไว้ดูภายหลัง
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/products"
                className="btn-primary gap-2 text-xs py-3 px-6 w-full sm:w-auto inline-flex justify-center"
              >
                <Sparkles size={14} />
                สำรวจชิ้นส่วนทั้งหมด (CATALOG)
              </Link>
              <Link
                href="/collection"
                className="btn-outline gap-2 text-xs py-3 px-6 w-full sm:w-auto inline-flex justify-center"
              >
                <Boxes size={14} />
                ดูชุดเซ็ตเต็มคัน (BUNDLES)
              </Link>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <PackageOpen size={36} className="mx-auto mb-3 opacity-40" />
            <p>ไม่พบรายการในหมวดหมู่ที่เลือก</p>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const isRemoving = removingId === item.productId;
              const isAdding = addingId === item.productId;
              const isBundle = item.productType === "bundle";
              const formattedPrice = Number(item.price).toLocaleString("th-TH");
              const formattedCompare = item.compareAtPrice
                ? Number(item.compareAtPrice).toLocaleString("th-TH")
                : null;

              return (
                <div
                  key={item.id}
                  className={`card bg-[#121212] border border-[#222222] hover:border-[var(--accent-red)] transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
                    isRemoving ? "opacity-30 scale-95 pointer-events-none" : ""
                  }`}
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div className="relative aspect-[4/3] w-full bg-[#181818] overflow-hidden border-b border-[#1E1E1E]">
                      {item.primaryImage ? (
                        <Image
                          src={item.primaryImage}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 bg-[#141414]">
                          <PackageOpen size={32} />
                          <span className="text-[0.65rem] font-heading uppercase tracking-widest">
                            NO IMAGE
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                        {isBundle ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-red)] text-white text-[0.6rem] font-heading font-bold uppercase tracking-wider rounded-sm shadow-md">
                            <Boxes size={10} />
                            AERO BUNDLE / ชุดเซ็ต
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1E1E1E]/90 text-white text-[0.6rem] font-heading font-medium uppercase tracking-wider rounded-sm border border-[#333]">
                            {item.categoryName || "AEROPART"}
                          </span>
                        )}
                      </div>

                      {/* Delete / Remove Action */}
                      <button
                        onClick={() => handleRemove(item.productId)}
                        disabled={isRemoving}
                        className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/70 hover:bg-[var(--accent-red)] text-white/80 hover:text-white transition-colors z-10 border border-white/10"
                        title="ลบออกจาก Wishlist"
                        aria-label="Remove from wishlist"
                      >
                        {isRemoving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>

                      {/* Telemetry pill overlay if available */}
                      {(item.downforceN || item.dragN) && (
                        <div className="absolute bottom-2 left-2 flex gap-1.5 z-10">
                          {item.downforceN && (
                            <span className="telemetry-pill text-[0.65rem] py-0.5 px-2 bg-black/80 backdrop-blur-sm border-white/10">
                              <Wind size={11} className="text-[var(--success)]" />
                              <span className="text-[var(--success)] font-bold">
                                +{item.downforceN}N
                              </span>
                            </span>
                          )}
                          {item.dragN && (
                            <span className="telemetry-pill text-[0.65rem] py-0.5 px-2 bg-black/80 backdrop-blur-sm border-white/10">
                              <Gauge size={11} className="text-[var(--accent-red)]" />
                              <span className="text-[var(--accent-red)] font-bold">
                                {item.dragN > 0 ? `+${item.dragN}N` : `${item.dragN}N`}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Body Info */}
                    <div className="p-4 space-y-2">
                      <div className="text-[0.65rem] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {item.brandName || "South Aero"}
                        {item.carModelName && ` • ${item.carModelName}`}
                      </div>

                      <Link
                        href={`/products/${item.slug}`}
                        className="block heading-sm text-white hover:text-[var(--accent-red)] transition-colors line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>

                      {item.materialName && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          วัสดุ: {item.materialName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Price & Add to Cart */}
                  <div className="p-4 pt-0 border-t border-[#1C1C1C] mt-3 space-y-3">
                    <div className="flex items-baseline justify-between pt-3">
                      <div>
                        <span className="text-[0.6rem] text-[var(--text-muted)] font-heading uppercase tracking-wider block">
                          PRICE
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-lg font-bold text-white">
                            ฿{formattedPrice}
                          </span>
                          {formattedCompare && (
                            <span className="text-xs text-[var(--text-muted)] line-through">
                              ฿{formattedCompare}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[0.65rem] font-heading font-bold uppercase tracking-wider ${
                          item.stockQuantity > 0
                            ? "text-[var(--success)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {item.stockQuantity > 0 ? "IN STOCK" : "MADE TO ORDER"}
                      </span>
                    </div>

                    {/* Add to cart / View button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={isAdding}
                        className="btn-primary flex-1 justify-center gap-2 text-xs py-2.5"
                      >
                        {isAdding ? (
                          <>
                            <Check size={14} />
                            ADDED!
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={14} />
                            ADD TO CART
                          </>
                        )}
                      </button>

                      <Link
                        href={`/products/${item.slug}`}
                        className="p-2.5 rounded-sm bg-[#1A1A1A] hover:bg-[#252525] text-[var(--text-secondary)] hover:text-white border border-[#282828] transition-colors"
                        title="ดูรายละเอียดสินค้า"
                        aria-label="View product detail"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
