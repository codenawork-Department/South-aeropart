"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-[#0A0A0A]">
      <div className="container-main">
        <div className="card p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-[#141414] via-[#161616] to-[#121212] border-[#242424]">
          <div>
            <h2 className="heading-md text-white">
              STAY <span className="text-[var(--accent-red)]">UPDATED</span>
            </h2>
            <p className="body-sm mt-1.5 max-w-md text-[var(--text-secondary)]">
              Subscribe to receive the latest release drops, CFD aero reports, and exclusive member discounts.
            </p>
          </div>

          {subscribed ? (
            <div className="flex items-center gap-2 text-sm text-[var(--success)] font-heading font-bold tracking-wider">
              <CheckCircle2 size={18} />
              YOU ARE ON THE VIP LIST!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full md:w-auto gap-0 shadow-lg">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="input-dark flex-1 md:w-80 rounded-none bg-[#1C1C1C] border-[#333333] text-xs py-3"
                id="newsletter-email-home"
              />
              <button
                type="submit"
                className="btn-primary rounded-none whitespace-nowrap py-3 px-6 text-xs"
                id="subscribe-home"
              >
                SUBSCRIBE
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
