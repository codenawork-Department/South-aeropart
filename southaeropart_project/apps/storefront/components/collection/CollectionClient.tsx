"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wind, Gauge, Check, Layers } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedField } from "@/lib/i18n-helpers";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import type { FeaturedBundleData } from "@/actions/bundle.actions";

interface CollectionClientProps {
  activeBundles: FeaturedBundleData[];
}

export function CollectionClient({ activeBundles }: CollectionClientProps) {
  const { lang, t } = useLanguage();
  const cDict = t.collection;

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Collection Hero Header */}
      <section className="bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E]">
        <div className="container-main py-12 md:py-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded-full text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase mb-3">
            {cDict.heroBadge}
          </div>
          <h1 className="heading-xl text-white">
            {cDict.heroTitleOur}{" "}
            <span className="text-[var(--accent-red)]">
              {cDict.heroTitleHighlight}
            </span>
          </h1>
          <p className="body-md text-[var(--text-secondary)] mt-3">
            {cDict.heroDesc}
          </p>
        </div>
      </section>

      {/* 2. Flagship Kits Showcase */}
      <section className="py-12 md:py-20">
        <div className="container-main space-y-12 md:space-y-16">
          {activeBundles.length === 0 ? (
            <div className="card p-10 md:p-16 bg-[#121212] border border-[#222222] text-center max-w-xl mx-auto rounded-sm shadow-2xl space-y-4 my-8">
              <div className="w-14 h-14 rounded-full bg-[#181818] border border-[#2A2A2A] text-[var(--accent-red)] mx-auto flex items-center justify-center">
                <Layers size={24} />
              </div>
              <h2 className="heading-md text-white">
                {cDict.emptyTitle}
              </h2>
              <p className="body-sm text-[var(--text-secondary)] max-w-md mx-auto">
                {cDict.emptyDesc}
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className="btn-primary gap-2 text-xs py-2.5 px-6 inline-flex"
                >
                  {cDict.browseAllProducts} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            activeBundles.map((kit, index) => {
              const isEven = index % 2 === 0;
              const localizedName = getLocalizedField(kit.name, kit.nameEn, lang);
              const localizedDescription = getLocalizedField(kit.description, kit.descriptionEn, lang);
              const localizedTagline = kit.shortDescription
                ? getLocalizedField(kit.shortDescription, kit.shortDescriptionEn, lang)
                : (lang === "en"
                    ? `FLAGSHIP ${(kit.brandName || "").toUpperCase()} ${(kit.carModelName || "").toUpperCase()} PACKAGE`
                    : `ชุดแต่งเรือธง ${(kit.brandName || "")} ${(kit.carModelName || "")} สมรรถนะสูง`);

              return (
                <div
                  key={kit.id}
                  className="card p-6 md:p-10 bg-[#121212] border-[#222222] hover:border-[var(--accent-red)] transition-all duration-500 group shadow-2xl"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Left Column (Image) */}
                    <div
                      className={`lg:col-span-6 ${
                        isEven ? "lg:order-1" : "lg:order-2"
                      }`}
                    >
                      <div className="relative aspect-[16/10] w-full rounded-sm overflow-hidden border border-[#262626] bg-[#161616]">
                        <Image
                          src={kit.primaryImage}
                          alt={localizedName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          sizes="(max-width: 1024px) 100vw, 600px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                        {/* Telemetry badges */}
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <div className="telemetry-pill text-xs">
                            <Wind size={14} className="text-[var(--success)]" />
                            <span className="text-[var(--success)] font-bold">
                              {kit.downforceBadge}
                            </span>
                          </div>
                          <div className="telemetry-pill text-xs">
                            <Gauge size={14} className="text-[var(--accent-red)]" />
                            <span className="text-[var(--accent-red)] font-bold">
                              {kit.dragBadge}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Info) */}
                    <div
                      className={`lg:col-span-6 space-y-4 ${
                        isEven ? "lg:order-2" : "lg:order-1"
                      }`}
                    >
                      <p className="text-[0.65rem] font-heading font-bold tracking-[0.2em] text-[var(--accent-red)] uppercase">
                        {localizedTagline}
                      </p>
                      <h2 className="heading-lg text-white">{localizedName}</h2>
                      <p className="body-md text-[var(--text-secondary)]">
                        {localizedDescription}
                      </p>

                      {/* Component Pieces List */}
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                          {cDict.includedInPackage}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {kit.bundleItems && kit.bundleItems.length > 0 ? (
                            kit.bundleItems.map((item) => {
                              const category = getLocalizedField(item.categoryName, item.categoryNameEn, lang);
                              const partName = getLocalizedField(item.name, item.nameEn, lang);
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                                >
                                  <Check
                                    size={14}
                                    className="text-[var(--accent-red)] flex-shrink-0"
                                  />
                                  <span>
                                    {category ? `${category}: ` : ""}
                                    {partName}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            kit.pieces.map((piece) => (
                              <div
                                key={piece}
                                className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                              >
                                <Check
                                  size={14}
                                  className="text-[var(--accent-red)] flex-shrink-0"
                                />
                                <span>{piece}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div className="pt-4 border-t border-[#1F1F1F] flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase">
                            {cDict.packageStartingAt}
                          </span>
                          <p className="font-heading text-xl font-bold text-white">
                            {kit.formattedPrice}
                          </p>
                        </div>

                        <Link
                          href={kit.link || `/products/${kit.slug}`}
                          className="btn-primary gap-2 text-xs py-2.5 px-5"
                        >
                          {cDict.exploreBuild} <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. CFD Aerodynamics Laboratory Feature */}
      <section className="py-12 md:py-16 bg-[#0E0E0E] border-t border-[#1C1C1C]">
        <div className="container-main">
          <div className="card p-8 md:p-12 bg-gradient-to-r from-[#141414] via-[#161616] to-[#121212] border-[#262626]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[var(--accent-red)]" />
                  <span className="text-xs font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider">
                    {cDict.cfdBadge}
                  </span>
                </div>
                <h2 className="heading-lg text-white">
                  {cDict.cfdTitle}
                </h2>
                <p className="body-md text-[var(--text-secondary)]">
                  {cDict.cfdDesc}
                </p>
                <div className="pt-2">
                  <Link href="/about" className="btn-outline gap-2 text-xs">
                    {cDict.learnAboutRd} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative aspect-[16/9] rounded-sm overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                  <Image
                    src="/images/G9/Artboard 9.png"
                    alt="CFD Wind Tunnel Simulation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 600px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureBadges />
    </div>
  );
}
