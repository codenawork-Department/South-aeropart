import { Award, Settings, Gauge, Headphones } from "lucide-react";

const FEATURES = [
  {
    icon: Award,
    title: "PREMIUM QUALITY",
    description: "High-grade pre-preg carbon & durable ABS materials built to last.",
  },
  {
    icon: Settings,
    title: "PRECISE FITMENT",
    description: "3D CAD laser-scanned for OEM bumper alignment & zero gap issues.",
  },
  {
    icon: Gauge,
    title: "PERFORMANCE DRIVEN",
    description: "CFD tested for verified downforce gains & high-speed stability.",
  },
  {
    icon: Headphones,
    title: "DEDICATED SUPPORT",
    description: "Expert guidance on vehicle compatibility, fitment & installation.",
  },
];

export function FeatureBadges() {
  return (
    <section className="py-12 md:py-16 bg-[#080808] border-y border-[#1C1C1C]">
      <div className="container-main">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border border-[#262626] bg-[#121212] mb-4 group-hover:border-[var(--accent-red)] group-hover:bg-[var(--accent-red)]/10 transition-all duration-300">
                <Icon size={22} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-red)] transition-colors" />
              </div>
              <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.12em] uppercase text-white group-hover:text-[var(--accent-red)] transition-colors">
                {title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-[200px] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
