"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wind, Compass } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function InfoSections() {
  const { t } = useLanguage();

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-[#0C0C0C] border-t border-[#1C1C1C]">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8">
          {/* Card 1: Aerodynamics Science */}
          <div className="card p-5 sm:p-6 md:p-6 lg:p-8 flex flex-col justify-between group hover:border-[#333333] transition-all bg-[#131313]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wind size={16} className="text-[var(--accent-red)]" />
                <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                  {t.home.aeroBadge}
                </span>
              </div>

              <h2 className="heading-md text-white">
                {t.home.aeroTitleWhatIs}{" "}
                <span className="text-[var(--accent-red)]">{t.home.aeroTitleHighlight}</span>
              </h2>

              <p className="body-md mt-3 text-[var(--text-secondary)]">
                {t.home.aeroDesc}
              </p>
            </div>

            {/* CFD Graphic Image */}
            <div className="mt-6 aspect-[16/9] relative rounded-sm overflow-hidden border border-[#222222] bg-[#0E0E0E]">
              <Image
                src="/images/G9/Artboard 8.png"
                alt="CFD Aerodynamics Airflow Simulation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 550px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3">
                <span className="telemetry-pill text-[0.65rem]">
                  {t.home.aeroSimPill}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#202020] flex items-center justify-between">
              <Link
                href="/aerodynamics"
                className="btn-outline gap-2 text-xs py-2.5 px-4"
                id="learn-aero"
              >
                {t.home.learnMore} <ArrowRight size={14} />
              </Link>
              <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase">
                {t.home.aeroRd}
              </span>
            </div>
          </div>

          {/* Card 2: Philosophy */}
          <div className="card p-5 sm:p-6 md:p-6 lg:p-8 flex flex-col justify-between group hover:border-[#333333] transition-all bg-[#131313]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Compass size={16} className="text-[var(--accent-red)]" />
                <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                  {t.home.philosophyBadge}
                </span>
              </div>

              <h2 className="heading-md text-white">
                {t.home.philosophyTitleOur}{" "}
                <span className="text-[var(--accent-red)]">{t.home.philosophyTitleHighlight}</span>
              </h2>

              <p className="font-heading text-xs tracking-widest text-[var(--text-muted)] mt-1 uppercase font-semibold">
                {t.home.philosophyTagline}
              </p>

              <p className="body-md mt-3 text-[var(--text-secondary)]">
                {t.home.philosophyDesc}
              </p>
            </div>

            {/* Philosophy Car Image */}
            <div className="mt-6 aspect-[16/9] relative rounded-sm overflow-hidden border border-[#222222] bg-[#0E0E0E]">
              <Image
                src="/images/BACK.png"
                alt="South Aero Accord G9 Rear Aerodynamics"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 550px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3">
                <span className="telemetry-pill text-[0.65rem]">
                  {t.home.philosophyCarPill}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#202020] flex items-center justify-between">
              <Link
                href="/about"
                className="btn-primary gap-2 text-xs py-2.5 px-4"
                id="learn-philosophy"
              >
                {t.home.ourStory} <ArrowRight size={14} />
              </Link>
              <span className="text-[0.65rem] text-[var(--text-muted)] font-heading uppercase">
                {t.home.estYear}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
