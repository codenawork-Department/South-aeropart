export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-heading text-[20vw] font-bold tracking-[0.2em] text-white/[0.02] uppercase whitespace-nowrap">
          SOUTH
        </span>
      </div>

      <div className="container-main py-10 md:py-16 lg:py-20 relative z-10">
        {/* Slogan */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="heading-xl">
            <span className="text-[var(--accent-red)]">NOT LOUD,</span>
            <br />
            <span className="text-[var(--text-primary)]">JUST DIFFERENT</span>
          </h1>
          <p className="font-heading text-xs md:text-sm tracking-[0.25em] text-[var(--text-secondary)] mt-3 uppercase">
            South Aero Performance
          </p>
        </div>

        {/* Car Lineup - 5 cars in a row */}
        <div className="flex items-end justify-center gap-2 md:gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`placeholder-image rounded-sm transition-all duration-300 ${
                i === 3
                  ? "w-32 h-24 md:w-52 md:h-40 lg:w-64 lg:h-48 scale-105"
                  : i === 2 || i === 4
                  ? "w-24 h-20 md:w-40 md:h-32 lg:w-48 lg:h-36"
                  : "w-20 h-16 md:w-32 md:h-24 lg:w-40 lg:h-28 opacity-70"
              }`}
            >
              <span className="text-[0.55rem] md:text-[0.65rem]">
                Car {i}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
    </section>
  );
}
