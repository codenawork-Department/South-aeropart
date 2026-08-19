import { Award, Settings, Gauge, Headphones } from "lucide-react";

const FEATURES = [
  {
    icon: Award,
    title: "PREMIUM QUALITY",
    description: "High-grade materials built to last.",
  },
  {
    icon: Settings,
    title: "PRECISE FITMENT",
    description: "Precision-engineered for your vehicle.",
  },
  {
    icon: Gauge,
    title: "PERFORMANCE DRIVEN",
    description: "Tested for real-world aerodynamic gains.",
  },
  {
    icon: Headphones,
    title: "SUPPORT",
    description: "Dedicated support for every customer.",
  },
];

export function FeatureBadges() {
  return (
    <section className="py-12 md:py-16 border-y border-[var(--border-color)]">
      <div className="container-main">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border border-[var(--border-color)] mb-4">
                <Icon size={22} className="text-[var(--text-secondary)]" />
              </div>
              <h3 className="font-heading text-xs md:text-sm font-bold tracking-[0.1em] uppercase">
                {title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-[180px]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
