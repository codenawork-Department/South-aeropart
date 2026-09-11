"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei/materials/MeshReflectorMaterial";
import { BlurPass } from "@react-three/drei/materials/BlurPass";
import * as THREE from "three";

/** Own every reflection target so changing quality releases the previous GPU budget. */
export function ManagedFloorReflection({
  resolution,
  colorMap,
  surfaceMap,
}: {
  resolution: number;
  colorMap: THREE.Texture;
  surfaceMap: THREE.Texture;
}) {
  const floor = useRef<THREE.Mesh>(null);
  const gl = useThree((state) => state.gl);
  const resources = useMemo(() => {
    const textureMatrix = new THREE.Matrix4();
    const reflection = new THREE.WebGLRenderTarget(resolution, resolution, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const blurred = new THREE.WebGLRenderTarget(resolution, resolution, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const blur = new BlurPass({
      gl,
      resolution,
      // The blur footprint is in UV space; keep the satin finish consistent at each tier.
      width: 180,
      height: 100,
      depthScale: 0,
    });
    const material = new MeshReflectorMaterial();
    material.color.set("#ffffff");
    material.map = colorMap;
    material.roughnessMap = surfaceMap;
    material.bumpMap = surfaceMap;
    material.bumpScale = 0.006;
    material.roughness = 0.48;
    material.metalness = 0;
    material.envMapIntensity = 0.65;
    material.textureMatrix = textureMatrix;
    material.tDiffuse = reflection.texture;
    material.tDiffuseBlur = blurred.texture;
    material.hasBlur = true;
    material.defines = { ...material.defines, USE_BLUR: "" };
    material.mirror = 0.24;
    material.mixStrength = 0.55;
    material.mixBlur = 1.5;
    material.mixContrast = 0.9;

    return {
      reflection,
      blurred,
      blur,
      material,
      textureMatrix,
      camera: new THREE.PerspectiveCamera(),
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      floorPosition: new THREE.Vector3(),
      cameraPosition: new THREE.Vector3(),
      rotation: new THREE.Matrix4(),
      lookAt: new THREE.Vector3(),
      clipPlane: new THREE.Vector4(),
      view: new THREE.Vector3(),
      target: new THREE.Vector3(),
      q: new THREE.Vector4(),
    };
  }, [gl, resolution, colorMap, surfaceMap]);

  useEffect(
    () => () => {
      resources.reflection.dispose();
      resources.blurred.dispose();
      resources.blur.renderTargetA.dispose();
      resources.blur.renderTargetB.dispose();
      resources.blur.screen.geometry.dispose();
      resources.blur.convolutionMaterial.dispose();
      resources.material.dispose();
    },
    [resources],
  );

  useFrame(({ camera, scene }) => {
    const mesh = floor.current;
    if (!mesh) return;
    const r = resources;
    mesh.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    r.floorPosition.setFromMatrixPosition(mesh.matrixWorld);
    r.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    r.rotation.extractRotation(mesh.matrixWorld);
    r.normal.set(0, 0, 1).applyMatrix4(r.rotation);
    r.view.subVectors(r.floorPosition, r.cameraPosition);
    if (r.view.dot(r.normal) > 0) return;

    r.view.reflect(r.normal).negate().add(r.floorPosition);
    r.rotation.extractRotation(camera.matrixWorld);
    r.lookAt.set(0, 0, -1).applyMatrix4(r.rotation).add(r.cameraPosition);
    r.target
      .subVectors(r.floorPosition, r.lookAt)
      .reflect(r.normal)
      .negate()
      .add(r.floorPosition);
    r.camera.position.copy(r.view);
    r.camera.up.set(0, 1, 0).applyMatrix4(r.rotation).reflect(r.normal);
    r.camera.lookAt(r.target);
    r.camera.near = camera.near;
    r.camera.far = camera.far;
    r.camera.updateMatrixWorld();
    r.camera.projectionMatrix.copy(camera.projectionMatrix);
    r.textureMatrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(r.camera.projectionMatrix)
      .multiply(r.camera.matrixWorldInverse)
      .multiply(mesh.matrixWorld);

    // Oblique near-plane clipping, as used by Three.js Reflector and Drei.
    r.plane
      .setFromNormalAndCoplanarPoint(r.normal, r.floorPosition)
      .applyMatrix4(r.camera.matrixWorldInverse);
    r.clipPlane.set(
      r.plane.normal.x,
      r.plane.normal.y,
      r.plane.normal.z,
      r.plane.constant,
    );
    const projection = r.camera.projectionMatrix.elements;
    r.q.set(
      (Math.sign(r.clipPlane.x) + projection[8]) / projection[0],
      (Math.sign(r.clipPlane.y) + projection[9]) / projection[5],
      -1,
      (1 + projection[10]) / projection[14],
    );
    r.clipPlane.multiplyScalar(2 / r.clipPlane.dot(r.q));
    projection[2] = r.clipPlane.x;
    projection[6] = r.clipPlane.y;
    projection[10] = r.clipPlane.z + 1;
    projection[14] = r.clipPlane.w;
    r.camera.projectionMatrixInverse.copy(r.camera.projectionMatrix).invert();

    const renderTarget = gl.getRenderTarget();
    const cubeFace = gl.getActiveCubeFace();
    const mipLevel = gl.getActiveMipmapLevel();
    const xrEnabled = gl.xr.enabled;
    const shadowAutoUpdate = gl.shadowMap.autoUpdate;
    const wasVisible = mesh.visible;
    try {
      mesh.visible = false;
      gl.xr.enabled = false;
      gl.shadowMap.autoUpdate = false;
      gl.setRenderTarget(r.reflection);
      gl.state.buffers.depth.setMask(true);
      if (!gl.autoClear) gl.clear();
      gl.render(scene, r.camera);
      r.blur.render(gl, r.reflection, r.blurred);
    } finally {
      mesh.visible = wasVisible;
      gl.xr.enabled = xrEnabled;
      gl.shadowMap.autoUpdate = shadowAutoUpdate;
      gl.setRenderTarget(renderTarget, cubeFace, mipLevel);
    }
  });

  return (
    <mesh
      ref={floor}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.001, 0]}
      receiveShadow
    >
      <planeGeometry args={[38, 38]} />
      <primitive object={resources.material} attach="material" />
    </mesh>
  );
}
