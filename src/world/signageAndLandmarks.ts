/**
 * Iconic Leonida Signage, Sahara Arena Neon Lattice, Urban Mid-Rise Infill,
 * Admiral & Rialto Causeway Bridges, and Ocean Beach Boardwalk Details.
 */

import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
} from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { createParallaxFacadeMaterial } from '../rendering/shaders';
import { posterUVToWorld } from './leonidaGeoData';

function makeSignBoard(
  scene: Scene,
  id: string,
  text: string,
  bgHex: string,
  fgHex: string,
  glowColor: Color3,
  w: number,
  h: number,
  parent: TransformNode
): void {
  const tex = new DynamicTexture(`bSignTex_${id}`, { width: 512, height: 128 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = fgHex;
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  tex.update(true);

  const mat = new PBRMaterial(`bSignMat_${id}`, scene);
  mat.albedoTexture = tex;
  mat.emissiveTexture = tex;
  mat.emissiveColor = glowColor;
  mat.roughness = 0.25;

  const board = MeshBuilder.CreateBox(`bSign_${id}`, { width: w, height: h, depth: 0.45 }, scene);
  board.material = mat;
  board.parent = parent;
}

export function buildDowntownSignageAndArena(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  stuccoMat: PBRMaterial,
  neonCoral: PBRMaterial,
  neonCyan: PBRMaterial,
  parent: TransformNode
): void {
  const root = new TransformNode('dt_signage_and_arena', scene);
  root.parent = parent;

  // MEGAMUNDO Tower rooftop & facade illuminated signage (IMG_8169)
  const megaSign = new TransformNode('sign_megamundo_grp', scene);
  megaSign.position.set(-215, 79.5, 90.3);
  megaSign.parent = root;
  makeSignBoard(scene, 'megamundo', 'MEGAMUNDO', '#0f172a', '#22d3ee', new Color3(0.25, 0.92, 1.0), 26, 6.2, megaSign);

  const megaBack = new TransformNode('sign_megamundo_e', scene);
  megaBack.position.set(-198.7, 79.5, 75);
  megaBack.rotation.y = -Math.PI / 2;
  megaBack.parent = root;
  makeSignBoard(scene, 'megamundo_e', 'MEGAMUNDO', '#0f172a', '#f472b6', new Color3(1.0, 0.35, 0.65), 24, 5.8, megaBack);

  // LNB Financial Center corporate illuminated sign (IMG_8169)
  const lnbSign = new TransformNode('sign_lnb_grp', scene);
  lnbSign.position.set(-199.7, 56, -85);
  lnbSign.rotation.y = -Math.PI / 2;
  lnbSign.parent = root;
  makeSignBoard(scene, 'lnb_tower', 'LNB', '#1e1b4b', '#f8fafc', new Color3(0.55, 0.72, 1.0), 14, 5.4, lnbSign);

  // Downtown mid-rise avenues & rooftop HVAC clusters (IMG_8169 / IMG_8170)
  const midRises = [
    { x: -168, z: -26, w: 20, h: 24, d: 22 },
    { x: -168, z: 86, w: 22, h: 28, d: 24 },
    { x: -252, z: 22, w: 24, h: 36, d: 26 },
    { x: -252, z: -48, w: 22, h: 22, d: 22 },
    { x: -214, z: 18, w: 20, h: 32, d: 20 },
  ];
  midRises.forEach((b, i) => {
    const fMat = createParallaxFacadeMaterial(`dt_mid_fac_${i}`, scene, 5, Math.round(b.h / 3.2), 20 + i * 2.3);
    const blk = MeshBuilder.CreateBox(`dt_mid_${i}`, { width: b.w, height: b.h, depth: b.d }, scene);
    blk.position.set(b.x, b.h / 2 + 0.4, b.z);
    blk.material = fMat;
    blk.receiveShadows = true;
    blk.parent = root;
    gfx.registerShadowCaster(blk, false);

    // Rooftop HVAC penthouse & antenna spire
    const hvac = MeshBuilder.CreateBox(`dt_hvac_${i}`, { width: b.w * 0.38, height: 2.2, depth: b.d * 0.35 }, scene);
    hvac.position.set(b.x, b.h + 1.5, b.z);
    hvac.material = concreteMat;
    hvac.parent = root;
  });

  // Sahara Arena Faceted Zigzag Neon Facade & Upper Bowl Collar (IMG_8169)
  const arenaXZ = posterUVToWorld(0.738, 0.498);
  const collar = MeshBuilder.CreateTorus(
    'sahara_bowl_collar',
    { diameter: 40.5, thickness: 1.4, tessellation: 24 },
    scene
  );
  collar.position.set(arenaXZ.x, 18.2, arenaXZ.z);
  collar.rotation.x = Math.PI / 2;
  collar.material = neonCyan;
  collar.parent = root;

  const ribCount = 16;
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * Math.PI * 2;
    const rib = MeshBuilder.CreateBox(`sahara_rib_${i}`, { width: 0.45, height: 18.6, depth: 0.7 }, scene);
    rib.position.set(arenaXZ.x + Math.cos(a) * 19.3, 9.6, arenaXZ.z + Math.sin(a) * 19.3);
    rib.rotation.y = -a;
    rib.rotation.z = i % 2 === 0 ? 0.24 : -0.24;
    rib.material = i % 2 === 0 ? neonCoral : stuccoMat;
    rib.parent = root;
  }

  const arenaSign = new TransformNode('sahara_sign_grp', scene);
  arenaSign.position.set(arenaXZ.x, 20.5, arenaXZ.z + 19.8);
  arenaSign.parent = root;
  makeSignBoard(scene, 'sahara_arena', 'SAHARA ARENA', '#1f0924', '#f9a8d4', new Color3(1.0, 0.28, 0.65), 18, 3.6, arenaSign);
}

export function buildCausewayBridgesAndBoardwalk(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  travertineMat: PBRMaterial,
  neonCyan: PBRMaterial,
  parent: TransformNode
): void {
  const root = new TransformNode('causeway_and_boardwalk', scene);
  root.parent = parent;

  // Admiral & Rialto Causeway Bridges spanning West & East Starfish Lagoon (z = -28)
  const spans: Array<[number, number]> = [
    [-142, -68],
    [68, 152],
  ];
  for (const [xStart, xEnd] of spans) {
    const len = xEnd - xStart;
    const midX = (xStart + xEnd) * 0.5;
    for (const side of [-1, 1]) {
      const curb = MeshBuilder.CreateBox(`bridge_curb_${xStart}_${side}`, { width: len, height: 0.9, depth: 0.45 }, scene);
      curb.position.set(midX, 1.15, -28 + side * 6.8);
      curb.material = concreteMat;
      curb.parent = root;
      gfx.registerShadowCaster(curb, false);
    }

    for (let x = xStart + 10; x < xEnd; x += 18) {
      for (const pz of [-5.2, 5.2]) {
        const pier = MeshBuilder.CreateCylinder(`bridge_pier_${x}_${pz}`, { diameter: 1.35, height: 5.4, tessellation: 14 }, scene);
        pier.position.set(x, -1.9, -28 + pz);
        pier.material = concreteMat;
        pier.parent = root;
      }
      const post = MeshBuilder.CreateCylinder(`bridge_lamp_${x}`, { diameter: 0.16, height: 5.2, tessellation: 8 }, scene);
      post.position.set(x, 3.7, -28 - 6.7);
      post.material = concreteMat;
      post.parent = root;

      const lum = MeshBuilder.CreateBox(`bridge_lum_${x}`, { width: 0.85, height: 0.14, depth: 0.35 }, scene);
      lum.position.set(x, 6.25, -28 - 6.0);
      lum.material = neonCyan;
      lum.parent = root;
    }
  }

  // Ocean Beach Boardwalk Strip, Neon Hotel Marquee, Ice Coolers & Beach Towels (IMG_8168)
  const boardwalk = MeshBuilder.CreateBox('vb_boardwalk_deck', { width: 4.5, height: 0.28, depth: 360 }, scene);
  boardwalk.position.set(206, 0.56, 20);
  boardwalk.material = travertineMat;
  boardwalk.receiveShadows = true;
  boardwalk.parent = root;

  const hotelMarquee = new TransformNode('ocean_view_marquee', scene);
  hotelMarquee.position.set(180.5, 9.5, -10);
  hotelMarquee.rotation.y = Math.PI / 2;
  hotelMarquee.parent = root;
  makeSignBoard(scene, 'ocean_beach', 'OCEAN VIEW', '#31102f', '#5eead4', new Color3(0.25, 0.95, 0.88), 11, 2.6, hotelMarquee);

  const towelColors = [
    new Color3(0.95, 0.42, 0.15),
    new Color3(0.14, 0.78, 0.82),
    new Color3(0.94, 0.82, 0.2),
    new Color3(0.9, 0.25, 0.55),
  ];
  const coolerMat = new PBRMaterial('beachCoolerMat', scene);
  coolerMat.albedoColor = new Color3(0.08, 0.38, 0.72);
  coolerMat.roughness = 0.42;

  for (let i = 0; i < 12; i++) {
    const tz = -135 + i * 25;
    const tx = 228 + (i % 3) * 3.8;
    const tMat = new PBRMaterial(`towelMat_${i}`, scene);
    tMat.albedoColor = towelColors[i % towelColors.length];
    tMat.roughness = 0.88;
    const towel = MeshBuilder.CreateBox(`beachTowel_${i}`, { width: 1.05, height: 0.04, depth: 2.05 }, scene);
    towel.position.set(tx, 0.54, tz);
    towel.rotation.y = (i % 5 - 2) * 0.12;
    towel.material = tMat;
    towel.parent = root;

    if (i % 3 === 0) {
      const cooler = MeshBuilder.CreateBox(`beachCooler_${i}`, { width: 0.65, height: 0.48, depth: 0.44 }, scene);
      cooler.position.set(tx + 0.9, 0.74, tz + 0.4);
      cooler.material = coolerMat;
      cooler.parent = root;
    }
  }
}
