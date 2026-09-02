"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Sparkles, Zap, Mail, ArrowRight } from "lucide-react";
import {
  subscribeNewsletterAction,
  getSubscriptionStatusAction,
  SubscriptionStatusResult,
} from "@/actions/newsletter.actions";

interface NewsletterSectionProps {
  initialStatus?: SubscriptionStatusResult;
}

export function NewsletterSection({ initialStatus }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscriptionStatusResult>(
    initialStatus || { isLoggedIn: false, isSubscribed: false, userEmail: null }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribedSuccess, setIsSubscribedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!initialStatus) {
      getSubscriptionStatusAction().then((res) => {
        setStatus(res);
      });
    }
  }, [initialStatus]);

  // If user is already logged in and subscribed, hide this section completely
  if (status.isSubscribed && !isSubscribedSuccess) {
    return null;
  }

  // Handle 1-Click Subscribe for Logged-In User
  const handleOneClickSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await subscribeNewsletterAction({
        source: "1click_banner",
      });
      if (res.success) {
        setIsSubscribedSuccess(true);
        setStatus((prev) => ({ ...prev, isSubscribed: true }));
      } else {
        setErrorMessage(res.error || "ไม่สามารถทำรายการได้ กรุณาลองใหม่");
      }
    } catch (err) {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Guest Subscribe Form
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await subscribeNewsletterAction({
        email: email.trim(),
        source: "homepage_banner",
      });
      if (res.success) {
        setIsSubscribedSuccess(true);
        setStatus((prev) => ({ ...prev, isSubscribed: true }));
      } else {
        setErrorMessage(res.error || "ไม่สามารถทำรายการได้ กรุณาลองใหม่");
      }
    } catch (err) {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-[#0A0A0A] border-t border-[#1C1C1C]">
      <div className="container-main">
        <div className="card p-6 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-gradient-to-r from-[#141414] via-[#161616] to-[#111111] border-[#242424] shadow-2xl relative overflow-hidden">
          {/* Subtle background red glow */}
          <div className="absolute top-0 right-1/4 w-72 h-32 bg-[var(--accent-red)]/5 blur-3xl pointer-events-none" />

          {/* Left: Heading & Value Proposition */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#202020] border border-[#2E2E2E] text-[0.68rem] text-[var(--text-secondary)] font-heading uppercase tracking-widest mb-3">
              <Sparkles size={13} className="text-[var(--accent-red)] animate-pulse" />
              <span>AERODYNAMICS & PRODUCT RELEASES</span>
            </div>
            <h2 className="heading-md text-white">
              STAY <span className="text-[var(--accent-red)]">UPDATED</span>
            </h2>
            <p className="body-sm mt-1.5 text-[var(--text-secondary)] leading-relaxed">
              รับรายงานผลทดสอบ CFD Aerodynamics และการแจ้งเตือนการเปิดตัวชุดแต่ง Part Drops รุ่นใหม่ก่อนใคร ส่งตรงถึงกล่องจดหมายของคุณ
            </p>
          </div>

          {/* Right: Interactive Subscribe Area */}
          <div className="w-full lg:w-auto relative z-10 flex flex-col items-start lg:items-end">
            {isSubscribedSuccess ? (
              <div className="flex items-center gap-2.5 p-4 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 font-heading font-bold text-xs tracking-wider animate-fade-in shadow-lg">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span>YOU ARE NOW SUBSCRIBED TO LATEST RELEASES!</span>
              </div>
            ) : status.isLoggedIn ? (
              /* State 2: Logged-in User (1-Click Subscribe) */
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                {status.userEmail && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-[#181818] border border-[#2B2B2B] text-xs text-[var(--text-secondary)]">
                    <Mail size={14} className="text-[var(--accent-red)]" />
                    <span className="font-mono text-white text-[0.75rem] truncate max-w-[200px]">
                      {status.userEmail}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleOneClickSubscribe}
                  disabled={isLoading}
                  className="btn-primary flex items-center justify-center gap-2 rounded whitespace-nowrap py-3 px-6 text-xs font-bold tracking-wider uppercase shadow-lg disabled:opacity-50"
                  id="btn-1click-subscribe"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>SUBSCRIBING...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} className="fill-current text-white" />
                      <span>SUBSCRIBE 1-CLICK</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* State 3: Guest Input Email */
              <form onSubmit={handleGuestSubmit} className="flex flex-col sm:flex-row w-full sm:w-auto gap-0 shadow-xl">
                <div className="relative flex-1 sm:w-80">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="input-dark w-full rounded-none sm:rounded-l bg-[#1A1A1A] border-[#303030] text-xs py-3 pl-3 pr-3 focus:border-[var(--accent-red)]"
                    id="newsletter-email-home"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary rounded-none sm:rounded-r whitespace-nowrap py-3 px-6 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
                  id="subscribe-home"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>SUBSCRIBE</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Error message */}
            {errorMessage && (
              <p className="text-xs text-red-400 mt-2 font-medium animate-fade-in">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
