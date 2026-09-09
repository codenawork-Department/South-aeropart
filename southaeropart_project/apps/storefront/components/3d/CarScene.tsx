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
  ToneMapping,
  ChromaticAberration,
  SMAA,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { MinimalistGarage } from "./MinimalistGarage";

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

    // 1. Force the driver's door and hinges into the exact mathematically closed pose
    clone.traverse((child) => {
      const name = child.name;
      if (name === "Animate_Door_FrontLeft") {
        child.quaternion.set(0.026201, 0.000823, 0.0314, 0.999163);
        child.position.set(0.900995, 0.444162, 0.661111);
        child.updateMatrix();
      } else if (name === "Animate_Door_FrontLeft_Hinge_1") {
        child.quaternion.set(0.020725, -0.169017, 0.003159, 0.98539);
        child.position.set(0.834848, 0.424862, 0.635625);
        child.updateMatrix();
      } else if (name === "Target_Door_FrontLeft_Hinge_1") {
        child.quaternion.set(-0.00697, -0.170418, -0.043005, 0.984408);
        child.position.set(-0.059551, -0.017073, -0.04625);
        child.updateMatrix();
      } else if (name === "Animate_DoorWindow_FrontLeft") {
        child.quaternion.set(-0.100472, 0.001375, 0.260027, 0.960359);
        child.position.set(-0.085385, 0.263413, -0.762663);
        child.updateMatrix();
      } else if (name === "Trigger_Door_FrontLeft") {
        child.quaternion.set(-0.026164, -0.000822, -0.0314, 0.999164);
        child.updateMatrix();
      }
    });

    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clone);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        action.play();
        mixer.setTime(clip.duration);
        mixer.update(0.01);
      });
    }
    clone.updateMatrixWorld(true);

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
              // 1. Windshield & Window Glass: Transparent tinted automotive glass (dielectric, non-glare)
              if (
                matName.includes("glassmtl") ||
                matName.includes("window") ||
                isWindowOrGlassMesh
              ) {
                mat.transparent = true;
                mat.opacity = 0.38;
                mat.color.set("#11171d"); // luxury subtle dark smoke tint
                mat.roughness = 0.22; // smooth laminated glass that softly diffuses reflections
                mat.metalness = 0.0; // PBR physical dielectric glass! Never metal
                mat.envMapIntensity = 0.22; // Controlled reflection, no glare hotspot
                mat.depthWrite = false;
              }
              // 2. Red Glass & Taillights (controlled specular glow for Bloom)
              else if (
                matName.includes("glassred") ||
                matName.includes("taillight") ||
                meshName.includes("taillight")
              ) {
                mat.transparent = true;
                mat.opacity = 0.85;
                mat.color.set("#ff1744");
                mat.roughness = 0.12;
                mat.metalness = 0.1;
                mat.emissive = new THREE.Color("#e51d24");
                mat.emissiveIntensity = 1.35;
                mat.depthWrite = false;
              }
              // 3. Headlights and Lens covers (crisp Xenon/LED glow)
              else if (
                matName.includes("light") ||
                meshName.includes("light") ||
                matName.includes("led")
              ) {
                mat.envMapIntensity = 0.6;
                mat.roughness = 0.15;
                mat.metalness = 0.1;
                if (
                  meshName.includes("front") ||
                  matName.includes("front") ||
                  matName.includes("head") ||
                  meshName.includes("drl")
                ) {
                  mat.emissive = new THREE.Color("#f0f7ff");
                  mat.emissiveIntensity = 1.4;
                } else if (mat.emissive && mat.emissive.getHex() > 0) {
                  mat.emissiveIntensity = Math.min(Math.max(mat.emissiveIntensity, 1.0), 1.5);
                }
              }
              // 4. Base Material: Chassis composite, inner hood & interior structural base
              else if (matName === "base" || matName.startsWith("base")) {
                mat.color.set("#181818"); // Dark charcoal composite, NOT white!
                mat.envMapIntensity = 0.35;
                mat.roughness = 0.65;
                mat.metalness = 0.1;
              }
              // 5. Carbon fiber aero parts (diffuser, splitters, side skirts, GT wing)
              // Hardened fallback color: never render white on low-power devices!
              else if (matName.includes("carbon")) {
                mat.color.set("#1a1a1a");
                mat.envMapIntensity = 0.75;
                mat.roughness = 0.28;
                mat.metalness = 0.2;
                if ("clearcoat" in mat) {
                  (mat as THREE.MeshPhysicalMaterial).clearcoat = 0.7;
                  (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.12;
                }
              }
              // 6. Rubber Tires & Wheels: Hardened fallback color to satin dark grey/black
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
              // 7. Grilles & Front Intakes: Deep black mesh
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
              // 8. Interior, Seats & Cockpit Engine: Charcoal interior
              else if (
                matName.includes("interior") ||
                matName.includes("engine") ||
                meshName.includes("seat")
              ) {
                mat.color.set("#202020");
                mat.envMapIntensity = 0.45;
                mat.roughness = 0.55;
              }
              // 9. Main Car Body Paint (Deep metallic finish with high-grade clearcoat sheen)
              else if (
                matName.includes("paint") ||
                matName.includes("coloured") ||
                matName.includes("body")
              ) {
                mat.envMapIntensity = 0.95;
                mat.roughness = 0.16;
                mat.metalness = 0.25;
                if ("clearcoat" in mat) {
                  (mat as THREE.MeshPhysicalMaterial).clearcoat = 0.9;
                  (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.08;
                }
              }
              // 10. Chrome / Badges / Calipers / Wheels / Rotors
              else if (
                matName.includes("badge") ||
                matName.includes("caliper") ||
                matName.includes("mirror") ||
                matName.includes("plate") ||
                matName.includes("rim")
              ) {
                mat.envMapIntensity = 1.0;
                mat.metalness = 0.92;
                mat.roughness = 0.15;
              }
              // 11. General parts: Neutral dark fallback
              else {
                mat.color.set("#222222");
                mat.envMapIntensity = 0.5;
                mat.roughness = 0.45;
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
  vignetteDarkness: number;
  vignetteOffset: number;
  chromaticAberrationOffset: [number, number];
}

const FILTER_CONFIGS: Record<Exclude<PostFilterPreset, "off">, FilterConfig> = {
  studio: {
    bloomThreshold: 1.18,
    bloomSmoothing: 0.08,
    bloomIntensity: 0.22,
    vignetteDarkness: 0.35,
    vignetteOffset: 0.38,
    chromaticAberrationOffset: [0.0003, 0.0003],
  },
  cinematic: {
    bloomThreshold: 1.15,
    bloomSmoothing: 0.08,
    bloomIntensity: 0.35,
    vignetteDarkness: 0.45,
    vignetteOffset: 0.30,
    chromaticAberrationOffset: [0.0004, 0.0004],
  },
  midnight: {
    bloomThreshold: 1.10,
    bloomSmoothing: 0.08,
    bloomIntensity: 0.50,
    vignetteDarkness: 0.55,
    vignetteOffset: 0.25,
    chromaticAberrationOffset: [0.0005, 0.0005],
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
      {/* 1. Bloom: captures real emissive light sources with no clipping */}
      <Bloom
        luminanceThreshold={config.bloomThreshold}
        luminanceSmoothing={config.bloomSmoothing}
        intensity={isMobile ? config.bloomIntensity * 0.75 : config.bloomIntensity}
        mipmapBlur
      />
      {/* 2. Filmic ACES Tone Mapping: smoothly maps HDR specular highlights without clipping/artifacts */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* 3. Subtle Vignette */}
      <Vignette
        offset={config.vignetteOffset}
        darkness={config.vignetteDarkness}
        eskil={false}
      />
      {/* 4. Subtle Chromatic Aberration */}
      <ChromaticAberration
        offset={aberrationOffset}
        radialModulation
        modulationOffset={0.5}
        opacity={isMobile ? 0 : 0.4}
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
          toneMappingExposure: 0.96,
        }}
        shadows
      >
        <color attach="background" args={["#f0f4f8"]} />

        {/* Minimalist Supercar Garage Showroom Architecture (White & Glass) */}
        <MinimalistGarage />

        {/* Universal Automotive Studio Environment Lighting (Balanced fill) */}
        <Environment files="/environments/studio.hdr" environmentIntensity={0.25} />

        {/* Soft daylight ambient fill */}
        <ambientLight intensity={0.45} color="#ffffff" />

        {/* Key Studio Light for Crisp Supercar Highlights & Soft Floor Shadows */}
        <directionalLight
          position={[5.5, 8.5, 3]}
          intensity={0.65}
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
        <directionalLight position={[-5, 6, -2]} intensity={0.3} color="#edf2f7" />

        {/* Rear Rim Light to Accentuate GT Aero Wing & Silhouette */}
        <directionalLight position={[0, 3.5, -6]} intensity={0.3} color="#ffffff" />

        {/* Realistic Ground Floor Contact Shadows Under Tires at y = 0 */}
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.55}
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

