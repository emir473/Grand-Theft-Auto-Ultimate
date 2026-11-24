import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, VertexData } from '@babylonjs/core';
import type { SurfaceMaterial } from '../core/types';
import {
  LEONIDA_ISLANDS,
  LEONIDA_MAINLAND_POLYGON,
  LEONIDA_WATER_BODIES,
  posterUVToWorld,
  type UVPoint,
  type WorldXZ,
} from './leonidaGeoData';

const MAINLAND_XZ = LEONIDA_MAINLAND_POLYGON.map((p) => posterUVToWorld(p.u, p.v));
const ISLANDS_XZ = LEONIDA_ISLANDS.map((isl) => ({
  ...isl,
  xz: isl.points.map((p) => posterUVToWorld(p.u, p.v)),
}));
const WATER_XZ = LEONIDA_WATER_BODIES.map((w) => ({
  ...w,
  xz: w.points.map((p) => posterUVToWorld(p.u, p.v)),
}));

function pointInPoly(px: number, pz: number, poly: WorldXZ[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const zi = poly[i].z;
    const xj = poly[j].x;
    const zj = poly[j].z;
    const intersect = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function minEdgeDist(px: number, pz: number, poly: WorldXZ[]): number {
  let minD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x;
    const az = poly[j].z;
    const bx = poly[i].x;
    const bz = poly[i].z;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz + 1e-6)));
    const d = Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
    if (d < minD) minD = d;
  }
  return minD;
}

function ridgeNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.011) * Math.cos(z * 0.009) * 0.5 +
    Math.sin(x * 0.027 + z * 0.019) * 0.3 +
    Math.cos(x * 0.053 - z * 0.041) * 0.2
  );
}

/**
 * Deterministic 3D heightfield query shared by rendering, player, vehicles, NPCs, and water.
 * Preserves flat navigable starter zones (Starfish Island, Downtown, Vice Beach, VCIA)
 * while sculpting rolling hills, wetlands, and Mount Kalaga northern highlands.
 */
export function sampleLeonidaHeight(x: number, z: number): number {
  // Starter Causeways & Starfish Island plateau
  if (Math.abs(x) <= 72 && Math.abs(z) <= 58) return 0.9;
  if (Math.abs(z + 28) <= 8.5 && x >= -145 && x <= 170) return 0.65;
  // Starter Downtown & VCIA apron plateau so starter buildings never sink
  if (x <= -90 && x >= -455 && z >= -445 && z <= 270) return 0.55;
  // Starter Vice Beach strip
  if (x >= 130 && x <= 255 && z >= -230 && z <= 265) return 0.55;

  // Lakes & Rivers
  for (const w of WATER_XZ) {
    if (pointInPoly(x, z, w.xz)) {
      if (w.kind === 'swamp') return 0.12 + ridgeNoise(x, z) * 0.25;
      return w.elevationTargetM;
    }
  }

  // Islands (Keys, Lagoon, Western Gulf)
  for (const isl of ISLANDS_XZ) {
    if (pointInPoly(x, z, isl.xz)) {
      const edge = minEdgeDist(x, z, isl.xz);
      const slope = Math.min(1, edge / 18);
      return 0.4 + slope * isl.elevationTargetM;
    }
  }

  // Mainland Leonida
  if (pointInPoly(x, z, MAINLAND_XZ)) {
    const edge = minEdgeDist(x, z, MAINLAND_XZ);
    const coastBlend = Math.min(1, edge / 45);
    const n = ridgeNoise(x, z);

    // Mount Kalaga National Park & Lummox Highlands (North, z > 580)
    if (z > 580) {
      const northFactor = Math.min(1, (z - 580) / 480);
      const peak = 18 + northFactor * 115 * (0.55 + Math.max(0, n) * 0.85);
      return Math.max(1.2, peak * coastBlend);
    }

    // Grassrivers Southern Wetlands (z < -360, x < -320)
    if (z < -360 && x < -320) {
      return Math.max(0.18, (0.45 + n * 0.55) * coastBlend);
    }

    // Western Rolling Hills (Port Gellhorn / Kelly County, x < -650)
    if (x < -650) {
      return Math.max(0.9, (12 + Math.max(0, n) * 28) * coastBlend);
    }

    // Central Plains & Ambrosia (z between 180 and 580)
    if (z > 180) {
      return Math.max(0.8, (6 + Math.max(0, n) * 14) * coastBlend);
    }

    return Math.max(0.6, 1.4 * coastBlend + Math.max(0, n) * 2.5);
  }

  // Overseas Keys Highway causeway strip (SR-1A)
  const keysDist = Math.abs(z + 980 - (x + 500) * 0.22);
  if (x >= -1220 && x <= -280 && keysDist < 12) return 0.7;

  // Shallow coral reef shelf near coasts -> deeper ocean floor
  const coastDist = minEdgeDist(x, z, MAINLAND_XZ);
  if (coastDist < 55) return -1.5 - (coastDist / 55) * 4.0;
  return -7.5;
}

export function sampleLeonidaSurface(x: number, z: number, wetness: number): SurfaceMaterial {
  if (Math.abs(x) <= 28 && z >= -28 && z <= 20) return 'marble';
  if (Math.abs(z + 28) <= 8.5 && x >= -145 && x <= 170) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';
  if (x >= 188 && x <= 255 && z >= -230 && z <= 265) return 'sand';
  if (x >= 156 && x <= 174 && z >= -230 && z <= 265) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';
  if (x <= -132 && x >= -248 && z >= -360 && z <= 260) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';

  const h = sampleLeonidaHeight(x, z);
  if (h < -0.05) return 'water';
  if (h < 0.42 && z < -320) return 'mud';
  if (h < 1.35) return 'sand';
  return 'gravel';
}

function biomeVertexColor(x: number, z: number, h: number): [number, number, number] {
  if (h < -1.5) return [0.06, 0.36, 0.48]; // deep reef
  if (h < 0.0) return [0.16, 0.62, 0.66]; // turquoise shallows
  if (h < 0.45 && z < -300) return [0.24, 0.31, 0.21]; // wetland mud/grass
  if (h < 1.25 && (x > 110 || z < -700 || minEdgeDist(x, z, MAINLAND_XZ) < 34)) {
    return [0.87, 0.79, 0.62]; // pale-gold beach sand
  }
  if (h > 68) return [0.44, 0.45, 0.42]; // mountain granite rock
  if (h > 26) return [0.22, 0.42, 0.23]; // highland pine forest
  if (x < -110 && x > -340 && z > -200 && z < 230) return [0.36, 0.38, 0.40]; // urban Vice City pad
  return [0.29, 0.48, 0.26]; // tropical turf & foliage
}

export function buildLeonidaTerrainMesh(scene: Scene, parent: TransformNode): Mesh {
  const minX = -1700;
  const maxX = 660;
  const minZ = -1500;
  const maxZ = 1440;
  const segX = 128;
  const segZ = 152;

  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iz = 0; iz <= segZ; iz++) {
    const vz = iz / segZ;
    const z = minZ + vz * (maxZ - minZ);
    for (let ix = 0; ix <= segX; ix++) {
      const ux = ix / segX;
      const x = minX + ux * (maxX - minX);
      const y = sampleLeonidaHeight(x, z);
      positions.push(x, y, z);
      uvs.push(ux * 16, vz * 16);
      const [r, g, b] = biomeVertexColor(x, z, y);
      colors.push(r, g, b, 1);
    }
  }

  const stride = segX + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.colors = colors;

  const terrain = new Mesh('leonidaHeightfieldTerrain', scene);
  vd.applyToMesh(terrain);
  terrain.parent = parent;
  terrain.receiveShadows = true;

  const mat = new PBRMaterial('leonidaTerrainMat', scene);
  mat.albedoColor = Color3.White();
  mat.roughness = 0.88;
  mat.metallic = 0.02;
  terrain.material = mat;

  return terrain;
}

export function getMainlandWorldPolygon(): WorldXZ[] {
  return MAINLAND_XZ;
}

export function getPolygonWorldCoords(points: UVPoint[]): WorldXZ[] {
  return points.map((p) => posterUVToWorld(p.u, p.v));
}
