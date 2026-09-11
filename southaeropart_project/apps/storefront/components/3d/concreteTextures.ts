import * as THREE from "three";

// Small, seamless aggregate maps generated once; no downloads or per-frame noise.
export function createConcreteTextures() {
  const size = 256;
  const colorData = new Uint8Array(size * size * 4);
  const surfaceData = new Uint8Array(size * size * 4);
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + 19.3) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (u: number, v: number, cells: number) => {
    const x = u * cells,
      y = v * cells;
    const ix = Math.floor(x),
      iy = Math.floor(y);
    const tx = x - ix,
      ty = y - iy;
    const sx = tx * tx * (3 - 2 * tx),
      sy = ty * ty * (3 - 2 * ty);
    const a = hash(ix % cells, iy % cells),
      b = hash((ix + 1) % cells, iy % cells);
    const c = hash(ix % cells, (iy + 1) % cells),
      d = hash((ix + 1) % cells, (iy + 1) % cells);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(a, b, sx),
      THREE.MathUtils.lerp(c, d, sx),
      sy,
    );
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const coarse = noise(x / size, y / size, 8);
      const fine = noise(x / size, y / size, 64);
      const grain = hash(x, y);
      const tone = Math.round(
        226 + coarse * 12 + fine * 5 - (grain > 0.985 ? 15 : 0),
      );
      const index = (y * size + x) * 4;
      colorData.set([tone, tone, tone - 2, 255], index);
      surfaceData.set(
        [
          Math.round(110 + fine * 30 + grain * 12),
          Math.round(145 + coarse * 40 + fine * 15),
          0,
          255,
        ],
        index,
      );
    }
  }
  const color = new THREE.DataTexture(colorData, size, size);
  color.colorSpace = THREE.SRGBColorSpace;
  const surface = new THREE.DataTexture(surfaceData, size, size);
  for (const texture of [color, surface]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }
  const wallColor = color.clone();
  const wallSurface = surface.clone();
  wallColor.repeat.set(2, 2);
  wallSurface.repeat.set(2, 2);
  return { color, surface, wallColor, wallSurface };
}
