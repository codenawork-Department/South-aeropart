import { ArrowRight } from "lucide-react";

export function InfoSections() {
  return (
    <section className="py-12 md:py-16">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Aerodynamic Card */}
          <div className="card p-6 md:p-8 flex flex-col">
            <div className="flex-1">
              <h2 className="heading-md">
                WHAT IS{" "}
                <span className="text-[var(--accent-red)]">AERODYNAMIC ?</span>
              </h2>
              <p className="body-md mt-4 max-w-md">
                Ever wonder how cars effortlessly slice through the air? It&apos;s the science of
                aerodynamics at work—minimizing drag and maximizing performance. Discover
                the science behind the speed.
              </p>
            </div>

            {/* Image Placeholder */}
            <div className="mt-6 aspect-[16/9] placeholder-image rounded-sm">
              <span>CFD Aerodynamics Analysis — Colorful Airflow Visualization</span>
            </div>

            <button className="btn-outline gap-2 mt-6 self-start" id="learn-aero">
              LEARN MORE <ArrowRight size={16} />
            </button>
          </div>

          {/* Philosophy Card */}
          <div className="card p-6 md:p-8 flex flex-col">
            <div className="flex-1">
              <h2 className="heading-md">
                OUR{" "}
                <span className="text-[var(--accent-red)]">PHILOSOPHY</span>
              </h2>
              <p className="font-heading text-sm tracking-wider text-[var(--text-secondary)] mt-1 uppercase">
                Not Loud, Just Different.
              </p>
              <p className="body-md mt-4 max-w-md">
                Born in function, built for the streets. We craft functional aero
                components that enhance performance, style, and driving
                experience.
              </p>
            </div>

            {/* Image Placeholder */}
            <div className="mt-6 aspect-[16/9] placeholder-image rounded-sm">
              <span>Honda Accord G9 — Rear 3/4 View with Body Kit</span>
            </div>

            <button className="btn-outline gap-2 mt-6 self-start" id="learn-philosophy">
              LEARN MORE <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
