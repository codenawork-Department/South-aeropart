"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { FEATURED_BODY_KIT } from "@/lib/mock-data";

const SLIDES = [
  { id: 1, placeholder: "Accord G9 Body Kit — Front 3/4 View" },
  { id: 2, placeholder: "Accord G9 Body Kit — Side Profile" },
  { id: 3, placeholder: "Accord G9 Body Kit — Rear 3/4 View" },
  { id: 4, placeholder: "Accord G9 Body Kit — Detail Shot" },
  { id: 5, placeholder: "Accord G9 Body Kit — Studio Shot" },
];

export function FeaturedSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

  return (
    <section className="bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
      <div className="container-main py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="heading-lg">
              ACCORD G9 BODY KIT{" "}
              <span className="text-[var(--accent-red)]">{FEATURED_BODY_KIT.version}</span>
            </h2>
            <p className="body-md mt-4 max-w-md">
              {FEATURED_BODY_KIT.description}
            </p>

            {/* Explore Button */}
            <button className="btn-outline gap-2 mt-6" id="explore-bodykit">
              EXPLORE <ArrowRight size={16} />
            </button>

            {/* Slide Counter + Navigation */}
            <div className="flex items-center gap-4 mt-8">
              <span className="font-heading text-2xl font-bold">
                {String(currentSlide + 1).padStart(2, "0")}
                <span className="text-[var(--text-muted)] text-lg"> / {String(SLIDES.length).padStart(2, "0")}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
                  aria-label="Next slide"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mt-6 font-heading">
              Design by : {FEATURED_BODY_KIT.designer}
            </p>
          </div>

          {/* Right: Image Slider */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm">
              <div className="placeholder-image w-full h-full" style={{ aspectRatio: '4/3' }}>
                <span>{SLIDES[currentSlide].placeholder}</span>
              </div>

              {/* Navigation Arrows on Image */}
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
