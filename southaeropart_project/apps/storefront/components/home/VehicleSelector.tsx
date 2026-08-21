"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { VEHICLE_MAKES, VEHICLE_MODELS } from "@/lib/mock-data";

export function VehicleSelector() {
  const router = useRouter();
  const [selectedMake, setSelectedMake] = useState("honda");
  const [selectedModel, setSelectedModel] = useState("accord-g9");

  const models = VEHICLE_MODELS[selectedMake] || [];

  const handleSearch = () => {
    router.push(`/products?make=${selectedMake}&model=${selectedModel}`);
  };

  return (
    <section className="bg-[#111111] border-b border-[#222222]">
      <div className="container-main py-4 md:py-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
          {/* Header Title */}
          <div className="flex-shrink-0">
            <h2 className="font-heading text-sm md:text-base font-extrabold tracking-wider uppercase text-white flex items-center gap-2">
              SELECT YOUR VEHICLE
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Find parts that fit your ride &amp; explore curated builds.
            </p>
          </div>

          {/* Selectors Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full lg:w-auto">
            {/* Make Dropdown */}
            <div className="w-full sm:w-48">
              <label className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading font-semibold">
                MAKE
              </label>
              <select
                id="vehicle-make"
                value={selectedMake}
                onChange={(e) => {
                  const newMake = e.target.value;
                  setSelectedMake(newMake);
                  const firstModel = VEHICLE_MODELS[newMake]?.[0];
                  if (firstModel) setSelectedModel(firstModel.value);
                }}
                className="select-dark bg-[#181818] border-[#2A2A2A] text-xs font-semibold py-2.5"
              >
                {VEHICLE_MAKES.map((make) => (
                  <option key={make.value} value={make.value}>
                    {make.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Dropdown */}
            <div className="w-full sm:w-52">
              <label className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading font-semibold">
                MODEL
              </label>
              <select
                id="vehicle-model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="select-dark bg-[#181818] border-[#2A2A2A] text-xs font-semibold py-2.5"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label} ({model.yearRange})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSearch}
              className="btn-primary py-2.5 px-5 text-xs whitespace-nowrap gap-2 self-stretch sm:self-end"
              id="view-products-btn"
            >
              <Search size={14} />
              VIEW PRODUCTS
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
