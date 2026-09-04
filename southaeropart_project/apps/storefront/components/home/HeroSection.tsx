"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CarModelViewer } from "@/components/3d/CarModelViewer";
import { HeroCardData, getHomepageHeroCards } from "@/actions/homepage.actions";

interface HeroSectionProps {
  initialCards?: HeroCardData[];
}

export function HeroSection({ initialCards }: HeroSectionProps) {
  const [cards, setCards] = useState<HeroCardData[]>(initialCards || []);

  useEffect(() => {
    if (!initialCards || initialCards.length === 0) {
      getHomepageHeroCards().then((data) => {
        if (data && data.length > 0) {
          setCards(data);
        }
      });
    }
  }, [initialCards]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#101010] to-[#0A0A0A] border-b border-[#1A1A1A]">
      {/* Background Watermark & Atmosphere Light */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-heading text-[18vw] font-black tracking-[0.25em] text-white/[0.02] uppercase whitespace-nowrap">
          SOUTH AERO
        </span>
      </div>

      {/* Radial Red & White Studio Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(229,29,36,0.12)_0%,rgba(255,255,255,0.03)_50%,transparent_80%)] blur-3xl pointer-events-none" />

      <div className="container-main pt-10 pb-8 md:pt-16 md:pb-12 relative z-10">
        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto mb-6 md:mb-12 px-2">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded-full text-[0.6rem] sm:text-[0.65rem] font-heading font-bold tracking-widest text-[var(--text-secondary)] uppercase mb-3 sm:mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-ping" />
            RACE-INSPIRED AERODYNAMICS &bull; THAILAND
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight text-white leading-none">
            <span className="text-[var(--accent-red)] drop-shadow-[0_0_20px_rgba(229,29,36,0.4)]">
              NOT LOUD,
            </span>{" "}
            <span className="text-white">JUST DIFFERENT</span>
          </h1>

          <p className="font-heading text-[0.7rem] sm:text-xs md:text-sm tracking-[0.25em] sm:tracking-[0.3em] text-[var(--text-secondary)] mt-2.5 sm:mt-3.5 uppercase font-medium">
            SOUTH AERO PERFORMANCE
          </p>
        </div>

        {/* Hero Vehicle Showcase Lineup */}
        <div className="relative max-w-5xl mx-auto">
          {/* Main Hero Centerpiece: Interactive 3D Vehicle Showcase */}
          <CarModelViewer />

          {/* 3 Secondary Mini Showcase Cards below hero (Dynamic Cloudinary Assets from DB) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-2.5 sm:mt-3 md:mt-4">
            {cards.map((item) => (
              <Link
                key={item.id || item.title}
                href={item.href}
                className="group relative aspect-[16/10] sm:aspect-[16/9] rounded-sm overflow-hidden border border-[#202020] hover:border-[var(--accent-red)] transition-all bg-[#121212] block shadow-lg hover:shadow-red-950/20"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 33vw, 300px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2 pointer-events-none">
                  <p className="font-heading text-[0.58rem] sm:text-[0.65rem] md:text-xs font-bold text-white uppercase truncate group-hover:text-[var(--accent-red)] transition-colors drop-shadow-md">
                    {item.title}
                  </p>
                  <p className="text-[0.5rem] sm:text-[0.55rem] md:text-[0.65rem] text-[var(--text-muted)] font-heading uppercase truncate">
                    {item.tag}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
