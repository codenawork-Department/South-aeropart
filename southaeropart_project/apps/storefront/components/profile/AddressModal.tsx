"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Building2, Check, Loader2, Globe } from "lucide-react";
import { UserAddress } from "@repo/db";
import { saveUserAddress, SaveAddressInput } from "@/actions/profile.actions";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: UserAddress | null;
  onSuccess?: () => void;
}

const COUNTRY_OPTIONS = [
  { code: "TH", name: "Thailand (ไทย)", dial: "+66" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "JP", name: "Japan (日本)", dial: "+81" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "DE", name: "Germany (Deutschland)", dial: "+49" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "KR", name: "South Korea (대한민국)", dial: "+82" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
];

export function AddressModal({
  isOpen,
  onClose,
  initialAddress,
  onSuccess,
}: AddressModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [type, setType] = useState<"shipping" | "billing">("shipping");
  const [country, setCountry] = useState<string>("TH");
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>("+66");
  const [recipientName, setRecipientName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [line1, setLine1] = useState<string>("");
  const [line2, setLine2] = useState<string>("");
  const [subDistrict, setSubDistrict] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [stateOrProvince, setStateOrProvince] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);

  useEffect(() => {
    if (initialAddress) {
      setType(initialAddress.type as "shipping" | "billing");
      setCountry(initialAddress.country || "TH");
      setPhoneCountryCode(initialAddress.phoneCountryCode || "+66");
      setRecipientName(initialAddress.recipientName || "");
      setPhone(initialAddress.phone || "");
      setLine1(initialAddress.line1 || "");
      setLine2(initialAddress.line2 || "");
      setSubDistrict(initialAddress.subDistrict || "");
      setDistrict(initialAddress.district || "");
      setProvince(initialAddress.province || "");
      setCity(initialAddress.city || "");
      setStateOrProvince(initialAddress.stateOrProvince || "");
      setPostalCode(initialAddress.postalCode || "");
      setCompanyName(initialAddress.companyName || "");
      setTaxId(initialAddress.taxId || "");
      setBranch(initialAddress.branch || "");
      setIsDefault(Boolean(initialAddress.isDefault));
    } else {
      setType("shipping");
      setCountry("TH");
      setPhoneCountryCode("+66");
      setRecipientName("");
      setPhone("");
      setLine1("");
      setLine2("");
      setSubDistrict("");
      setDistrict("");
      setProvince("");
      setCity("");
      setStateOrProvince("");
      setPostalCode("");
      setCompanyName("");
      setTaxId("");
      setBranch("");
      setIsDefault(false);
    }
    setErrorMsg(null);
  }, [initialAddress, isOpen]);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const matched = COUNTRY_OPTIONS.find((c) => c.code === newCountry);
    if (matched) {
      setPhoneCountryCode(matched.dial);
    }
  };

  if (!isOpen) return null;

  const isThai = country === "TH";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: SaveAddressInput = {
      id: initialAddress?.id,
      type,
      recipientName,
      phoneCountryCode,
      phone,
      country,
      line1,
      line2: line2 || null,
      subDistrict: isThai ? subDistrict : null,
      district: isThai ? district : null,
      province: isThai ? province : null,
      city: !isThai ? city : null,
      stateOrProvince: !isThai ? stateOrProvince : null,
      postalCode,
      companyName: type === "billing" ? companyName : null,
      taxId: type === "billing" ? taxId : null,
      branch: type === "billing" ? branch : null,
      isDefault,
    };

    const res = await saveUserAddress(payload);

    setIsSubmitting(false);
    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to save address. Please verify your input.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)]">
              {type === "shipping" ? <MapPin size={18} /> : <Building2 size={18} />}
            </div>
            <h2 className="text-lg font-bold font-heading uppercase text-white tracking-wide">
              {initialAddress ? "Edit Address" : "Add New Address"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Address Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Address Purpose
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("shipping")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded text-sm font-medium border transition-all ${
                  type === "shipping"
                    ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10 text-white"
                    : "border-[#262626] bg-[#1A1A1A] text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                <MapPin size={16} />
                Shipping (จัดส่งพัสดุ)
              </button>
              <button
                type="button"
                onClick={() => setType("billing")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded text-sm font-medium border transition-all ${
                  type === "billing"
                    ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10 text-white"
                    : "border-[#262626] bg-[#1A1A1A] text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                <Building2 size={16} />
                Tax Invoice / Billing (ใบกำกับภาษี)
              </button>
            </div>
          </div>

          {/* Country Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Country / Region (ประเทศ)
            </label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="select-dark bg-[#1A1A1A] border-[#2A2A2A] text-white"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.dial})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax / Billing Specific Fields */}
          {type === "billing" && (
            <div className="p-4 bg-[#181818] border border-[#262626] rounded-md space-y-4">
              <div className="text-xs font-bold font-heading uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                <Building2 size={14} />
                Tax & Legal Entity Details (ข้อมูลผู้เสียภาษี)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Company / Taxpayer Legal Name (ชื่อบริษัท / ชื่อผู้เสียภาษี) *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. South Motorsport Co., Ltd."
                    className="input-dark w-full bg-[#1F1F1F] border-[#2E2E2E] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Tax ID / VAT Registration No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder={isThai ? "13-digit Tax ID" : "Tax/VAT No."}
                    className="input-dark w-full bg-[#1F1F1F] border-[#2E2E2E] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Branch (สาขา - e.g. สำนักงานใหญ่ / 00000)
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Head Office (สำนักงานใหญ่)"
                    className="input-dark w-full bg-[#1F1F1F] border-[#2E2E2E] text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Recipient Name (ชื่อผู้รับ) *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Full Name"
                className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Phone Number (เบอร์ติดต่อ) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="input-dark w-24 bg-[#1A1A1A] border-[#2A2A2A] text-white text-center font-mono"
                  placeholder="+66"
                />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={isThai ? "0812345678" : "Phone number"}
                  className="input-dark flex-1 bg-[#1A1A1A] border-[#2A2A2A] text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Address Line 1 & Line 2 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Address Line 1 (บ้านเลขที่ / ถนน / อาคาร) *
              </label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="House No., Building, Street address"
                className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Address Line 2 (หมู่บ้าน / ชั้น / ห้อง - Optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Apt, Suite, Unit, Floor (optional)"
                className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
          </div>

          {/* Dynamic Geographic Fields */}
          {isThai ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  ตำบล / แขวง *
                </label>
                <input
                  type="text"
                  required
                  value={subDistrict}
                  onChange={(e) => setSubDistrict(e.target.value)}
                  placeholder="ตำบล/แขวง"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  อำเภอ / เขต *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="อำเภอ/เขต"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  จังหวัด *
                </label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="จังหวัด"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  รหัสไปรษณีย์ *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10110"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Los Angeles, Tokyo"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  State / Province / Region *
                </label>
                <input
                  type="text"
                  required
                  value={stateOrProvince}
                  onChange={(e) => setStateOrProvince(e.target.value)}
                  placeholder="e.g. California, Kanto"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Postal / ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 90001, 100-0001"
                  className="input-dark w-full bg-[#1A1A1A] border-[#2A2A2A] text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Set Default Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded bg-[#1A1A1A] border-[#333333] text-[var(--accent-red)] focus:ring-[var(--accent-red)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Set as default {type === "shipping" ? "shipping" : "billing"} address (ตั้งเป็นที่อยู่หลัก)
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs px-6 py-2.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Address"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
