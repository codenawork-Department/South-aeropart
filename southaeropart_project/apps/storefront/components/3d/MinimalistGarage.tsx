"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ManagedFloorReflection } from "./ManagedFloorReflection";
import { createConcreteTextures } from "./concreteTextures";
import type { RenderingQuality } from "./renderingPreferences";

type Box = [number, number, number, number, number, number];

// Architectural repetitions share geometry, material and one draw call.
function BoxBatch({
  boxes,
  material,
}: {
  boxes: Box[];
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    boxes.forEach(([x, y, z, sx, sy, sz], index) => {
      transform.position.set(x, y, z);
      transform.scale.set(sx, sy, sz);
      transform.updateMatrix();
      ref.current!.setMatrixAt(index, transform.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [boxes]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, boxes.length]}
      material={material}
      receiveShadow
    >
      <boxGeometry />
    </instancedMesh>
  );
}

function GlassWall({
  width,
  bays,
  material,
}: {
  width: number;
  bays: number;
  material: THREE.Material;
}) {
  return (
    <group>
      {Array.from({ length: bays }, (_, i) => (
        <mesh
          key={i}
          position={[-width / 2 + ((i + 0.5) * width) / bays, 2.6, 0]}
          material={material}
        >
          <boxGeometry args={[width / bays - 0.065, 5.03, 0.018]} />
        </mesh>
      ))}
    </group>
  );
}

export const MinimalistGarage = memo(function MinimalistGarage({
  quality,
}: {
  quality: RenderingQuality;
}) {
  const textures = useMemo(createConcreteTextures, []);
  const signTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#30383d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#dce0df";
    context.font = "600 74px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SOUTH  AERO", 512, 84);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  const materials = useMemo(
    () => ({
      concrete: new THREE.MeshStandardMaterial({
        color: "#fafaf7",
        map: textures.wallColor,
        roughnessMap: textures.wallSurface,
        bumpMap: textures.wallSurface,
        bumpScale: 0.008,
        roughness: 0.72,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: "#424b50",
        metalness: 0.65,
        roughness: 0.32,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: "#9da5a7",
        metalness: 0.7,
        roughness: 0.3,
      }),
      joint: new THREE.MeshStandardMaterial({
        color: "#adb0ae",
        roughness: 0.9,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: "#e2e3df",
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
      led: new THREE.MeshBasicMaterial({ color: "#e9e6df", toneMapped: true }),
      red: new THREE.MeshStandardMaterial({
        color: "#b52024",
        roughness: 0.48,
      }),
      exterior: new THREE.MeshStandardMaterial({
        color: "#aebbb8",
        roughness: 0.85,
      }),
      foliage: new THREE.MeshStandardMaterial({
        color: "#52645a",
        roughness: 0.9,
      }),
      sign: new THREE.MeshBasicMaterial({ map: signTexture }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#edf5f2",
        roughness: 0.075,
        metalness: 0,
        ior: 1.45,
        thickness: 0.018,
        attenuationColor: new THREE.Color("#b6d2c6"),
        attenuationDistance: 3,
        envMapIntensity: 0.9,
        // Closed thin boxes already have an inward-facing surface. Culling the
        // opposite face avoids two full-screen glass passes on every window.
        side: THREE.FrontSide,
      }),
    }),
    [textures, signTexture],
  );

  useLayoutEffect(() => {
    const glass = materials.glass;
    glass.transmission = quality.glassRefraction ? 0.94 : 0;
    glass.transparent = !quality.glassRefraction;
    glass.opacity = quality.glassRefraction ? 1 : 0.16;
    glass.depthWrite = quality.glassRefraction;
    glass.needsUpdate = true;
  }, [materials, quality.glassRefraction]);
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      Object.values(textures).forEach((texture) => texture.dispose());
      signTexture.dispose();
    },
    [materials, textures, signTexture],
  );

  const architecture = useMemo(() => {
    const frames: Box[] = [],
      trim: Box[] = [],
      concrete: Box[] = [],
      joints: Box[] = [],
      lights: Box[] = [],
      exterior: Box[] = [];
    for (const y of [0.08, 4.1, 5.15]) {
      frames.push([0, y, -7, 18, 0.07, 0.1]);
      for (const x of [-9, 9]) frames.push([x, y, -1, 0.1, 0.07, 12]);
    }
    for (let x = -9; x <= 9; x += 3)
      frames.push([x, 2.6, -7, 0.065, 5.2, 0.13]);
    for (const x of [-9, 9])
      for (let z = -7; z <= 5; z += 3)
        frames.push([x, 2.6, z, 0.13, 5.2, 0.065]);
    // Concrete structural band, columns, recessed panel joints and plinth.
    concrete.push(
      [0, 5.45, -7, 18.4, 0.5, 0.5],
      [0, 0.12, -7, 18.4, 0.24, 0.45],
    );
    for (const x of [-9.15, 9.15]) {
      concrete.push(
        [x, 5.45, -1, 0.5, 0.5, 12.4],
        [x, 0.12, -1, 0.45, 0.24, 12.4],
      );
      for (const z of [-7, 5]) concrete.push([x, 2.7, z, 0.36, 5.4, 0.36]);
    }
    for (let x = -2; x <= 2; x += 2)
      concrete.push([x, 2.05, -6.7, 1.99, 3.6, 0.14]);
    joints.push(
      [0, 0.28, -6.59, 6, 0.025, 0.02],
      [0, 3.86, -6.59, 6, 0.025, 0.02],
    );
    // Flush floor control joints kept outside the central car bay.
    for (const x of [-9, -6, -3, 3, 6, 9])
      joints.push([x, 0.0005, -1, 0.008, 0.001, 18]);
    for (const z of [-7, -4, 4, 7])
      joints.push([0, 0.0005, z, 24, 0.001, 0.008]);
    // Service cabinet with worktop, drawer gaps and stainless handles.
    concrete.push(
      [-5.3, 0.48, -6.25, 2.8, 0.88, 0.75],
      [-5.3, 0.955, -6.25, 2.95, 0.055, 0.82],
    );
    for (const y of [0.28, 0.55, 0.82]) {
      joints.push([-5.3, y, -5.865, 2.65, 0.009, 0.006]);
      trim.push([-5.3, y + 0.065, -5.835, 0.6, 0.015, 0.035]);
    }
    trim.push(
      [8.92, 1.3, 2.05, 0.035, 0.55, 0.035],
      [8.96, 1.05, 2.05, 0.1, 0.025, 0.025],
      [8.96, 1.55, 2.05, 0.1, 0.025, 0.025],
    );
    // Ceiling coffers and slim recessed light channels.
    for (const x of [-6, -3, 0, 3, 6])
      concrete.push([x, 5.22, -1, 0.11, 0.16, 12]);
    for (const x of [-4.5, 4.5]) {
      frames.push([x, 5.14, -1, 0.13, 0.04, 10]);
      lights.push([x, 5.115, -1, 0.07, 0.008, 9.8]);
    }
    lights.push([0, 0.34, -6.59, 5.75, 0.018, 0.018]);
    // Courtyard depth is visible through the glass and in oblique reflections.
    exterior.push([0, 1.05, -11.2, 25, 2.1, 0.35]);
    for (const x of [-12.5, 12.5]) exterior.push([x, 0.7, -1, 0.3, 1.4, 22]);
    for (let x = -11; x <= 11; x += 0.6)
      exterior.push([x, 2.5, -11, 0.06, 2.9, 0.22]);
    for (const x of [-10.7, 10.7]) concrete.push([x, 0.3, -3, 1.05, 0.6, 4]);
    return { frames, trim, concrete, joints, lights, exterior };
  }, []);

  return (
    <group>
      {quality.reflections ? (
        <ManagedFloorReflection
          resolution={quality.reflectionResolution}
          colorMap={textures.color}
          surfaceMap={textures.surface}
        />
      ) : (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
          <planeGeometry args={[38, 38]} />
          <meshStandardMaterial
            color="#ffffff"
            map={textures.color}
            roughnessMap={textures.surface}
            bumpMap={textures.surface}
            bumpScale={0.006}
            roughness={0.48}
            metalness={0}
          />
        </mesh>
      )}
      <BoxBatch boxes={architecture.concrete} material={materials.concrete} />
      <BoxBatch boxes={architecture.frames} material={materials.frame} />
      <BoxBatch boxes={architecture.trim} material={materials.trim} />
      <BoxBatch boxes={architecture.joints} material={materials.joint} />
      <BoxBatch boxes={architecture.lights} material={materials.led} />
      <BoxBatch boxes={architecture.exterior} material={materials.exterior} />
      <group position={[0, 0, -7]}>
        <GlassWall width={18} bays={6} material={materials.glass} />
      </group>
      <group position={[-9, 0, -1]} rotation-y={Math.PI / 2}>
        <GlassWall width={12} bays={4} material={materials.glass} />
      </group>
      <group position={[9, 0, -1]} rotation-y={-Math.PI / 2}>
        <GlassWall width={12} bays={4} material={materials.glass} />
      </group>
      <mesh
        position={[0, 5.55, -1]}
        rotation-x={Math.PI / 2}
        material={materials.ceiling}
      >
        <planeGeometry args={[18, 12]} />
      </mesh>
      {[-10.7, 10.7].flatMap((x) =>
        [-4.2, -3, -1.8].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.84, z]}
            scale={[0.46, 0.46, 0.6]}
            material={materials.foliage}
          >
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 2.4, -6.59]} material={materials.sign}>
        <boxGeometry args={[1.9, 0.32, 0.035]} />
      </mesh>
      <mesh position={[0, 2.21, -6.56]} material={materials.red}>
        <boxGeometry args={[1.9, 0.012, 0.01]} />
      </mesh>
    </group>
  );
});
