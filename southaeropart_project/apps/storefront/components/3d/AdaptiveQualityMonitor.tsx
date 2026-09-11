"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdaptiveQualityController,
  type AdaptiveQualitySample,
} from "./adaptiveQuality";

interface AdaptiveQualityMonitorProps {
  enabled?: boolean;
  onQualityChange: (sample: AdaptiveQualitySample) => void;
}

/** Mount inside Canvas; enable after the model and environment have resolved. */
export function AdaptiveQualityMonitor({
  enabled = true,
  onQualityChange,
}: AdaptiveQualityMonitorProps) {
  const controller = useRef<AdaptiveQualityController | null>(null);
  if (controller.current === null)
    controller.current = new AdaptiveQualityController();
  const onSample = useRef(onQualityChange);
  onSample.current = onQualityChange;

  useEffect(() => {
    const policy = controller.current!;
    policy.pause();
    onSample.current(policy.getSample(window.devicePixelRatio));
    const pause = () => policy.pause();
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("resize", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("resize", pause);
    };
  }, [enabled]);

  useFrame((_, delta) => {
    const sample = controller.current!.addFrame(
      delta * 1000,
      enabled && document.visibilityState === "visible",
      window.devicePixelRatio,
    );
    if (sample) onSample.current(sample);
  });

  return null;
}
