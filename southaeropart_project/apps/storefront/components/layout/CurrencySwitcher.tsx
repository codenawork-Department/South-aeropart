"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Currency, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { Coins, ChevronDown, Check } from "lucide-react";

interface CurrencySwitcherProps {
  variant?: "navbar" | "mobile" | "compact";
  className?: string;
}

export function CurrencySwitcher({
  variant = "navbar",
  className = "",
}: CurrencySwitcherProps) {
  const { currency, setCurrency, allMetadata, rates } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (variant === "mobile") {
    return (
      <div
        className={`flex flex-col gap-2 p-3 rounded-lg bg-[#141414] border border-[#222] ${className}`}
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-heading uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Coins size={15} className="text-[var(--accent-red)]" />
            <span>Currency / สกุลเงิน</span>
          </div>
          <span className="text-[10px] text-[var(--accent-red)] font-mono font-bold">
            {allMetadata[currency]?.symbol} {currency}
          </span>
        </div>

        {/* Currency Pills Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
          {SUPPORTED_CURRENCIES.map((code) => {
            const meta = allMetadata[code];
            const isSelected = currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded text-xs font-heading font-bold transition-all border ${
                  isSelected
                    ? "bg-[var(--accent-red)] text-white border-[var(--accent-red)] shadow-sm shadow-black"
                    : "bg-[#1C1C1C] text-[var(--text-secondary)] border-[#282828] hover:text-white hover:border-[#444]"
                }`}
              >
                <span className="text-sm leading-none font-mono">{meta.symbol}</span>
                <span className="text-[10px] tracking-wider mt-0.5">{code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Navbar Dropdown Switcher
  const currentMeta = allMetadata[currency] || allMetadata.THB;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-heading font-bold uppercase tracking-wider rounded-sm bg-[#151515] border border-[#262626] hover:border-[#383838] hover:text-white text-[var(--text-secondary)] transition-all shadow-inner"
        aria-label="Select currency"
        aria-expanded={isOpen}
      >
        <Coins size={12} className="text-[var(--accent-red)]" />
        <span className="text-white font-mono">{currentMeta.symbol}</span>
        <span>{currency}</span>
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 text-[var(--text-muted)] ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-48 rounded-md bg-[#121212] border border-[#2A2A2A] shadow-2xl z-[100] py-1.5 animate-fadeIn"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[#202020] mb-1">
            Display Currency
          </div>

          {SUPPORTED_CURRENCIES.map((code) => {
            const meta = allMetadata[code];
            const isSelected = currency === code;
            const rate = rates[code];
            const rateText =
              code === "THB"
                ? "Base currency"
                : rate
                ? `1 THB ≈ ${rate >= 1 ? rate.toFixed(2) : rate.toFixed(4)} ${meta.symbol}`
                : "";

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-[#1F1414] text-white"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      isSelected
                        ? "bg-[var(--accent-red)] text-white"
                        : "bg-[#1E1E1E] text-[var(--text-muted)]"
                    }`}
                  >
                    {meta.symbol}
                  </span>
                  <div className="truncate">
                    <p
                      className={`font-heading font-bold tracking-wider leading-tight ${
                        isSelected ? "text-[var(--accent-red)]" : "text-white"
                      }`}
                    >
                      {code}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {meta.nameEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {rateText && (
                    <span className="text-[9px] text-[var(--text-muted)] font-mono">
                      {rateText}
                    </span>
                  )}
                  {isSelected && (
                    <Check size={14} className="text-[var(--accent-red)] shrink-0 ml-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
