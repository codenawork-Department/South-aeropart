"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { MockProduct, CartItem } from "@/lib/mock-data";

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: string;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: MockProduct, variant?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback((product: MockProduct, variant = "Gloss Black") => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant === variant
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `${product.id}-${variant}-${Date.now()}`,
          product,
          quantity: 1,
          variant,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items
    .reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0)
    .toFixed(2);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        itemCount,
        subtotal,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
