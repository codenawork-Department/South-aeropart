"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function HeroSection() {
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
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded-full text-[0.65rem] font-heading font-bold tracking-widest text-[var(--text-secondary)] uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-ping" />
            RACE-INSPIRED AERODYNAMICS &bull; THAILAND
          </div>

          <h1 className="heading-xl tracking-tight text-white leading-none">
            <span className="text-[var(--accent-red)] drop-shadow-[0_0_20px_rgba(229,29,36,0.4)]">
              NOT LOUD,
            </span>{" "}
            <span className="text-white">JUST DIFFERENT</span>
          </h1>

          <p className="font-heading text-xs md:text-sm tracking-[0.3em] text-[var(--text-secondary)] mt-3.5 uppercase font-medium">
            SOUTH AERO PERFORMANCE
          </p>
        </div>

        {/* Hero Vehicle Showcase Lineup */}
        <div className="relative max-w-5xl mx-auto">
          {/* Main Hero Centerpiece Banner */}
          <div className="relative aspect-[21/9] sm:aspect-[2.2/1] w-full rounded-sm overflow-hidden border border-[#222222] bg-[#0E0E0E] shadow-2xl shadow-black/90 group">
            <Image
              src="/images/FRONT.png"
              alt="Honda Accord G9 Body Kit 02 by South Aero"
              fill
              priority
              className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />

            {/* Studio Floor Gradient & Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/30 pointer-events-none" />

            {/* Badge Overlay */}
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex flex-wrap items-center gap-2 md:gap-3">
              <div className="telemetry-pill">
                <span className="text-[var(--accent-red)] font-bold">AERO BUILD</span>
                <span className="text-white font-bold">ACCORD G9 KIT 02</span>
              </div>
              <div className="telemetry-pill hidden sm:inline-flex">
                <span className="text-[var(--success)] font-bold">+155 N</span>
                <span className="text-[var(--text-secondary)]">DOWNFORCE</span>
              </div>
            </div>

            {/* Explore Link */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
              <Link
                href="/products/accord-g9-complete-body-kit-02"
                className="btn-primary py-2 px-4 text-xs gap-2"
              >
                VIEW BUILD <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* 3 Secondary Mini Showcase Cards below hero */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
            {[
              {
                title: "ACCORD G9 REAR",
                tag: "DUCKTAIL & DIFFUSER",
                image: "/images/BACK.png",
                href: "/products/ducktail-spoiler-accord-g9",
              },
              {
                title: "CIVIC FD TRACK",
                tag: "AERO PACKAGE",
                image: "/images/fd.png",
                href: "/products/civic-fd-track-aero-package",
              },
              {
                title: "CIVIC FE STREET",
                tag: "MODERN STANCE",
                image: "/images/fe.png",
                href: "/products/civic-fe-street-performance-kit",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative aspect-[16/9] rounded-sm overflow-hidden border border-[#202020] hover:border-[var(--accent-red)] transition-all bg-[#121212]"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 33vw, 300px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="font-heading text-[0.65rem] md:text-xs font-bold text-white uppercase truncate group-hover:text-[var(--accent-red)] transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[0.55rem] md:text-[0.65rem] text-[var(--text-muted)] font-heading uppercase">
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
