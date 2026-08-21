"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  Gauge,
  Cpu,
  Layers,
  Send,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { FeatureBadges } from "@/components/home/FeatureBadges";

const PROCESS_STEPS = [
  {
    step: "01",
    icon: Cpu,
    title: "3D LASER SCANNING",
    description:
      "We scan OEM vehicle chassis using sub-millimeter 3D optical scanning to ensure our aerodynamic surfaces align with factory body gaps.",
  },
  {
    step: "02",
    icon: Gauge,
    title: "CFD SIMULATION",
    description:
      "Computational Fluid Dynamics software models high-velocity wind patterns, calculating boundary layer pressure and downforce-to-drag efficiency.",
  },
  {
    step: "03",
    icon: Layers,
    title: "AUTOCLAVE CARBON",
    description:
      "Our components are manufactured using pre-preg carbon fiber cured under high pressure and heat in autoclaves for maximum strength and minimal weight.",
  },
  {
    step: "04",
    icon: Shield,
    title: "TRACK VALIDATION",
    description:
      "Every prototype undergoes high-speed proving tests to guarantee structural integrity, zero vibration, and measurable aerodynamic gains.",
  },
];

function AboutPage() {
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    vehicle: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      setFormSent(true);
    }
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* 1. Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b border-[#1E1E1E]">
        <div className="container-main py-16 md:py-24 text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181818] border border-[#2B2B2B] rounded-full text-[0.65rem] font-heading font-bold tracking-widest text-[var(--accent-red)] uppercase mb-4">
            AERODYNAMIC MOTORSPORT ENGINEERING
          </div>

          <h1 className="heading-xl text-white">
            ABOUT <span className="text-[var(--accent-red)]">SOUTH AERO</span>
          </h1>

          <p className="font-heading text-sm md:text-base tracking-[0.25em] text-[var(--text-secondary)] mt-3 uppercase font-semibold">
            NOT LOUD, JUST DIFFERENT.
          </p>

          <p className="body-md text-[var(--text-secondary)] mt-4 leading-relaxed">
            Founded with a singular vision: to bring authentic motorsport aerodynamic engineering to street and track enthusiasts. We reject non-functional cosmetic kits in favor of scientifically validated, race-inspired performance.
          </p>
        </div>
      </section>

      {/* 2. Story & Showcase Dual Column */}
      <section className="py-12 md:py-20 border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-heading font-bold text-[var(--accent-red)] tracking-widest uppercase">
                OUR STORY &bull; BORN ON THE TRACK
              </span>
              <h2 className="heading-lg text-white">
                FUNCTION FIRST, SCULPTED FOR THE STREETS
              </h2>
              <p className="body-md text-[var(--text-secondary)]">
                South Aero Performance started in Thailand with a group of automotive engineers and time-attack racers who were dissatisfied with generic aftermarket body kits that caused excessive drag and poor fitment.
              </p>
              <p className="body-md text-[var(--text-secondary)]">
                By investing in high-precision 3D scanning, high-end CFD software, and autoclave carbon manufacturing, we engineer complete aerodynamic packages that transform the vehicle stance while pushing real downforce onto the pavement.
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative aspect-[16/10] rounded-sm overflow-hidden border border-[#242424] bg-[#121212] shadow-2xl">
                <Image
                  src="/images/SOUTH IG/Artboard 1.png"
                  alt="South Aero Performance Identity"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4-Stage Engineering Process */}
      <section className="py-12 md:py-20 bg-[#0E0E0E] border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-heading font-bold text-[var(--accent-red)] tracking-widest uppercase">
              PRECISION METHODOLOGY
            </span>
            <h2 className="heading-lg text-white mt-1">
              OUR ENGINEERING PROCESS
            </h2>
            <p className="body-sm text-[var(--text-muted)] mt-2">
              From raw vehicle scan to wind-tunnel calibrated track ready aero.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="card p-6 bg-[#131313] border-[#222222] hover:border-[var(--accent-red)] transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-heading text-2xl font-extrabold text-[var(--border-color)] group-hover:text-[var(--accent-red)] transition-colors">
                    {step}
                  </span>
                  <div className="w-10 h-10 rounded-sm bg-[#1A1A1A] flex items-center justify-center text-[var(--accent-red)]">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-white mb-2">
                  {title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Inquiry & Contact Section */}
      <section className="py-12 md:py-20">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Contact Details */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-heading font-bold text-[var(--accent-red)] tracking-widest uppercase">
                  GET IN TOUCH
                </span>
                <h2 className="heading-md text-white mt-1">
                  CUSTOM BUILDS &amp; WHOLESALE
                </h2>
                <p className="body-sm text-[var(--text-secondary)] mt-2">
                  Interested in custom aerodynamic fabrication, dealership inquiries, or finding a certified installer near you? Contact our engineering team directly.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <div className="w-8 h-8 rounded-sm bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[var(--accent-red)]">
                    <MapPin size={16} />
                  </div>
                  <span>Bangkok, Thailand &bull; South Aero Performance Lab</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <div className="w-8 h-8 rounded-sm bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[var(--accent-red)]">
                    <Mail size={16} />
                  </div>
                  <span>contact@southaero.com</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <div className="w-8 h-8 rounded-sm bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[var(--accent-red)]">
                    <Phone size={16} />
                  </div>
                  <span>+66 (0) 81-234-5678</span>
                </div>
              </div>
            </div>

            {/* Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="card p-6 md:p-8 bg-[#121212] border-[#242424]">
                {formSent ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2
                      size={48}
                      className="text-[var(--success)] mx-auto"
                    />
                    <h3 className="font-heading text-lg font-bold text-white uppercase">
                      MESSAGE RECEIVED
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                      Thank you for reaching out. Our aerodynamics team will get back to you within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          YOUR NAME
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="John Doe"
                          className="input-dark w-full text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          EMAIL ADDRESS
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="john@example.com"
                          className="input-dark w-full text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        VEHICLE MAKE &amp; MODEL (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        value={formData.vehicle}
                        onChange={(e) =>
                          setFormData({ ...formData, vehicle: e.target.value })
                        }
                        placeholder="e.g. Honda Accord G9 2.4 (2015)"
                        className="input-dark w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        MESSAGE / INQUIRY
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="Tell us about your build requirements..."
                        className="input-dark w-full text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full justify-center gap-2 py-3 text-xs"
                    >
                      SEND INQUIRY <Send size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureBadges />
    </div>
  );
}

export default function Page() {
  return <AboutPage />;
}
