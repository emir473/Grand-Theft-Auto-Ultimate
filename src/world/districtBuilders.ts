import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { createParallaxFacadeMaterial } from '../rendering/shaders';
import type { SpatialGrid } from './spatialGrid';
import { ENTERABLE_INTERIORS } from './interiors';
import { posterUVToWorld } from './leonidaGeoData';
import {
  buildHotelBalconyTrim,
  buildWeatheredStiltHouseDetails,
  buildZigzagMarinaPavilion,
} from './landmarkDetails';
import { buildDowntownMonorailAndOverpass } from './downtownInfra';
import { buildCausewayBridgesAndBoardwalk, buildDowntownSignageAndArena } from './signageAndLandmarks';
import { buildGreaterLeonidaBiomeProps, buildVCPortAndVCIADetails } from './regionalLandmarks';

export type DistrictMatMap = Record<string, PBRMaterial>;

function makeBox(
  scene: Scene,
  gfx: GraphicsEngine,
  name: string,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: PBRMaterial | StandardMaterial | ReturnType<typeof createParallaxFacadeMaterial>,
  parent: TransformNode,
  castShadow = true
): Mesh {
  const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  m.position.set(x, y, z);
  m.material = mat;
  m.parent = parent;
  m.receiveShadows = true;
  if (castShadow) gfx.registerShadowCaster(m, false);
  return m;
}

export function buildStarfishIslandChunk(
  scene: Scene,
  gfx: GraphicsEngine,
  mats: DistrictMatMap,
  parent: TransformNode
): TransformNode {
  const root = new TransformNode('chunk_star_island', scene);
  root.parent = parent;

  makeBox(scene, gfx, 'star_island_base', 140, 1.2, 110, 0, -0.1, 0, mats.sand, root, false);
  makeBox(scene, gfx, 'villa_courtyard', 52, 0.4, 48, 0, 0.7, -4, mats.travertine, root, false);

  makeBox(scene, gfx, 'villa_back_wall', 20, 4.8, 0.6, 0, 3.3, 24, mats.stucco, root);
  makeBox(scene, gfx, 'villa_left_wall', 0.6, 4.8, 16, -9.7, 3.3, 16, mats.stucco, root);
  makeBox(scene, gfx, 'villa_right_wall', 0.6, 4.8, 16, 9.7, 3.3, 16, mats.stucco, root);
  makeBox(scene, gfx, 'villa_front_l', 7.5, 4.8, 0.6, -6, 3.3, 8.2, mats.stucco, root);
  makeBox(scene, gfx, 'villa_front_r', 7.5, 4.8, 0.6, 6, 3.3, 8.2, mats.stucco, root);
  makeBox(scene, gfx, 'villa_roof_1', 21, 0.5, 17, 0, 5.9, 16, mats.travertine, root);
  makeBox(scene, gfx, 'villa_upper_suite', 12, 3.6, 10, -2, 8.0, 17, mats.stucco, root);
  makeBox(scene, gfx, 'villa_upper_roof', 13, 0.4, 11, -2, 9.9, 17, mats.travertine, root);

  const helipad = MeshBuilder.CreateCylinder('villa_helipad', { diameter: 14, height: 0.3, tessellation: 24 }, scene);
  helipad.position.set(34, 0.8, -4);
  helipad.material = mats.concrete;
  helipad.parent = root;
  helipad.receiveShadows = true;

  makeBox(scene, gfx, 'villa_garage_bay', 14, 3.6, 16, -24, 2.3, 12, mats.concrete, root);
  makeBox(scene, gfx, 'villa_neon_accent', 18, 0.18, 0.18, 0, 5.7, 8.0, mats.neon_coral, root, false);
  return root;
}

export function buildViceBeachChunk(
  scene: Scene,
  gfx: GraphicsEngine,
  mats: DistrictMatMap,
  spatialGrid: SpatialGrid,
  parent: TransformNode
): TransformNode {
  const root = new TransformNode('chunk_vice_beach', scene);
  root.parent = parent;

  makeBox(scene, gfx, 'vice_beach_sand', 120, 1.0, 480, 195, -0.1, 20, mats.sand, root, false);
  makeBox(scene, gfx, 'ocean_drive_sidewalk', 24, 0.6, 440, 175, 0.35, 20, mats.travertine, root, false);

  // Pastel Art Deco Hotels matching IMG_8168
  const hotelHeights = [22, 30, 18, 26, 34, 20];
  hotelHeights.forEach((h, i) => {
    const z = -140 + i * 65;
    const facadeMat = createParallaxFacadeMaterial(`hotel_facade_${i}`, scene, 6, Math.round(h / 3), i + 1.7);
    makeBox(scene, gfx, `hotel_tower_${i}`, 22, h, 26, 192, h / 2 + 0.5, z, facadeMat, root);
    makeBox(scene, gfx, `hotel_trim_${i}`, 22.4, 0.4, 26.4, 192, h + 0.5, z, i % 2 === 0 ? mats.neon_coral : mats.neon_cyan, root, false);
    buildHotelBalconyTrim(scene, 192, h, z, mats.travertine, root, i);
    spatialGrid.insert(`hotel_${i}`, 'building', { x: 192, y: 0, z }, { name: `Ocean Hotel ${i + 1}` });
  });

  // Brutalist Zigzag Marina Pavilion behind 6-car showcase plaza (IMG_8171)
  buildZigzagMarinaPavilion(scene, gfx, mats.concrete, mats.asphalt, root);

  // Beach Umbrellas, Loungers & Lifeguard Towers (IMG_8168)
  const umbColors = [new Color3(0.15, 0.62, 0.92), new Color3(0.95, 0.25, 0.62), new Color3(0.98, 0.78, 0.18)];
  for (let i = 0; i < 14; i++) {
    const z = -150 + i * 24;
    const x = 222 + (i % 3) * 8;
    const mat = new PBRMaterial(`beachUmbMat_${i}`, scene);
    mat.albedoColor = umbColors[i % umbColors.length];
    mat.roughness = 0.6;
    const canopy = MeshBuilder.CreateCylinder(`beachUmb_${i}`, { diameterTop: 0.2, diameterBottom: 3.1, height: 0.6, tessellation: 8 }, scene);
    canopy.position.set(x, 2.5, z);
    canopy.material = mat;
    canopy.parent = root;
    makeBox(scene, gfx, `beachPole_${i}`, 0.08, 2.2, 0.08, x, 1.4, z, mats.travertine, root, false);
    makeBox(scene, gfx, `beachLounger_${i}`, 0.85, 0.28, 2.0, x - 1.3, 0.75, z, mats.stucco, root, false);
  }
  // Lifeguard tower
  makeBox(scene, gfx, 'lifeguard_deck', 4.2, 2.4, 4.2, 232, 1.6, 12, mats.travertine, root);
  makeBox(scene, gfx, 'lifeguard_cabin', 3.4, 2.4, 3.4, 232, 3.8, 12, mats.neon_cyan, root);

  for (const interior of ENTERABLE_INTERIORS.filter((x) => x.kind === 'nightclub' || x.kind === 'clothing')) {
    makeBox(scene, gfx, `shell_${interior.id}`, interior.size.w, interior.size.h, interior.size.d, interior.interiorCenter.x, interior.size.h / 2 + 0.5, interior.interiorCenter.z, mats.stucco, root);
  }
  buildCausewayBridgesAndBoardwalk(scene, gfx, mats.concrete, mats.travertine, mats.neon_cyan, root);
  return root;
}

export function buildDowntownAndPortChunk(
  scene: Scene,
  gfx: GraphicsEngine,
  mats: DistrictMatMap,
  spatialGrid: SpatialGrid,
  parent: TransformNode
): TransformNode {
  const root = new TransformNode('chunk_downtown', scene);
  root.parent = parent;

  makeBox(scene, gfx, 'downtown_ground', 240, 1.0, 480, -210, -0.1, 20, mats.concrete, root, false);

  // Megamundo & LNB style lit high-rises (IMG_8169)
  const towers = [
    { x: -175, z: 25, w: 28, h: 68, d: 28, name: 'Downtown Tower' },
    { x: -215, z: 75, w: 32, h: 86, d: 30, name: 'Megamundo Tower' },
    { x: -175, z: 145, w: 26, h: 54, d: 26, name: 'Bayside Plaza' },
    { x: -215, z: -85, w: 30, h: 62, d: 28, name: 'LNB Financial Center' },
  ];
  towers.forEach((t, idx) => {
    const fMat = createParallaxFacadeMaterial(`dt_facade_${idx}`, scene, 8, Math.round(t.h / 3.5), 10 + idx * 3.1);
    makeBox(scene, gfx, `dt_tower_${idx}`, t.w, t.h, t.d, t.x, t.h / 2 + 0.4, t.z, fMat, root);
    makeBox(scene, gfx, `dt_crown_${idx}`, t.w + 0.5, 0.6, t.d + 0.5, t.x, t.h + 0.5, t.z, idx % 2 === 0 ? mats.neon_cyan : mats.neon_coral, root, false);
    spatialGrid.insert(`dt_tower_${idx}`, 'building', { x: t.x, y: 0, z: t.z }, { name: t.name });
  });

  // Sahara Arena faceted dome (IMG_8384 + IMG_8169 background)
  const arenaXZ = posterUVToWorld(0.738, 0.498);
  const arena = MeshBuilder.CreateCylinder('sahara_arena_dome', { diameter: 38, height: 18, tessellation: 12 }, scene);
  arena.position.set(arenaXZ.x, 9.5, arenaXZ.z);
  arena.material = mats.stucco;
  arena.parent = root;
  gfx.registerShadowCaster(arena, false);

  // Vice City General Hospital
  makeBox(scene, gfx, 'vc_hospital', 36, 16, 28, -168, 8.4, -155, mats.stucco, root);
  makeBox(scene, gfx, 'vc_hospital_cross', 6, 1.5, 0.5, -149.8, 12, -155, mats.neon_coral, root, false);

  // VC Port shipping docks & cranes (IMG_8682)
  const portXZ = posterUVToWorld(0.805, 0.550);
  makeBox(scene, gfx, 'vc_port_dock', 75, 1.4, 42, portXZ.x, 0.7, portXZ.z, mats.concrete, root, false);
  makeBox(scene, gfx, 'vc_port_crane_1', 3.5, 22, 3.5, portXZ.x - 12, 11.5, portXZ.z, mats.neon_coral, root);
  makeBox(scene, gfx, 'vc_port_crane_arm', 18, 2.2, 2.8, portXZ.x - 5, 21.5, portXZ.z, mats.neon_coral, root);

  for (const int of ENTERABLE_INTERIORS.filter((x) => x.kind !== 'villa' && x.kind !== 'nightclub' && x.kind !== 'clothing')) {
    makeBox(scene, gfx, `shell_${int.id}`, int.size.w, int.size.h, int.size.d, int.interiorCenter.x, int.size.h / 2 + 0.4, int.interiorCenter.z, mats.concrete, root);
  }
  buildDowntownMonorailAndOverpass(scene, gfx, mats.concrete, mats.asphalt, mats.neon_cyan, root);
  buildDowntownSignageAndArena(scene, gfx, mats.concrete, mats.stucco, mats.neon_coral, mats.neon_cyan, root);
  return root;
}

export function buildStateRegionsChunks(
  scene: Scene,
  gfx: GraphicsEngine,
  mats: DistrictMatMap,
  parent: TransformNode
): TransformNode[] {
  // VCIA Airport (IMG_8384)
  const vciaRoot = new TransformNode('chunk_vcia', scene);
  vciaRoot.parent = parent;
  makeBox(scene, gfx, 'vcia_apron', 240, 0.8, 220, -280, 0.0, -330, mats.concrete, vciaRoot, false);
  makeBox(scene, gfx, 'vcia_runway_09L', 340, 0.3, 24, -260, 0.42, -375, mats.asphalt, vciaRoot, false);
  makeBox(scene, gfx, 'vcia_runway_09R', 310, 0.3, 20, -450, 0.42, -255, mats.asphalt, vciaRoot, false);
  makeBox(scene, gfx, 'vcia_terminal', 64, 14, 28, -240, 7.4, -312, mats.stucco, vciaRoot);
  makeBox(scene, gfx, 'vcia_atc_tower', 9, 32, 9, -295, 16.4, -315, mats.concrete, vciaRoot);

  // Greater Leonida Landmarks (Grassrivers stilt house IMG_8172, Allied Crystal, Port Gellhorn, Mount Kalaga)
  const stateRoot = new TransformNode('chunk_greater_leonida', scene);
  stateRoot.parent = parent;

  // Grassrivers Stilt House (mint-green cabin on stilts matching IMG_8172)
  const grXZ = posterUVToWorld(0.450, 0.660);
  const stiltMat = new PBRMaterial('stiltMintMat', scene);
  stiltMat.albedoColor = new Color3(0.32, 0.56, 0.50);
  stiltMat.roughness = 0.78;
  [-4, 4].forEach((ox) =>
    [-3, 3].forEach((oz) => makeBox(scene, gfx, `stilt_post_${ox}_${oz}`, 0.4, 3.4, 0.4, grXZ.x + ox, 1.9, grXZ.z + oz, mats.concrete, stateRoot))
  );
  makeBox(scene, gfx, 'stilt_cabin_body', 10, 3.2, 7.5, grXZ.x, 4.9, grXZ.z, stiltMat, stateRoot);
  makeBox(scene, gfx, 'stilt_deck', 12, 0.3, 9.5, grXZ.x, 3.3, grXZ.z, mats.travertine, stateRoot);
  buildWeatheredStiltHouseDetails(scene, gfx, grXZ.x, grXZ.z, mats.travertine, stateRoot);

  // Allied Crystal Sugar Refinery near Ambrosia (IMG_8682)
  const alliedXZ = posterUVToWorld(0.546, 0.362);
  makeBox(scene, gfx, 'allied_crystal_plant', 38, 18, 28, alliedXZ.x, 15, alliedXZ.z, mats.concrete, stateRoot);
  const silo = MeshBuilder.CreateCylinder('allied_silo', { diameter: 11, height: 26, tessellation: 14 }, scene);
  silo.position.set(alliedXZ.x + 24, 19, alliedXZ.z);
  silo.material = mats.stucco;
  silo.parent = stateRoot;

  // Leonida State Prison (Kelly County)
  const prisonXZ = posterUVToWorld(0.405, 0.448);
  makeBox(scene, gfx, 'leonida_state_prison', 48, 12, 42, prisonXZ.x, 12, prisonXZ.z, mats.concrete, stateRoot);

  // Port Gellhorn docks (IMG_8682)
  const pgXZ = posterUVToWorld(0.305, 0.355);
  makeBox(scene, gfx, 'port_gellhorn_pier', 75, 1.5, 48, pgXZ.x, 1.2, pgXZ.z, mats.concrete, stateRoot, false);

  buildVCPortAndVCIADetails(scene, gfx, mats.concrete, mats.stucco, mats.neon_cyan, vciaRoot);
  buildGreaterLeonidaBiomeProps(scene, gfx, mats.concrete, stateRoot);

  return [vciaRoot, stateRoot];
}
