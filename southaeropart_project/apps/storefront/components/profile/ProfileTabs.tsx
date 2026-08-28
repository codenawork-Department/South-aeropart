"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  Car,
  MapPin,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Star,
  Download,
  Lock,
  Globe,
  Coins,
  Compass,
  Building2,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { User as DbUser, UserAddress } from "@repo/db";
import { VehicleBrandData } from "@/actions/vehicle.actions";
import {
  updateUserProfile,
  updatePrivacyConsents,
  deleteUserAddress,
  setDefaultAddress,
  deleteUserVehicle,
  setDefaultVehicle,
  exportUserData,
} from "@/actions/profile.actions";
import { AddressModal } from "./AddressModal";
import { GarageModal } from "./GarageModal";

interface ProfileTabsProps {
  user: DbUser;
  addresses: UserAddress[];
  vehicles: Array<{
    id: string;
    userId: string;
    brandId: string;
    carModelId: string;
    year: number | null;
    subModel: string | null;
    steeringOrientation: string;
    plateNumber: string | null;
    isDefault: boolean;
    createdAt: Date;
    brandName: string;
    brandLogoUrl: string | null;
    brandSlug: string;
    modelName: string;
    modelSlug: string;
    generation: string | null;
  }>;
  brands: VehicleBrandData[];
}

export function ProfileTabs({
  user,
  addresses,
  vehicles,
  brands,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "personal" | "garage" | "addresses" | "privacy"
  >("personal");

  // Personal Info form states
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [language, setLanguage] = useState<"th" | "en" | "ja">(
    (user.metadata?.preferences?.language as "th" | "en" | "ja") || "th"
  );
  const [currency, setCurrency] = useState<"THB" | "USD" | "EUR" | "JPY" | "SGD">(
    (user.metadata?.preferences?.currency as "THB" | "USD" | "EUR" | "JPY" | "SGD") || "THB"
  );
  const [defaultSteering, setDefaultSteering] = useState<"RHD" | "LHD">(
    (user.metadata?.preferences?.defaultSteering as "RHD" | "LHD") || "RHD"
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Privacy Consents form states
  const [marketingEmail, setMarketingEmail] = useState(
    Boolean(user.metadata?.privacyConsents?.marketingEmail)
  );
  const [marketingSms, setMarketingSms] = useState(
    Boolean(user.metadata?.privacyConsents?.marketingSms)
  );
  const [analytics, setAnalytics] = useState(
    Boolean(user.metadata?.privacyConsents?.analytics)
  );
  const [isUpdatingConsents, setIsUpdatingConsents] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Data Export state
  const [isExportingData, setIsExportingData] = useState(false);

  // Modals state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // Handle Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileFeedback(null);

    const res = await updateUserProfile({
      fullName,
      phone,
      language,
      currency,
      defaultSteering,
    });

    setIsUpdatingProfile(false);
    if (res.success) {
      setProfileFeedback({
        type: "success",
        message: "Profile preferences updated successfully!",
      });
      setTimeout(() => setProfileFeedback(null), 4000);
    } else {
      setProfileFeedback({
        type: "error",
        message: res.error || "Failed to update profile",
      });
    }
  };

  // Handle Save Privacy Consents
  const handleSaveConsents = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingConsents(true);
    setConsentFeedback(null);

    const res = await updatePrivacyConsents({
      marketingEmail,
      marketingSms,
      analytics,
    });

    setIsUpdatingConsents(false);
    if (res.success) {
      setConsentFeedback({
        type: "success",
        message: "Privacy & Consent settings updated in accordance with PDPA!",
      });
      setTimeout(() => setConsentFeedback(null), 4000);
    } else {
      setConsentFeedback({
        type: "error",
        message: res.error || "Failed to update privacy settings",
      });
    }
  };

  // Handle Export Data
  const handleExportData = async () => {
    setIsExportingData(true);
    const res = await exportUserData();
    setIsExportingData(false);

    if (res.success && res.data) {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `south-aeropart-my-data-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      alert("Failed to export data. Please try again.");
    }
  };

  const shippingAddresses = addresses.filter((a) => a.type === "shipping");
  const billingAddresses = addresses.filter((a) => a.type === "billing");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Navigation Tabs */}
      <div className="lg:col-span-3">
        <div className="bg-[#111111] border border-[#222222] rounded-lg p-2 space-y-1 sticky top-24">
          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "personal"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <User size={18} />
              <span>Personal & Region</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("garage")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "garage"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Car size={18} />
              <span>My Garage</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "garage"
                  ? "bg-black/30 text-white font-bold"
                  : "bg-[#222222] text-[var(--text-muted)]"
              }`}
            >
              {vehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "addresses"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin size={18} />
              <span>Addresses & Tax</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "addresses"
                  ? "bg-black/30 text-white font-bold"
                  : "bg-[#222222] text-[var(--text-muted)]"
              }`}
            >
              {addresses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "privacy"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield size={18} />
              <span>Privacy & PDPA</span>
            </div>
          </button>
        </div>
      </div>

      {/* Right Column: Tab Content Panels */}
      <div className="lg:col-span-9">
        {/* TAB 1: PERSONAL & PREFERENCES */}
        {activeTab === "personal" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-6">
            <div className="border-b border-[#222222] pb-4">
              <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                <User size={20} className="text-[var(--accent-red)]" />
                Personal Information & Regional Preferences
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Manage your public profile, contact details, and display preferences.
              </p>
            </div>

            {profileFeedback && (
              <div
                className={`p-4 rounded-md text-sm flex items-center gap-3 ${
                  profileFeedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {profileFeedback.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Full Name (ชื่อ - นามสกุล)
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="input-dark w-full bg-[#181818] border-[#2A2A2A] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Email Address (อีเมล)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="input-dark w-full bg-[#141414] border-[#242424] text-[var(--text-muted)] cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Clerk Auth
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Contact Phone (เบอร์โทรติดต่อ)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+66 81 234 5678"
                    className="input-dark w-full bg-[#181818] border-[#2A2A2A] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={14} className="text-[var(--accent-red)]" />
                    Preferred Language (ภาษาที่แสดงผล)
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="select-dark bg-[#181818] border-[#2A2A2A] text-white"
                  >
                    <option value="th">ภาษาไทย (TH)</option>
                    <option value="en">English (EN)</option>
                    <option value="ja">日本語 (JA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Coins size={14} className="text-[var(--accent-red)]" />
                    Display Currency (สกุลเงินแสดงผล)
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="select-dark bg-[#181818] border-[#2A2A2A] text-white"
                  >
                    <option value="THB">THB (฿ - Thai Baht)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="JPY">JPY (¥ - Japanese Yen)</option>
                    <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                  </select>
                  <p className="text-[0.7rem] text-[var(--text-muted)] mt-1.5">
                    * Display conversion for reference. Checkout processed in store primary currency.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Compass size={14} className="text-[var(--accent-red)]" />
                    Default Steering Preference (ตำแหน่งพวงมาลัย)
                  </label>
                  <select
                    value={defaultSteering}
                    onChange={(e) => setDefaultSteering(e.target.value as any)}
                    className="select-dark bg-[#181818] border-[#2A2A2A] text-white"
                  >
                    <option value="RHD">RHD (Right-Hand Drive - พวงมาลัยขวา)</option>
                    <option value="LHD">LHD (Left-Hand Drive - พวงมาลัยซ้าย)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#222222]">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="btn-primary text-xs px-6 py-3"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving Preferences...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY GARAGE */}
        {activeTab === "garage" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                  <Car size={20} className="text-[var(--accent-red)]" />
                  My Garage (โรงรถของฉัน)
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Save your vehicle models to check aeropart compatibility and receive fitment alerts.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingVehicle(null);
                  setIsGarageModalOpen(true);
                }}
                className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 shrink-0"
              >
                <Plus size={16} />
                Add Vehicle
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-[#2A2A2A] rounded-lg bg-[#141414]">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center mx-auto mb-4">
                  <Car size={32} />
                </div>
                <h3 className="text-base font-bold font-heading uppercase text-white">
                  Your Garage is Empty
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1 mb-6">
                  Add your car brand, model, and year to ensure every aerodynamic part you view matches your exact chassis.
                </p>
                <button
                  onClick={() => {
                    setEditingVehicle(null);
                    setIsGarageModalOpen(true);
                  }}
                  className="btn-outline text-xs px-5 py-2.5"
                >
                  <Plus size={14} />
                  Add First Vehicle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className={`relative p-5 rounded-lg border transition-all ${
                      v.isDefault
                        ? "border-[var(--accent-red)] bg-gradient-to-br from-[#1A1A1A] to-[#141414] shadow-lg shadow-[var(--accent-red)]/5"
                        : "border-[#242424] bg-[#161616] hover:border-[#333333]"
                    }`}
                  >
                    {/* Default Badge */}
                    {v.isDefault && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 text-[0.65rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-red)] text-white">
                        <Star size={11} className="fill-white" />
                        Primary Car
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Brand Logo or Icon */}
                      <div className="w-12 h-12 rounded bg-[#202020] border border-[#2E2E2E] flex items-center justify-center p-2 shrink-0">
                        {v.brandLogoUrl ? (
                          <Image
                            src={v.brandLogoUrl}
                            alt={v.brandName}
                            width={40}
                            height={40}
                            className="max-h-full max-w-full object-contain filter invert opacity-90"
                            unoptimized
                          />
                        ) : (
                          <Car size={24} className="text-[var(--text-secondary)]" />
                        )}
                      </div>

                      <div className="flex-1 pr-16">
                        <span className="text-[0.7rem] font-bold font-heading tracking-widest text-[var(--accent-red)] uppercase">
                          {v.brandName}
                        </span>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {v.modelName} {v.generation ? `(${v.generation})` : ""}
                        </h4>

                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)] flex-wrap">
                          {v.year && (
                            <span className="px-2 py-0.5 rounded bg-[#222222] border border-[#303030]">
                              Year {v.year}
                            </span>
                          )}
                          {v.subModel && (
                            <span className="px-2 py-0.5 rounded bg-[#222222] border border-[#303030]">
                              {v.subModel}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 font-mono font-semibold">
                            {v.steeringOrientation}
                          </span>
                        </div>

                        {v.plateNumber && (
                          <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">
                            Plate: {v.plateNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-4">
                      {!v.isDefault ? (
                        <button
                          onClick={() => setDefaultVehicle(v.id)}
                          className="text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle size={14} />
                          Set as Primary
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check size={14} /> Active Fitment Filter
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingVehicle(v);
                            setIsGarageModalOpen(true);
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                          title="Edit vehicle"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Remove this vehicle from your garage?")) {
                              await deleteUserVehicle(v.id);
                            }
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete vehicle"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADDRESS BOOK & TAX */}
        {activeTab === "addresses" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                  <MapPin size={20} className="text-[var(--accent-red)]" />
                  Address Book & Tax Invoicing
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Manage multiple shipping destinations and verified corporate tax invoice profiles.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingAddress(null);
                  setIsAddressModalOpen(true);
                }}
                className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 shrink-0"
              >
                <Plus size={16} />
                Add Address
              </button>
            </div>

            {/* Shipping Addresses Section */}
            <div>
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-[var(--accent-red)] mb-4 flex items-center gap-2">
                <MapPin size={15} />
                Shipping Addresses (ที่อยู่จัดส่งพัสดุ)
              </h3>

              {shippingAddresses.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#2A2A2A] rounded-lg bg-[#141414]">
                  <p className="text-xs text-[var(--text-secondary)]">No shipping addresses saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shippingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative p-5 rounded-lg border flex flex-col justify-between ${
                        addr.isDefault
                          ? "border-[var(--accent-red)] bg-[#171717]"
                          : "border-[#242424] bg-[#141414]"
                      }`}
                    >
                      {addr.isDefault && (
                        <span className="absolute top-3 right-3 text-[0.65rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-red)] text-white">
                          Default Shipping
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{addr.recipientName}</h4>
                          <span className="text-xs px-1.5 py-0.2 rounded bg-[#242424] text-[var(--text-secondary)] font-mono">
                            {addr.country}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                          {addr.phoneCountryCode} {addr.phone}
                        </p>

                        <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ""}
                          <br />
                          {addr.country === "TH"
                            ? `${addr.subDistrict ? `ต.${addr.subDistrict} ` : ""}${addr.district ? `อ.${addr.district} ` : ""}${addr.province ? `จ.${addr.province} ` : ""}${addr.postalCode}`
                            : `${addr.city ? `${addr.city}, ` : ""}${addr.stateOrProvince ? `${addr.stateOrProvince} ` : ""}${addr.postalCode}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-[#242424] pt-3 mt-4">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => setDefaultAddress(addr.id, "shipping")}
                            className="text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle size={13} />
                            Set as Default
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400">Primary Destination</span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAddress(addr);
                              setIsAddressModalOpen(true);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-white"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Delete this address?")) {
                                await deleteUserAddress(addr.id);
                              }
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing / Tax Profiles Section */}
            <div className="border-t border-[#222222] pt-6">
              <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-[var(--accent-red)] mb-4 flex items-center gap-2">
                <Building2 size={15} />
                Tax Invoice & Billing Profiles (ข้อมูลออกใบกำกับภาษี)
              </h3>

              {billingAddresses.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#2A2A2A] rounded-lg bg-[#141414]">
                  <p className="text-xs text-[var(--text-secondary)]">No tax invoice profiles saved yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {billingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative p-5 rounded-lg border flex flex-col justify-between ${
                        addr.isDefault
                          ? "border-[var(--accent-red)] bg-[#171717]"
                          : "border-[#242424] bg-[#141414]"
                      }`}
                    >
                      {addr.isDefault && (
                        <span className="absolute top-3 right-3 text-[0.65rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-red)] text-white">
                          Default Tax Profile
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {addr.companyName || addr.recipientName}
                          </h4>
                          <span className="text-xs px-1.5 py-0.2 rounded bg-[#242424] text-[var(--text-secondary)] font-mono">
                            {addr.country}
                          </span>
                        </div>

                        {addr.taxId && (
                          <p className="text-xs text-amber-400 font-mono mt-1">
                            Tax ID: {addr.taxId} {addr.branch ? `(Branch: ${addr.branch})` : ""}
                          </p>
                        )}

                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ""}
                          <br />
                          {addr.country === "TH"
                            ? `${addr.subDistrict ? `ต.${addr.subDistrict} ` : ""}${addr.district ? `อ.${addr.district} ` : ""}${addr.province ? `จ.${addr.province} ` : ""}${addr.postalCode}`
                            : `${addr.city ? `${addr.city}, ` : ""}${addr.stateOrProvince ? `${addr.stateOrProvince} ` : ""}${addr.postalCode}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-[#242424] pt-3 mt-4">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => setDefaultAddress(addr.id, "billing")}
                            className="text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle size={13} />
                            Set as Default
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400">Primary Tax Profile</span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAddress(addr);
                              setIsAddressModalOpen(true);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-white"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Delete this tax invoice profile?")) {
                                await deleteUserAddress(addr.id);
                              }
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PRIVACY, CONSENT & SECURITY */}
        {activeTab === "privacy" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-8">
            <div className="border-b border-[#222222] pb-4">
              <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                <Shield size={20} className="text-[var(--accent-red)]" />
                Privacy & Data Protection (PDPA & GDPR)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                We strictly adhere to Thailand&apos;s Personal Data Protection Act (PDPA) and global privacy standards.
              </p>
            </div>

            {consentFeedback && (
              <div
                className={`p-4 rounded-md text-sm flex items-center gap-3 ${
                  consentFeedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {consentFeedback.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{consentFeedback.message}</span>
              </div>
            )}

            {/* Consents Form */}
            <form onSubmit={handleSaveConsents} className="space-y-6">
              <div className="space-y-4">
                {/* Consent 1: Email Marketing */}
                <div className="p-4 bg-[#161616] border border-[#242424] rounded-lg flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Marketing & Product Launch Newsletters (Email)
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Receive early-bird notifications on new aerodynamic body kits, carbon fiber drops, and seasonal discounts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={marketingEmail}
                      onChange={(e) => setMarketingEmail(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-red)]"></div>
                  </label>
                </div>

                {/* Consent 2: SMS Promotion */}
                <div className="p-4 bg-[#161616] border border-[#242424] rounded-lg flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      SMS Notifications & Flash Sale Alerts
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Receive high-priority SMS alerts for limited production batches and tracking updates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={marketingSms}
                      onChange={(e) => setMarketingSms(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-red)]"></div>
                  </label>
                </div>

                {/* Consent 3: Recommendation Analytics */}
                <div className="p-4 bg-[#161616] border border-[#242424] rounded-lg flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Personalized Aero Fitment Analytics
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Allow South Aeropart to analyze browsing preferences and garage cars to tailor aero suggestions.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-red)]"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingConsents}
                  className="btn-primary text-xs px-6 py-2.5"
                >
                  {isUpdatingConsents ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving Preferences...
                    </>
                  ) : (
                    "Save Privacy Preferences"
                  )}
                </button>
              </div>
            </form>

            {/* Data Portability Section */}
            <div className="border-t border-[#222222] pt-6">
              <div className="p-5 bg-gradient-to-r from-[#171717] to-[#121212] border border-[#262626] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download size={16} className="text-[var(--accent-red)]" />
                    Download Personal Data Archive (Right to Data Portability)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                    Download an exported JSON copy of all personal details, saved garage vehicles, addresses, and consent audit trails associated with your account.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={isExportingData}
                  className="btn-outline text-xs px-4 py-2.5 shrink-0 flex items-center gap-2"
                >
                  {isExportingData ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating JSON...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Export Data (JSON)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security & Clerk Notice */}
            <div className="p-4 bg-[#141414] border border-[#222222] rounded-lg text-xs text-[var(--text-muted)] flex items-start gap-3">
              <Lock size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[var(--text-secondary)] font-medium">Authentication & Passwords</p>
                <p className="mt-0.5">
                  Your credentials and OAuth logins (Google/Apple) are securely managed and encrypted via Clerk Authentication. No plain passwords or payment card details are stored on South Aeropart application databases.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        initialAddress={editingAddress}
      />

      <GarageModal
        isOpen={isGarageModalOpen}
        onClose={() => {
          setIsGarageModalOpen(false);
          setEditingVehicle(null);
        }}
        brands={brands}
        initialVehicle={editingVehicle}
      />
    </div>
  );
}
