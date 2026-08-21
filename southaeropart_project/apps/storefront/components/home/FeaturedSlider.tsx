"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Gauge, Wind } from "lucide-react";
import { FEATURED_BODY_KIT } from "@/lib/mock-data";

export function FeaturedSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = FEATURED_BODY_KIT.slides;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const activeSlide = slides[currentSlide];

  return (
    <section className="bg-[#0F0F0F] border-y border-[#1E1E1E]">
      <div className="container-main py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text Info & Controls */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase mb-3">
              FLAGSHIP AERODYNAMIC BUILD
            </div>

            <h2 className="heading-lg text-white">
              {FEATURED_BODY_KIT.name}{" "}
              <span className="text-[var(--accent-red)]">{FEATURED_BODY_KIT.version}</span>
            </h2>

            <p className="font-heading text-xs uppercase tracking-widest text-[var(--text-secondary)] mt-1 font-semibold">
              {FEATURED_BODY_KIT.tagline}
            </p>

            <p className="body-md mt-4 max-w-lg text-[var(--text-secondary)]">
              {FEATURED_BODY_KIT.description}
            </p>

            {/* Aerodynamic Stats Badges */}
            <div className="flex items-center gap-3 mt-6">
              <div className="telemetry-pill bg-[#161616] border-[#2A2A2A]">
                <Wind size={15} className="text-[var(--success)]" />
                <span className="text-white font-bold">{FEATURED_BODY_KIT.downforceBadge}</span>
                <span className="text-[var(--text-muted)] text-[0.7rem]">DOWNFORCE</span>
              </div>
              <div className="telemetry-pill bg-[#161616] border-[#2A2A2A]">
                <Gauge size={15} className="text-[var(--accent-red)]" />
                <span className="text-white font-bold">{FEATURED_BODY_KIT.dragBadge}</span>
                <span className="text-[var(--text-muted)] text-[0.7rem]">DRAG COEFFICIENT</span>
              </div>
            </div>

            {/* Explore Button */}
            <div className="mt-8">
              <Link
                href="/products/accord-g9-complete-body-kit-02"
                className="btn-outline gap-2 px-6"
                id="explore-bodykit"
              >
                EXPLORE BUILD <ArrowRight size={16} />
              </Link>
            </div>

            {/* Slide Index Counter + Prev/Next Buttons */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[#1F1F1F]">
              <span className="font-heading text-2xl font-bold text-white tracking-wider">
                {String(currentSlide + 1).padStart(2, "0")}
                <span className="text-[var(--text-muted)] text-base font-normal">
                  {" "}/ {String(slides.length).padStart(2, "0")}
                </span>
              </span>

              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 flex items-center justify-center border border-[#2B2B2B] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] hover:bg-[#1A1A1A] transition-all rounded-sm"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 flex items-center justify-center border border-[#2B2B2B] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] hover:bg-[#1A1A1A] transition-all rounded-sm"
                  aria-label="Next slide"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <span className="text-xs text-[var(--text-muted)] font-heading uppercase tracking-widest ml-auto hidden sm:inline-block">
                {activeSlide.title}
              </span>
            </div>

            <p className="text-[0.65rem] text-[var(--text-muted)] tracking-widest uppercase mt-4 font-heading">
              Design by &bull; {FEATURED_BODY_KIT.designer}
            </p>
          </div>

          {/* Right Column: Image Slider with Real Photos */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-[#262626] bg-[#141414] shadow-2xl group">
              <Image
                src={activeSlide.image}
                alt={activeSlide.title}
                fill
                priority
                className="object-cover transition-all duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 600px"
              />

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Caption Tag */}
              <div className="absolute bottom-4 left-4 right-16">
                <p className="font-heading text-xs font-bold text-white uppercase tracking-wider">
                  {activeSlide.title}
                </p>
                <p className="text-[0.7rem] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                  {activeSlide.caption}
                </p>
              </div>

              {/* Overlay Nav Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/60 text-white hover:bg-[var(--accent-red)] transition-colors backdrop-blur-sm rounded-sm"
                aria-label="Previous image"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/60 text-white hover:bg-[var(--accent-red)] transition-colors backdrop-blur-sm rounded-sm"
                aria-label="Next image"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
