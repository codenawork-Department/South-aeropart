"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigation } from "./navigation-context";

export function TopProgressBar() {
  const { isNavigating } = useNavigation();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const isNavigatingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  }, []);

  const completeProgress = useCallback(() => {
    isNavigatingRef.current = false;
    clearAllTimers();
    setProgress(100);

    const fadeTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);

    activeTimersRef.current.push(fadeTimer);
  }, [clearAllTimers]);

  const startProgress = useCallback(() => {
    clearAllTimers();
    isNavigatingRef.current = true;
    setVisible(true);
    setProgress(25);

    // Staggered smooth increments while waiting for route transition
    const t1 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(50);
    }, 120);

    const t2 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(75);
    }, 300);

    const t3 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(88);
    }, 600);

    // Safety fallback: if navigation stalls or is cancelled, auto-finish
    const tSafety = setTimeout(() => {
      if (isNavigatingRef.current) {
        completeProgress();
      }
    }, 4000);

    activeTimersRef.current.push(t1, t2, t3, tSafety);
  }, [clearAllTimers, completeProgress]);

  // Sync with NavigationContext
  useEffect(() => {
    if (isNavigating) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [isNavigating, startProgress, completeProgress]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300"
      style={{
        opacity: progress === 100 ? 0 : 1,
      }}
    >
      {/* Top Bar Line */}
      <div
        className="h-[2.5px] top-loader-bar transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "350ms",
        }}
      />

      {/* Trailing Glow Particle at leading head */}
      <div
        className="absolute top-0 w-8 h-3 -mt-[0.5px] top-loader-glow bg-red-400 rounded-full blur-[3px] transition-all ease-out pointer-events-none"
        style={{
          left: `calc(${progress}% - 30px)`,
          opacity: progress > 0 && progress < 100 ? 1 : 0,
          transitionDuration: progress === 100 ? "200ms" : "350ms",
        }}
      />
    </div>
  );
}
