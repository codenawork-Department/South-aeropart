"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  X,
  Sparkles,
  Check,
  Loader2,
  ChevronDown,
  Layers,
  Wind,
  Shield,
  Zap,
  Tag,
  Plus,
} from "lucide-react";
import { AppIcon, type IconData } from "./app-icon";
import { getIconsAction } from "@/actions/icon.actions";

export interface IconPickerProps {
  value?: string | null; // icon slug or lucide name
  iconData?: IconData | null;
  onChange: (icon: { slug: string; name: string; id?: string; lucideName?: string | null }) => void;
  onClear?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

const CATEGORY_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "aerodynamics", label: "แอโรไดนามิกส์" },
  { id: "material", label: "วัสดุ & งานผลิต" },
  { id: "performance", label: "สมรรถนะ & ฟิตติ้ง" },
  { id: "trust", label: "ความน่าเชื่อถือ" },
  { id: "services", label: "บริการ & ติดตั้ง" },
];

export function IconPicker({
  value,
  iconData,
  onChange,
  onClear,
  disabled = false,
  size = "md",
  label,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [iconsList, setIconsList] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Load icons when opened or initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadIcons() {
      setIsLoading(true);
      try {
        const res = await getIconsAction({ onlyActive: true });
        if (res.success && res.data && isMounted) {
          setIconsList(res.data);
        }
      } catch (err) {
        console.error("Failed to load icons:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (isOpen) {
      loadIcons();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Find currently selected icon object
  const currentIcon: IconData | null = useMemo(() => {
    if (iconData) return iconData;
    if (!value) return null;
    return (
      iconsList.find(
        (i) =>
          i.slug === value ||
          i.lucideName === value ||
          i.name?.toLowerCase() === value.toLowerCase()
      ) || { type: "lucide", lucideName: value, slug: value, name: value }
    );
  }, [value, iconData, iconsList]);

  // Filtered icons
  const filteredIcons = useMemo(() => {
    return iconsList.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.slug?.toLowerCase().includes(q) ||
        item.lucideName?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [iconsList, selectedCategory, searchTerm]);

  const handleSelect = (item: IconData) => {
    onChange({
      slug: item.slug || item.lucideName || "icon",
      name: item.name || item.slug || "Icon",
      id: item.id,
      lucideName: item.lucideName,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className={`w-full h-[38px] flex items-center gap-2.5 rounded-lg border transition-all cursor-pointer text-left px-3 py-2 text-xs min-w-0 ${
          currentIcon
            ? "bg-[#141414] border-[#2D2D2D] hover:border-red-500/60 text-white"
            : "bg-[#141414] border-[#2D2D2D] hover:border-[#444] text-gray-400"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="w-5 h-5 rounded flex items-center justify-center bg-red-950/40 border border-red-800/40 text-red-400 shrink-0">
          <AppIcon icon={currentIcon} size={13} />
        </div>
        <span className="truncate flex-1 font-medium text-xs">
          {currentIcon ? currentIcon.name || currentIcon.slug : label || "เลือกไอคอน"}
        </span>
        <ChevronDown size={13} className="text-gray-500 shrink-0" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121212] border border-[#2B2B2B] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เลือกไอคอน (Icon Picker)</h3>
                  <p className="text-xs text-gray-400">เลือกจากคลังไอคอนของ South Aero</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Categories Bar */}
            <div className="p-4 border-b border-[#1E1E1E] space-y-3 bg-[#161616]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อไอคอน (เช่น Wind, Carbon, Downforce)..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#111111] border border-[#282828] text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === tab.id
                        ? "bg-red-600 text-white font-medium shadow-sm"
                        : "bg-[#202020] text-gray-400 hover:text-gray-200 hover:bg-[#282828]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons Grid Content */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[360px] min-h-[220px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs">
                  <Loader2 size={24} className="animate-spin text-red-500 mb-2" />
                  <span>กำลังโหลดคลังไอคอน...</span>
                </div>
              ) : filteredIcons.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#1C1C1C] flex items-center justify-center text-gray-500">
                    <Sparkles size={18} />
                  </div>
                  <p className="text-xs text-gray-400">ไม่พบไอคอนที่ตรงกับคำค้นหา</p>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("all");
                      }}
                      className="text-xs text-red-400 hover:underline"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {filteredIcons.map((item) => {
                    const isSelected =
                      currentIcon?.slug === item.slug ||
                      currentIcon?.lucideName === item.lucideName;
                    return (
                      <button
                        key={item.id || item.slug}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-red-950/50 border-red-600 ring-1 ring-red-500/50 text-white"
                            : "bg-[#181818] border-[#262626] hover:border-[#404040] hover:bg-[#202020] text-gray-300"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
                            isSelected
                              ? "bg-red-900/60 text-red-300"
                              : "bg-[#121212] border border-[#2B2B2B] text-gray-300 group-hover:text-white"
                          }`}
                        >
                          <AppIcon icon={item} size={20} />
                        </div>
                        <span className="text-[11px] font-medium truncate w-full" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-[9px] text-gray-500 truncate w-full font-mono mt-0.5">
                          {item.slug}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#1E1E1E] bg-[#141414] text-xs">
              <span className="text-gray-500">
                พบทั้งหมด {filteredIcons.length} ไอคอน
              </span>
              <div className="flex items-center gap-2">
                {onClear && currentIcon && (
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    ล้างค่า
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
