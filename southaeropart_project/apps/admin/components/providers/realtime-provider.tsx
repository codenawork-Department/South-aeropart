"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { getAdminRealtimeHeartbeatAction } from "@/actions/realtime.actions";

export interface NewOrderAlert {
  id: string;
  orderNumber: string;
  total: string;
  createdAt: string;
  createdAtMs: number;
  formattedTime: string;
}

export interface NewQuoteAlert {
  id: string;
  recipientName: string;
  phone: string;
  subtotal: string;
  createdAt: string;
  createdAtMs: number;
  formattedTime: string;
}

interface RealtimeContextValue {
  syncInterval: number; // in milliseconds, 0 = paused
  setSyncInterval: (interval: number) => void;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  syncNow: () => Promise<void>;
  newOrderAlerts: NewOrderAlert[]; // Maximum 5 concurrent orders
  latestNewOrder: NewOrderAlert | null; // Compatibility with single-order listeners
  dismissAlert: (orderId?: string) => void;
  dismissAllAlerts: () => void;
  totalOrders: number;
  pendingQuotesCount: number;
  newQuoteAlerts: NewQuoteAlert[];
  latestNewQuote: NewQuoteAlert | null;
  dismissQuoteAlert: (quoteId?: string) => void;
  dismissAllQuoteAlerts: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Synthesizes an elegant, high-end notification chime using Web Audio API.
 * Avoids any external mp3 downloads and ensures zero latency.
 */
function playLuxuryChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First note (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second note (A5 - 880 Hz) - Harmonic shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn("[RealtimeProvider] Web Audio not allowed yet:", e);
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Default: 10 seconds auto-refresh (10000ms)
  const [syncInterval, setSyncIntervalState] = useState<number>(10000);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSoundEnabled, setIsSoundEnabledState] = useState<boolean>(true);
  const [newOrderAlerts, setNewOrderAlerts] = useState<NewOrderAlert[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [pendingQuotesCount, setPendingQuotesCount] = useState<number>(0);
  const [newQuoteAlerts, setNewQuoteAlerts] = useState<NewQuoteAlert[]>([]);

  // Tracking state refs to detect deltas without component re-binding
  const previousOrdersRef = useRef<number | null>(null);
  const previousUpdatedRef = useRef<string | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  const previousQuotesRef = useRef<number | null>(null);
  const previousQuoteUpdatedRef = useRef<string | null>(null);
  const knownQuoteIdsRef = useRef<Set<string>>(new Set());

  const isSyncingRef = useRef<boolean>(false);

  // Load user preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedInterval = localStorage.getItem("sa_admin_sync_interval");
      if (savedInterval !== null) {
        setSyncIntervalState(parseInt(savedInterval, 10));
      }

      const savedSound = localStorage.getItem("sa_admin_sound_enabled");
      if (savedSound !== null) {
        setIsSoundEnabledState(savedSound === "true");
      }
    } catch {
      // Ignore localStorage errors in private browsing
    }
  }, []);

  const setSyncInterval = (val: number) => {
    setSyncIntervalState(val);
    try {
      localStorage.setItem("sa_admin_sync_interval", val.toString());
    } catch {}
  };

  const setIsSoundEnabled = (val: boolean) => {
    setIsSoundEnabledState(val);
    try {
      localStorage.setItem("sa_admin_sound_enabled", val ? "true" : "false");
    } catch {}
  };

  const dismissAlert = useCallback((orderId?: string) => {
    if (orderId) {
      setNewOrderAlerts((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setNewOrderAlerts([]);
    }
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setNewOrderAlerts([]);
  }, []);

  const dismissQuoteAlert = useCallback((quoteId?: string) => {
    if (quoteId) {
      setNewQuoteAlerts((prev) => prev.filter((q) => q.id !== quoteId));
    } else {
      setNewQuoteAlerts([]);
    }
  }, []);

  const dismissAllQuoteAlerts = useCallback(() => {
    setNewQuoteAlerts([]);
  }, []);

  // Main synchronization routine
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const res = await getAdminRealtimeHeartbeatAction();

      if (res.success && res.data) {
        const {
          totalOrders: currentOrders,
          latestOrderUpdated,
          recentOrders,
          pendingQuotesCount: currentPendingQuotes,
          latestQuoteUpdated,
          recentPendingQuotes,
        } = res.data;

        setTotalOrders(currentOrders);
        setPendingQuotesCount(currentPendingQuotes);

        let shouldPlayChime = false;
        let shouldRefresh = false;

        // 1. Check Orders
        if (previousOrdersRef.current === null) {
          previousOrdersRef.current = currentOrders;
          previousUpdatedRef.current = latestOrderUpdated;
          knownOrderIdsRef.current = new Set(recentOrders.map((o) => o.id));
        } else {
          const newArrivals = recentOrders.filter(
            (o) => !knownOrderIdsRef.current.has(o.id)
          );

          if (newArrivals.length > 0) {
            newArrivals.forEach((o) => knownOrderIdsRef.current.add(o.id));

            const formattedNewOrders: NewOrderAlert[] = newArrivals.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              total: o.total,
              createdAt: o.createdAt,
              createdAtMs: o.createdAtMs || Date.now(),
              formattedTime: new Date(o.createdAtMs || o.createdAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            }));

            setNewOrderAlerts((prev) => {
              const combined = [...formattedNewOrders, ...prev];
              const uniqueMap = new Map<string, NewOrderAlert>();
              combined.forEach((item) => {
                if (!uniqueMap.has(item.id)) {
                  uniqueMap.set(item.id, item);
                }
              });
              return Array.from(uniqueMap.values()).slice(0, 5);
            });

            shouldPlayChime = true;
            shouldRefresh = true;
          } else if (
            currentOrders !== previousOrdersRef.current ||
            latestOrderUpdated !== previousUpdatedRef.current
          ) {
            shouldRefresh = true;
          }

          previousOrdersRef.current = currentOrders;
          previousUpdatedRef.current = latestOrderUpdated;
        }

        // 2. Check Shipping Quotes
        if (previousQuotesRef.current === null) {
          previousQuotesRef.current = currentPendingQuotes;
          previousQuoteUpdatedRef.current = latestQuoteUpdated;
          knownQuoteIdsRef.current = new Set((recentPendingQuotes || []).map((q) => q.id));
        } else {
          const newQuoteArrivals = (recentPendingQuotes || []).filter(
            (q) => !knownQuoteIdsRef.current.has(q.id)
          );

          if (newQuoteArrivals.length > 0) {
            newQuoteArrivals.forEach((q) => knownQuoteIdsRef.current.add(q.id));

            const formattedNewQuotes: NewQuoteAlert[] = newQuoteArrivals.map((q) => ({
              id: q.id,
              recipientName: q.recipientName,
              phone: q.phone,
              subtotal: q.subtotal,
              createdAt: q.createdAt,
              createdAtMs: q.createdAtMs || Date.now(),
              formattedTime: new Date(q.createdAtMs || q.createdAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            }));

            setNewQuoteAlerts((prev) => {
              const combined = [...formattedNewQuotes, ...prev];
              const uniqueMap = new Map<string, NewQuoteAlert>();
              combined.forEach((item) => {
                if (!uniqueMap.has(item.id)) {
                  uniqueMap.set(item.id, item);
                }
              });
              return Array.from(uniqueMap.values()).slice(0, 5);
            });

            shouldPlayChime = true;
            shouldRefresh = true;
          } else if (
            currentPendingQuotes !== previousQuotesRef.current ||
            latestQuoteUpdated !== previousQuoteUpdatedRef.current
          ) {
            shouldRefresh = true;
          }

          previousQuotesRef.current = currentPendingQuotes;
          previousQuoteUpdatedRef.current = latestQuoteUpdated;
        }

        if (shouldPlayChime && isSoundEnabled) {
          playLuxuryChime();
        }

        if (shouldRefresh) {
          router.refresh();
        }
      } else {
        router.refresh();
      }
    } catch (err) {
      console.warn("[RealtimeProvider] Sync heartbeat warning:", err);
    } finally {
      setLastSyncedAt(new Date());
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [isSoundEnabled, router]);

  // Periodic heartbeat timer
  useEffect(() => {
    // Initial sync on mount
    syncNow();

    if (syncInterval <= 0) return;

    const timer = setInterval(() => {
      // Only sync if browser tab is visible
      if (document.visibilityState === "visible") {
        syncNow();
      }
    }, syncInterval);

    return () => clearInterval(timer);
  }, [syncInterval, syncNow]);

  // Tab visibility listener: instantly re-sync when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [syncNow]);

  return (
    <RealtimeContext.Provider
      value={{
        syncInterval,
        setSyncInterval,
        isSyncing,
        lastSyncedAt,
        isSoundEnabled,
        setIsSoundEnabled,
        syncNow,
        newOrderAlerts,
        latestNewOrder: newOrderAlerts[0] || null,
        dismissAlert,
        dismissAllAlerts,
        totalOrders,
        pendingQuotesCount,
        newQuoteAlerts,
        latestNewQuote: newQuoteAlerts[0] || null,
        dismissQuoteAlert,
        dismissAllQuoteAlerts,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeSync() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeSync must be used within a RealtimeProvider");
  }
  return context;
}
