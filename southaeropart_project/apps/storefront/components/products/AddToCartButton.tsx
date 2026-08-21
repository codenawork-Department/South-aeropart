"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import type { MockProduct } from "@/lib/mock-data";

export function AddToCartButton({
  product,
  showText = false,
  variant,
}: {
  product: MockProduct;
  showText?: boolean;
  variant?: string;
}) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, variant || product.finish);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  };

  if (showText) {
    return (
      <button
        onClick={handleAdd}
        className="btn-primary w-full justify-center gap-2 py-3 text-xs"
        id={`add-to-cart-${product.slug}`}
      >
        {added ? (
          <>
            <Check size={16} /> ADDED TO CART
          </>
        ) : (
          <>
            <ShoppingCart size={16} /> ADD TO CART
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-sm border transition-all ${
        added
          ? "bg-[var(--success)] border-[var(--success)] text-white"
          : "border-[#2D2D2D] bg-[#161616] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] hover:bg-[var(--accent-red)]"
      }`}
      aria-label={`Add ${product.name} to cart`}
      title="Quick Add to Cart"
    >
      {added ? <Check size={15} /> : <ShoppingCart size={15} />}
    </button>
  );
}
