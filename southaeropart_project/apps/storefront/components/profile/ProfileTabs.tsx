"use client";

import { useState, useEffect } from "react";
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
  Building2,
  Loader2,
  AlertCircle,
  Check,
  FileText,
  Eye,
  ScrollText,
  Database,
  CheckCircle2,
} from "lucide-react";
import { User as DbUser, UserAddress } from "@repo/db";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Currency } from "@/lib/currency";
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
import { PdpaTermsModal } from "./PdpaTermsModal";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileLanguage, PROFILE_TRANSLATIONS } from "./profile-i18n";

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
  const { lang: appLang, setLanguage: setAppLanguage } = useLanguage();
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [language, setLanguage] = useState<ProfileLanguage>(
    appLang || (user.metadata?.preferences?.language as ProfileLanguage) || "en"
  );

  // Keep local language in sync with appLang
  useEffect(() => {
    if (appLang && appLang !== language) {
      setLanguage(appLang);
    }
  }, [appLang, language]);

  // Sync language changes across app via LanguageProvider and cookie/storage
  const handleSetLanguage = (newLang: ProfileLanguage) => {
    setLanguage(newLang);
    setAppLanguage(newLang);
  };

  const { currency: appCurrency, setCurrency: setAppCurrency } = useCurrency();
  const [currency, setCurrency] = useState<Currency>(
    appCurrency || (user.metadata?.preferences?.currency as Currency) || "THB"
  );

  // Keep local currency in sync with appCurrency
  useEffect(() => {
    if (appCurrency && appCurrency !== currency) {
      setCurrency(appCurrency);
    }
  }, [appCurrency, currency]);

  // Sync currency changes across app via CurrencyProvider
  const handleSetCurrency = (newCurr: Currency) => {
    setCurrency(newCurr);
    setAppCurrency(newCurr);
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Active translation dictionary
  const t = PROFILE_TRANSLATIONS[language] || PROFILE_TRANSLATIONS.th;

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

  const [isPdpaTermsModalOpen, setIsPdpaTermsModalOpen] = useState(false);

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
    });

    setIsUpdatingProfile(false);
    if (res.success) {
      setAppCurrency(currency);
      setProfileFeedback({
        type: "success",
        message: t.personalTab.saveSuccess,
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
        message: t.privacyTab.consentsUpdated,
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
        `south-aeropart-my-data-${language}-${new Date().toISOString().slice(0, 10)}.json`
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
    <div className="space-y-8">
      {/* Profile Summary Header with Live Language Sync */}
      <ProfileHeader
        user={user}
        addressCount={addresses.length}
        vehicleCount={vehicles.length}
        language={language}
      />

      {/* Tabs Header & Language Quick Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-2 px-5 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "personal"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[#1A1A1A]"
            }`}
          >
            <User size={15} />
            {t.tabs.personal}
          </button>

          <button
            onClick={() => setActiveTab("garage")}
            className={`flex items-center gap-2 px-5 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "garage"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[#1A1A1A]"
            }`}
          >
            <Car size={15} />
            {t.tabs.garage}
            <span
              className={`px-1.5 py-0.2 rounded text-[0.65rem] font-bold ${
                activeTab === "garage"
                  ? "bg-black/30 text-white"
                  : "bg-[#252525] text-[var(--text-muted)]"
              }`}
            >
              {vehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`flex items-center gap-2 px-5 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "addresses"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[#1A1A1A]"
            }`}
          >
            <MapPin size={15} />
            {t.tabs.addresses}
            <span
              className={`px-1.5 py-0.2 rounded text-[0.65rem] font-bold ${
                activeTab === "addresses"
                  ? "bg-black/30 text-white"
                  : "bg-[#252525] text-[var(--text-muted)]"
              }`}
            >
              {addresses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 px-5 py-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === "privacy"
                ? "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-[#1A1A1A]"
            }`}
          >
            <Shield size={15} />
            {t.tabs.privacy}
          </button>
        </div>

        {/* Quick Language Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] rounded-md p-1 self-start sm:self-auto">
          <Globe size={14} className="text-[var(--accent-red)] ml-1.5 mr-1 hidden sm:inline" />
          <button
            type="button"
            onClick={() => handleSetLanguage("th")}
            className={`px-2.5 py-1 rounded text-[0.7rem] font-bold tracking-wider transition-all ${
              language === "th"
                ? "bg-[var(--accent-red)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
            }`}
          >
            ไทย (TH)
          </button>
          <button
            type="button"
            onClick={() => handleSetLanguage("en")}
            className={`px-2.5 py-1 rounded text-[0.7rem] font-bold tracking-wider transition-all ${
              language === "en"
                ? "bg-[var(--accent-red)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* =========================================================================
            TAB 1: PERSONAL INFO & PREFERENCES
           ========================================================================= */}
        {activeTab === "personal" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="border-b border-[#222222] pb-4">
              <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                <User size={20} className="text-[var(--accent-red)]" />
                {t.personalTab.sectionTitle}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {t.personalTab.sectionSubtitle}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    {t.personalTab.name}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kenji Takahashi"
                    className="input-dark w-full bg-[#181818] border-[#2A2A2A] text-white"
                  />
                </div>

                {/* Email (Readonly - managed via Clerk) */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    {t.personalTab.email}
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="input-dark w-full bg-[#151515] border-[#222222] text-[var(--text-muted)] cursor-not-allowed"
                  />
                  <p className="text-[0.7rem] text-[var(--text-muted)] mt-1.5">
                    {t.personalTab.emailNotice}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    {t.personalTab.phone}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.personalTab.phonePlaceholder}
                    className="input-dark w-full bg-[#181818] border-[#2A2A2A] text-white font-mono"
                  />
                </div>

                {/* Language Preference */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={14} className="text-[var(--accent-red)]" />
                    {t.personalTab.language}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => handleSetLanguage(e.target.value as ProfileLanguage)}
                    className="select-dark bg-[#181818] border-[#2A2A2A] text-white"
                  >
                    <option value="th">ภาษาไทย (TH - Thailand PDPA)</option>
                    <option value="en">English (EN - Global / GDPR)</option>
                  </select>
                </div>

                {/* Currency Preference */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Coins size={14} className="text-[var(--accent-red)]" />
                    {t.personalTab.currency}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => handleSetCurrency(e.target.value as Currency)}
                    className="select-dark bg-[#181818] border-[#2A2A2A] text-white max-w-md"
                  >
                    <option value="THB">THB (฿ - Thai Baht)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="JPY">JPY (¥ - Japanese Yen)</option>
                    <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                  </select>
                  <p className="text-[0.7rem] text-[var(--text-muted)] mt-1.5">
                    {t.personalTab.currencyNotice}
                  </p>
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
                      {t.personalTab.saving}
                    </>
                  ) : (
                    t.personalTab.saveChanges
                  )}
                </button>
              </div>
            </form>

            {/* Clerk Security Card */}
            <div className="p-4 bg-[#141414] border border-[#222222] rounded-lg flex items-start gap-3">
              <Lock size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                <p className="font-semibold text-white">
                  {t.personalTab.accountSecurity}
                </p>
                <p>{t.personalTab.authManagedBy}</p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MY GARAGE
           ========================================================================= */}
        {activeTab === "garage" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                  <Car size={20} className="text-[var(--accent-red)]" />
                  {t.garageTab.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t.garageTab.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingVehicle(null);
                  setIsGarageModalOpen(true);
                }}
                className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 shrink-0"
              >
                <Plus size={16} />
                {t.garageTab.addVehicle}
              </button>
            </div>

            {/* Garage Vehicles List */}
            {vehicles.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-[#262626] rounded-lg">
                <div className="w-16 h-16 rounded-full bg-[#181818] border border-[#282828] flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                  <Car size={28} />
                </div>
                <h3 className="text-base font-bold font-heading uppercase text-white mb-1">
                  {t.garageTab.emptyTitle}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-6">
                  {t.garageTab.emptyDesc}
                </p>
                <button
                  type="button"
                  onClick={() => setIsGarageModalOpen(true)}
                  className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2"
                >
                  <Plus size={15} />
                  {t.garageTab.addFirst}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className={`relative p-5 rounded-lg border transition-all ${
                      v.isDefault
                        ? "bg-[#181818] border-[var(--accent-red)]/60 shadow-lg shadow-[var(--accent-red)]/5"
                        : "bg-[#141414] border-[#242424] hover:border-[#303030]"
                    }`}
                  >
                    {/* Primary Vehicle Badge */}
                    {v.isDefault && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-[var(--accent-red)] text-white">
                        <Star size={10} className="fill-current" />
                        {t.garageTab.primaryCar}
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Brand Logo */}
                      <div className="w-12 h-12 rounded bg-[#1F1F1F] border border-[#2A2A2A] p-2 flex items-center justify-center shrink-0">
                        {v.brandLogoUrl ? (
                          <Image
                            src={v.brandLogoUrl}
                            alt={v.brandName}
                            width={36}
                            height={36}
                            className="max-h-full max-w-full object-contain filter invert opacity-90"
                          />
                        ) : (
                          <Car size={20} className="text-[var(--text-secondary)]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--accent-red)] uppercase tracking-wider">
                          {v.brandName}
                        </p>
                        <h4 className="text-base font-bold font-heading text-white truncate mt-0.5">
                          {v.modelName} {v.generation ? `(${v.generation})` : ""}
                        </h4>

                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)] flex-wrap">
                          {v.year && (
                            <span className="px-2 py-0.5 rounded bg-[#222222] border border-[#303030]">
                              {t.garageTab.year} {v.year}
                            </span>
                          )}
                          {v.subModel && (
                            <span className="px-2 py-0.5 rounded bg-[#222222] border border-[#303030]">
                              {v.subModel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-4">
                      {!v.isDefault ? (
                        <button
                          onClick={() => setDefaultVehicle(v.id)}
                          className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <Star size={13} />
                          {t.garageTab.setPrimary}
                        </button>
                      ) : (
                        <span className="text-[0.7rem] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          {t.garageTab.activeFilter}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingVehicle(v);
                            setIsGarageModalOpen(true);
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                          title={t.garageTab.edit}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(t.garageTab.deleteConfirm)) {
                              await deleteUserVehicle(v.id);
                            }
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={t.garageTab.delete}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: ADDRESSES & TAX / BILLING
           ========================================================================= */}
        {activeTab === "addresses" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                  <MapPin size={20} className="text-[var(--accent-red)]" />
                  {t.addressTab.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t.addressTab.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(null);
                    setIsAddressModalOpen(true);
                  }}
                  className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2"
                >
                  <Plus size={16} />
                  {t.addressTab.addShipping}
                </button>
              </div>
            </div>

            {/* Section A: Shipping Addresses */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider flex items-center gap-2">
                <MapPin size={16} className="text-[var(--accent-red)]" />
                {t.addressTab.shippingTitle}
              </h3>

              {shippingAddresses.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#141414] border border-[#222222] text-center text-xs text-[var(--text-muted)]">
                  {t.addressTab.shippingEmpty}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shippingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative p-5 rounded-lg border transition-all ${
                        addr.isDefault
                          ? "bg-[#181818] border-[var(--accent-red)]/60"
                          : "bg-[#141414] border-[#242424]"
                      }`}
                    >
                      {addr.isDefault && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-[var(--accent-red)] text-white">
                          {t.addressTab.defaultBadge}
                        </span>
                      )}

                      <h4 className="text-sm font-bold text-white mb-1">
                        {addr.recipientName}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mb-2 font-mono">
                        {addr.phoneCountryCode} {addr.phone}
                      </p>

                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ""}
                        {addr.subDistrict ? `, ต.${addr.subDistrict}` : ""}
                        {addr.district ? `, อ.${addr.district}` : ""}
                        {addr.city ? `, ${addr.city}` : ""}
                        {addr.province ? `, จ.${addr.province}` : ""}
                        {addr.stateOrProvince ? `, ${addr.stateOrProvince}` : ""}
                        {` ${addr.postalCode}, ${addr.country}`}
                      </p>

                      <div className="flex items-center justify-between border-t border-[#262626] pt-3 mt-4">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => setDefaultAddress(addr.id, addr.type as "shipping" | "billing")}
                            className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            <Check size={13} />
                            {t.addressTab.setDefault}
                          </button>
                        ) : (
                          <span className="text-[0.7rem] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            {t.addressTab.defaultBadge}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAddress(addr);
                              setIsAddressModalOpen(true);
                            }}
                            className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                            title={t.addressTab.edit}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(t.addressTab.deleteConfirm)) {
                                await deleteUserAddress(addr.id);
                              }
                            }}
                            className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title={t.addressTab.delete}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Tax / Invoicing Profiles */}
            <div className="space-y-4 pt-4 border-t border-[#222222]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider flex items-center gap-2">
                  <Building2 size={16} className="text-[var(--accent-red)]" />
                  {t.addressTab.billingTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress({ type: "billing" } as any);
                    setIsAddressModalOpen(true);
                  }}
                  className="text-xs text-[var(--accent-red)] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus size={14} />
                  {t.addressTab.addBilling}
                </button>
              </div>

              {billingAddresses.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#141414] border border-[#222222] text-center text-xs text-[var(--text-muted)]">
                  {t.addressTab.billingEmpty}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {billingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-5 rounded-lg bg-[#141414] border border-[#262626]"
                    >
                      <h4 className="text-sm font-bold text-white mb-1">
                        {addr.companyName || addr.recipientName}
                      </h4>
                      {addr.taxId && (
                        <p className="text-xs text-[var(--accent-red)] font-mono font-semibold mb-1">
                          {t.addressTab.taxId}: {addr.taxId}{" "}
                          {addr.branch ? `(${t.addressTab.branch}: ${addr.branch})` : ""}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ""}
                        {addr.subDistrict ? `, ต.${addr.subDistrict}` : ""}
                        {addr.district ? `, อ.${addr.district}` : ""}
                        {addr.city ? `, ${addr.city}` : ""}
                        {addr.province ? `, จ.${addr.province}` : ""}
                        {` ${addr.postalCode}, ${addr.country}`}
                      </p>

                      <div className="flex items-center justify-end gap-2 border-t border-[#262626] pt-3 mt-4">
                        <button
                          onClick={() => {
                            setEditingAddress(addr);
                            setIsAddressModalOpen(true);
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                          title={t.addressTab.edit}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(t.addressTab.deleteConfirm)) {
                              await deleteUserAddress(addr.id);
                            }
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={t.addressTab.delete}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: PRIVACY, CONSENT & SECURITY (TAILORED PER COUNTRY LAWS)
           ========================================================================= */}
        {activeTab === "privacy" && (
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg md:text-xl font-bold font-heading uppercase text-white tracking-wide flex items-center gap-2">
                    <Shield size={20} className="text-[var(--accent-red)]" />
                    {t.privacyTab.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[0.68rem] font-bold bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 uppercase tracking-wider">
                    {t.privacyTab.lawBadge}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {t.privacyTab.subtitle}
                  </span>
                </div>
              </div>

              {/* View Terms & Policy Button */}
              <button
                type="button"
                onClick={() => setIsPdpaTermsModalOpen(true)}
                className="btn-outline text-xs px-4 py-2.5 flex items-center gap-2 text-white border-[var(--accent-red)]/40 hover:bg-[var(--accent-red)]/10 hover:border-[var(--accent-red)] shrink-0 transition-all shadow-md"
              >
                <ScrollText size={15} className="text-[var(--accent-red)]" />
                <span>{t.privacyTab.viewTermsBtn}</span>
              </button>
            </div>

            {/* Data Collection Transparency Overview */}
            <div className="p-4 rounded-lg bg-[#151515] border border-[#242424] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database size={15} className="text-[var(--accent-red)]" />
                  {t.privacyTab.dataMatrixTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPdpaTermsModalOpen(true)}
                  className="text-xs text-[var(--accent-red)] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Eye size={13} /> {t.privacyTab.viewFullMatrix}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category1Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category1Desc}
                  </p>
                </div>

                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category2Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category2Desc}
                  </p>
                </div>

                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category3Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category3Desc}
                  </p>
                </div>

                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category4Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category4Desc}
                  </p>
                </div>

                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category5Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category5Desc}
                  </p>
                </div>

                <div className="p-2.5 bg-[#1A1A1A] border border-[#262626] rounded text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {t.privacyTab.category6Title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[0.7rem]">
                    {t.privacyTab.category6Desc}
                  </p>
                </div>
              </div>
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
                      {t.privacyTab.consentEmail}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {t.privacyTab.consentEmailDesc}
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
                      {t.privacyTab.consentSms}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {t.privacyTab.consentSmsDesc}
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
                      {t.privacyTab.consentAnalytics}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {t.privacyTab.consentAnalyticsDesc}
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
                      {t.privacyTab.savingConsents}
                    </>
                  ) : (
                    t.privacyTab.saveConsents
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
                    {t.privacyTab.exportTitle}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                    {t.privacyTab.exportDesc}
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
                      {t.privacyTab.exportingBtn}
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      {t.privacyTab.exportBtn}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Security & Clerk Notice */}
            <div className="p-4 bg-[#141414] border border-[#222222] rounded-lg text-xs text-[var(--text-muted)] flex items-start gap-3">
              <Lock size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">{t.privacyTab.authNoticeTitle}</p>
                <p className="mt-0.5">
                  {t.privacyTab.authNoticeDesc}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS WITH ACTIVE LANGUAGE SYNC */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        initialAddress={editingAddress}
        language={language}
      />

      <GarageModal
        isOpen={isGarageModalOpen}
        onClose={() => {
          setIsGarageModalOpen(false);
          setEditingVehicle(null);
        }}
        brands={brands}
        initialVehicle={editingVehicle}
        language={language}
      />

      <PdpaTermsModal
        isOpen={isPdpaTermsModalOpen}
        onClose={() => setIsPdpaTermsModalOpen(false)}
        language={language}
      />
    </div>
  );
}
