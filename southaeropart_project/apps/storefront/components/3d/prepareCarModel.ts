import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

// This export's grille PNGs contain real cutouts, but its glTF materials omit
// alphaMode. Other DiffuseAOSO atlases also have alpha (packed shading data), so
// enabling transparency for every RGBA texture would punch holes in the cabin.
const CUTOUT_MATERIALS = new Set([
  "Grille1A",
  "Grille2A",
  "Grille5A",
  "Grille6A",
]);
const GLASS_MATERIALS = new Set(["GlassMtl", "GlassRed"]);
const CARBON_MATERIALS = new Set(["Carbon1M", "Carbon2", "Carbon2M"]);

export interface PreparedCarModel {
  scene: THREE.Group;
  /** A transmission render pass is reserved for devices with measured headroom. */
  setGlassTransmission: (enabled: boolean) => void;
  /** Release only resources owned by this instance, never the useGLTF cache. */
  dispose: () => void;
}

function clonePhysicalMaterial(source: THREE.MeshStandardMaterial) {
  if (source instanceof THREE.MeshPhysicalMaterial) return source.clone();

  const material = new THREE.MeshPhysicalMaterial();
  // PhysicalMaterial.copy expects another physical material. Copy the complete
  // Standard base explicitly, retaining its maps, UV channels and alpha state.
  THREE.MeshStandardMaterial.prototype.copy.call(material, source);
  material.defines = { STANDARD: "", PHYSICAL: "" };
  return material;
}

function prepareMaterial(source: THREE.Material): THREE.Material {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source.clone();

  const material =
    source.name === "Paint" || GLASS_MATERIALS.has(source.name)
      ? clonePhysicalMaterial(source)
      : source.clone();

  if (CUTOUT_MATERIALS.has(source.name) && material.map) {
    material.alphaTest = 0.42;
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    material.color.set("#343a3d");
    material.metalness = 0.25;
    material.roughness = 0.48;
    // Keep map alpha for both the color pass and Three's shadow depth pass.
  } else if (source.name === "Paint") {
    const paint = material as THREE.MeshPhysicalMaterial;
    paint.metalness = 0.45;
    paint.roughness = 0.26;
    paint.clearcoat = 1;
    paint.clearcoatRoughness = 0.09;
    paint.envMapIntensity = 0.7;
  } else if (GLASS_MATERIALS.has(source.name)) {
    const glass = material as THREE.MeshPhysicalMaterial;
    glass.metalness = 0;
    glass.roughness = source.name === "GlassMtl" ? 0.055 : 0.12;
    glass.ior = 1.5;
    glass.thickness = 0.006;
    glass.attenuationDistance = 0.6;
    glass.attenuationColor.set("#a8bcb2");
    if (source.name === "GlassMtl") glass.color.set("#d2ded8");
    // Lens materials must not become emissive bulbs. Their authored red color
    // also survives on meshes containing both clear glass and taillight lenses.
  } else if (source.name === "Base" && !material.map) {
    // The source exports this untextured structural material as default white.
    material.color.set("#171b1d");
    material.metalness = 0;
    material.roughness = 0.68;
  } else if (source.name === "Grille3A" || source.name === "Grille4A") {
    // These two grilles have modeled geometry instead of an opacity texture.
    if (!material.map) material.color.set("#25292b");
    material.metalness = 0.25;
    material.roughness = 0.48;
  } else if (source.name === "Grille7A" || source.name === "Grille8A") {
    material.color.set("#343a3d");
    material.metalness = 0.2;
    material.roughness = 0.55;
  } else if (CARBON_MATERIALS.has(source.name)) {
    material.metalness = 0.12;
    material.roughness = 0.32;
  } else if (source.name === "Coloured") {
    material.roughness = 0.34;
  }

  // All remaining authored paint factors, albedo atlases, badges, tires, brake
  // calipers, normals and alpha metadata stay intact. Mesh names are not a
  // reliable material classifier (a wheel includes its tire AND metallic rim).
  return material;
}

function applyClosedDoorPose(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[],
) {
  const closeClip = animations.find((clip) =>
    clip.name.includes("DoorFrontLeftClose"),
  );
  if (!closeClip) return;

  // The supplied clip's final frame closes the door and raises its window. A
  // one-time sample also handles its root/hinge tracks without rounded constants
  // or a permanently running AnimationMixer for an otherwise stationary car.
  for (const track of closeClip.tracks) {
    const binding = new THREE.PropertyBinding(scene, track.name);
    binding.setValue(track.createInterpolant().evaluate(closeClip.duration), 0);
    binding.unbind();
  }
  scene.updateMatrixWorld(true);
}

export function prepareCarModel(
  source: THREE.Group,
  animations: THREE.AnimationClip[] = [],
): PreparedCarModel {
  // Object3D.clone leaves SkinnedMesh.skeleton pointing at the original bones.
  // This model is skinned, so its clone needs its own bone bindings as well.
  const model = cloneSkeleton(source);
  const scene = new THREE.Group();
  scene.name = "FerrariShowcase";
  scene.add(model);

  applyClosedDoorPose(model, animations);

  const materials = new Map<THREE.Material, THREE.Material>();
  const skeletons = new Set<THREE.Skeleton>();
  const sharedSkeletons = new Map<THREE.Matrix4[], THREE.Skeleton>();
  const glassMaterials: THREE.MeshPhysicalMaterial[] = [];

  const getMaterial = (sourceMaterial: THREE.Material) => {
    let material = materials.get(sourceMaterial);
    if (!material) {
      material = prepareMaterial(sourceMaterial);
      materials.set(sourceMaterial, material);
      if (
        material instanceof THREE.MeshPhysicalMaterial &&
        GLASS_MATERIALS.has(material.name)
      ) {
        glassMaterials.push(material);
      }
    }
    return material;
  };

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.material = Array.isArray(object.material)
      ? object.material.map(getMaterial)
      : getMaterial(object.material);
    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    object.castShadow = meshMaterials.some(
      (material) => !GLASS_MATERIALS.has(material.name),
    );
    object.receiveShadow = true;

    if (object instanceof THREE.SkinnedMesh) {
      // SkeletonUtils creates one Skeleton per primitive. Reuse an identical
      // cloned skin so this 109-primitive asset uploads its bone texture once.
      const skeleton = object.skeleton;
      const shared = sharedSkeletons.get(skeleton.boneInverses);
      if (
        shared &&
        shared.bones.length === skeleton.bones.length &&
        shared.bones.every((bone, index) => bone === skeleton.bones[index])
      ) {
        object.skeleton = shared;
      } else {
        sharedSkeletons.set(skeleton.boneInverses, skeleton);
      }
      // Any cached bounds describe the open bind pose, not the sampled pose.
      object.computeBoundingBox();
      object.computeBoundingSphere();
      skeletons.add(object.skeleton);
    }
  });

  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3());
    scene.position.set(-center.x, -bounds.min.y, -center.z);
  }
  scene.updateMatrixWorld(true);

  let transmissionEnabled: boolean | undefined;
  const setGlassTransmission = (enabled: boolean) => {
    if (enabled === transmissionEnabled) return;
    transmissionEnabled = enabled;
    for (const glass of glassMaterials) {
      const isClear = glass.name === "GlassMtl";
      glass.transmission = enabled ? (isClear ? 0.96 : 0.6) : 0;
      glass.transparent = !enabled;
      glass.opacity = enabled ? 1 : isClear ? 0.22 : 0.66;
      glass.depthWrite = enabled;
      glass.needsUpdate = true;
    }
  };
  setGlassTransmission(false);

  return {
    scene,
    setGlassTransmission,
    dispose: () => {
      materials.forEach((material) => material.dispose());
      skeletons.forEach((skeleton) => skeleton.dispose());
      // Geometry and textures are shared immutable assets owned by useGLTF.
    },
  };
}
