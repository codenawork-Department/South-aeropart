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
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { FeatureBadges } from "@/components/home/FeatureBadges";
import { useLanguage } from "@/components/providers/LanguageProvider";

function AboutPage() {
  const { lang, t } = useLanguage();
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    vehicle: "",
    message: "",
  });

  const processSteps = [
    {
      step: "01",
      icon: Cpu,
      title: t.about.step1Title,
      description: t.about.step1Desc,
    },
    {
      step: "02",
      icon: Gauge,
      title: t.about.step2Title,
      description: t.about.step2Desc,
    },
    {
      step: "03",
      icon: Layers,
      title: t.about.step3Title,
      description: t.about.step3Desc,
    },
    {
      step: "04",
      icon: Shield,
      title: t.about.step4Title,
      description: t.about.step4Desc,
    },
  ];

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
            {t.about.heroBadge}
          </div>

          <h1 className="heading-xl text-white">
            {t.about.heroTitle} <span className="text-[var(--accent-red)]">{t.about.heroHighlight}</span>
          </h1>

          <p className="font-heading text-sm md:text-base tracking-[0.25em] text-[var(--text-secondary)] mt-3 uppercase font-semibold">
            {t.about.heroTagline}
          </p>

          <p className="body-md text-[var(--text-secondary)] mt-4 leading-relaxed">
            {t.about.heroDesc}
          </p>
        </div>
      </section>

      {/* 2. Story & Showcase Dual Column */}
      <section className="py-12 md:py-20 border-b border-[#1C1C1C]">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-center">
            <div className="order-2 md:order-1 md:col-span-6 lg:col-span-6 space-y-4">
              <span className="text-xs font-heading font-bold text-[var(--accent-red)] tracking-widest uppercase">
                {t.about.storyBadge}
              </span>
              <h2 className="heading-lg text-white">
                {t.about.storyTitle}
              </h2>
              <p className="body-md text-[var(--text-secondary)]">
                {t.about.storyDesc1}
              </p>
              <p className="body-md text-[var(--text-secondary)]">
                {t.about.storyDesc2}
              </p>
            </div>

            <div className="order-1 md:order-2 md:col-span-6 lg:col-span-6">
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
              {t.about.processBadge}
            </span>
            <h2 className="heading-lg text-white mt-1">
              {t.about.processTitle}
            </h2>
            <p className="body-sm text-[var(--text-muted)] mt-2">
              {t.about.processSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map(({ step, icon: Icon, title, description }) => (
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12">
            {/* Contact Details */}
            <div className="md:col-span-5 lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-heading font-bold text-[var(--accent-red)] tracking-widest uppercase">
                  {t.about.contactBadge}
                </span>
                <h2 className="heading-md text-white mt-1">
                  {t.about.contactTitle}
                </h2>
                <p className="body-sm text-[var(--text-secondary)] mt-2">
                  {t.about.contactDesc}
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
            <div className="md:col-span-7 lg:col-span-7">
              <div className="card p-6 md:p-8 bg-[#121212] border-[#242424]">
                {formSent ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2
                      size={48}
                      className="text-[var(--success)] mx-auto"
                    />
                    <h3 className="font-heading text-lg font-bold text-white uppercase">
                      {t.about.messageReceived}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                      {t.about.messageReceivedDesc}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          {t.about.formName}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder={lang === "th" ? "เช่น คุณสมชาย" : "John Doe"}
                          className="input-dark w-full text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          {t.about.formEmail}
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
                        {t.about.formVehicle}
                      </label>
                      <input
                        type="text"
                        value={formData.vehicle}
                        onChange={(e) =>
                          setFormData({ ...formData, vehicle: e.target.value })
                        }
                        placeholder={lang === "th" ? "เช่น Honda Accord G9 2.4 (2015)" : "e.g. Honda Accord G9 2.4 (2015)"}
                        className="input-dark w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[0.65rem] font-heading font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        {t.about.formMessage}
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder={lang === "th" ? "บอกเล่าความต้องการ หรือสอบถามรายละเอียดเพิ่มเติม..." : "Tell us about your build requirements..."}
                        className="input-dark w-full text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full justify-center gap-2 py-3 text-xs"
                    >
                      {t.about.sendInquiry} <Send size={14} />
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
