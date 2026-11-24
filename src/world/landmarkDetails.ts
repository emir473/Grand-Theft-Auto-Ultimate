/**
 * Architectural Hero Detail Builders
 * - Brutalist Sawtooth/Zigzag Marina Pavilion & Parking Lot Stripes (IMG_8171)
 * - Weathered Mint-Green Stilt House Exterior Stairs, Railing, Roof & Satellite Dish (IMG_8172)
 * - Pastel Art Deco Rounded Balcony Tiers (IMG_8168)
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';

export function buildZigzagMarinaPavilion(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  asphaltMat: PBRMaterial,
  parent: TransformNode
): void {
  const pavRoot = new TransformNode('marina_zigzag_pavilion', scene);
  pavRoot.position.set(164, 0.45, -54);
  pavRoot.parent = parent;

  // Wet asphalt marina showcase apron + yellow parking bay stripes (IMG_8171)
  const apron = MeshBuilder.CreateBox('marina_showcase_apron', { width: 42, height: 0.22, depth: 36 }, scene);
  apron.position.set(2, -0.1, 20);
  apron.material = asphaltMat;
  apron.receiveShadows = true;
  apron.parent = pavRoot;

  const stripeMat = new PBRMaterial('marina_stripe_mat', scene);
  stripeMat.albedoColor = new Color3(0.9, 0.72, 0.18);
  stripeMat.roughness = 0.65;
  for (let i = -3; i <= 3; i++) {
    const line = MeshBuilder.CreateBox(`marina_line_${i}`, { width: 0.18, height: 0.24, depth: 5.2 }, scene);
    line.position.set(i * 4.5 + 2, -0.08, 16);
    line.rotation.y = 0.24;
    line.material = stripeMat;
    line.parent = pavRoot;
  }

  // Sawtooth / Zigzag Brutalist Concrete Roof Bays & Diagonal Struts (IMG_8171)
  const backWall = MeshBuilder.CreateBox('marina_back', { width: 38, height: 6.2, depth: 10 }, scene);
  backWall.position.set(0, 3.1, -6);
  backWall.material = concreteMat;
  backWall.receiveShadows = true;
  backWall.parent = pavRoot;
  gfx.registerShadowCaster(backWall, false);

  for (let b = 0; b < 6; b++) {
    const bx = -15 + b * 6;
    const pitchRoofL = MeshBuilder.CreateBox(`marina_zigL_${b}`, { width: 3.4, height: 0.35, depth: 14 }, scene);
    pitchRoofL.position.set(bx - 1.35, 7.6, -4);
    pitchRoofL.rotation.z = 0.52;
    pitchRoofL.material = concreteMat;
    pitchRoofL.parent = pavRoot;
    gfx.registerShadowCaster(pitchRoofL, false);

    const pitchRoofR = MeshBuilder.CreateBox(`marina_zigR_${b}`, { width: 3.4, height: 0.35, depth: 14 }, scene);
    pitchRoofR.position.set(bx + 1.35, 7.6, -4);
    pitchRoofR.rotation.z = -0.52;
    pitchRoofR.material = concreteMat;
    pitchRoofR.parent = pavRoot;
    gfx.registerShadowCaster(pitchRoofR, false);

    // Diagonal Y-columns
    const colA = MeshBuilder.CreateBox(`marina_colA_${b}`, { width: 0.55, height: 7.4, depth: 0.7 }, scene);
    colA.position.set(bx - 0.9, 3.6, 1.5);
    colA.rotation.z = -0.22;
    colA.material = concreteMat;
    colA.parent = pavRoot;
    gfx.registerShadowCaster(colA, false);

    const colB = MeshBuilder.CreateBox(`marina_colB_${b}`, { width: 0.55, height: 7.4, depth: 0.7 }, scene);
    colB.position.set(bx + 0.9, 3.6, 1.5);
    colB.rotation.z = 0.22;
    colB.material = concreteMat;
    colB.parent = pavRoot;
    gfx.registerShadowCaster(colB, false);
  }
}

export function buildWeatheredStiltHouseDetails(
  scene: Scene,
  gfx: GraphicsEngine,
  baseX: number,
  baseZ: number,
  woodMat: PBRMaterial,
  parent: TransformNode
): void {
  const stiltGroup = new TransformNode('stilt_house_details', scene);
  stiltGroup.position.set(baseX, 0, baseZ);
  stiltGroup.parent = parent;

  // Corrugated angled gable roof
  const roofMat = new PBRMaterial('stiltRoofMat', scene);
  roofMat.albedoColor = new Color3(0.28, 0.34, 0.36);
  roofMat.metallic = 0.55;
  roofMat.roughness = 0.48;

  for (const s of [-1, 1]) {
    const slope = MeshBuilder.CreateBox(`stilt_roof_${s}`, { width: 11.4, height: 0.16, depth: 4.9 }, scene);
    slope.position.set(0, 7.0, s * 2.15);
    slope.rotation.x = s * 0.28;
    slope.material = roofMat;
    slope.parent = stiltGroup;
    gfx.registerShadowCaster(slope, false);
  }

  // Porch guardrails
  const railConfigs = [
    { x: 0, z: -4.6, w: 11.8, d: 0.15 },
    { x: -5.8, z: 0, w: 0.15, d: 9.2 },
    { x: 5.8, z: 0, w: 0.15, d: 9.2 },
  ];
  railConfigs.forEach((rc, idx) => {
    const rail = MeshBuilder.CreateBox(`stilt_rail_${idx}`, { width: rc.w, height: 0.95, depth: rc.d }, scene);
    rail.position.set(rc.x, 3.9, rc.z);
    rail.material = woodMat;
    rail.parent = stiltGroup;
  });

  // Exterior wooden staircase ramp down to muddy yard
  const stair = MeshBuilder.CreateBox('stilt_stairs', { width: 1.8, height: 0.24, depth: 5.2 }, scene);
  stair.position.set(-4.6, 1.8, -6.5);
  stair.rotation.x = -0.58;
  stair.material = woodMat;
  stair.parent = stiltGroup;
  gfx.registerShadowCaster(stair, false);

  // Corner satellite dish (IMG_8172)
  const dishMat = new PBRMaterial('stiltDishMat', scene);
  dishMat.albedoColor = new Color3(0.92, 0.93, 0.94);
  dishMat.roughness = 0.35;
  const dish: Mesh = MeshBuilder.CreateCylinder('stilt_sat_dish', { diameterTop: 1.05, diameterBottom: 0.15, height: 0.22, tessellation: 18 }, scene);
  dish.position.set(-5.6, 4.3, -4.6);
  dish.rotation.set(0.9, -0.5, 0);
  dish.material = dishMat;
  dish.parent = stiltGroup;
}

export function buildHotelBalconyTrim(
  scene: Scene,
  x: number,
  h: number,
  z: number,
  trimMat: PBRMaterial,
  parent: TransformNode,
  index: number
): void {
  const tiers = Math.max(2, Math.floor(h / 7));
  for (let t = 1; t < tiers; t++) {
    const balcony = MeshBuilder.CreateCylinder(
      `hotel_balc_${index}_${t}`,
      { diameter: 7.2, height: 0.32, tessellation: 20 },
      scene
    );
    balcony.position.set(x + 11.2, 3.5 + t * 6.5, z);
    balcony.material = trimMat;
    balcony.parent = parent;
  }
}
