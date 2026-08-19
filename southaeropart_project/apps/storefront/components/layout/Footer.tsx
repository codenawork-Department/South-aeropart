import Link from "next/link";
import { Facebook, Instagram, Youtube, Music2 } from "lucide-react";

const FOOTER_LINKS = {
  shop: {
    title: "SHOP",
    links: [
      { label: "Body Kits", href: "/products?category=body-kits" },
      { label: "Spoilers", href: "/products?category=spoilers" },
      { label: "Diffusers", href: "/products?category=diffusers" },
      { label: "Accessories", href: "/products?category=accessories" },
      { label: "Aero Parts", href: "/products?category=aero-parts" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Gallery", href: "/gallery" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  support: {
    title: "SUPPORT",
    links: [
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "FAQ", href: "/faq" },
      { label: "Terms & Conditions", href: "/terms" },
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
  return (
    <footer className="bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
      {/* Main Footer */}
      <div className="container-main py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <Link href="/" className="inline-flex flex-col">
              <span className="font-heading text-2xl font-bold tracking-[0.15em]">SOUTH</span>
              <span className="text-[0.5rem] font-heading tracking-[0.3em] text-[var(--text-secondary)] -mt-0.5">
                A E R O
              </span>
            </Link>
            <p className="text-xs text-[var(--text-muted)] mt-3 tracking-wider font-heading uppercase">
              Not Loud, Just Different.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-5">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title}>
              <h3 className="font-heading text-sm font-bold tracking-[0.15em] uppercase mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Payment Methods */}
          <div>
            <h3 className="font-heading text-sm font-bold tracking-[0.15em] uppercase mb-4">
              PAYMENT METHODS
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Visa */}
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-[#1A1F71] font-bold text-sm italic">VISA</span>
              </div>
              {/* Mastercard */}
              <div className="h-8 px-2 bg-white rounded flex items-center justify-center gap-0.5">
                <div className="w-4 h-4 rounded-full bg-[#EB001B]" />
                <div className="w-4 h-4 rounded-full bg-[#F79E1B] -ml-2" />
              </div>
              {/* PayPal */}
              <div className="h-8 px-3 bg-white rounded flex items-center justify-center">
                <span className="text-[#003087] font-bold text-xs">Pay<span className="text-[#009CDE]">Pal</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider">Secure Payment</p>
                <p className="text-[0.65rem] text-[var(--text-muted)]">Your payment is 100% secure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-[var(--border-color)]">
        <div className="container-main py-4">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} South Aero. All rights reserved.
          </p>
        </div>
      </div>

      {/* Newsletter Bar */}
      <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <div className="container-main py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold tracking-wider uppercase">
                JOIN THE MOVEMENT
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Get the latest updates on new products, special deals, and exclusive content.
              </p>
            </div>
            <div className="flex w-full md:w-auto gap-0">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-dark flex-1 md:w-72 rounded-none"
                id="newsletter-email"
              />
              <button className="btn-primary rounded-none whitespace-nowrap" id="newsletter-subscribe">
                SUBSCRIBE
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
