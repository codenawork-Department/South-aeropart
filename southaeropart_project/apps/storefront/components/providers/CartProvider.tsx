"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CartableProduct } from "@/components/products/AddToCartButton";

export type CartItem = {
  id: string;
  product: CartableProduct;
  quantity: number;
  variant: string;
};

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: string;
  isHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: CartableProduct, variant?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "south_aero_cart_items";

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount (hydration-safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error("[CartProvider] Failed to load cart from localStorage", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync cart to localStorage whenever items change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("[CartProvider] Failed to save cart to localStorage", e);
    }
  }, [items, isHydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback((product: CartableProduct, variant = "Gloss Black") => {
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
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items
    .reduce((sum, item) => sum + parseFloat(item.product.price || "0") * item.quantity, 0)
    .toFixed(2);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        itemCount,
        subtotal,
        isHydrated,
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


