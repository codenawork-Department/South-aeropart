"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
  memo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useProgress,
  Environment,
  BakeShadows,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  ChromaticAberration,
  N8AO,
} from "@react-three/postprocessing";
import {
  ToneMappingMode,
  type EffectComposer as Composer,
} from "postprocessing";
import * as THREE from "three";
import { MinimalistGarage } from "./MinimalistGarage";
import { prepareCarModel } from "./prepareCarModel";
import { AdaptiveQualityMonitor } from "./AdaptiveQualityMonitor";
import { BakedContactShadow } from "./BakedContactShadow";
import {
  INITIAL_QUALITY_LEVEL,
  QUALITY_PROFILES,
  type AdaptiveQualitySample,
} from "./adaptiveQuality";

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
  hero: DEFAULT_TARGET,
  front: [0, 0.55, 0],
  side: DEFAULT_TARGET,
  rear: DEFAULT_TARGET,
  top: [0, 0.45, 0],
};

const configureCarLoader: NonNullable<Parameters<typeof useGLTF>[3]> = (
  loader,
) => {
  loader.register((parser) => {
    // Embedded images become blob URLs. ImageBitmapLoader fetches those URLs
    // through connect-src, while this site's CSP allows them under img-src.
    // TextureLoader uses the allowed image path and retains GLTF UV/alpha setup.
    return {
      name: "SOUTH_AERO_EMBEDDED_IMAGES",
      beforeRoot: () => {
        parser.textureLoader = new THREE.TextureLoader(loader.manager);
        parser.textureLoader.setCrossOrigin(loader.crossOrigin);
        return null;
      },
    };
  });
};

function CarModel({
  onLoaded,
  transmission,
}: {
  onLoaded: () => void;
  transmission: boolean;
}) {
  const { scene, animations } = useGLTF(
    "/models/ferrari_296_speciale_a.glb",
    false,
    false,
    configureCarLoader,
  );
  const prepared = useMemo(
    () => prepareCarModel(scene, animations),
    [scene, animations],
  );
  useEffect(() => {
    prepared.setGlassTransmission(transmission);
  }, [prepared, transmission]);
  useEffect(() => {
    onLoaded();
    return () => prepared.dispose();
  }, [prepared, onLoaded]);
  return <primitive object={prepared.scene} dispose={null} />;
}

function CameraController({
  preset,
  autoRotate,
  isUserInteracting,
  controlsRef,
}: {
  preset: CameraPreset;
  autoRotate: boolean;
  isUserInteracting: boolean;
  controlsRef: React.RefObject<OrbitControlsElement>;
}) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Keep a minimum horizontal field of view on portrait/mobile canvases so
    // the side preset still includes both bumpers, without resetting orbit/zoom.
    const aspect = size.width / Math.max(1, size.height);
    const framing = Math.max(1, 1.65 / Math.max(0.5, aspect));
    camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * framing),
    );
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const targetPos = useMemo(
    () => new THREE.Vector3(...PRESET_POSITIONS[preset]),
    [preset],
  );
  const targetLook = useMemo(
    () => new THREE.Vector3(...PRESET_TARGETS[preset]),
    [preset],
  );
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
      const step = 1 - Math.exp(-delta * 4);
      camera.position.lerp(targetPos, step);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLook, step);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(targetPos) < 0.02)
        isTransitioningRef.current = false;
    }
    // Read the live transition ref each frame so auto spin resumes after a preset settles.
    if (controlsRef.current)
      controlsRef.current.autoRotate =
        autoRotate && !isUserInteracting && !isTransitioningRef.current;
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
      maxPolarAngle={Math.PI / 2.05}
      autoRotateSpeed={0.8}
      makeDefault
    />
  );
}

function ProgressWatcher({
  onProgress,
}: {
  onProgress?: (pct: number) => void;
}) {
  const progress = useProgress((state) => state.progress);
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);
  return null;
}

const FILTER_CONFIGS = {
  studio: { bloom: 0.12, threshold: 1.25, vignette: 0.16, aberration: 0 },
  cinematic: {
    bloom: 0.28,
    threshold: 1.15,
    vignette: 0.36,
    aberration: 0.0003,
  },
  midnight: { bloom: 0.45, threshold: 1.1, vignette: 0.45, aberration: 0.0005 },
};

const CarPostProcessing = memo(function CarPostProcessing({
  preset,
  level,
}: {
  preset: Exclude<PostFilterPreset, "off">;
  level: AdaptiveQualitySample["level"];
}) {
  const config = FILTER_CONFIGS[preset];
  const quality = QUALITY_PROFILES[level];
  const composerRef = useRef<Composer>(null);
  const lifecycle = useMemo(() => ({ generation: 0 }), []);
  const aberrationOffset = useMemo(
    () => new THREE.Vector2(config.aberration, config.aberration),
    [config.aberration],
  );
  useEffect(() => {
    const composer = composerRef.current;
    const passes = [...(composer?.passes ?? [])];
    const generation = ++lifecycle.generation;
    return () => {
      // Defer past Strict Mode's effect replay. The wrapper removes effect
      // passes during unmount, so retain their handles for explicit cleanup.
      queueMicrotask(() => {
        if (generation !== lifecycle.generation) return;
        passes
          .filter((pass) => !composer?.passes.includes(pass))
          .forEach((pass) => pass.dispose());
        composer?.dispose();
      });
    };
  }, [lifecycle]);
  // EffectComposer temporarily sets NoToneMapping and restores renderer ACES when disabled.
  // HDR is mapped exactly once; Studio avoids a camera-lens aberration effect entirely.
  return (
    <EffectComposer
      ref={composerRef}
      multisampling={quality.multisampling}
      enableNormalPass={false}
      frameBufferType={THREE.HalfFloatType}
    >
      {quality.ambientOcclusion ? (
        <N8AO
          aoRadius={0.18}
          intensity={1.1}
          distanceFalloff={1}
          quality="medium"
          halfRes
        />
      ) : (
        <></>
      )}
      <Bloom
        luminanceThreshold={config.threshold}
        luminanceSmoothing={0.12}
        intensity={config.bloom}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.35} darkness={config.vignette} eskil={false} />
      {config.aberration > 0 ? (
        <ChromaticAberration
          offset={aberrationOffset}
          radialModulation
          modulationOffset={0.5}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
});

export interface CarSceneProps {
  cameraPreset: CameraPreset;
  autoRotate: boolean;
  filterPreset?: PostFilterPreset;
  onProgress?: (pct: number) => void;
  onLoaded?: () => void;
  onQualityChange?: (sample: AdaptiveQualitySample) => void;
}

export const CarScene = memo(function CarScene({
  cameraPreset,
  autoRotate,
  filterPreset = "studio",
  onProgress,
  onLoaded,
  onQualityChange,
}: CarSceneProps) {
  const controlsRef = useRef<OrbitControlsElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [sample, setSample] = useState<AdaptiveQualitySample>({
    level: INITIAL_QUALITY_LEVEL,
    dpr: 1,
    fps: null,
    limited: false,
  });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quality = QUALITY_PROFILES[sample.level];
  const handleLoaded = useCallback(() => {
    setModelReady(true);
    onLoaded?.();
  }, [onLoaded]);
  const handleQuality = useCallback(
    (next: AdaptiveQualitySample) => {
      // FPS-only reports update the small DOM readout without rebuilding the 3D scene.
      setSample((previous) =>
        previous.level === next.level && previous.dpr === next.dpr
          ? previous
          : next,
      );
      onQualityChange?.(next);
    },
    [onQualityChange],
  );
  const handlePointerDown = () => {
    setIsUserInteracting(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };
  const handlePointerUp = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsUserInteracting(false), 3800);
  };
  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    let inViewport = true;
    const update = () =>
      setVisible(inViewport && document.visibilityState !== "hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        update();
      },
      { rootMargin: "100px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas
        camera={{
          position: PRESET_POSITIONS.hero,
          fov: 40,
          near: 0.1,
          far: 60,
        }}
        dpr={sample.dpr}
        frameloop={visible ? "always" : "never"}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        shadows="soft"
      >
        <color attach="background" args={["#edf1f5"]} />
        <ProgressWatcher onProgress={onProgress} />
        <AdaptiveQualityMonitor
          enabled={modelReady && visible}
          onQualityChange={handleQuality}
        />
        <Suspense fallback={null}>
          <MinimalistGarage quality={quality} />
          <Environment
            files="/environments/studio.hdr"
            environmentIntensity={0.5}
          />
          <ambientLight intensity={0.22} color="#ffffff" />
          <directionalLight
            key={quality.shadowMapSize}
            position={[5.5, 8.5, 3]}
            intensity={1.2}
            castShadow={quality.shadowMapSize > 0}
            shadow-mapSize-width={quality.shadowMapSize || 256}
            shadow-mapSize-height={quality.shadowMapSize || 256}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-camera-left={-3.5}
            shadow-camera-right={3.5}
            shadow-camera-top={3.5}
            shadow-camera-bottom={-3.5}
            shadow-bias={-0.0001}
            shadow-normalBias={0.012}
          />
          <directionalLight
            position={[-5, 6, -2]}
            intensity={0.65}
            color="#e5efff"
          />
          <directionalLight
            position={[0, 3.5, -6]}
            intensity={0.6}
            color="#fff5eb"
          />
          <CarModel onLoaded={handleLoaded} transmission={sample.level === 4} />
          {modelReady && (
            <>
              <BakedContactShadow
                key={quality.contactShadowResolution}
                resolution={quality.contactShadowResolution}
              />
              <BakeShadows key={quality.shadowMapSize} />
            </>
          )}
          <CameraController
            preset={cameraPreset}
            autoRotate={autoRotate}
            isUserInteracting={isUserInteracting}
            controlsRef={controlsRef}
          />
          {quality.postprocessing && filterPreset !== "off" && (
            <CarPostProcessing
              key={`${sample.level}-${filterPreset}`}
              preset={filterPreset}
              level={sample.level}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
});
