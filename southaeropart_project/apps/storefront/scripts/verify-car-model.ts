import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { prepareCarModel } from "../components/3d/prepareCarModel";

async function verifyCarModel() {
  const path = fileURLToPath(
    new URL("../public/models/ferrari_296_speciale_a.glb", import.meta.url),
  );
  const file = readFileSync(path);
  const loader = new GLTFLoader();
  // Keep the real geometry, skeleton, animation and material metadata. Browser
  // PNG decoding is the only part replaced for this headless regression check.
  loader.register((parser) => ({
    name: "HEADLESS_TEXTURES",
    loadTexture: async (index: number) => {
      const texture = new THREE.Texture();
      texture.name =
        parser.json.images[parser.json.textures[index].source].name;
      return texture;
    },
  }));
  const gltf = await loader.parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    "",
  );
  const source = gltf.scene;
  const sourceDoor = source.getObjectByName("Animate_Door_FrontLeft")!;
  const initialDoor = sourceDoor.quaternion.clone();
  const sourceMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const sourceTextures = new Set<THREE.Texture>();
  const sourceGeometries = new Set<THREE.BufferGeometry>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    sourceGeometries.add(object.geometry);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      assert(material instanceof THREE.MeshStandardMaterial);
      sourceMaterials.set(material.name, material);
      if (material.map) sourceTextures.add(material.map);
    });
  });
  const originalPaint = sourceMaterials.get("Paint")!.color.clone();
  const prepared = prepareCarModel(source, gltf.animations);
  const preparedMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const preparedSkeletons = new Set<THREE.Skeleton>();
  let skinnedMeshes = 0;
  prepared.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      assert(material instanceof THREE.MeshStandardMaterial);
      preparedMaterials.set(material.name, material);
      const original = sourceMaterials.get(material.name)!;
      assert.notEqual(material, original, "Never mutate a cached material");
      assert.equal(
        material.map,
        original.map,
        "Retain authored albedo and alpha texture",
      );
      assert.equal(
        material.normalMap,
        original.normalMap,
        "Retain authored normal map",
      );
    });
    if (object instanceof THREE.SkinnedMesh) {
      skinnedMeshes++;
      preparedSkeletons.add(object.skeleton);
      const original = source.getObjectByName(object.name) as THREE.SkinnedMesh;
      assert.notEqual(object.skeleton, original.skeleton);
      object.skeleton.bones.forEach((bone, index) => {
        assert.notEqual(
          bone,
          original.skeleton.bones[index],
          "Bind to cloned bones",
        );
        assert.equal(bone, prepared.scene.getObjectByName(bone.name));
      });
    }
  });
  assert(skinnedMeshes > 0);
  assert.equal(
    preparedSkeletons.size,
    1,
    "Share this asset's cloned skin across its primitives",
  );
  assert(
    sourceDoor.quaternion.equals(initialDoor),
    "Source door remains unchanged",
  );
  const closedDoor = prepared.scene.getObjectByName("Animate_Door_FrontLeft")!;
  const clip = gltf.animations.find((animation) =>
    animation.name.includes("DoorFrontLeftClose"),
  )!;
  const doorTrack = clip.tracks.find(
    (track) => track.name === "Animate_Door_FrontLeft.quaternion",
  )!;
  const expectedDoor = new THREE.Quaternion().fromArray(
    doorTrack.createInterpolant().evaluate(clip.duration),
  );
  assert(
    closedDoor.quaternion.equals(expectedDoor),
    "Door uses the authored last frame",
  );
  assert(
    closedDoor.quaternion.angleTo(initialDoor) > 0.5,
    "Door actually changes from open to closed",
  );
  assert(sourceMaterials.get("Paint")!.color.equals(originalPaint));
  for (const name of ["Grille1A", "Grille2A", "Grille5A", "Grille6A"]) {
    const material = preparedMaterials.get(name)!;
    assert(material.alphaTest > 0);
    assert.equal(
      material.transparent,
      false,
      "Cutouts retain depth and stable sorting",
    );
    assert.equal(sourceMaterials.get(name)!.alphaTest, 0);
  }
  for (const name of [
    "InteriorA",
    "EngineA",
    "Wheel1A",
    "Grille7A",
    "Grille8A",
  ]) {
    assert.equal(
      preparedMaterials.get(name)!.alphaTest,
      0,
      "Packed shading alpha is not transparency",
    );
    if (!name.startsWith("Grille")) {
      assert(
        preparedMaterials
          .get(name)!
          .color.equals(sourceMaterials.get(name)!.color),
        "Preserve authored cabin, engine and wheel colors",
      );
    }
  }
  const paint = preparedMaterials.get("Paint") as THREE.MeshPhysicalMaterial;
  assert(paint instanceof THREE.MeshPhysicalMaterial && paint.clearcoat > 0);
  const glass = preparedMaterials.get("GlassMtl") as THREE.MeshPhysicalMaterial;
  assert(glass.transparent && glass.opacity < 0.3 && !glass.depthWrite);
  prepared.setGlassTransmission(true);
  assert(glass.transmission > 0.9 && glass.opacity === 1 && glass.depthWrite);
  prepared.setGlassTransmission(false);
  assert(glass.transmission === 0 && glass.transparent && glass.opacity < 0.3);
  const bounds = new THREE.Box3().setFromObject(prepared.scene);
  assert(
    Math.abs(bounds.min.y) < 1e-5,
    "Tires sit on the floor after closing the door",
  );
  assert(Math.abs(bounds.getCenter(new THREE.Vector3()).x) < 1e-5);

  let cachedResourceDisposals = 0;
  const recordDisposal = () => {
    cachedResourceDisposals++;
  };
  sourceMaterials.forEach((material) =>
    material.addEventListener("dispose", recordDisposal),
  );
  sourceTextures.forEach((texture) =>
    texture.addEventListener("dispose", recordDisposal),
  );
  sourceGeometries.forEach((geometry) =>
    geometry.addEventListener("dispose", recordDisposal),
  );
  prepared.dispose();
  assert.equal(
    cachedResourceDisposals,
    0,
    "Cleanup preserves useGLTF shared resources",
  );
  console.log(
    `Car model verified: ${skinnedMeshes} cloned skinned meshes, ${preparedMaterials.size} materials, authored closed door, grille cutouts, glass tiers and cache isolation.`,
  );
}

verifyCarModel().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
