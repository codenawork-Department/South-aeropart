"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableComboboxProps {
  id: string;
  label: string;
  placeholder?: string;
  searchPlaceholder?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  emptyText?: string;
}

export function SearchableCombobox({
  id,
  label,
  placeholder = "เลือกรายการ...",
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  value,
  options,
  onChange,
  disabled = false,
  isLoading = false,
  emptyText = "ไม่พบข้อมูล",
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Selected option display text
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[0].value);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label
        htmlFor={id}
        className="text-[0.62rem] text-zinc-400 uppercase tracking-widest mb-1 block font-heading font-semibold"
      >
        {label}
      </label>

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-zinc-900/90 border text-xs font-heading font-semibold py-2 px-3 rounded-sm flex items-center justify-between gap-2 transition-all outline-none cursor-pointer ${
          isOpen
            ? "border-[var(--accent-red)] ring-1 ring-[var(--accent-red)]"
            : "border-zinc-800 hover:border-zinc-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="truncate text-left text-zinc-100">
          {isLoading ? (
            <span className="text-zinc-500 font-sans">กำลังโหลด...</span>
          ) : selectedOption ? (
            <span>
              {selectedOption.label}
              {selectedOption.subLabel && (
                <span className="text-zinc-400 font-normal ml-1">({selectedOption.subLabel})</span>
              )}
            </span>
          ) : (
            <span className="text-zinc-500 font-heading font-medium tracking-wider uppercase text-xs">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          size={14}
          className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--accent-red)]" : ""
          }`}
        />
      </button>

      {/* Floating Searchable Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[220px] bg-zinc-900 border border-zinc-800 rounded-sm shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Input Header */}
          <div className="p-1.5 border-b border-zinc-800 bg-zinc-950/90 flex items-center gap-1.5">
            <Search size={13} className="text-zinc-500 ml-1.5 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-white placeholder-zinc-500 py-1 px-1 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-zinc-400 hover:text-white rounded-sm"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-500 font-sans">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs font-heading flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent-red)]/15 text-white font-bold"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                    }`}
                  >
                    <span className="truncate">
                      {opt.label}
                      {opt.subLabel && (
                        <span className="text-zinc-500 font-normal ml-1.5 text-[0.68rem]">
                          {opt.subLabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check size={13} className="text-[var(--accent-red)] flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
