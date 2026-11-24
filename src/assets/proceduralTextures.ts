/**
 * Procedural Photorealistic PBR Texture Generator (BaseColor, Normal, Metallic/Roughness/AO)
 * Uses deterministic value noise and fBm to produce tactile asphalt, travertine, stucco,
 * beach sand, swamp mud, concrete, and wave normal maps without external URLs.
 */

import { DynamicTexture, Scene, Texture } from '@babylonjs/core';

export interface PBRTextureSet {
  albedo: DynamicTexture;
  normal: DynamicTexture;
  metallicRoughness: DynamicTexture;
}

function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy, seed);
  const b = hash2d(ix + 1, iy, seed);
  const c = hash2d(ix, iy + 1, seed);
  const d = hash2d(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 19);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

export class ProceduralTextureBank {
  private sets = new Map<string, PBRTextureSet>();
  private singles = new Map<string, DynamicTexture>();

  constructor(private readonly scene: Scene) {}

  buildNormalFromHeight(name: string, height: Float32Array, size: number, strength = 2.4): DynamicTexture {
    const tex = new DynamicTexture(name, { width: size, height: size }, this.scene, true);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let y = 0; y < size; y++) {
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xm = (x - 1 + size) % size;
        const xp = (x + 1) % size;
        const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
        const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
        const nz = 1.0;
        const inv = 1 / Math.hypot(dx, dy, nz);
        const idx = (y * size + x) * 4;
        data[idx] = Math.round(((-dx * inv) * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round(((-dy * inv) * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round(((nz * inv) * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.update(true);
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    tex.anisotropicFilteringLevel = 8;
    return tex;
  }

  createPBRSurface(
    key: string,
    size: number,
    seed: number,
    palette: { baseR: number; baseG: number; baseB: number; varR: number; varG: number; varB: number },
    roughnessRange: [number, number],
    metallic = 0,
    detailScale = 12,
    roadStripes = false
  ): PBRTextureSet {
    const existing = this.sets.get(key);
    if (existing) return existing;

    const albedo = new DynamicTexture(`${key}_albedo`, { width: size, height: size }, this.scene, true);
    const mr = new DynamicTexture(`${key}_mr`, { width: size, height: size }, this.scene, true);
    const actx = albedo.getContext() as unknown as CanvasRenderingContext2D;
    const mctx = mr.getContext() as unknown as CanvasRenderingContext2D;
    const aImg = actx.createImageData(size, size);
    const mImg = mctx.createImageData(size, size);
    const height = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const n = fbm(u * detailScale, v * detailScale, seed, 4);
        const micro = hash2d(x, y, seed + 5) * 0.12;
        const h = n * 0.85 + micro;
        height[y * size + x] = h;

        let r = palette.baseR + (h - 0.5) * palette.varR;
        let g = palette.baseG + (h - 0.5) * palette.varG;
        let b = palette.baseB + (h - 0.5) * palette.varB;

        if (roadStripes) {
          if (Math.abs(u - 0.5) < 0.016 && (Math.floor(v * 6) % 2 === 0)) {
            r = 228; g = 186; b = 64; // Yellow dashed center line
          } else if (u < 0.035 || u > 0.965) {
            r = 216; g = 218; b = 220; // White shoulder edge line
          }
        }

        const idx = (y * size + x) * 4;
        aImg.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        aImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        aImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        aImg.data[idx + 3] = 255;

        const rough = roughnessRange[0] + (1 - h) * (roughnessRange[1] - roughnessRange[0]);
        mImg.data[idx] = Math.round(h * 45 + 210); // AO in R (Babylon uses G=rough, B=metal, R=AO)
        mImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(rough * 255)));
        mImg.data[idx + 2] = Math.round(metallic * 255);
        mImg.data[idx + 3] = 255;
      }
    }

    actx.putImageData(aImg, 0, 0);
    mctx.putImageData(mImg, 0, 0);
    albedo.update(true);
    mr.update(true);
    albedo.wrapU = albedo.wrapV = Texture.WRAP_ADDRESSMODE;
    mr.wrapU = mr.wrapV = Texture.WRAP_ADDRESSMODE;
    albedo.anisotropicFilteringLevel = 8;

    const normal = this.buildNormalFromHeight(`${key}_normal`, height, size, roadStripes ? 1.8 : 2.6);
    const set: PBRTextureSet = { albedo, normal, metallicRoughness: mr };
    this.sets.set(key, set);
    return set;
  }

  createWaveNormalMap(key = 'ocean_normal', size = 256): DynamicTexture {
    const existing = this.singles.get(key);
    if (existing) return existing;
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;
        const w1 = Math.sin(u * 3 + v * 2) * 0.35;
        const w2 = Math.cos(u * 5 - v * 4) * 0.2;
        const w3 = fbm((x / size) * 14, (y / size) * 14, 91, 3) * 0.45;
        height[y * size + x] = w1 + w2 + w3;
      }
    }
    const tex = this.buildNormalFromHeight(key, height, size, 3.1);
    this.singles.set(key, tex);
    return tex;
  }

  getSet(key: string): PBRTextureSet | undefined {
    return this.sets.get(key);
  }

  disposeAll(): void {
    for (const set of this.sets.values()) {
      set.albedo.dispose();
      set.normal.dispose();
      set.metallicRoughness.dispose();
    }
    for (const tex of this.singles.values()) {
      tex.dispose();
    }
    this.sets.clear();
    this.singles.clear();
  }
}
