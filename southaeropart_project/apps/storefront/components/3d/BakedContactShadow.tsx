"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A static depth capture with separable blur. Own its targets explicitly because
// the installed Drei ContactShadows does not release them on resolution changes.
export const BakedContactShadow = memo(function BakedContactShadow({
  resolution,
}: {
  resolution: number;
}) {
  const group = useRef<THREE.Group>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const resources = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(resolution, resolution);
    const scratch = new THREE.WebGLRenderTarget(resolution, resolution, {
      depthBuffer: false,
    });
    target.texture.generateMipmaps = scratch.texture.generateMipmaps = false;
    const geometry = new THREE.PlaneGeometry(7, 7).rotateX(Math.PI / 2);
    const depth = new THREE.MeshDepthMaterial({
      depthTest: false,
      depthWrite: false,
    });
    depth.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4( vec3( 1.0 - fragCoordZ ), opacity )",
        "vec4( vec3(0.04, 0.055, 0.07), 1.0 - fragCoordZ )",
      );
    };
    const blur = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        inputTexture: { value: target.texture },
        direction: { value: new THREE.Vector2() },
      },
      vertexShader:
        "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `
        uniform sampler2D inputTexture;
        uniform vec2 direction;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(inputTexture, vUv) * 0.227027;
          color += texture2D(inputTexture, vUv + direction * 1.384615) * 0.316216;
          color += texture2D(inputTexture, vUv - direction * 1.384615) * 0.316216;
          color += texture2D(inputTexture, vUv + direction * 3.230769) * 0.070270;
          color += texture2D(inputTexture, vUv - direction * 3.230769) * 0.070270;
          gl_FragColor = color;
        }`,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur);
    plane.frustumCulled = false;
    return { target, scratch, geometry, depth, blur, plane, baked: false };
  }, [resolution]);

  useEffect(() => {
    resources.baked = false;
    return () => {
      resources.target.dispose();
      resources.scratch.dispose();
      resources.geometry.dispose();
      resources.plane.geometry.dispose();
      resources.depth.dispose();
      resources.blur.dispose();
    };
  }, [resources]);

  useFrame(({ gl, scene }) => {
    if (resources.baked || !group.current || !camera.current) return;
    const originalTarget = gl.getRenderTarget();
    const originalClearColor = gl.getClearColor(new THREE.Color());
    const originalClearAlpha = gl.getClearAlpha();
    const originalBackground = scene.background;
    const originalOverride = scene.overrideMaterial;
    const originalAutoUpdate = gl.shadowMap.autoUpdate;
    const originalNeedsUpdate = gl.shadowMap.needsUpdate;
    try {
      group.current.visible = false;
      scene.background = null;
      scene.overrideMaterial = resources.depth;
      gl.shadowMap.autoUpdate = false;
      gl.shadowMap.needsUpdate = false;
      gl.setClearColor(0x000000, 0);
      gl.setRenderTarget(resources.target);
      gl.clear();
      gl.render(scene, camera.current);
      for (const amount of [2.5, 1]) {
        resources.blur.uniforms.inputTexture.value = resources.target.texture;
        resources.blur.uniforms.direction.value.set(amount / 256, 0);
        gl.setRenderTarget(resources.scratch);
        gl.render(resources.plane, camera.current);
        resources.blur.uniforms.inputTexture.value = resources.scratch.texture;
        resources.blur.uniforms.direction.value.set(0, amount / 256);
        gl.setRenderTarget(resources.target);
        gl.render(resources.plane, camera.current);
      }
      resources.baked = true;
    } finally {
      group.current.visible = true;
      scene.background = originalBackground;
      scene.overrideMaterial = originalOverride;
      gl.shadowMap.autoUpdate = originalAutoUpdate;
      gl.shadowMap.needsUpdate = originalNeedsUpdate;
      gl.setClearColor(originalClearColor, originalClearAlpha);
      gl.setRenderTarget(originalTarget);
    }
  });

  return (
    <group ref={group} rotation-x={Math.PI / 2} position={[0, 0.003, 0]}>
      <mesh
        geometry={resources.geometry}
        scale={[1, -1, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          transparent
          map={resources.target.texture}
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <orthographicCamera ref={camera} args={[-3.5, 3.5, 3.5, -3.5, 0, 1.8]} />
    </group>
  );
});
