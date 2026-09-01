"use client";

import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ArrowRight,
  Loader2,
  RotateCcw,
  Car,
  Sparkles,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import {
  VehicleBrandData,
  VehicleModelData,
  UserGarageVehicle,
} from "@/actions/vehicle.actions";
import { SearchableCombobox, ComboboxOption } from "./SearchableCombobox";

interface VehicleSelectorProps {
  initialBrands?: VehicleBrandData[];
  initialGarageVehicles?: UserGarageVehicle[];
}

export function VehicleSelector({
  initialBrands,
  initialGarageVehicles,
}: VehicleSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [brands, setBrands] = useState<VehicleBrandData[]>(initialBrands || []);
  const [garageVehicles, setGarageVehicles] = useState<UserGarageVehicle[]>(
    initialGarageVehicles || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialBrands || initialBrands.length === 0);

  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const garageDropdownRef = useRef<HTMLDivElement>(null);

  const makeParam = searchParams.get("make") || "";
  const modelParam = searchParams.get("model") || "";

  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Close garage dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        garageDropdownRef.current &&
        !garageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGarageOpen(false);
      }
    }
    if (isGarageOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGarageOpen]);

  // 1. Initialize from props and dynamically re-sync in background to guarantee real-time updates
  useEffect(() => {
    let isMounted = true;

    if (initialBrands && initialBrands.length > 0) {
      setBrands(initialBrands);
      setIsLoading(false);
    }

    if (initialGarageVehicles) {
      setGarageVehicles(initialGarageVehicles);
    }

    // Always fetch fresh data via dynamic /api/vehicles to capture any newly added brands/models or garage vehicles
    fetch("/api/vehicles", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          if (Array.isArray(json.data) && json.data.length > 0) {
            setBrands(json.data);
          }
          if (Array.isArray(json.garageVehicles)) {
            setGarageVehicles(json.garageVehicles);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to sync vehicle data in background:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [initialBrands, initialGarageVehicles]);

  // 2. Sync selected make and model when brands or URL searchParams change
  useEffect(() => {
    if (brands.length === 0) return;

    if (makeParam && brands.some((b) => b.slug === makeParam)) {
      setSelectedMake(makeParam);

      const currentBrandObj = brands.find((b) => b.slug === makeParam);
      const availableModels = currentBrandObj?.models || [];

      if (modelParam && availableModels.some((m) => m.slug === modelParam)) {
        setSelectedModel(modelParam);
      } else {
        setSelectedModel("");
      }
    } else {
      // If there is NO make filter in the URL, do NOT default to any vehicle.
      // Leave both empty so placeholders "SELECT CAR BRAND" & "SELECT CAR MODEL" are displayed!
      setSelectedMake("");
      setSelectedModel("");
    }
  }, [brands, makeParam, modelParam]);

  // Models list for current make
  const currentModels: VehicleModelData[] = useMemo(() => {
    if (!selectedMake) return [];
    const brand = brands.find((b) => b.slug === selectedMake);
    return brand?.models || [];
  }, [brands, selectedMake]);

  // Combobox options for Make
  const makeOptions: ComboboxOption[] = useMemo(() => {
    return brands.map((b) => ({
      value: b.slug,
      label: b.name,
      subLabel: `${b.models.length} รุ่น`,
    }));
  }, [brands]);

  // Combobox options for Model
  const modelOptions: ComboboxOption[] = useMemo(() => {
    return currentModels.map((m) => ({
      value: m.slug,
      label: m.displayName,
      subLabel: m.yearRange || undefined,
    }));
  }, [currentModels]);

  const handleMakeChange = (newMake: string) => {
    setSelectedMake(newMake);
    // Reset model so customer is prompted to select a model
    setSelectedModel("");
  };

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
  };

  const executeVehicleFilter = (make: string, model: string) => {
    startTransition(() => {
      const query = new URLSearchParams();
      if (make) query.set("make", make);
      if (model) query.set("model", model);

      router.push(`/products?${query.toString()}`);
      router.refresh();
    });
  };

  const handleSearch = () => {
    if (!selectedMake) return;
    executeVehicleFilter(selectedMake, selectedModel);
  };

  const handleReset = () => {
    setSelectedMake("");
    setSelectedModel("");
    startTransition(() => {
      router.push("/products");
      router.refresh();
    });
  };

  // Quick-select a vehicle from user garage
  const handleSelectGarageVehicle = (vehicle: UserGarageVehicle) => {
    setSelectedMake(vehicle.brandSlug);
    setSelectedModel(vehicle.carModelSlug);
    setIsGarageOpen(false);
    executeVehicleFilter(vehicle.brandSlug, vehicle.carModelSlug);
  };

  const hasActiveFilter = Boolean(makeParam);

  // Friendly display names for active filter label
  const activeBrandName = useMemo(() => {
    return brands.find((b) => b.slug === makeParam)?.name || makeParam.toUpperCase();
  }, [brands, makeParam]);

  const activeModelName = useMemo(() => {
    const brand = brands.find((b) => b.slug === makeParam);
    const model = brand?.models.find((m) => m.slug === modelParam);
    return model?.displayName || modelParam.replace(/-/g, " ").toUpperCase();
  }, [brands, makeParam, modelParam]);

  return (
    <section className="bg-zinc-950 border-b border-zinc-800/80 relative z-30">
      <div className="container-main py-3.5 md:py-4">
        {/* =========================================================================
            1. TOP ROW: Title & Integrated My Garage Shortcut (Clean & Balanced)
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-900/90">
          {/* Left: Branding & Section Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[var(--accent-red)] flex-shrink-0">
              <Car size={15} />
            </div>
            <div>
              <h2 className="font-heading text-xs md:text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
                SELECT YOUR VEHICLE
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] shadow-[0_0_8px_rgba(229,29,36,0.8)] animate-pulse" />
              </h2>
              <p className="text-[0.65rem] text-zinc-400 font-sans">
                ค้นหาชุดแต่งและชิ้นส่วนแอโร่ที่ตรงรุ่นสำหรับรถของคุณ
              </p>
            </div>
          </div>

          {/* Right: My Garage Quick-Select Pill (Integrated into header row) */}
          {garageVehicles.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-center" ref={garageDropdownRef}>
              <span className="text-[0.62rem] font-heading font-semibold uppercase tracking-wider text-zinc-400 hidden lg:inline">
                รถของคุณ:
              </span>

              {garageVehicles.length === 1 ? (
                // Single saved vehicle quick-pill
                (() => {
                  const v = garageVehicles[0];
                  const isSelected = selectedMake === v.brandSlug && selectedModel === v.carModelSlug;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectGarageVehicle(v)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60 text-white"
                          : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                      }`}
                      title="เลือกรถจากโรงรถของคุณทันที"
                    >
                      <Car size={13} className="text-[var(--accent-red)]" />
                      <span className="text-zinc-200">
                        {v.brandName} {v.carModelName}
                      </span>
                      {v.carModelGen && (
                        <span className="text-[0.62rem] text-zinc-400 font-normal">
                          ({v.carModelGen})
                        </span>
                      )}
                      {isSelected ? (
                        <span className="text-[0.58rem] px-1.5 py-0.2 rounded bg-[var(--accent-red)] text-white font-bold tracking-wider uppercase ml-1">
                          ACTIVE
                        </span>
                      ) : (
                        <Sparkles size={11} className="text-[var(--accent-red)] ml-0.5" />
                      )}
                    </button>
                  );
                })()
              ) : (
                // Multiple saved vehicles dropdown
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGarageOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-heading font-semibold transition-all cursor-pointer shadow-sm ${
                      garageVehicles.some((v) => v.brandSlug === selectedMake && v.carModelSlug === selectedModel)
                        ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/60 text-white"
                        : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <Car size={13} className="text-[var(--accent-red)]" />
                    <span>รถในโรงรถ ({garageVehicles.length} คัน)</span>
                    <ChevronDown
                      size={13}
                      className={`text-zinc-400 transition-transform ${isGarageOpen ? "rotate-180 text-[var(--accent-red)]" : ""}`}
                    />
                  </button>

                  {isGarageOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                      <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 text-[0.62rem] font-heading font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>เลือกรถจากโรงรถของคุณ</span>
                        <Sparkles size={11} className="text-[var(--accent-red)]" />
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
                        {garageVehicles.map((v) => {
                          const isCurrentSelected =
                            selectedMake === v.brandSlug && selectedModel === v.carModelSlug;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectGarageVehicle(v)}
                              className={`w-full text-left px-3 py-2 text-xs font-heading flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isCurrentSelected
                                  ? "bg-[var(--accent-red)]/15 text-white font-bold"
                                  : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{v.brandName} {v.carModelName}</span>
                                  {v.isDefault && (
                                    <span className="text-[0.55rem] px-1 py-0.2 bg-zinc-800 text-[var(--accent-red)] font-bold rounded">
                                      DEFAULT
                                    </span>
                                  )}
                                </div>
                                <p className="text-[0.65rem] text-zinc-400 font-sans mt-0.5">
                                  {v.carModelGen ? `${v.carModelGen}` : ""}
                                  {v.year ? ` • ปี ${v.year}` : ""}
                                </p>
                              </div>
                              {isCurrentSelected && (
                                <Check size={14} className="text-[var(--accent-red)] flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            2. MAIN INPUTS ROW: Make, Model & Clean Primary Action Button
           ========================================================================= */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* Make Combobox */}
          <div className="flex-1 sm:max-w-[280px]">
            <SearchableCombobox
              id="vehicle-make"
              label="MAKE (แบรนด์)"
              placeholder="SELECT CAR BRAND"
              searchPlaceholder="พิมพ์ชื่อแบรนด์..."
              value={selectedMake}
              options={makeOptions}
              onChange={handleMakeChange}
              disabled={isLoading || brands.length === 0}
              isLoading={isLoading}
              emptyText="ไม่พบแบรนด์ที่ค้นหา"
            />
          </div>

          {/* Model Combobox */}
          <div className="flex-1 sm:max-w-[320px]">
            <SearchableCombobox
              id="vehicle-model"
              label="MODEL (รุ่นรถ)"
              placeholder="SELECT CAR MODEL"
              searchPlaceholder="พิมพ์ชื่อรุ่น เช่น Type R, GR..."
              value={selectedModel}
              options={modelOptions}
              onChange={handleModelChange}
              disabled={isLoading || !selectedMake || currentModels.length === 0}
              isLoading={isLoading}
              emptyText="ไม่พบรุ่นรถที่ค้นหา"
            />
          </div>

          {/* Solid Primary Button (Full-width on mobile, auto on desktop) */}
          <div className="w-full sm:w-auto">
            <button
              onClick={handleSearch}
              disabled={isLoading || !selectedMake || isPending}
              className="btn-primary w-full sm:w-auto py-2.5 px-6 text-xs font-heading font-bold uppercase tracking-wider gap-2 shadow-lg shadow-red-950/40 hover:shadow-red-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
              id="view-products-btn"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  LOADING...
                </>
              ) : (
                <>
                  <Search size={13} />
                  VIEW PRODUCTS
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. ACTIVE FILTER STATUS & CLEAR BAR (Appears only when filter is active)
           ========================================================================= */}
        {hasActiveFilter && (
          <div className="mt-3 pt-2.5 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] text-zinc-400 font-sans">
                กำลังแสดงผลสำหรับ:
              </span>
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-red-600/60 text-[0.68rem] font-heading font-bold text-white uppercase tracking-wide transition-all cursor-pointer shadow-sm"
                title="คลิกเพื่อล้างตัวกรองนี้"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] group-hover:scale-125 transition-transform" />
                <span>
                  {activeBrandName} {activeModelName ? `• ${activeModelName}` : ""}
                </span>
                <span className="ml-1 p-0.5 rounded bg-zinc-800 group-hover:bg-[var(--accent-red)] text-zinc-400 group-hover:text-white transition-colors">
                  <X size={10} strokeWidth={2.5} />
                </span>
              </button>
            </div>

            {/* Clear filter / Show all models button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-[0.68rem] font-heading font-bold uppercase tracking-wider text-zinc-400 hover:text-[var(--accent-red)] transition-colors cursor-pointer py-1"
              title="ล้างตัวกรองและแสดงสินค้าของรถทุกรุ่น"
            >
              <RotateCcw size={11} />
              <span>ล้างตัวกรอง (ดูสินค้าทุกรุ่น)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
