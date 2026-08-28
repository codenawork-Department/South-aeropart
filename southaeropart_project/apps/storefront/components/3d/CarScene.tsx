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
import * as THREE from "three";

type OrbitControlsElement = React.ElementRef<typeof OrbitControls>;

export type CameraPreset = "hero" | "front" | "side" | "rear" | "top";

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
              // 1. Windshield & Window Glass: Fix Blender opaque grey export to transparent tinted automotive glass
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
              // 2. Red Glass (Taillight covers)
              else if (matName.includes("glassred")) {
                mat.transparent = true;
                mat.opacity = 0.6;
                mat.color.set("#d90429");
                mat.roughness = 0.08;
                mat.metalness = 0.3;
                mat.depthWrite = false;
              }
              // 3. Headlights and Lens covers
              else if (matName.includes("light") || meshName.includes("light")) {
                mat.envMapIntensity = 0.95;
                mat.roughness = 0.12;
                mat.metalness = 0.1;
                if (mat.emissive && mat.emissive.getHex() > 0) {
                  mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 2.5);
                }
              }
              // 4. Carbon fiber aero parts (diffuser, splitters, side skirts)
              else if (matName.includes("carbon")) {
                mat.envMapIntensity = 0.8;
                mat.roughness = 0.32;
                mat.metalness = 0.15;
              }
              // 5. Rubber Tires & Matte Trim: Keep deep black, no plastic shine
              else if (
                matName.includes("plastic_black") ||
                matName.includes("mat_568") ||
                matName.includes("mat_571") ||
                matName.includes("tire") ||
                matName.includes("rubber") ||
                meshName.includes("tire") ||
                meshName.includes("wheel")
              ) {
                mat.envMapIntensity = 0.25;
                mat.roughness = 0.8;
                mat.metalness = 0.05;
              }
              // 6. Main Car Body Paint (Paint, Coloured, Base)
              else if (
                matName.includes("paint") ||
                matName.includes("coloured") ||
                matName.includes("base") ||
                matName.includes("body")
              ) {
                mat.envMapIntensity = 0.88;
                mat.roughness = 0.18;
                mat.metalness = 0.15;
              }
              // 7. Chrome / Badges / Calipers / Wheels
              else if (
                matName.includes("badge") ||
                matName.includes("caliper") ||
                matName.includes("mirror") ||
                matName.includes("plate")
              ) {
                mat.envMapIntensity = 0.95;
                mat.metalness = 0.9;
                mat.roughness = 0.15;
              }
              // 8. Cockpit Interior & Engine
              else if (matName.includes("interior") || matName.includes("engine")) {
                mat.envMapIntensity = 0.45;
                mat.roughness = 0.55;
              }
              // 9. General parts
              else {
                mat.envMapIntensity = 0.65;
                mat.roughness = 0.4;
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

export interface CarSceneProps {
  cameraPreset: CameraPreset;
  autoRotate: boolean;
  onProgress?: (pct: number) => void;
  onLoaded?: () => void;
}

export function CarScene({
  cameraPreset,
  autoRotate,
  onProgress,
  onLoaded,
}: CarSceneProps) {
  const controlsRef = useRef<OrbitControlsElement>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        shadows
      >
        {/* Sketchfab-Grade Balanced Studio Environment Lighting */}
        <Environment preset="studio" environmentIntensity={0.65} />

        {/* Subtle Ambient Fill for Natural Shadow Depth */}
        <ambientLight intensity={0.18} />

        {/* Balanced Key Sunlight for Natural Highlights & Sharp Shadows */}
        <directionalLight
          position={[5, 9, 5]}
          intensity={0.95}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
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
          resolution={1024}
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
      </Canvas>
    </div>
  );
}
