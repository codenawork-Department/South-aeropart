"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function RealtimeLiveProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const currentVersionRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const triggerLiveRefresh = (newVersion?: number) => {
      if (newVersion) {
        currentVersionRef.current = newVersion;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 50);
    };

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/realtime");

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") {
              currentVersionRef.current = data.version || Date.now();
            } else if (data.type === "refresh") {
              triggerLiveRefresh(data.version);
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with backoff
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        };
      } catch {
        // SSE not supported or network error
      }
    };

    connectSSE();

    // Check version on tab focus/visibility
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && currentVersionRef.current > 0) {
        try {
          const res = await fetch(`/api/realtime?check=1&v=${currentVersionRef.current}`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (data.hasUpdate) {
            triggerLiveRefresh(data.version);
          }
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [router]);

  return <>{children}</>;
}
