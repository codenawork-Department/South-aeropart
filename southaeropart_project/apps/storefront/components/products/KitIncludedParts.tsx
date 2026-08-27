"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Boxes,
  ArrowRight,
  Wind,
  Check,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";

interface BundleItem {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: string;
  categoryName: string;
  material?: string;
  image?: string;
  downforceN?: number;
  dragN?: number;
}

interface KitIncludedPartsProps {
  items: BundleItem[];
  kitName: string;
}

export function KitIncludedParts({ items, kitName }: KitIncludedPartsProps) {
  if (!items || items.length === 0) return null;

  const totalSum = items.reduce((acc, item) => acc + Number(item.price || 0), 0);

  return (
    <section className="bg-[#101010] border border-[#222222] rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Glow background accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Boxes size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                INCLUDED IN THIS AERO KIT
              </span>
              <span className="text-xs text-gray-400 font-mono">({items.length} ชิ้นส่วน)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide mt-1 font-heading">
              รายการชิ้นส่วนทั้งหมดในชุดเซ็ต
            </h3>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">
            ราคารวมทุกชิ้นส่วน
          </span>
          <span className="text-lg font-bold font-mono text-white">
            ฿{totalSum.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((part, index) => (
          <div
            key={part.id || index}
            className="group bg-[#161616] hover:bg-[#1A1A1A] border border-[#282828] hover:border-amber-500/40 rounded-xl p-4 transition-all duration-300 flex flex-col justify-between space-y-4"
          >
            <div className="flex gap-4">
              {/* Part Thumbnail */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-black/60 border border-[#333333] shrink-0 overflow-hidden flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
                {part.image ? (
                  <Image
                    src={part.image}
                    alt={part.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package size={24} className="text-gray-600" />
                )}
                <span className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-gray-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/10">
                  0{index + 1}
                </span>
              </div>

              {/* Part Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {part.categoryName}
                  </span>
                  {part.material && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                      {part.material}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {part.name}
                </h4>

                {part.sku && (
                  <p className="text-[11px] font-mono text-gray-500">
                    SKU: {part.sku}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <span className="font-mono font-bold text-white text-sm">
                    ฿{Number(part.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                  {part.downforceN && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                      <Wind size={12} className="text-[var(--accent-red)]" />
                      +{part.downforceN}N
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Link to Single Product */}
            <div className="pt-2 border-t border-[#242424] flex items-center justify-between">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Check size={12} className="text-emerald-400" /> รวมอยู่ในเซ็ตนี้
              </span>

              <Link
                href={`/products/${part.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-amber-400 transition-colors py-1 px-2.5 rounded-md hover:bg-white/5"
              >
                <span>ดูรายละเอียดเฉพาะชิ้นนี้</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Advice note */}
      <div className="bg-[#151515] border border-[#262626] rounded-lg p-3.5 flex items-start gap-3 text-xs text-gray-400">
        <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p>
          หากท่านต้องการสั่งซื้อเฉพาะบางชิ้นส่วน สามารถคลิกที่ปุ่ม <strong className="text-white">&quot;ดูรายละเอียดเฉพาะชิ้นนี้&quot;</strong> เพื่อสั่งซื้อแยกชิ้นได้ตามต้องการ
        </p>
      </div>
    </section>
  );
}
