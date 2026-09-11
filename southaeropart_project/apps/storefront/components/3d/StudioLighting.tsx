"use client";

import { memo } from "react";
import { Environment, Lightformer } from "@react-three/drei";

// Bake a bounded studio environment once. Unlike the photographic HDR, these
// diffusers have no tiny, extremely bright sources that blow out the windscreen.
export const StudioEnvironment = memo(function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={256} environmentIntensity={0.8}>
      <color attach="background" args={["#858c92"]} />
      <Lightformer
        position={[-5, 6, 1]}
        scale={[4, 7, 1]}
        intensity={2.2}
        color="#fffaf2"
      />
      <Lightformer
        position={[6, 3, -2]}
        scale={[3, 6, 1]}
        intensity={1.5}
        color="#e5efff"
      />
      <Lightformer position={[0, 7, -4]} scale={[5, 3, 1]} intensity={1.6} />
      <Lightformer position={[0, 2, 8]} scale={[7, 3, 1]} intensity={0.65} />
      <Lightformer position={[-1, 1, -8]} scale={[7, 2, 1]} intensity={0.8} />
    </Environment>
  );
});
