"use client";

import { useState } from "react";
import { ChevronDown, Search, ArrowRight } from "lucide-react";
import { VEHICLE_MAKES, VEHICLE_MODELS } from "@/lib/mock-data";

export function VehicleSelector() {
  const [selectedMake, setSelectedMake] = useState("honda");
  const [selectedModel, setSelectedModel] = useState("accord-g9");

  const models = VEHICLE_MODELS[selectedMake] || [];
  const selectedMakeData = VEHICLE_MAKES.find((m) => m.value === selectedMake);

  return (
    <section className="bg-[var(--bg-elevated)] border-b border-[var(--border-color)]">
      <div className="container-main py-4 md:py-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          {/* Label */}
          <div className="flex-shrink-0">
            <h2 className="font-heading text-sm md:text-base font-bold tracking-wider uppercase">
              SELECT YOUR VEHICLE
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Explore our builds and product inspiration.
            </p>
          </div>

          {/* Dropdowns */}
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            {/* Make */}
            <div className="flex-1 md:flex-initial md:w-48">
              <label className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading">
                Make
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-white/10 rounded text-xs font-bold">
                  {selectedMakeData?.logo}
                </div>
                <select
                  id="vehicle-make"
                  value={selectedMake}
                  onChange={(e) => {
                    setSelectedMake(e.target.value);
                    const firstModel = VEHICLE_MODELS[e.target.value]?.[0];
                    if (firstModel) setSelectedModel(firstModel.value);
                  }}
                  className="select-dark pl-10"
                >
                  {VEHICLE_MAKES.map((make) => (
                    <option key={make.value} value={make.value}>
                      {make.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Model */}
            <div className="flex-1 md:flex-initial md:w-48">
              <label className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-widest mb-1 block font-heading">
                Model
              </label>
              <select
                id="vehicle-model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="select-dark"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Products Button */}
            <div className="hidden md:block flex-shrink-0 self-end">
              <button className="btn-outline gap-2 whitespace-nowrap" id="view-products-btn">
                <Search size={14} />
                VIEW ALL PRODUCTS
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Mobile View Products */}
          <button className="btn-outline w-full gap-2 md:hidden" id="view-products-mobile">
            <Search size={14} />
            VIEW ALL PRODUCTS
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
