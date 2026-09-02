"use client";

import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const FREE_SHIPPING_THRESHOLD = 15000;

export function CartPageClient() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart, isHydrated } = useCart();

  const subtotalNum = parseFloat(subtotal || "0");
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalNum);
  const freeShippingPercent = Math.min(100, (subtotalNum / FREE_SHIPPING_THRESHOLD) * 100);

  if (!isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent-red)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase font-heading tracking-widest text-[var(--text-muted)]">
            LOADING CART...
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-main py-16 md:py-24">
        <div className="max-w-xl mx-auto bg-[#121212] border border-[#222222] rounded-xl p-8 sm:p-12 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-[var(--text-muted)] mx-auto flex items-center justify-center mb-6">
            <ShoppingCart size={36} className="text-[var(--accent-red)]" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            YOUR CART IS EMPTY
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-md mx-auto leading-relaxed">
            ยังไม่มีสินค้าในตะกร้าของคุณ สำรวจชุดแต่งแอโรไดนามิกคาร์บอนไฟเบอร์เกรดพรีเมียมและเริ่มตกแต่งรถของคุณได้เลย
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products" className="btn-primary w-full sm:w-auto px-8 py-3.5 text-xs gap-2">
              BROWSE ACCESSORIES <ArrowRight size={16} />
            </Link>
            <Link href="/collection" className="btn-outline w-full sm:w-auto px-8 py-3.5 text-xs">
              VIEW COLLECTIONS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-10 md:py-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)] font-heading tracking-wider uppercase">
        <Link href="/" className="hover:text-white transition-colors">HOME</Link>
        <span>/</span>
        <span className="text-[var(--accent-red)]">SHOPPING CART</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#222222] gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <span className="text-xs font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
              SOUTH AERO LOGISTICS
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white mt-1">
            SHOPPING CART
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-heading tracking-wider uppercase text-[var(--text-muted)]">
            TOTAL ITEMS:
          </span>
          <span className="font-heading text-lg font-bold text-white px-3 py-1 bg-[#1A1A1A] border border-[#2D2D2D] rounded">
            {itemCount}
          </span>
        </div>
      </div>

      {/* Free Shipping Progress Indicator */}
      <div className="mb-8 p-4 bg-[#141414] border border-[#222222] rounded-lg">
        <div className="flex items-center justify-between text-xs font-heading tracking-wider uppercase mb-2">
          <div className="flex items-center gap-2 text-white">
            <Truck size={16} className="text-[var(--accent-red)]" />
            {amountToFreeShipping > 0 ? (
              <span>
                ซื้อเพิ่มอีก <span className="text-[var(--accent-red)] font-bold">฿{amountToFreeShipping.toLocaleString()} THB</span> เพื่อรับสิทธิ์จัดส่งฟรี!
              </span>
            ) : (
              <span className="text-[var(--success)] font-bold flex items-center gap-1.5">
                <Sparkles size={14} /> คุณได้รับสิทธิ์จัดส่งฟรีทั่วประเทศแล้ว!
              </span>
            )}
          </div>
          <span className="text-[var(--text-muted)] font-mono">{freeShippingPercent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#202020] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-red-dark)] to-[var(--accent-red)] transition-all duration-500 rounded-full"
            style={{ width: `${freeShippingPercent}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Cart Items (Left) vs Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="hidden sm:grid grid-cols-12 text-[0.7rem] font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] pb-3 border-b border-[#222222] px-4">
            <div className="col-span-6">PRODUCT</div>
            <div className="col-span-2 text-center">PRICE</div>
            <div className="col-span-2 text-center">QUANTITY</div>
            <div className="col-span-2 text-right">TOTAL</div>
          </div>

          {items.map((item) => {
            const priceNum = parseFloat(item.product.price || "0");
            const lineTotal = (priceNum * item.quantity).toFixed(2);

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-lg transition-colors"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Product Info */}
                  <div className="sm:col-span-6 flex gap-4 items-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-[#1A1A1A] border border-[#2D2D2D] rounded-md overflow-hidden relative">
                      {item.product.images?.[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-[0.65rem] text-center font-heading text-[var(--text-muted)]">
                          {item.product.name}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.65rem] font-heading font-bold uppercase tracking-widest text-[var(--accent-red)]">
                        SOUTH AERO
                      </p>
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-heading text-sm sm:text-base font-bold uppercase text-white hover:text-[var(--accent-red)] transition-colors line-clamp-2 mt-0.5"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[0.7rem] px-2 py-0.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded text-[var(--text-secondary)]">
                          Finish: <strong className="text-white">{item.variant || "Gloss Black"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2 text-left sm:text-center">
                    <span className="sm:hidden text-xs text-[var(--text-muted)] font-heading mr-2 uppercase">
                      Price:
                    </span>
                    <span className="font-heading text-sm font-semibold text-white">
                      ฿{priceNum.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                    <div className="flex items-center border border-[#333333] rounded bg-[#0E0E0E]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-white disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 h-7 flex items-center justify-center text-xs font-heading font-bold text-white border-x border-[#333333]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-heading text-sm sm:text-base font-bold text-white">
                      ฿{parseFloat(lineTotal).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                      aria-label="Remove item"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action Row Under Items */}
          <div className="flex flex-wrap items-center justify-between pt-4 gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-heading font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> CONTINUE SHOPPING
            </Link>
            <button
              onClick={clearCart}
              className="text-xs font-heading tracking-wider uppercase text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
            >
              CLEAR SHOPPING CART
            </button>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4 sticky top-28">
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-6 shadow-2xl space-y-5">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-white pb-4 border-b border-[#222222]">
              ORDER SUMMARY
            </h2>

            {/* Price Calculations */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-heading font-semibold text-white">
                  ฿{subtotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Estimated Shipping</span>
                <span className="font-heading font-semibold text-white">
                  {subtotalNum >= FREE_SHIPPING_THRESHOLD ? (
                    <span className="text-[var(--success)] uppercase text-xs">FREE SHIPPING</span>
                  ) : (
                    "฿150.00 THB"
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Estimated VAT (7%)</span>
                <span className="font-heading font-semibold text-[var(--text-muted)] text-xs">
                  INCLUDED IN TOTAL
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-4 border-t border-[#222222] flex items-baseline justify-between">
              <div>
                <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                  TOTAL
                </span>
                <p className="text-[0.65rem] text-[var(--text-muted)] uppercase">Tax included</p>
              </div>
              <div className="text-right">
                <span className="font-heading text-2xl font-extrabold text-white">
                  ฿{(subtotalNum + (subtotalNum >= FREE_SHIPPING_THRESHOLD ? 0 : 150)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[0.7rem] text-[var(--text-muted)] block font-mono">THB</span>
              </div>
            </div>

            {/* Checkout Action */}
            <Link
              href="/checkout"
              id="proceed-to-checkout-btn"
              className="btn-primary w-full justify-center gap-2 py-4 text-xs tracking-widest font-heading font-bold uppercase shadow-lg shadow-[var(--accent-red)]/20"
            >
              PROCEED TO CHECKOUT <ArrowRight size={16} />
            </Link>

            {/* Trust Features */}
            <div className="pt-4 border-t border-[#202020] space-y-2.5">
              {[
                { icon: ShieldCheck, title: "GENUINE CARBON FIBER", desc: "Authentic aerospace autoclave pre-preg" },
                { icon: Truck, title: "INSURED FREIGHT SHIPPING", desc: "Heavy-duty custom wooden crating" },
                { icon: RotateCcw, title: "30-DAY FITMENT WARRANTY", desc: "Guaranteed perfect OEM fitment" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon size={16} className="text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[0.7rem] font-heading font-bold uppercase tracking-wider text-white">
                      {title}
                    </p>
                    <p className="text-[0.65rem] text-[var(--text-muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
