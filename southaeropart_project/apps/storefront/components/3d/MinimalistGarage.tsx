"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ManagedFloorReflection } from "./ManagedFloorReflection";

interface MinimalistGarageProps {
  quality: { reflectionResolution: number; reflections: boolean };
}

export function MinimalistGarage({ quality }: MinimalistGarageProps) {
  const reflectionResolution = Math.max(
    128,
    Math.min(1024, quality.reflectionResolution),
  );
  // Memoize materials for pristine white showroom & glass pavilion
  const materials = useMemo(() => {
    return {
      // 1. Architectural White Structural Beams & Mullions
      whiteStructure: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f8fafc"),
        roughness: 0.35,
        metalness: 0.1,
      }),

      // 2. White Architectural Feature Panel (Back)
      whitePanel: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 0.45,
        metalness: 0.05,
      }),

      // 3. Double-Glazed Showroom Glass Walls
      showroomGlass: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#e2e8f0"),
        transparent: true,
        opacity: 0.14,
        roughness: 0.12,
        metalness: 0,
        envMapIntensity: 0.35,
        depthWrite: false,
      }),

      // 4. Slim Dark Titanium Window Frames / Mullions
      windowMullion: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2d333b"),
        roughness: 0.4,
        metalness: 0.7,
      }),

      // 5. Inset Floor Brushed Aluminum Track
      floorTrack: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#cbd5e1"),
        roughness: 0.3,
        metalness: 0.5,
      }),

      // 6. South Aero Red Corner Indicator
      accentRed: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#e51d24"),
      }),

      // 7. Pure White Ceiling Plane
      ceiling: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f8fafc"),
        roughness: 0.6,
        metalness: 0.02,
      }),

      // 8. Overhead Studio Softbox Light Emitters
      lightEmitter: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffffff"),
      }),

      // 9. Soft Ambient LED Accent Strips
      ledStrip: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffffff"),
      }),

      // 10. Outside Horizon Atmosphere (visible through glass)
      outsideHorizon: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#edf2f7"),
      }),
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* 1. SATIN SHOWROOM FLOOR; skip the extra scene render on constrained devices. */}
      {quality.reflections ? (
        <ManagedFloorReflection resolution={reflectionResolution} />
      ) : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.001, 0]}
          receiveShadow
        >
          <planeGeometry args={[38, 38]} />
          <meshStandardMaterial
            color="#e9e8e5"
            roughness={0.48}
            metalness={0.02}
            envMapIntensity={0.45}
          />
        </mesh>
      )}

      {/* 2. MINIMALIST INSET SHOWCASE BAY FLOOR FRAME */}
      {/* Front line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 2.8]}
        material={materials.floorTrack}
      >
        <planeGeometry args={[3.0, 0.02]} />
      </mesh>
      {/* Rear line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, -2.8]}
        material={materials.floorTrack}
      >
        <planeGeometry args={[3.0, 0.02]} />
      </mesh>
      {/* Left line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-1.5, 0.001, 0]}
        material={materials.floorTrack}
      >
        <planeGeometry args={[0.02, 5.6]} />
      </mesh>
      {/* Right line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[1.5, 0.001, 0]}
        material={materials.floorTrack}
      >
        <planeGeometry args={[0.02, 5.6]} />
      </mesh>

      {/* 4 Corner Performance Red Inset Markers */}
      {[
        [-1.5, 2.8],
        [1.5, 2.8],
        [-1.5, -2.8],
        [1.5, -2.8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.002, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.accentRed}>
            <planeGeometry args={[0.22, 0.022]} />
          </mesh>
        </group>
      ))}

      {/* 3. PANORAMIC GLASS WALLS SURROUNDING THE GARAGE */}
      {/* --- BACK GLASS WALL & WHITE ARCHITECTURAL FRAME --- */}
      <group position={[0, 2.9, -7.5]}>
        {/* Main Glass Curtain Wall */}
        <mesh material={materials.showroomGlass}>
          <planeGeometry args={[26, 5.8]} />
        </mesh>

        {/* Top & Bottom Structural White Headers */}
        <mesh position={[0, 2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[26, 0.2, 0.25]} />
        </mesh>
        <mesh position={[0, -2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[26, 0.2, 0.25]} />
        </mesh>

        {/* Vertical Architectural Mullions (Dividing glass into luxury showroom bays) */}
        {[-13, -8.66, -4.33, 0, 4.33, 8.66, 13].map((mx, idx) => (
          <mesh
            key={`bm-${idx}`}
            position={[mx, 0, 0]}
            material={materials.windowMullion}
          >
            <boxGeometry args={[0.06, 5.6, 0.12]} />
          </mesh>
        ))}

        {/* Floating Centerpiece White Feature Panel */}
        <group position={[0, 0.3, 0.12]}>
          <mesh material={materials.whitePanel} receiveShadow>
            <boxGeometry args={[6.8, 4.2, 0.08]} />
          </mesh>
          {/* Subtle Recessed LED Line in the Centerpiece */}
          <mesh position={[0, -1.8, 0.05]} material={materials.ledStrip}>
            <boxGeometry args={[6.0, 0.025, 0.02]} />
          </mesh>
          {/* South Aero Architectural Logo Plaque */}
          <group position={[0, 1.0, 0.05]}>
            <mesh material={materials.whiteStructure}>
              <boxGeometry args={[2.8, 0.65, 0.03]} />
            </mesh>
            <mesh position={[0, 0, 0.02]} material={materials.windowMullion}>
              <boxGeometry args={[2.7, 0.55, 0.01]} />
            </mesh>
            <mesh position={[0, -0.3, 0.025]} material={materials.accentRed}>
              <boxGeometry args={[2.7, 0.018, 0.01]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* --- LEFT GLASS WALL --- */}
      <group position={[-9.5, 2.9, -1.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={materials.showroomGlass}>
          <planeGeometry args={[12, 5.8]} />
        </mesh>
        {/* Top & Bottom Headers */}
        <mesh position={[0, 2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[12, 0.2, 0.25]} />
        </mesh>
        <mesh position={[0, -2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[12, 0.2, 0.25]} />
        </mesh>
        {/* Vertical Mullions */}
        {[-6, -3, 0, 3, 6].map((mx, idx) => (
          <mesh
            key={`lm-${idx}`}
            position={[mx, 0, 0]}
            material={materials.windowMullion}
          >
            <boxGeometry args={[0.06, 5.6, 0.12]} />
          </mesh>
        ))}
      </group>

      {/* --- RIGHT GLASS WALL --- */}
      <group position={[9.5, 2.9, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={materials.showroomGlass}>
          <planeGeometry args={[12, 5.8]} />
        </mesh>
        {/* Top & Bottom Headers */}
        <mesh position={[0, 2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[12, 0.2, 0.25]} />
        </mesh>
        <mesh position={[0, -2.85, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[12, 0.2, 0.25]} />
        </mesh>
        {/* Vertical Mullions */}
        {[-6, -3, 0, 3, 6].map((mx, idx) => (
          <mesh
            key={`rm-${idx}`}
            position={[mx, 0, 0]}
            material={materials.windowMullion}
          >
            <boxGeometry args={[0.06, 5.6, 0.12]} />
          </mesh>
        ))}
      </group>

      {/* --- OUTSIDE MINIMALIST DAYLIGHT HORIZON (Visible through glass) --- */}
      <mesh position={[0, 3.0, -11.0]} material={materials.outsideHorizon}>
        <planeGeometry args={[36, 12]} />
      </mesh>
      <mesh
        position={[-13.0, 3.0, -1.5]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.outsideHorizon}
      >
        <planeGeometry args={[18, 12]} />
      </mesh>
      <mesh
        position={[13.0, 3.0, -1.5]}
        rotation={[0, -Math.PI / 2, 0]}
        material={materials.outsideHorizon}
      >
        <planeGeometry args={[18, 12]} />
      </mesh>

      {/* 4. WHITE MINIMALIST CEILING & FLOATING STUDIO LIGHT RIG */}
      {/* Clean White Ceiling Plane */}
      <mesh
        position={[0, 5.8, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.ceiling}
      >
        <planeGeometry args={[38, 38]} />
      </mesh>

      {/* Perimeter White Roof Beams */}
      <mesh position={[0, 5.7, -7.5]} material={materials.whiteStructure}>
        <boxGeometry args={[26, 0.2, 0.4]} />
      </mesh>
      <mesh position={[-9.5, 5.7, -1.5]} material={materials.whiteStructure}>
        <boxGeometry args={[0.4, 0.2, 12]} />
      </mesh>
      <mesh position={[9.5, 5.7, -1.5]} material={materials.whiteStructure}>
        <boxGeometry args={[0.4, 0.2, 12]} />
      </mesh>

      {/* Suspended White Supercar Studio Light Canopy (Floating at y = 4.1) */}
      <group position={[0, 4.1, 0]}>
        {/* Outer White Structural Box Frame */}
        <mesh position={[-1.8, 0, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[0.08, 0.06, 6.2]} />
        </mesh>
        <mesh position={[1.8, 0, 0]} material={materials.whiteStructure}>
          <boxGeometry args={[0.08, 0.06, 6.2]} />
        </mesh>
        <mesh position={[0, 0, -3.1]} material={materials.whiteStructure}>
          <boxGeometry args={[3.68, 0.06, 0.08]} />
        </mesh>
        <mesh position={[0, 0, 3.1]} material={materials.whiteStructure}>
          <boxGeometry args={[3.68, 0.06, 0.08]} />
        </mesh>

        {/* Diffused Frosted Linear LED Softbox Panels (Clean White Emission) */}
        <mesh position={[-1.8, -0.032, 0]} material={materials.lightEmitter}>
          <boxGeometry args={[0.06, 0.015, 6.0]} />
        </mesh>
        <mesh position={[1.8, -0.032, 0]} material={materials.lightEmitter}>
          <boxGeometry args={[0.06, 0.015, 6.0]} />
        </mesh>
        <mesh position={[0, -0.032, -3.1]} material={materials.lightEmitter}>
          <boxGeometry args={[3.5, 0.015, 0.06]} />
        </mesh>
        <mesh position={[0, -0.032, 3.1]} material={materials.lightEmitter}>
          <boxGeometry args={[3.5, 0.015, 0.06]} />
        </mesh>

        {/* Central Dual Diffused Softboxes (Overhead High-End Studio Illumination) */}
        <mesh position={[-0.75, -0.025, 0]} material={materials.lightEmitter}>
          <boxGeometry args={[0.22, 0.015, 4.8]} />
        </mesh>
        <mesh position={[0.75, -0.025, 0]} material={materials.lightEmitter}>
          <boxGeometry args={[0.22, 0.015, 4.8]} />
        </mesh>

        {/* White Suspension Cables Up To Ceiling */}
        {[
          [-1.8, 3.1],
          [1.8, 3.1],
          [-1.8, -3.1],
          [1.8, -3.1],
        ].map(([cx, cz], i) => (
          <mesh
            key={i}
            position={[cx, 0.85, cz]}
            material={materials.whiteStructure}
          >
            <cylinderGeometry args={[0.004, 0.004, 1.7, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
