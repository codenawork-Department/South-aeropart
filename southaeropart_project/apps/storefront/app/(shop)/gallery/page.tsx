"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import { GALLERY_ITEMS, GalleryItem } from "@/lib/mock-data";
import { FeatureBadges } from "@/components/home/FeatureBadges";

const CATEGORY_TABS = [
  { id: "all", label: "ALL BUILDS" },
  { id: "accord-g9", label: "ACCORD G9" },
  { id: "civic-fd", label: "CIVIC FD" },
  { id: "civic-fe", label: "CIVIC FE" },
  { id: "civic-fl5", label: "CIVIC FL5 TYPE R" },
  { id: "aero-cfd", label: "AERO CFD SIMULATION" },
  { id: "brand", label: "SOUTH AERO LAB" },
];

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  const filteredItems =
    selectedCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === selectedCategory);

  const activeItem =
    selectedImageIndex !== null ? filteredItems[selectedImageIndex] : null;

  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % filteredItems.length);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        (selectedImageIndex - 1 + filteredItems.length) % filteredItems.length
      );
    }
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Header & Filter Bar (Matching Bottom-Right Screen in Design) */}
      <section className="bg-[#111111] border-b border-[#222222]">
        <div className="container-main py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase">
                  MOTORSPORT ARCHIVE &bull; CUSTOMER BUILDS
                </span>
              </div>
              <h1 className="heading-lg text-white">
                SOUTH AERO <span className="text-[var(--accent-red)]">GALLERY</span>
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-lg">
                Explore our flagship project builds, track validations, wind-tunnel CFD simulations, and customer installations.
              </p>
            </div>

            {/* Quick Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setSelectedImageIndex(null);
                  }}
                  className={`px-3.5 py-2 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all ${
                    selectedCategory === tab.id
                      ? "bg-[var(--accent-red)] text-white shadow-md shadow-[var(--accent-red)]/30"
                      : "bg-[#161616] border border-[#2B2B2B] text-[var(--text-secondary)] hover:text-white hover:border-[#404040]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Masonry / Multi-Aspect Gallery Grid */}
      <section className="py-10 md:py-16">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredItems.map((item, index) => {
              const isLandscape = item.aspect === "landscape";
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`group relative overflow-hidden rounded-sm border border-[#222222] hover:border-[var(--accent-red)] bg-[#121212] cursor-pointer transition-all duration-300 ${
                    isLandscape ? "aspect-[16/10]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5" />

                  {/* Top Category Badge */}
                  <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="telemetry-pill text-[0.6rem] py-0.5 px-2 bg-black/80">
                      {item.categoryLabel}
                    </span>
                  </div>

                  {/* Expand Icon */}
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-7 h-7 rounded-sm bg-black/70 flex items-center justify-center text-white hover:bg-[var(--accent-red)] transition-colors">
                      <Maximize2 size={13} />
                    </div>
                  </div>

                  {/* Bottom Captions */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="font-heading text-xs font-bold text-white uppercase tracking-wider line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-[0.65rem] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                      {item.model}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-sm text-[var(--text-muted)] font-heading uppercase">
                No gallery builds found in this category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. Value Proposition Badges */}
      <FeatureBadges />

      {/* 4. High-Resolution Interactive Lightbox Modal */}
      {activeItem && selectedImageIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
          {/* Close button */}
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-5 right-5 p-2 text-white hover:text-[var(--accent-red)] transition-colors rounded hover:bg-white/10 z-20"
            aria-label="Close lightbox"
          >
            <X size={28} />
          </button>

          {/* Navigation Arrows */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-[var(--accent-red)] text-white rounded-full transition-colors z-20 backdrop-blur-sm"
            aria-label="Previous build photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-[var(--accent-red)] text-white rounded-full transition-colors z-20 backdrop-blur-sm"
            aria-label="Next build photo"
          >
            <ChevronRight size={24} />
          </button>

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl flex flex-col items-center">
            {/* Image Container */}
            <div className="relative w-full aspect-[16/10] max-h-[70vh] bg-[#101010] rounded-sm overflow-hidden border border-[#2B2B2B] shadow-2xl">
              <Image
                src={activeItem.image}
                alt={activeItem.title}
                fill
                priority
                className="object-contain"
                sizes="100vw"
              />
            </div>

            {/* Photo Metadata Footer */}
            <div className="w-full mt-4 p-4 bg-[#141414] border border-[#242424] rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-heading font-bold text-[var(--accent-red)] uppercase tracking-wider">
                    {activeItem.categoryLabel}
                  </span>
                  <span className="text-[var(--text-muted)]">&bull;</span>
                  <span className="text-xs text-[var(--text-muted)] font-heading">
                    {activeItem.model}
                  </span>
                </div>
                <h3 className="font-heading text-sm md:text-base font-bold text-white uppercase mt-0.5">
                  {activeItem.title}
                </h3>
                {activeItem.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {activeItem.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="telemetry-pill text-xs">
                  {selectedImageIndex + 1} / {filteredItems.length}
                </span>
                <Link
                  href="/products"
                  className="btn-primary py-2 px-4 text-xs gap-1.5 whitespace-nowrap"
                >
                  SHOP PARTS <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
