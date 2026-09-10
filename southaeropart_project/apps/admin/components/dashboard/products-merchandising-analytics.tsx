"use client";

import React, { useState } from "react";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Box,
  Truck,
  ExternalLink,
  Flame,
  ShieldAlert,
  Search,
  Eye,
  X,
  Gauge,
  Info,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

export interface ProductSkuAnalyticsItem {
  id: string;
  name: string;
  type: "single" | "bundle";
  typeLabel: string;
  carModel: string;
  revenue: number;
  revenueFormatted: string;
  sharePercent: number;
  unitsSold: number;
  price: string;
  margin: string;
  trend: string;
  stockStatus: "good" | "warning" | "danger";
  stockCount: number;
  stockDaysLeft: number;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  price: string;
  status: "warning" | "danger";
  daysLeft: number;
}

export interface ProductCatalogDemandItem {
  id: string;
  name: string;
  nameEn?: string | null;
  sku: string;
  type: "single" | "bundle";
  typeLabel: string;
  carModel: string;
  category: string;
  price: string;
  priceNum: number;
  costEstimate: string;
  margin: string;
  stockQuantity: number;
  stockStatus: "good" | "warning" | "danger" | "out_of_stock";
  stockDaysLeft: number;
  directUnits: number;
  bundleUnits: number;
  totalUnits: number;
  directRevenue: number;
  totalRevenue: number;
  totalRevenueFormatted: string;
  sharePercent: number;
  downforceN?: number | null;
  dragN?: number | null;
  material?: string;
  parentBundles?: Array<{ id: string; name: string; unitsSold: number }>;
  bundleComponents?: Array<{ id: string; name: string; quantity: number; currentStock: number }>;
}

interface ProductsMerchandisingAnalyticsProps {
  topSkus?: ProductSkuAnalyticsItem[];
  lowStockAlerts?: LowStockAlertItem[];
  catalogDemandItems?: ProductCatalogDemandItem[];
}

export function ProductsMerchandisingAnalytics({
  topSkus: initialTopSkus,
  lowStockAlerts: initialAlerts,
  catalogDemandItems: initialCatalogItems,
}: ProductsMerchandisingAnalyticsProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "single" | "bundle">("all");

  // Search & Demand Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [demandFilter, setDemandFilter] = useState<"all" | "single" | "bundle" | "in-bundle">("all");

  // Hover Popover State
  const [hoveredProduct, setHoveredProduct] = useState<{
    item: ProductCatalogDemandItem;
    x: number;
    y: number;
  } | null>(null);

  const defaultTopSkus: ProductSkuAnalyticsItem[] = [
    {
      id: "sku-1",
      name: "Front Lip V1 (สเกิร์ตหน้าทรงสปอร์ต)",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Civic FE / FL5",
      revenue: 480000,
      revenueFormatted: "฿480,000",
      sharePercent: 37.5,
      unitsSold: 1600,
      price: "฿3,200",
      margin: "41.2%",
      trend: "+15.4% YoY",
      stockStatus: "danger",
      stockCount: 6,
      stockDaysLeft: 2,
    },
    {
      id: "sku-2",
      name: "Side Skirt V2 (สเกิร์ตข้าง Aerodynamic)",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Civic FE / Accord G9",
      revenue: 300000,
      revenueFormatted: "฿300,000",
      sharePercent: 23.4,
      unitsSold: 1020,
      price: "฿4,500",
      margin: "39.0%",
      trend: "+8.7% YoY",
      stockStatus: "good",
      stockCount: 42,
      stockDaysLeft: 18,
    },
    {
      id: "sku-3",
      name: "Rear Diffuser (ชายล่างหลังครีบคาร์บอน)",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Toyota GR86 / Subaru BRZ",
      revenue: 200000,
      revenueFormatted: "฿200,000",
      sharePercent: 15.6,
      unitsSold: 680,
      price: "฿5,200",
      margin: "38.5%",
      trend: "+6.1% YoY",
      stockStatus: "good",
      stockCount: 28,
      stockDaysLeft: 12,
    },
    {
      id: "sku-4",
      name: "Ducktail Spoiler Carbon (สปอยเลอร์หลังคาร์บอนแท้)",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Accord G9 / G10",
      revenue: 160000,
      revenueFormatted: "฿160,000",
      sharePercent: 12.5,
      unitsSold: 420,
      price: "฿6,900",
      margin: "44.0%",
      trend: "+19.2% YoY",
      stockStatus: "warning",
      stockCount: 8,
      stockDaysLeft: 4,
    },
    {
      id: "sku-5",
      name: "Complete Aero Pack 3-Piece (ชุดแต่งรอบคัน 3 ชิ้น)",
      type: "bundle",
      typeLabel: "เซ็ตพ่วง (Bundle Kit)",
      carModel: "Honda Civic FE / FL5",
      revenue: 140000,
      revenueFormatted: "฿140,000",
      sharePercent: 10.9,
      unitsSold: 600,
      price: "฿12,900",
      margin: "36.5%",
      trend: "+32.0% YoY",
      stockStatus: "warning",
      stockCount: 12,
      stockDaysLeft: 5,
    },
  ];

  const defaultCatalogItems: ProductCatalogDemandItem[] = [
    {
      id: "sku-4",
      name: "Ducktail Spoiler Carbon (สปอยเลอร์หลังคาร์บอนแท้)",
      nameEn: "Ducktail Rear Spoiler Carbon Fiber",
      sku: "SP-G9-DT-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Accord G9 / G10",
      category: "Rear Spoilers & Wings",
      price: "฿6,900",
      priceNum: 6900,
      costEstimate: "฿3,860",
      margin: "44.0%",
      stockQuantity: 8,
      stockStatus: "warning",
      stockDaysLeft: 4,
      directUnits: 420,
      bundleUnits: 600,
      totalUnits: 1020,
      directRevenue: 2898000,
      totalRevenue: 6400000,
      totalRevenueFormatted: "฿6,400,000",
      sharePercent: 12.5,
      downforceN: 45,
      dragN: 12,
      material: "Pre-preg Carbon Fiber (Autoclave 3K Twill)",
      parentBundles: [
        {
          id: "sku-5",
          name: "Complete Aero Pack 3-Piece (ชุดแต่งรอบคัน 3 ชิ้น)",
          unitsSold: 600,
        },
      ],
    },
    {
      id: "sku-1",
      name: "Front Lip V1 Sport (สเกิร์ตหน้าทรงสปอร์ต)",
      nameEn: "Front Lip Splitter V1 Sport",
      sku: "FL-FL5-V1-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Civic FE / FL5",
      category: "Front Lips & Splitters",
      price: "฿3,200",
      priceNum: 3200,
      costEstimate: "฿1,880",
      margin: "41.2%",
      stockQuantity: 6,
      stockStatus: "danger",
      stockDaysLeft: 2,
      directUnits: 1600,
      bundleUnits: 600,
      totalUnits: 2200,
      directRevenue: 5120000,
      totalRevenue: 6740000,
      totalRevenueFormatted: "฿6,740,000",
      sharePercent: 37.5,
      downforceN: 85,
      dragN: 8,
      material: "Vacuum-infused Carbon Fiber",
      parentBundles: [
        {
          id: "sku-5",
          name: "Complete Aero Pack 3-Piece (ชุดแต่งรอบคัน 3 ชิ้น)",
          unitsSold: 600,
        },
      ],
    },
    {
      id: "sku-2",
      name: "Side Skirt V2 Aerodynamic (สเกิร์ตข้างครีบแอโร่)",
      nameEn: "Side Skirt Extensions V2",
      sku: "SS-FL5-V2-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Civic FE / FL5",
      category: "Side Skirts & Diffusers",
      price: "฿4,500",
      priceNum: 4500,
      costEstimate: "฿2,740",
      margin: "39.0%",
      stockQuantity: 42,
      stockStatus: "good",
      stockDaysLeft: 18,
      directUnits: 1020,
      bundleUnits: 600,
      totalUnits: 1620,
      directRevenue: 4590000,
      totalRevenue: 6885000,
      totalRevenueFormatted: "฿6,885,000",
      sharePercent: 23.4,
      downforceN: 35,
      dragN: -4,
      material: "Wet Carbon Fiber UV Coating",
      parentBundles: [
        {
          id: "sku-5",
          name: "Complete Aero Pack 3-Piece (ชุดแต่งรอบคัน 3 ชิ้น)",
          unitsSold: 600,
        },
      ],
    },
    {
      id: "sku-3",
      name: "Rear Diffuser Dual Fins (ชายล่างหลังครีบคาร์บอน)",
      nameEn: "Rear Diffuser Dual Aggressive Fins",
      sku: "RD-GR86-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Toyota GR86 / Subaru BRZ",
      category: "Rear Diffusers",
      price: "฿5,200",
      priceNum: 5200,
      costEstimate: "฿3,200",
      margin: "38.5%",
      stockQuantity: 28,
      stockStatus: "good",
      stockDaysLeft: 12,
      directUnits: 680,
      bundleUnits: 240,
      totalUnits: 920,
      directRevenue: 3536000,
      totalRevenue: 4590000,
      totalRevenueFormatted: "฿4,590,000",
      sharePercent: 15.6,
      downforceN: 110,
      dragN: -15,
      material: "Pre-preg Carbon Fiber (Autoclave)",
      parentBundles: [
        {
          id: "sku-8",
          name: "Track Spec Aero Kit (ชุดแต่งสายสนามลดแรงยก)",
          unitsSold: 240,
        },
      ],
    },
    {
      id: "sku-5",
      name: "Complete Aero Pack 3-Piece (ชุดแต่งรอบคัน 3 ชิ้น)",
      nameEn: "Complete Aero Dynamic Pack 3-Piece Set",
      sku: "KIT-FL5-3PC",
      type: "bundle",
      typeLabel: "เซ็ตพ่วง (Bundle Kit)",
      carModel: "Honda Civic FE / FL5",
      category: "Aero Kits & Bundles",
      price: "฿12,900",
      priceNum: 12900,
      costEstimate: "฿8,190",
      margin: "36.5%",
      stockQuantity: 6,
      stockStatus: "danger",
      stockDaysLeft: 2,
      directUnits: 600,
      bundleUnits: 0,
      totalUnits: 600,
      directRevenue: 7740000,
      totalRevenue: 7740000,
      totalRevenueFormatted: "฿7,740,000",
      sharePercent: 10.9,
      downforceN: 165,
      dragN: 16,
      material: "Full Carbon Composite Set",
      bundleComponents: [
        {
          id: "sku-1",
          name: "Front Lip V1 Sport",
          quantity: 1,
          currentStock: 6,
        },
        {
          id: "sku-2",
          name: "Side Skirt V2 Aerodynamic",
          quantity: 2,
          currentStock: 42,
        },
        {
          id: "sku-4",
          name: "Ducktail Spoiler Carbon",
          quantity: 1,
          currentStock: 8,
        },
      ],
    },
    {
      id: "sku-6",
      name: "Carbon Mirror Caps M-Style (ครอบกระจกมองข้างคาร์บอน)",
      nameEn: "Carbon Fiber Mirror Covers M-Style",
      sku: "MC-G9-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Accord G9",
      category: "Accessories & Caps",
      price: "฿2,400",
      priceNum: 2400,
      costEstimate: "฿1,320",
      margin: "45.0%",
      stockQuantity: 35,
      stockStatus: "good",
      stockDaysLeft: 25,
      directUnits: 310,
      bundleUnits: 0,
      totalUnits: 310,
      directRevenue: 744000,
      totalRevenue: 744000,
      totalRevenueFormatted: "฿744,000",
      sharePercent: 4.8,
      material: "Dry Carbon Replacement Caps",
      parentBundles: [],
    },
    {
      id: "sku-7",
      name: "GT Wing Type-R Swan Neck (สปอยเลอร์ปีกนก GT คาร์บอน)",
      nameEn: "Swan Neck Carbon GT Wing 1450mm",
      sku: "GW-FL5-SN-CF",
      type: "single",
      typeLabel: "ชิ้นเดี่ยว (Single)",
      carModel: "Honda Civic Type R FL5",
      category: "Rear Spoilers & Wings",
      price: "฿16,500",
      priceNum: 16500,
      costEstimate: "฿9,570",
      margin: "42.0%",
      stockQuantity: 4,
      stockStatus: "danger",
      stockDaysLeft: 3,
      directUnits: 180,
      bundleUnits: 80,
      totalUnits: 260,
      directRevenue: 2970000,
      totalRevenue: 4090000,
      totalRevenueFormatted: "฿4,090,000",
      sharePercent: 8.4,
      downforceN: 210,
      dragN: 28,
      material: "Dry Carbon Blade + CNC Billet Aluminum Brackets",
      parentBundles: [
        {
          id: "sku-8",
          name: "Track Spec Aero Kit (ชุดแต่งสายสนามลดแรงยก)",
          unitsSold: 80,
        },
      ],
    },
    {
      id: "sku-8",
      name: "Track Spec Aero Kit (ชุดแต่งสายสนามลดแรงยก)",
      nameEn: "Track Spec Competition Aero Kit",
      sku: "KIT-TRACK-GR86",
      type: "bundle",
      typeLabel: "เซ็ตพ่วง (Bundle Kit)",
      carModel: "Toyota GR86 / Subaru BRZ",
      category: "Aero Kits & Bundles",
      price: "฿24,900",
      priceNum: 24900,
      costEstimate: "฿15,400",
      margin: "38.1%",
      stockQuantity: 4,
      stockStatus: "danger",
      stockDaysLeft: 3,
      directUnits: 240,
      bundleUnits: 0,
      totalUnits: 240,
      directRevenue: 5976000,
      totalRevenue: 5976000,
      totalRevenueFormatted: "฿5,976,000",
      sharePercent: 9.2,
      downforceN: 320,
      dragN: 13,
      material: "Competition Grade Carbon Composite",
      bundleComponents: [
        {
          id: "sku-3",
          name: "Rear Diffuser Dual Fins",
          quantity: 1,
          currentStock: 28,
        },
        {
          id: "sku-7",
          name: "GT Wing Type-R Swan Neck",
          quantity: 1,
          currentStock: 4,
        },
      ],
    },
  ];

  const topSkus = initialTopSkus && initialTopSkus.length > 0 ? initialTopSkus : defaultTopSkus;
  const catalogDemandItems =
    initialCatalogItems && initialCatalogItems.length > 0 ? initialCatalogItems : defaultCatalogItems;
  const lowStockAlerts =
    initialAlerts && initialAlerts.length > 0
      ? initialAlerts
      : [
          {
            id: "alert-1",
            name: "Front Lip V1 (Civic FL5)",
            sku: "FL-FL5-V1-CF",
            stockQuantity: 6,
            price: "฿3,200",
            status: "danger" as const,
            daysLeft: 2,
          },
          {
            id: "alert-2",
            name: "Ducktail Spoiler Carbon (Accord G9)",
            sku: "SP-G9-DT-CF",
            stockQuantity: 8,
            price: "฿6,900",
            status: "warning" as const,
            daysLeft: 4,
          },
          {
            id: "alert-3",
            name: "Aero Complete Pack Hardware Kit",
            sku: "HW-UNIV-KIT",
            stockQuantity: 12,
            price: "฿1,500",
            status: "warning" as const,
            daysLeft: 5,
          },
        ];

  const filteredTopSkus =
    selectedFilter === "all"
      ? topSkus
      : topSkus.filter((sku) => sku.type === selectedFilter);

  // Filter Catalog Demand Items
  const filteredDemandItems = catalogDemandItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
      item.sku.toLowerCase().includes(q) ||
      item.carModel.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (demandFilter === "single") return item.type === "single";
    if (demandFilter === "bundle") return item.type === "bundle";
    if (demandFilter === "in-bundle") {
      return item.type === "single" && item.bundleUnits > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ─── SECTION 1: TOP REVENUE GENERATING SKUS ─── */}
      <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Package size={16} />
              </span>
              <h3 className="text-base font-bold text-white">
                สินค้าทำเงินสูงสุด 5 อันดับแรก (Top 5 Revenue SKUs)
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              สร้างรายได้รวมคิดเป็นสัดส่วนหลักของแคตตาล็อก พร้อมข้อมูลมาร์จิ้น ยอดขาย และสถานะคลัง
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#181818] p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedFilter === "all"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ทั้งหมด (5 SKUs)
            </button>
            <button
              onClick={() => setSelectedFilter("single")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedFilter === "single"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ชิ้นเดี่ยว (Single)
            </button>
            <button
              onClick={() => setSelectedFilter("bundle")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedFilter === "bundle"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ชุดเซ็ต (Bundles)
            </button>
          </div>
        </div>

        {/* SKUs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-gray-400 border-b border-white/5 text-[11px]">
                <th className="pb-2.5 font-medium">ชื่อสินค้า / รุ่นรถ</th>
                <th className="pb-2.5 font-medium">ประเภท</th>
                <th className="pb-2.5 font-medium text-right">ราคาต่อหน่วย</th>
                <th className="pb-2.5 font-medium text-right">ยอดขาย (ชิ้น)</th>
                <th className="pb-2.5 font-medium text-right">รายได้รวม</th>
                <th className="pb-2.5 font-medium text-right">สัดส่วน</th>
                <th className="pb-2.5 font-medium text-right">Gross Margin</th>
                <th className="pb-2.5 font-medium text-right">สถานะสต็อก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTopSkus.map((sku) => (
                <tr key={sku.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-sans">
                    <div className="font-semibold text-white">{sku.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{sku.carModel}</div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        sku.type === "bundle"
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {sku.typeLabel}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-200">{sku.price}</td>
                  <td className="py-3 text-right text-white font-bold">
                    {sku.unitsSold.toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-bold">
                    {sku.revenueFormatted}
                  </td>
                  <td className="py-3 text-right text-gray-300 font-bold">
                    {sku.sharePercent}%
                  </td>
                  <td className="py-3 text-right text-emerald-300">{sku.margin}</td>
                  <td className="py-3 text-right">
                    {sku.stockStatus === "danger" ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        ⚠️ เหลือ {sku.stockCount} ชิ้น (~{sku.stockDaysLeft} วัน)
                      </span>
                    ) : sku.stockStatus === "warning" ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        เหลือ {sku.stockCount} ชิ้น (~{sku.stockDaysLeft} วัน)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        พร้อมขาย ({sku.stockCount})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SECTION 1.5: COMPONENT DEMAND & UNIFIED SKU SEARCH ENGINE (NEW) ─── */}
      <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Search size={16} />
              </span>
              <h3 className="text-base font-bold text-white">
                ระบบค้นหา &amp; ตรวจสอบยอดขายชิ้นส่วนจริง (Component Demand &amp; SKU Search Engine)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                รวมยอดขายเดี่ยว + ในเซ็ต
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              ค้นหายอดขายชิ้นส่วนจริงทุกรายการในคลัง (รวมยอดขายแยกเดี่ยว + ยอดขายที่แฝงในชุดเซ็ต ไม่ตกหล่นแม้ไม่ติด Top 5) พร้อมนำเมาส์ชี้ (Hover) เพื่อดูสเปกและชุดเซ็ตที่เกี่ยวข้อง
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-[#181818] border border-white/5">
              พบ {filteredDemandItems.length} จาก {catalogDemandItems.length} รายการ
            </span>
          </div>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า (เช่น Ducktail, Front Lip), รหัส SKU (เช่น SP-G9), รุ่นรถ (Civic, Accord, GR86)..."
              className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title="ล้างคำค้นหา"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#181818] p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setDemandFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                demandFilter === "all"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setDemandFilter("single")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                demandFilter === "single"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ชิ้นเดี่ยว
            </button>
            <button
              onClick={() => setDemandFilter("bundle")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                demandFilter === "bundle"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ชุดเซ็ต
            </button>
            <button
              onClick={() => setDemandFilter("in-bundle")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                demandFilter === "in-bundle"
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
              title="กรองเฉพาะสินค้าเดี่ยวที่มีการขายผ่านชุดเซ็ต"
            >
              มีขายในชุดเซ็ต
            </button>
          </div>
        </div>

        {/* Demand & Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-gray-400 border-b border-white/5 text-[11px]">
                <th className="pb-3 font-medium">สินค้า / รหัส SKU / รุ่นรถ</th>
                <th className="pb-3 font-medium text-center">ประเภท</th>
                <th className="pb-3 font-medium text-right">ยอดรวมจำหน่ายจริง (Total Units)</th>
                <th className="pb-3 font-medium text-center">สัดส่วนการจำหน่าย (เดี่ยว vs ในเซ็ต)</th>
                <th className="pb-3 font-medium text-right">ราคา / รายได้รวม</th>
                <th className="pb-3 font-medium text-right">สต็อกในคลัง</th>
                <th className="pb-3 font-medium text-center">สเปกย่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDemandItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 font-sans">
                    ไม่พบสินค้าที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredDemandItems.map((item) => {
                  const directPct =
                    item.totalUnits > 0
                      ? Math.round((item.directUnits / item.totalUnits) * 100)
                      : 100;
                  const bundlePct = 100 - directPct;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredProduct({
                          item,
                          x: rect.left,
                          y: rect.bottom,
                        });
                      }}
                      onMouseLeave={() => setHoveredProduct(null)}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3.5 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {item.name}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                            ชี้ดูสเปก
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                          <span className="text-gray-300 font-medium">{item.sku}</span>
                          <span>•</span>
                          <span>{item.carModel}</span>
                          <span>•</span>
                          <span className="text-gray-500">{item.category}</span>
                        </div>
                      </td>

                      {/* Product Type */}
                      <td className="py-3.5 text-center">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                            item.type === "bundle"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>

                      {/* Total Physical Units Dispatched */}
                      <td className="py-3.5 text-right">
                        <div className="text-sm font-extrabold text-white font-mono">
                          {item.totalUnits.toLocaleString()} ชิ้น
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          ตัดสต็อกจริงรวมทุกบิล
                        </div>
                      </td>

                      {/* Distribution Breakdown (Direct vs In-Bundle) */}
                      <td className="py-3.5 px-3 min-w-[200px]">
                        {item.type === "single" ? (
                          <div className="space-y-1.5">
                            {/* Visual Dual Progress Bar */}
                            <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden flex">
                              <div
                                className="bg-blue-500 h-full transition-all"
                                style={{ width: `${directPct}%` }}
                                title={`ขายเดี่ยว: ${item.directUnits} ชิ้น (${directPct}%)`}
                              />
                              <div
                                className="bg-purple-500 h-full transition-all"
                                style={{ width: `${bundlePct}%` }}
                                title={`ในชุดเซ็ต: ${item.bundleUnits} ชิ้น (${bundlePct}%)`}
                              />
                            </div>

                            {/* Detailed Badges */}
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-blue-300">
                                📦 เดี่ยว: <strong className="text-white">{item.directUnits}</strong> ({directPct}%)
                              </span>
                              <span className="text-purple-300">
                                🧩 ในเซ็ต: <strong className="text-white">{item.bundleUnits}</strong> ({bundlePct}%)
                              </span>
                            </div>

                            {/* Parent Bundle Name Snippet */}
                            {item.parentBundles && item.parentBundles.length > 0 && (
                              <div className="text-[9px] text-gray-400 font-sans truncate max-w-[240px]">
                                สังกัด: {item.parentBundles.map((b) => b.name.split(" ")[0]).join(", ")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                              ชุดเซ็ตสมบูรณ์ ({item.bundleComponents?.length || 3} ชิ้นส่วน)
                            </span>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              ยอดจำหน่ายทั้งเซ็ต {item.directUnits} ชุด
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Price & Revenue */}
                      <td className="py-3.5 text-right">
                        <div className="text-white font-bold">{item.price}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          {item.totalRevenueFormatted}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          Margin: {item.margin}
                        </div>
                      </td>

                      {/* Current Warehouse Stock */}
                      <td className="py-3.5 text-right">
                        {item.stockStatus === "danger" ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            ⚠️ เหลือ {item.stockQuantity} ชิ้น (~{item.stockDaysLeft} วัน)
                          </span>
                        ) : item.stockStatus === "warning" ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            เหลือ {item.stockQuantity} ชิ้น (~{item.stockDaysLeft} วัน)
                          </span>
                        ) : item.stockStatus === "out_of_stock" ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-700/40 font-bold">
                            สินค้าหมด (0 ชิ้น)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            พร้อมส่ง ({item.stockQuantity})
                          </span>
                        )}
                      </td>

                      {/* Quick Specs Action */}
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                          title="ดูสเปกและชุดเซ็ต"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FLOATING HOVER QUICK PREVIEW CARD (GLASSMORPHIC POPOVER) ─── */}
      {hoveredProduct && (
        <div
          className="fixed z-50 pointer-events-none w-80 sm:w-96 p-4 rounded-2xl bg-[#141414]/95 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-xs space-y-3 transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: Math.max(
              16,
              Math.min(
                hoveredProduct.x + 20,
                typeof window !== "undefined" ? window.innerWidth - 410 : 800
              )
            ),
            top: Math.max(
              20,
              hoveredProduct.y - 120 < 0
                ? hoveredProduct.y + 20
                : hoveredProduct.y - 140
            ),
          }}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    hoveredProduct.item.type === "bundle"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  }`}
                >
                  {hoveredProduct.item.typeLabel}
                </span>
                <span className="text-[10px] font-mono text-gray-400 font-bold">
                  {hoveredProduct.item.sku}
                </span>
              </div>
              <h4 className="font-bold text-white text-sm mt-1 leading-snug">
                {hoveredProduct.item.name}
              </h4>
              {hoveredProduct.item.nameEn && (
                <p className="text-[11px] text-gray-400 font-sans">
                  {hoveredProduct.item.nameEn}
                </p>
              )}
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
              <Package size={18} />
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="p-2 rounded-xl bg-[#1A1A1A] border border-white/5">
              <span className="text-[10px] text-gray-400 block">ราคาขาย / ต้นทุนประเมิน</span>
              <span className="font-bold text-white text-sm">
                {hoveredProduct.item.price}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block">
                Margin {hoveredProduct.item.margin} ({hoveredProduct.item.costEstimate})
              </span>
            </div>

            <div className="p-2 rounded-xl bg-[#1A1A1A] border border-white/5">
              <span className="text-[10px] text-gray-400 block">สถานะสต็อกในคลัง</span>
              <span className="font-bold text-white text-sm">
                {hoveredProduct.item.stockQuantity} ชิ้น
              </span>
              <span
                className={`text-[10px] font-mono block ${
                  hoveredProduct.item.stockStatus === "danger"
                    ? "text-rose-400 font-bold"
                    : hoveredProduct.item.stockStatus === "warning"
                    ? "text-amber-400 font-bold"
                    : "text-emerald-400"
                }`}
              >
                ~{hoveredProduct.item.stockDaysLeft} วันก่อนหมด
              </span>
            </div>
          </div>

          {/* Aero Telemetry Specs */}
          {(hoveredProduct.item.downforceN || hoveredProduct.item.material) && (
            <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1">
              <span className="text-[10px] text-blue-300 font-bold flex items-center gap-1">
                <Gauge size={12} />
                CFD Aerodynamics &amp; Materials
              </span>
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
                {hoveredProduct.item.downforceN && (
                  <span>Downforce: +{hoveredProduct.item.downforceN}N</span>
                )}
                {hoveredProduct.item.dragN !== undefined && (
                  <span>Drag: {hoveredProduct.item.dragN}N</span>
                )}
              </div>
              {hoveredProduct.item.material && (
                <p className="text-[10px] text-gray-400 leading-tight">
                  วัสดุ: {hoveredProduct.item.material}
                </p>
              )}
            </div>
          )}

          {/* Component Demand / Bundle Relations */}
          <div className="p-2.5 rounded-xl bg-[#181818] border border-white/5 space-y-1.5">
            <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
              <Layers size={12} />
              {hoveredProduct.item.type === "single"
                ? "ความสัมพันธ์กับชุดเซ็ต (Bundle Context)"
                : "ชิ้นส่วนย่อยในชุดเซ็ตนี้ (Kit Components)"}
            </span>

            {hoveredProduct.item.type === "single" ? (
              hoveredProduct.item.parentBundles &&
              hoveredProduct.item.parentBundles.length > 0 ? (
                <div className="space-y-1">
                  {hoveredProduct.item.parentBundles.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-[11px] font-sans text-gray-200"
                    >
                      <span className="truncate max-w-[200px]">• {b.name}</span>
                      <span className="font-mono text-purple-300 font-bold">
                        ดึงไป {b.unitsSold} ชิ้น
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-400 pt-0.5">
                    💡 ขายแยกเดี่ยว {hoveredProduct.item.directUnits} ชิ้น + ผ่านชุดเซ็ต{" "}
                    {hoveredProduct.item.bundleUnits} ชิ้น
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">
                  สินค้านี้จำหน่ายเฉพาะชิ้นเดี่ยว ยังไม่ได้ถูกนำไปจัดชุดแต่งครบเซ็ต
                </p>
              )
            ) : (
              <div className="space-y-1">
                {hoveredProduct.item.bundleComponents?.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-[11px] font-sans text-gray-200"
                  >
                    <span className="truncate max-w-[180px]">
                      • {c.name} ({c.quantity}x)
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        c.currentStock <= 6 ? "text-rose-400 font-bold" : "text-emerald-400"
                      }`}
                    >
                      สต็อก: {c.currentStock} ชิ้น
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 2: BUNDLES VS SINGLE PARTS DYNAMICS & LOW STOCK ALERTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Single Parts vs Bundles Strategic Analysis */}
        <div className="lg:col-span-7 bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers size={16} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                พลังของชุดเซ็ต: ชิ้นเดี่ยว vs ชุดแต่งพ่วง (Single vs Bundle Dynamic)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
              Basket Driver
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Single Parts Metric */}
            <div className="p-4 rounded-xl bg-[#161616] border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-bold">สินค้าชิ้นเดี่ยว (Single Parts)</span>
                <span className="font-mono text-blue-400 font-bold">89.1% ยอดขาย</span>
              </div>
              <p className="text-xl font-extrabold text-white font-mono">฿1,140,000</p>
              <div className="text-xs font-mono text-gray-400 space-y-1 pt-1 border-t border-white/5">
                <div className="flex justify-between">
                  <span>AOV ต่อออเดอร์:</span>
                  <span className="text-white">฿280</span>
                </div>
                <div className="flex justify-between">
                  <span>ปริมาณจำหน่าย:</span>
                  <span className="text-white">3,720 ชิ้น</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                ลูกค้าส่วนใหญ่ตัดสินใจซื้อง่ายจากชิ้นที่จำเป็นที่สุด แต่ฉุดให้ AOV รวมอยู่ในระดับต่ำ
              </p>
            </div>

            {/* Bundles Metric */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-[#161616] border border-purple-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-300 font-bold">ชุดแต่งครบเซ็ต (Bundle Kits)</span>
                <span className="font-mono text-emerald-400 font-bold">10.9% ยอดขาย</span>
              </div>
              <p className="text-xl font-extrabold text-purple-300 font-mono">฿140,000</p>
              <div className="text-xs font-mono text-gray-400 space-y-1 pt-1 border-t border-white/5">
                <div className="flex justify-between">
                  <span>AOV ต่อออเดอร์:</span>
                  <span className="text-emerald-400 font-bold">฿850 (3x สูงกว่า)</span>
                </div>
                <div className="flex justify-between">
                  <span>เติบโต:</span>
                  <span className="text-emerald-400 font-bold">+32.0% YoY</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed pt-1">
                การซื้อชุดเซ็ตช่วยดัน Basket Size สูงขึ้นถึง 3 เท่า พร้อมส่งฟรีเมื่อยอดถึง ฿3,500
              </p>
            </div>
          </div>

          {/* Strategic Merchandising Advice */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1.5 text-xs">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles size={14} />
              กลยุทธ์ Merchandising: ดันสัดส่วน Bundle จาก 10.9% สู่ 20%
            </span>
            <p className="text-gray-300 leading-relaxed">
              หากเพิ่มชุดแต่งพ่วง (เช่น หน้า+ข้าง+หลัง) พร้อมส่วนลดเซ็ต 8-10% และส่งเสริมในหน้า Product Page
              จะสามารถยกระดับ AOV ของทั้งร้านจาก ฿296 แตะเป้าหมาย ฿350 ได้ทันที
            </p>
          </div>
        </div>

        {/* Right (5 cols): High-Demand Low Stock Alerts */}
        <div className="lg:col-span-5 bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle size={16} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                สินค้าสต็อกใกล้หมด (Low Stock Alerts)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              ความเสี่ยงเสียยอดขาย
            </span>
          </div>

          <div className="space-y-2.5">
            {lowStockAlerts.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#161616] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.status === "danger" ? "bg-rose-500 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    <h4 className="font-semibold text-white text-xs truncate">{item.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-0.5">
                    <span>{item.sku}</span>
                    <span>•</span>
                    <span className="text-gray-300 font-bold">{item.price}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`font-mono text-xs font-bold ${
                      item.status === "danger" ? "text-rose-400" : "text-amber-400"
                    }`}
                  >
                    เหลือ {item.stockQuantity} ชิ้น
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    สต็อกพอขายอีก ~{item.daysLeft} วัน
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Button */}
          <div className="pt-1">
            <Link
              href="/products"
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>จัดการและสั่งผลิตสินค้าในสต็อก</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
