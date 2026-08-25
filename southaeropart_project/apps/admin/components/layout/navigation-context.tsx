"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationContextType {
  pendingPathname: string | null;
  isNavigating: boolean;
  startNavigating: (href: string) => void;
  completeNavigating: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  pendingPathname: null,
  isNavigating: false,
  startNavigating: () => {},
  completeNavigating: () => {},
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const currentPathRef = useRef(pathname);

  // Keep current path ref updated
  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  const clearPending = useCallback(() => {
    setPendingPathname(null);
    setIsNavigating(false);
  }, []);

  // When pathname changes, navigation is complete
  useEffect(() => {
    clearPending();
  }, [pathname, clearPending]);

  const startNavigating = useCallback((href: string) => {
    if (!href) return;
    try {
      const url = new URL(href, window.location.origin);
      const targetPath = url.pathname;

      // Only trigger if navigating to a different path
      if (targetPath !== window.location.pathname) {
        setPendingPathname(targetPath);
        setIsNavigating(true);
      }
    } catch {
      setPendingPathname(href);
      setIsNavigating(true);
    }
  }, []);

  const completeNavigating = useCallback(() => {
    clearPending();
  }, [clearPending]);

  // Global click interceptor for internal links
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      // Ignore right clicks or modified clicks (Ctrl, Cmd, Shift, Alt)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");
      const isDownload = target.hasAttribute("download");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        targetAttr === "_blank" ||
        isDownload
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.origin);
        if (targetUrl.origin === window.location.origin) {
          // If clicking exact current page, don't trigger
          if (targetUrl.pathname === window.location.pathname) {
            return;
          }

          startNavigating(targetUrl.pathname);
        }
      } catch {
        // ignore invalid urls
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [startNavigating]);

  return (
    <NavigationContext.Provider
      value={{
        pendingPathname,
        isNavigating,
        startNavigating,
        completeNavigating,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
