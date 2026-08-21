"use client";

import { useState } from "react";
import Link from "next/link";
import { Facebook, Instagram, Youtube, Music2, CheckCircle2, ShieldCheck } from "lucide-react";

const FOOTER_LINKS = {
  shop: {
    title: "SHOP",
    links: [
      { label: "Body Kits", href: "/products?category=body-kits" },
      { label: "Front Lips", href: "/products?category=front-lips" },
      { label: "Side Skirts", href: "/products?category=side-skirts" },
      { label: "Diffusers", href: "/products?category=diffusers" },
      { label: "Spoilers", href: "/products?category=spoilers" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Collection", href: "/collection" },
      { label: "Gallery", href: "/gallery" },
      { label: "Contact", href: "/about" },
    ],
  },
  support: {
    title: "SUPPORT",
    links: [
      { label: "Shipping & Delivery", href: "/about" },
      { label: "Returns & Warranty", href: "/about" },
      { label: "Fitment Guide", href: "/about" },
      { label: "Terms & Conditions", href: "/about" },
    ],
  },
};

const SOCIAL_LINKS = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: Music2, href: "https://tiktok.com", label: "TikTok" },
];

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="bg-[#080808] border-t border-[#1F1F1F]">
      {/* Main Footer Links */}
      <div className="container-main py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex flex-col group">
              <div className="flex items-center gap-1">
                <span className="font-heading text-2xl font-black tracking-[0.2em] text-white group-hover:text-[var(--accent-red)] transition-colors">
                  SOUTH
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />
              </div>
              <span className="text-[0.55rem] font-heading font-semibold tracking-[0.4em] text-[var(--text-secondary)] -mt-1 uppercase">
                A E R O
              </span>
            </Link>
            <p className="text-xs text-[var(--text-muted)] mt-3 font-heading uppercase tracking-wider">
              NOT LOUD, JUST DIFFERENT.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-5">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-[#262626] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-all"
                  aria-label={label}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav Links Columns */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title}>
              <h3 className="font-heading text-xs font-bold tracking-[0.15em] uppercase text-white mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors hover:translate-x-0.5 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Payment Methods Column */}
          <div>
            <h3 className="font-heading text-xs font-bold tracking-[0.15em] uppercase text-white mb-4">
              PAYMENT METHODS
            </h3>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Visa Badge */}
              <div className="h-7 px-2.5 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-[#1A1F71] font-black text-xs italic tracking-wider">VISA</span>
              </div>
              {/* Mastercard Badge */}
              <div className="h-7 px-2.5 bg-white rounded flex items-center justify-center gap-0.5 shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-1.5" />
              </div>
              {/* PayPal Badge */}
              <div className="h-7 px-2.5 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-[#003087] font-bold text-xs">Pay<span className="text-[#009CDE]">Pal</span></span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-4">
              <ShieldCheck size={16} className="text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.7rem] font-heading font-bold text-white uppercase tracking-wider">
                  SECURE PAYMENT
                </p>
                <p className="text-[0.65rem] text-[var(--text-muted)]">
                  Your payment is 100% encrypted &amp; secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Strip */}
      <div className="bg-[#111111] border-t border-[#1C1C1C]">
        <div className="container-main py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-bold tracking-wider uppercase text-white">
                JOIN THE MOVEMENT
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Subscribe to receive the latest updates, event releases, and exclusive aerodynamics releases.
              </p>
            </div>

            {subscribed ? (
              <div className="flex items-center gap-2 text-xs text-[var(--success)] font-heading font-semibold tracking-wider">
                <CheckCircle2 size={16} />
                THANK YOU FOR SUBSCRIBING!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-0">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email..."
                  className="input-dark flex-1 md:w-72 rounded-none text-xs"
                  id="footer-newsletter-email"
                />
                <button
                  type="submit"
                  className="btn-primary rounded-none whitespace-nowrap text-xs py-2 px-5"
                  id="footer-newsletter-subscribe"
                >
                  SUBSCRIBE
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Copyright Line */}
      <div className="border-t border-[#1A1A1A] bg-[#070707]">
        <div className="container-main py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[0.7rem] text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} South Aero Performance. All rights reserved.
          </p>
          <p className="text-[0.65rem] text-[var(--text-muted)] font-heading tracking-widest uppercase">
            DESIGNED &amp; ENGINEERED IN THAILAND
          </p>
        </div>
      </div>
    </footer>
  );
}
