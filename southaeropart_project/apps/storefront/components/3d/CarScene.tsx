"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useProgress,
  ContactShadows,
  Environment,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
  ChromaticAberration,
  SMAA,
} from "@react-three/postprocessing";
import * as THREE from "three";

type OrbitControlsElement = React.ElementRef<typeof OrbitControls>;

export type CameraPreset = "hero" | "front" | "side" | "rear" | "top";
export type PostFilterPreset = "studio" | "cinematic" | "midnight" | "off";

const PRESET_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  hero: [3.8, 1.4, 4.0],
  front: [0, 1.1, 4.5],
  side: [4.8, 1.2, 0],
  rear: [0, 1.4, -4.5],
  top: [0.05, 5.8, 0.05],
};

const DEFAULT_TARGET: [number, number, number] = [0, 0.59, 0];

const PRESET_TARGETS: Record<CameraPreset, [number, number, number]> = {
  hero: [0, 0.59, 0],
  front: [0, 0.55, 0],
  side: [0, 0.59, 0],
  rear: [0, 0.59, 0],
  top: [0, 0.45, 0],
};

interface MustangModelProps {
  onLoaded?: () => void;
}

function CarModel({ onLoaded }: MustangModelProps) {
  const { scene, animations } = useGLTF("/models/ferrari_296_speciale_a.glb");
  const modelRef = useRef<THREE.Group>(null);

  // Compute exact bounding box, align wheels to sit precisely on floor y = 0, and fix materials
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // 1. Ensure initial animation pose (e.g. door closed) is set cleanly
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clone);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        action.play();
        // Advance to final keyframe so doors and panels are in closed position
        mixer.setTime(clip.duration);
        mixer.update(0);
      });
    }

    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    // Shift model so bottom (tires) is exactly at y = 0, and X/Z are centered at 0
    clone.position.set(-center.x, -box.min.y, -center.z);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name.toLowerCase();

        // Detect glass / window meshes
        const isWindowOrGlassMesh =
          meshName.includes("window") ||
          meshName.includes("glass") ||
          meshName.includes("windshield");

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            const matName = (mat.name || "").toLowerCase();

            if (
              mat instanceof THREE.MeshStandardMaterial ||
              mat instanceof THREE.MeshPhysicalMaterial
            ) {
              // 1. Windshield & Window Glass: Transparent tinted automotive glass
              if (
                matName.includes("glassmtl") ||
                matName.includes("window") ||
                isWindowOrGlassMesh
              ) {
                mat.transparent = true;
                mat.opacity = 0.22;
                mat.color.set("#111827"); // luxury subtle dark tint
                mat.roughness = 0.05;
                mat.metalness = 0.9;
                mat.envMapIntensity = 1.2;
                mat.depthWrite = false;
              }
              // 2. Red Glass & Taillights (with specular emissive glow for Bloom)
              else if (
                matName.includes("glassred") ||
                matName.includes("taillight") ||
                meshName.includes("taillight")
              ) {
                mat.transparent = true;
                mat.opacity = 0.85;
                mat.color.set("#ff1744");
                mat.roughness = 0.08;
                mat.metalness = 0.2;
                mat.emissive = new THREE.Color("#ff002e");
                mat.emissiveIntensity = 2.4;
                mat.depthWrite = false;
              }
              // 3. Headlights and Lens covers (crisp Xenon/LED glow)
              else if (
                matName.includes("light") ||
                meshName.includes("light") ||
                matName.includes("led")
              ) {
                mat.envMapIntensity = 1.25;
                mat.roughness = 0.08;
                mat.metalness = 0.15;
                if (
                  meshName.includes("front") ||
                  matName.includes("front") ||
                  matName.includes("head") ||
                  meshName.includes("drl")
                ) {
                  mat.emissive = new THREE.Color("#f0f7ff");
                  mat.emissiveIntensity = 2.6;
                } else if (mat.emissive && mat.emissive.getHex() > 0) {
                  mat.emissiveIntensity = Math.min(Math.max(mat.emissiveIntensity, 1.8), 2.8);
                }
              }
              // 4. Carbon fiber aero parts (diffuser, splitters, side skirts, GT wing)
              // Hardened fallback color: never render white on low-power devices!
              else if (matName.includes("carbon")) {
                mat.color.set("#1a1a1a");
                mat.envMapIntensity = 0.95;
                mat.roughness = 0.26;
                mat.metalness = 0.2;
                if ("clearcoat" in mat) {
                  (mat as THREE.MeshPhysicalMaterial).clearcoat = 0.8;
                  (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.1;
                }
              }
              // 5. Rubber Tires & Wheels: Hardened fallback color to satin dark grey/black
              // Even if texture binding fails or is delayed on mobile/onboard GPU, tires are NEVER white!
              else if (
                matName.includes("plastic_black") ||
                matName.includes("mat_568") ||
                matName.includes("mat_571") ||
                matName.includes("tire") ||
                matName.includes("rubber") ||
                matName.includes("wheel1a") ||
                meshName.includes("tire") ||
                meshName.includes("wheel")
              ) {
                mat.color.set("#181818");
                mat.envMapIntensity = 0.25;
                mat.roughness = 0.82;
                mat.metalness = 0.08;
              }
              // 6. Grilles & Front Intakes: Deep black mesh
              else if (
                matName.includes("grille") ||
                meshName.includes("grille") ||
                meshName.includes("intake")
              ) {
                mat.color.set("#111111");
                mat.envMapIntensity = 0.35;
                mat.roughness = 0.6;
                mat.metalness = 0.15;
              }
              // 7. Interior, Seats & Cockpit Engine: Charcoal interior
              else if (
                matName.includes("interior") ||
                matName.includes("engine") ||
                meshName.includes("seat")
              ) {
                mat.color.set("#202020");
                mat.envMapIntensity = 0.45;
                mat.roughness = 0.55;
              }
              // 8. Main Car Body Paint (Rosso Corsa depth with high-grade clearcoat sheen)
              else if (
                matName.includes("paint") ||
                matName.includes("coloured") ||
                matName.includes("base") ||
                matName.includes("body")
              ) {
                mat.envMapIntensity = 1.15;
                mat.roughness = 0.14;
                mat.metalness = 0.24;
                if ("clearcoat" in mat) {
                  (mat as THREE.MeshPhysicalMaterial).clearcoat = 1.0;
                  (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.07;
                }
              }
              // 9. Chrome / Badges / Calipers / Wheels / Rotors
              else if (
                matName.includes("badge") ||
                matName.includes("caliper") ||
                matName.includes("mirror") ||
                matName.includes("plate") ||
                matName.includes("rim")
              ) {
                mat.envMapIntensity = 1.3;
                mat.metalness = 0.92;
                mat.roughness = 0.12;
              }
              // 10. General parts: Neutral dark fallback
              else {
                mat.color.set("#222222");
                mat.envMapIntensity = 0.7;
                mat.roughness = 0.38;
              }

              mat.needsUpdate = true;
            }
          });
        }

        // Do not cast solid shadow from transparent windows into interior cabin
        mesh.castShadow = !isWindowOrGlassMesh;
        mesh.receiveShadow = true;
      }
    });

    return clone;
  }, [scene, animations]);

  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
  }, [onLoaded]);

  return (
    <group ref={modelRef} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload("/models/ferrari_296_speciale_a.glb");

interface CameraControllerProps {
  preset: CameraPreset;
  autoRotate: boolean;
  isUserInteracting: boolean;
  controlsRef: React.RefObject<OrbitControlsElement>;
}

function CameraController({
  preset,
  autoRotate,
  isUserInteracting,
  controlsRef,
}: CameraControllerProps) {
  const { camera } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(...PRESET_POSITIONS[preset]), [preset]);
  const targetLook = useMemo(() => new THREE.Vector3(...PRESET_TARGETS[preset]), [preset]);
  const isTransitioningRef = useRef(false);
  const prevPresetRef = useRef(preset);

  useEffect(() => {
    if (prevPresetRef.current !== preset) {
      isTransitioningRef.current = true;
      prevPresetRef.current = preset;
    }
  }, [preset]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current && !isUserInteracting) {
      const step = Math.min(1, delta * 4.0);
      camera.position.lerp(targetPos, step);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLook, step);
        controlsRef.current.update();
      }

      if (camera.position.distanceTo(targetPos) < 0.05) {
        isTransitioningRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={DEFAULT_TARGET}
      enableDamping
      dampingFactor={0.06}
      minDistance={2.4}
      maxDistance={7.8}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.05} // Constrain camera so it never clips under the floor
      autoRotate={autoRotate && !isUserInteracting && !isTransitioningRef.current}
      autoRotateSpeed={0.8}
      makeDefault
    />
  );
}

// Progress listener inside Canvas Suspense
function ProgressWatcher({ onProgress }: { onProgress: (pct: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  return null;
}

interface FilterConfig {
  bloomThreshold: number;
  bloomSmoothing: number;
  bloomIntensity: number;
  contrast: number;
  brightness: number;
  saturation: number;
  hue: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  chromaticAberrationOffset: [number, number];
}

const FILTER_CONFIGS: Record<Exclude<PostFilterPreset, "off">, FilterConfig> = {
  studio: {
    bloomThreshold: 0.88,
    bloomSmoothing: 0.25,
    bloomIntensity: 0.65,
    contrast: 0.08,
    brightness: 0.02,
    saturation: 0.12,
    hue: 0,
    vignetteDarkness: 0.45,
    vignetteOffset: 0.35,
    chromaticAberrationOffset: [0.0004, 0.0004],
  },
  cinematic: {
    bloomThreshold: 0.82,
    bloomSmoothing: 0.3,
    bloomIntensity: 1.0,
    contrast: 0.16,
    brightness: 0.01,
    saturation: 0.22,
    hue: -0.015,
    vignetteDarkness: 0.65,
    vignetteOffset: 0.25,
    chromaticAberrationOffset: [0.0008, 0.0008],
  },
  midnight: {
    bloomThreshold: 0.76,
    bloomSmoothing: 0.25,
    bloomIntensity: 1.35,
    contrast: 0.22,
    brightness: -0.02,
    saturation: 0.28,
    hue: 0.035,
    vignetteDarkness: 0.75,
    vignetteOffset: 0.2,
    chromaticAberrationOffset: [0.0006, 0.0006],
  },
};

function CarPostProcessing({
  preset,
  isMobile,
  isLowTierGPU,
}: {
  preset: PostFilterPreset;
  isMobile: boolean;
  isLowTierGPU: boolean;
}) {
  const config = preset !== "off" ? FILTER_CONFIGS[preset] : null;

  const aberrationOffset = useMemo(() => {
    if (!config) return new THREE.Vector2(0, 0);
    return new THREE.Vector2(...config.chromaticAberrationOffset);
  }, [config]);

  if (preset === "off" || !config) {
    return null;
  }

  // Optimize multisampling: 0 on mobile/integrated GPUs to preserve high framerate & memory
  const multisampling = isMobile || isLowTierGPU ? 0 : 4;

  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={config.bloomThreshold}
        luminanceSmoothing={config.bloomSmoothing}
        intensity={isMobile ? config.bloomIntensity * 0.75 : config.bloomIntensity}
        mipmapBlur
      />
      <BrightnessContrast
        brightness={config.brightness}
        contrast={config.contrast}
      />
      <HueSaturation
        saturation={config.saturation}
        hue={config.hue}
      />
      <Vignette
        offset={config.vignetteOffset}
        darkness={config.vignetteDarkness}
        eskil={false}
      />
      <ChromaticAberration
        offset={aberrationOffset}
        radialModulation
        modulationOffset={0.5}
        opacity={isMobile ? 0 : 1}
      />
      <SMAA opacity={isMobile || isLowTierGPU ? 0 : 1} />
    </EffectComposer>
  );
}

// Adaptive device detection hook
function useDeviceTier() {
  const [tier, setTier] = useState<{
    isMobile: boolean;
    isLowTierGPU: boolean;
  }>({
    isMobile: false,
    isLowTierGPU: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent)); // iPads reporting as Mac

    let isLowTierGPU = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext)
            .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            .toLowerCase();
          if (
            renderer.includes("intel") ||
            renderer.includes("uhd") ||
            renderer.includes("iris") ||
            renderer.includes("swiftshader") ||
            renderer.includes("llvmpipe") ||
            renderer.includes("basic render") ||
            renderer.includes("mali") ||
            renderer.includes("adreno")
          ) {
            isLowTierGPU = true;
          }
        }
      }
    } catch {
      // Graceful fallback
    }

    setTier({ isMobile, isLowTierGPU });
  }, []);

  return tier;
}

export interface CarSceneProps {
  cameraPreset: CameraPreset;
  autoRotate: boolean;
  filterPreset?: PostFilterPreset;
  onProgress?: (pct: number) => void;
  onLoaded?: () => void;
}

export function CarScene({
  cameraPreset,
  autoRotate,
  filterPreset = "studio",
  onProgress,
  onLoaded,
}: CarSceneProps) {
  const controlsRef = useRef<OrbitControlsElement>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isMobile, isLowTierGPU } = useDeviceTier();

  const handlePointerDown = () => {
    setIsUserInteracting(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  const handlePointerUp = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 3800);
  };

  // Cleanup idle timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      <Canvas
        camera={{ position: PRESET_POSITIONS.hero, fov: 40 }}
        dpr={isMobile ? [1, 1.35] : isLowTierGPU ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        shadows
      >
        <color attach="background" args={["#0a0a0a"]} />

        {/* Universal Automotive Studio Environment Lighting (Self-contained, local HDR, 100% device compatible) */}
        <Environment files="/environments/studio.hdr" environmentIntensity={0.7} />

        {/* Subtle Ambient Fill for Natural Shadow Depth */}
        <ambientLight intensity={0.22} />

        {/* Balanced Key Sunlight for Natural Highlights & Sharp Shadows */}
        <directionalLight
          position={[5, 9, 5]}
          intensity={0.95}
          castShadow
          shadow-mapSize-width={isMobile ? 512 : 1024}
          shadow-mapSize-height={isMobile ? 512 : 1024}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.00005}
          shadow-normalBias={0.02}
        />

        {/* Soft Cool Fill from Opposite Side */}
        <directionalLight position={[-5, 4, 3]} intensity={0.3} color="#e8f0fe" />

        {/* Realistic Ground Floor Contact Shadows Under Tires at y = 0 */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.75}
          scale={10.5}
          blur={1.8}
          far={2.5}
          resolution={isMobile ? 512 : 1024}
          color="#000000"
        />

        <Suspense fallback={null}>
          {onProgress && <ProgressWatcher onProgress={onProgress} />}
          <CarModel onLoaded={onLoaded} />
        </Suspense>

        <CameraController
          preset={cameraPreset}
          autoRotate={autoRotate}
          isUserInteracting={isUserInteracting}
          controlsRef={controlsRef}
        />

        {/* Photorealistic Automotive Post-Processing Pipeline (Adaptive) */}
        <CarPostProcessing
          preset={filterPreset}
          isMobile={isMobile}
          isLowTierGPU={isLowTierGPU}
        />
      </Canvas>
    </div>
  );
}

