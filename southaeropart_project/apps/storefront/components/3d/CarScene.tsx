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

const DEFAULT_TARGET: [number, number, number] = [0, 0.68, 0];

const PRESET_TARGETS: Record<CameraPreset, [number, number, number]> = {
  hero: [0, 0.68, 0],
  front: [0, 0.62, 0],
  side: [0, 0.68, 0],
  rear: [0, 0.68, 0],
  top: [0, 0.5, 0],
};

interface MustangModelProps {
  onLoaded?: () => void;
}

function MustangModel({ onLoaded }: MustangModelProps) {
  const { scene } = useGLTF("/models/ford_mustang_gt3.glb");
  const modelRef = useRef<THREE.Group>(null);

  // Compute exact bounding box and align wheels to sit precisely on floor y = 0
  // Crucially: DO NOT mutate or overwrite artist PBR materials (roughness, metalness, color)
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    // Shift model so bottom (tires) is exactly at y = 0, and X/Z are centered at 0
    clone.position.set(-center.x, -box.min.y, -center.z);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
              // Natural PBR environment reflection intensity
              mat.envMapIntensity = 0.9;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });

    return clone;
  }, [scene]);

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

useGLTF.preload("/models/ford_mustang_gt3.glb");

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
        {/* Sketchfab-Grade Studio Environment Lighting */}
        <Environment preset="studio" environmentIntensity={0.85} />

        {/* Soft Ambient Fill */}
        <ambientLight intensity={0.4} />

        {/* Balanced Key Sunlight for Natural Highlights & Shadows */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0001}
        />

        {/* Soft Cool Fill from Opposite Side */}
        <directionalLight position={[-5, 4, 3]} intensity={0.5} color="#e6f0ff" />

        {/* Realistic Ground Floor Contact Shadows Under Tires at y = 0 */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.85}
          scale={10.5}
          blur={1.4}
          far={3.0}
          resolution={1024}
          color="#000000"
        />

        <Suspense fallback={null}>
          {onProgress && <ProgressWatcher onProgress={onProgress} />}
          <MustangModel onLoaded={onLoaded} />
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
