"use client";

import { X, Minus, Plus, Trash2, ShoppingCart, Lock, Award, RotateCcw, Headphones, ArrowRight } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, itemCount, subtotal } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-[var(--bg-primary)] border-l border-[var(--border-color)] flex flex-col animate-slide-in-right"
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)]">
          <h2 className="font-heading text-lg font-bold tracking-wider uppercase">
            MY CART <span className="text-[var(--text-secondary)]">({itemCount})</span>
          </h2>
          <button
            id="cart-close"
            onClick={closeCart}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart size={48} className="text-[var(--border-color)] mb-4" />
              <p className="font-heading text-sm tracking-wider text-[var(--text-secondary)] uppercase">
                Your cart is empty
              </p>
              <Link
                href="/products"
                onClick={closeCart}
                className="btn-primary mt-6 text-xs"
              >
                BROWSE PRODUCTS
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded"
              >
                {/* Product Image Placeholder */}
                <div className="w-20 h-20 flex-shrink-0 placeholder-image rounded" style={{ background: '#1a1a1a' }}>
                  <span className="text-[0.6rem] text-[var(--text-muted)]">
                    {item.product.name}
                  </span>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.65rem] text-[var(--accent-red)] font-heading font-semibold tracking-wider uppercase">
                        SOUTH AERO
                      </p>
                      <h3 className="font-heading text-sm font-bold tracking-wide uppercase leading-tight mt-0.5">
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {item.variant}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors flex-shrink-0"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="font-heading text-sm font-bold">
                      ฿{parseFloat(item.product.price).toLocaleString()} THB
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center border border-[var(--border-color)]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 h-7 flex items-center justify-center text-xs font-medium border-x border-[var(--border-color)]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[var(--border-color)] px-6 py-5 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm tracking-wider text-[var(--text-secondary)] uppercase">
                Subtotal ({itemCount} {itemCount === 1 ? "Item" : "Items"})
              </span>
              <span className="font-heading text-lg font-bold">
                ฿{parseFloat(subtotal).toLocaleString()} THB
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Shipping and taxes calculated at checkout.
            </p>

            {/* Actions */}
            <Link
              href="/checkout"
              onClick={closeCart}
              id="checkout-btn"
              className="btn-primary w-full justify-center gap-2"
            >
              CHECK OUT <ArrowRight size={16} />
            </Link>
            <button
              onClick={closeCart}
              className="btn-outline w-full justify-center gap-2"
            >
              CONTINUE SHOPPING <ArrowRight size={16} />
            </button>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
              {[
                { icon: Lock, title: "Secure Checkout", desc: "Your payment is 100% secure." },
                { icon: Award, title: "Premium Quality", desc: "Built for performance and style." },
                { icon: RotateCcw, title: "Easy Returns", desc: "Hassle-free returns within 30 days." },
                { icon: Headphones, title: "Dedicated Support", desc: "We're here to help you." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon size={16} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{desc}</p>
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
