"use client";

import { useState } from "react";
import Image from "next/image";
import { User, ShieldCheck, Car, MapPin, Calendar, Globe } from "lucide-react";
import { User as DbUser } from "@repo/db";
import { ProfileLanguage, PROFILE_TRANSLATIONS } from "./profile-i18n";

interface ProfileHeaderProps {
  user: DbUser;
  addressCount: number;
  vehicleCount: number;
  language?: ProfileLanguage;
}

export function ProfileHeader({
  user,
  addressCount,
  vehicleCount,
  language = "en",
}: ProfileHeaderProps) {
  const [imageError, setImageError] = useState(false);

  const t = PROFILE_TRANSLATIONS[language]?.header || PROFILE_TRANSLATIONS.en.header;

  const memberSinceYear = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  const preferredLanguage = language.toUpperCase();
  const preferredCurrency = (user.metadata?.preferences?.currency as string) || "THB";

  return (
    <div className="relative overflow-hidden bg-[#111111] border border-[#222222] rounded-lg p-6 md:p-8 mb-8">
      {/* Background motorsport red ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-red)]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Avatar & Basic Info */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-[var(--accent-red)] bg-[#1A1A1A] flex items-center justify-center shadow-lg shadow-black/60">
              {user.avatarUrl && !imageError ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName || "User Avatar"}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={user.avatarUrl.includes("clerk.com")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#202020] to-[#121212] text-white">
                  <User size={36} className="text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
            {/* Online / Active Badge */}
            <span
              className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#111111] rounded-full"
              title={t.activeAccount}
            />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold font-heading uppercase tracking-wide text-white">
                {user.fullName || t.valuedCustomer}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={12} />
                {t.verified}
              </span>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{user.email}</p>

            <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)] flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--accent-red)]" />
                {t.memberSince} {memberSinceYear}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#333333]" />
              <span className="flex items-center gap-1.5 uppercase font-medium">
                <Globe size={13} className="text-[var(--accent-red)]" />
                {preferredLanguage} · {preferredCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Stats Cards */}
        <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 border-[#222222] pt-4 md:pt-0">
          <div className="flex-1 md:flex-initial flex items-center gap-3 px-4 py-3 bg-[#171717] border border-[#262626] rounded-md min-w-[130px]">
            <div className="p-2 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)]">
              <Car size={18} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.myGarage}
              </span>
              <span className="text-base font-bold font-heading text-white">
                {vehicleCount} {vehicleCount === 1 ? t.car : t.cars}
              </span>
            </div>
          </div>

          <div className="flex-1 md:flex-initial flex items-center gap-3 px-4 py-3 bg-[#171717] border border-[#262626] rounded-md min-w-[130px]">
            <div className="p-2 rounded bg-white/5 text-white">
              <MapPin size={18} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.addresses}
              </span>
              <span className="text-base font-bold font-heading text-white">
                {addressCount} {t.saved}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
