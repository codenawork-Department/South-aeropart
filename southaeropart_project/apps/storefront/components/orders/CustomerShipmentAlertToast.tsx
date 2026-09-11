"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Truck, Package, X, ArrowRight, Copy, Check } from "lucide-react";
import { getLatestCustomerShipmentAlertAction } from "@/actions/checkout.actions";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getLocalizedOrderItemName } from "@/lib/i18n-helpers";

interface ShippedOrderAlert {
  id: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  updatedAt: Date | string;
  total: string;
  currency: string;
  productName: string;
  productNameEn?: string | null;
  imageUrl: string | null;
}

const DISMISSED_STORAGE_KEY = "sa_dismissed_shipped_orders";

function getDismissedOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDismissedOrderId(orderId: string) {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedOrderIds();
    if (!dismissed.includes(orderId)) {
      dismissed.push(orderId);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function playShipmentChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Gentle luxury notification chord (F5 -> A5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(698.46, now); // F5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.18); // A5

    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18); // C6

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // AudioContext blocked by browser autoplay policy until interaction
  }
}

export function CustomerShipmentAlertToast() {
  const { lang, t } = useLanguage();
  const [activeAlert, setActiveAlert] = useState<ShippedOrderAlert | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isCheckingRef = useRef(false);

  const checkForShipmentAlert = useCallback(async (forcedOrderId?: string) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const res = await getLatestCustomerShipmentAlertAction();
      if (res.success && res.data) {
        const order = res.data;
        const dismissed = getDismissedOrderIds();

        // If forced or not yet dismissed, display the alert
        if (forcedOrderId || !dismissed.includes(order.id)) {
          setActiveAlert(order);
          playShipmentChime();
        }
      }
    } catch {
      // Ignore background telemetry errors
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkForShipmentAlert();

    // Listen for custom shipment event dispatched by RealtimeLiveProvider SSE
    const handleShipmentNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const orderId = customEvent.detail?.payload?.orderId || customEvent.detail?.orderId;
      checkForShipmentAlert(orderId);
    };

    window.addEventListener("southaero:order_shipped", handleShipmentNotification);

    // Periodic check every 45s for background updates
    const interval = setInterval(() => {
      checkForShipmentAlert();
    }, 45000);

    return () => {
      window.removeEventListener("southaero:order_shipped", handleShipmentNotification);
      clearInterval(interval);
    };
  }, [checkForShipmentAlert]);

  const handleDismiss = () => {
    if (activeAlert) {
      addDismissedOrderId(activeAlert.id);
      setActiveAlert(null);
    }
  };

  const handleCopyTracking = (e: React.MouseEvent, tracking: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(tracking);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!activeAlert) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full bg-[#121212]/95 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(220,38,38,0.25)] animate-in slide-in-from-top-4 fade-in duration-300 transition-all"
    >
      {/* Top Ambient Glow */}
      <div className="absolute -top-6 right-1/4 w-48 h-20 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-950/80 border border-red-500/60 text-red-400">
            <Truck size={17} className="animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-xs font-black uppercase tracking-wider text-red-400">
                {t.toast.shippedTitle}
              </span>
              <span className="text-[0.65rem] font-mono font-semibold px-1.5 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-500/30">
                {t.toast.shippedBadge}
              </span>
            </div>
            <span className="text-[0.7rem] font-mono text-neutral-400">
              {t.toast.orderNumber}{activeAlert.orderNumber}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close notification"
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content Body */}
      <div className="relative z-10 mt-3.5 pt-3 border-t border-white/10 flex items-center gap-3">
        {activeAlert.imageUrl ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#1A1A1A] flex-shrink-0">
            <Image
              src={activeAlert.imageUrl}
              alt={activeAlert.productName}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 text-neutral-500">
            <Package size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">
            {getLocalizedOrderItemName(activeAlert.productName, activeAlert.productNameEn, lang)}
          </p>
          <p className="text-[0.7rem] text-neutral-400 mt-0.5">
            {t.toast.carrier}{" "}
            <span className="text-neutral-200 font-medium">
              {activeAlert.shippingCarrier || "South Aero Standard Logistics"}
            </span>
          </p>
        </div>
      </div>

      {/* Tracking Code snippet */}
      {activeAlert.trackingNumber && (
        <div className="relative z-10 mt-3 p-2 rounded-lg bg-[#0A0A0A] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[0.65rem] font-mono uppercase text-neutral-400">{t.toast.trackingCode}</span>
            <span className="font-mono text-xs font-bold text-white tracking-wider truncate select-all">
              {activeAlert.trackingNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => handleCopyTracking(e, activeAlert.trackingNumber!)}
            className="flex items-center gap-1 text-[0.65rem] font-mono text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 transition-colors flex-shrink-0"
          >
            {isCopied ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">{t.toast.copied}</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>{t.toast.copy}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="relative z-10 mt-3.5 flex items-center gap-2">
        <Link
          href={`/orders/${activeAlert.id}`}
          onClick={handleDismiss}
          className="flex-1 btn-primary py-2 px-3 text-xs font-heading font-bold uppercase tracking-wider justify-center gap-1.5"
        >
          <span>{t.toast.trackButton}</span>
          <ArrowRight size={13} />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-2 text-xs font-heading uppercase tracking-wider text-neutral-400 hover:text-white rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
        >
          {t.toast.dismissButton}
        </button>
      </div>
    </div>
  );
}
