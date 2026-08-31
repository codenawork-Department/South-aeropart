"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Car, Loader2, Sparkles } from "lucide-react";
import { VehicleBrandData } from "@/actions/vehicle.actions";
import { saveUserVehicle, SaveVehicleInput } from "@/actions/profile.actions";
import { ProfileLanguage, PROFILE_TRANSLATIONS } from "./profile-i18n";

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: VehicleBrandData[];
  initialVehicle?: {
    id: string;
    brandId: string;
    carModelId: string;
    year: number | null;
    subModel: string | null;
    isDefault: boolean;
  } | null;
  onSuccess?: () => void;
  language?: ProfileLanguage;
}

export function GarageModal({
  isOpen,
  onClose,
  brands,
  initialVehicle,
  onSuccess,
  language = "th",
}: GarageModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = PROFILE_TRANSLATIONS[language]?.garageTab || PROFILE_TRANSLATIONS.th.garageTab;

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [subModel, setSubModel] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);

  // Available models based on selected brand
  const availableModels = useMemo(() => {
    if (!selectedBrandId) return [];
    const brand = brands.find((b) => b.id === selectedBrandId);
    return brand?.models || [];
  }, [selectedBrandId, brands]);

  useEffect(() => {
    if (initialVehicle) {
      setSelectedBrandId(initialVehicle.brandId);
      setSelectedModelId(initialVehicle.carModelId);
      setYear(initialVehicle.year ? String(initialVehicle.year) : "");
      setSubModel(initialVehicle.subModel || "");
      setIsDefault(Boolean(initialVehicle.isDefault));
    } else {
      const firstBrand = brands[0];
      setSelectedBrandId(firstBrand ? firstBrand.id : "");
      setSelectedModelId(firstBrand?.models[0] ? firstBrand.models[0].id : "");
      setYear(String(new Date().getFullYear()));
      setSubModel("");
      setIsDefault(false);
    }
    setErrorMsg(null);
  }, [initialVehicle, isOpen, brands]);

  // When brand changes, update model if current model is not in brand
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find((b) => b.id === brandId);
    if (brand && brand.models.length > 0) {
      setSelectedModelId(brand.models[0]?.id ?? "");
    } else {
      setSelectedModelId("");
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId || !selectedModelId) {
      setErrorMsg(t.validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: SaveVehicleInput = {
      id: initialVehicle?.id,
      brandId: selectedBrandId,
      carModelId: selectedModelId,
      year: year ? parseInt(year, 10) : null,
      subModel: subModel || null,
      isDefault,
    };

    const res = await saveUserVehicle(payload);

    setIsSubmitting(false);
    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to save vehicle to garage.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)]">
              <Car size={18} />
            </div>
            <h2 className="text-lg font-bold font-heading uppercase text-white tracking-wide">
              {initialVehicle ? t.modalEditTitle : t.modalAddTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Fitment Benefits Notice */}
          <div className="flex items-start gap-3 p-3.5 bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 rounded-md">
            <Sparkles size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t.fitmentNotice}
            </p>
          </div>

          {/* Car Brand */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {t.brandLabel}
            </label>
            <select
              required
              value={selectedBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="select-dark bg-[#1A1A1A] border-[#2A2A2A] text-white"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Car Model */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {t.modelLabel}
            </label>
            <select
              required
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="select-dark bg-[#1A1A1A] border-[#2A2A2A] text-white"
            >
              {availableModels.length === 0 ? (
                <option value="">{t.noModels}</option>
              ) : (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} {m.yearRange ? `[${m.yearRange}]` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Year & SubModel/Trim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t.yearLabel}
              </label>
              <input
                type="number"
                min="1970"
                max={new Date().getFullYear() + 2}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t.subModelLabel}
              </label>
              <input
                type="text"
                value={subModel}
                onChange={(e) => setSubModel(e.target.value)}
                placeholder="e.g. Type R FL5, GR, NISMO"
                className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
          </div>

          {/* Set as Default Car */}
          <div className="pt-1">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded bg-[#1A1A1A] border-[#333333] text-[var(--accent-red)] focus:ring-[var(--accent-red)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {t.setPrimaryCheckbox}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline text-xs px-5 py-2.5"
              disabled={isSubmitting}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs px-6 py-2.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.savingCar}
                </>
              ) : (
                t.saveCar
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
