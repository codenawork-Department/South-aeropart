"use client";

import { X, Minus, Plus, Trash2, ShoppingCart, Lock, Award, RotateCcw, Headphones, ArrowRight } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import Link from "next/link";
import Image from "next/image";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, itemCount, subtotal } = useCart();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className="absolute top-0 right-0 bottom-0 w-full max-w-[430px] bg-[#0D0D0D] border-l border-[#222222] flex flex-col shadow-2xl shadow-black animate-slide-in-right z-10"
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base sm:text-lg font-bold tracking-wider uppercase text-white">
              {t.cart.title}
            </h2>
            <span className="text-[var(--accent-red)] font-heading text-base sm:text-lg font-bold">
              ({itemCount})
            </span>
          </div>
          <button
            id="cart-close"
            onClick={closeCart}
            className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors rounded hover:bg-white/5"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mb-4 text-[var(--text-muted)]">
                <ShoppingCart size={28} />
              </div>
              <p className="font-heading text-base font-semibold tracking-wider text-white uppercase">
                {t.cart.empty}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-xs">
                {t.cart.emptyDesc}
              </p>
              <Link
                href="/products"
                onClick={closeCart}
                className="btn-primary mt-6 text-xs gap-2"
              >
                {t.cart.startShopping} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 sm:gap-4 p-3 sm:p-3.5 bg-[#141414] border border-[#222222] rounded relative group"
              >
                {/* Product Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-[#1C1C1C] rounded overflow-hidden relative border border-[#2A2A2A]">
                  {item.product.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[0.6rem] text-[var(--text-muted)] p-1 text-center font-heading">
                      {item.product.name}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[0.65rem] text-[var(--accent-red)] font-heading font-bold tracking-widest uppercase">
                          SOUTH AERO
                        </p>
                        <h3 className="font-heading text-sm font-bold tracking-wide uppercase leading-tight text-white mt-0.5 truncate">
                          {item.product.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Finish: <span className="text-white font-medium">{item.variant || item.product.finish}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#202020]">
                    <p className="font-heading text-sm font-bold text-white">
                      {formatPrice(item.product.price, { showCode: true })}
                    </p>

                    {/* Quantity Selector Stepper */}
                    <div className="flex items-center border border-[#333333] rounded-sm bg-[#0E0E0E]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-7 h-6 flex items-center justify-center text-xs font-heading font-bold text-white border-x border-[#333333]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="border-t border-[#222222] bg-[#111111] px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs sm:text-sm font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                {t.cart.subtotal} ({itemCount} {t.cart.items})
              </span>
              <span className="font-heading text-lg sm:text-xl font-bold text-white">
                {formatPrice(subtotal, { showCode: true })}
              </span>
            </div>
            <p className="text-[0.7rem] sm:text-[0.75rem] text-[var(--text-muted)] -mt-1 sm:-mt-2">
              {t.cart.shippingCalculated}
            </p>

            {/* Actions */}
            <div className="space-y-2 sm:space-y-2.5 pt-1">
              <Link
                href="/checkout"
                onClick={closeCart}
                id="checkout-btn"
                className="btn-primary w-full justify-center gap-2 py-3 sm:py-3.5 text-xs sm:text-sm"
              >
                {t.cart.checkout} <ArrowRight size={16} />
              </Link>
              <Link
                href="/cart"
                onClick={closeCart}
                id="view-cart-btn"
                className="btn-outline w-full justify-center gap-2 py-2.5 sm:py-3 text-xs tracking-wider"
              >
                {t.cart.title}
              </Link>
              <button
                onClick={closeCart}
                className="w-full text-center py-1.5 sm:py-2 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
              >
                {t.cart.continueShopping}
              </button>
            </div>

            {/* 4 Trust Badges */}
            <div className="pt-3 sm:pt-4 border-t border-[#222222] grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { icon: Lock, title: "SECURE CHECKOUT", desc: "Your payment is 100% secure." },
                { icon: Award, title: "PREMIUM QUALITY", desc: "Built for performance and style." },
                { icon: RotateCcw, title: "EASY RETURNS", desc: "Hassle-free 30-day policy." },
                { icon: Headphones, title: "DEDICATED SUPPORT", desc: "We're here to help you." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-2 sm:gap-2.5">
                  <Icon size={13} className="text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[0.6rem] sm:text-[0.65rem] font-heading font-bold text-white tracking-wider uppercase">
                      {title}
                    </p>
                    <p className="text-[0.58rem] sm:text-[0.65rem] text-[var(--text-muted)] leading-tight mt-0.5">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
