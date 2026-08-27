"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import {
  getVehicleSelectorData,
  VehicleBrandData,
  VehicleModelData,
} from "@/actions/vehicle.actions";

interface VehicleSelectorProps {
  initialBrands?: VehicleBrandData[];
}

export function VehicleSelector({ initialBrands }: VehicleSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [brands, setBrands] = useState<VehicleBrandData[]>(initialBrands || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialBrands || initialBrands.length === 0);

  const makeParam = searchParams.get("make");
  const modelParam = searchParams.get("model");

  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Fetch from database if initialBrands not provided from server component
  useEffect(() => {
    let isMounted = true;

    if (!initialBrands || initialBrands.length === 0) {
      setIsLoading(true);
      getVehicleSelectorData()
        .then((data) => {
          if (isMounted) {
            setBrands(data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load vehicle data:", err);
          if (isMounted) setIsLoading(false);
        });
    } else {
      setBrands(initialBrands);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [initialBrands]);

  // Sync selected make and model when brands or URL params change
  useEffect(() => {
    if (brands.length === 0) return;

    // 1. Determine selected make
    setSelectedMake((prevMake) => {
      let nextMake = "";
      if (makeParam && brands.some((b) => b.slug === makeParam)) {
        nextMake = makeParam;
      } else if (prevMake && brands.some((b) => b.slug === prevMake)) {
        nextMake = prevMake;
      } else {
        const hondaBrand = brands.find((b) => b.slug === "honda");
        const brandWithModels = brands.find((b) => b.models.length > 0);
        nextMake = hondaBrand?.slug || brandWithModels?.slug || brands[0]?.slug || "";
      }

      // 2. Determine selected model for this make
      const currentBrandObj = brands.find((b) => b.slug === nextMake);
      const availableModels = currentBrandObj?.models || [];

      setSelectedModel((prevModel) => {
        if (availableModels.length === 0) return "";
        if (modelParam && availableModels.some((m) => m.slug === modelParam)) {
          return modelParam;
        }
        if (prevModel && availableModels.some((m) => m.slug === prevModel)) {
          return prevModel;
        }
        return availableModels[0]?.slug || "";
      });

      return nextMake;
    });
  }, [brands, makeParam, modelParam]);

  // Current models list for selected make
  const currentModels: VehicleModelData[] = useMemo(() => {
    const brand = brands.find((b) => b.slug === selectedMake);
    return brand?.models || [];
  }, [brands, selectedMake]);

  const handleMakeChange = (newMake: string) => {
    setSelectedMake(newMake);
    const brand = brands.find((b) => b.slug === newMake);
    const firstModel = brand?.models?.[0]?.slug || "";
    setSelectedModel(firstModel);
  };

  const handleSearch = () => {
    if (!selectedMake) return;

    startTransition(() => {
      const query = new URLSearchParams();
      if (selectedMake) query.set("make", selectedMake);
      if (selectedModel) query.set("model", selectedModel);

      router.push(`/products?${query.toString()}`);
    });
  };

  return (
    <section className="bg-[#111111] border-b border-[#222222]">
      <div className="container-main py-4 md:py-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
          {/* Header Title */}
          <div className="flex-shrink-0">
            <h2 className="font-heading text-sm md:text-base font-extrabold tracking-wider uppercase text-white flex items-center gap-2">
              SELECT YOUR VEHICLE
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Find parts that fit your ride &amp; explore curated builds from database.
            </p>
          </div>

          {/* Selectors Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full lg:w-auto">
            {/* Make Dropdown */}
            <div className="w-full sm:w-48">
              <label
                htmlFor="vehicle-make"
                className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading font-semibold"
              >
                MAKE
              </label>
              <select
                id="vehicle-make"
                value={selectedMake}
                disabled={isLoading || brands.length === 0}
                onChange={(e) => handleMakeChange(e.target.value)}
                className="select-dark bg-[#181818] border-[#2A2A2A] text-xs font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <option value="">กำลังโหลดแบรนด์...</option>
                ) : brands.length === 0 ? (
                  <option value="">ไม่พบข้อมูลแบรนด์</option>
                ) : (
                  brands.map((brand) => (
                    <option key={brand.id} value={brand.slug}>
                      {brand.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Model Dropdown */}
            <div className="w-full sm:w-56">
              <label
                htmlFor="vehicle-model"
                className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading font-semibold"
              >
                MODEL
              </label>
              <select
                id="vehicle-model"
                value={selectedModel}
                disabled={isLoading || currentModels.length === 0}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="select-dark bg-[#181818] border-[#2A2A2A] text-xs font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <option value="">กำลังโหลดรุ่นรถ...</option>
                ) : currentModels.length === 0 ? (
                  <option value="">
                    {brands.length > 0 ? "ไม่มีข้อมูลรุ่นในแบรนด์นี้" : "โปรดเลือกแบรนด์ก่อน"}
                  </option>
                ) : (
                  currentModels.map((model) => (
                    <option key={model.id} value={model.slug}>
                      {model.displayName}
                      {model.yearRange ? ` (${model.yearRange})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading || !selectedMake || isPending}
              className="btn-primary py-2.5 px-5 text-xs whitespace-nowrap gap-2 self-stretch sm:self-end disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="view-products-btn"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  LOADING...
                </>
              ) : (
                <>
                  <Search size={14} />
                  VIEW PRODUCTS
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
