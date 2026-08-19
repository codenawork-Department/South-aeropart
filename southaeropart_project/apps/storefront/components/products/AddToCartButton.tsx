"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import type { MockProduct } from "@/lib/mock-data";

export function AddToCartButton({ product }: { product: MockProduct }) {
  const { addItem } = useCart();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(product);
      }}
      className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:border-[var(--accent-red)] transition-all"
      aria-label={`Add ${product.name} to cart`}
    >
      <ShoppingCart size={16} />
    </button>
  );
}
