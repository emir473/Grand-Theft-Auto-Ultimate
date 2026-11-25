/**
 * Regional Leonida Landmarks & Biome Detail Builders:
 * - VC Port stacked shipping container yard & harbor bollards
 * - VCIA Airport concourse jetways, radar dome, hangars & runway strobe lights
 * - Allied Crystal refinery stacks & pipes
 * - Buckskin Swamp cypress/mangrove clusters around stilt house (IMG_8172)
 * - Mount Kalaga ranger lookout tower & highland pine forest (IMG_8682)
 */

import {
  Color3,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { posterUVToWorld } from './leonidaGeoData';
import { sampleLeonidaHeight } from './terrainHeightfield';

export function buildVCPortAndVCIADetails(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  stuccoMat: PBRMaterial,
  neonCyan: PBRMaterial,
  parent: TransformNode
): void {
  const root = new TransformNode('port_and_vcia_details', scene);
  root.parent = parent;

  // VC Port Stacked Shipping Containers & Pier Pilings
  const portXZ = posterUVToWorld(0.805, 0.550);
  const teuPalette = [
    new Color3(0.76, 0.18, 0.14),
    new Color3(0.14, 0.42, 0.72),
    new Color3(0.88, 0.52, 0.12),
    new Color3(0.14, 0.58, 0.48),
  ];
  const teuMats = teuPalette.map((col, idx) => {
    const m = new PBRMaterial(`teuMat_${idx}`, scene);
    m.albedoColor = col;
    m.roughness = 0.55;
    m.metallic = 0.25;
    return m;
  });

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const stack = (row + col) % 2 === 0 ? 2 : 1;
      for (let tier = 0; tier < stack; tier++) {
        const box = MeshBuilder.CreateBox(`port_teu_${row}_${col}_${tier}`, { width: 2.5, height: 2.6, depth: 6.2 }, scene);
        box.position.set(portXZ.x - 24 + row * 7.5, 2.7 + tier * 2.62, portXZ.z - 8 + col * 8.5);
        box.material = teuMats[(row + col + tier) % teuMats.length];
        box.receiveShadows = true;
        box.parent = root;
        gfx.registerShadowCaster(box, false);
      }
    }
  }

  // VCIA Concourse Jetways, Hangars, Radar Dome & Runway Approach Lights
  const concourse = MeshBuilder.CreateBox('vcia_concourse_wing', { width: 12, height: 9, depth: 74 }, scene);
  concourse.position.set(-240, 4.9, -268);
  concourse.material = stuccoMat;
  concourse.parent = root;
  gfx.registerShadowCaster(concourse, false);

  for (let j = 0; j < 4; j++) {
    const jetway = MeshBuilder.CreateBox(`vcia_jetway_${j}`, { width: 18, height: 2.6, depth: 2.6 }, scene);
    jetway.position.set(-224, 4.8, -292 + j * 16);
    jetway.material = concreteMat;
    jetway.parent = root;
  }

  const radarDome = MeshBuilder.CreateSphere('vcia_atc_radome', { diameter: 6.4, segments: 18 }, scene);
  radarDome.position.set(-295, 34.5, -315);
  radarDome.material = stuccoMat;
  radarDome.parent = root;

  for (let h = 0; h < 2; h++) {
    const hangar = MeshBuilder.CreateCylinder(
      `vcia_hangar_${h}`,
      { diameter: 24, height: 32, tessellation: 18, arc: 0.5 },
      scene
    );
    hangar.rotation.z = Math.PI / 2;
    hangar.position.set(-345 + h * 42, 0.5, -330);
    hangar.material = concreteMat;
    hangar.parent = root;
  }

  const strobeMat = new PBRMaterial('vciaStrobeMat', scene);
  strobeMat.albedoColor = new Color3(0.95, 0.98, 1);
  strobeMat.emissiveColor = new Color3(0.85, 0.95, 1);
  for (let rx = -410; rx <= -110; rx += 30) {
    for (const s of [-1, 1]) {
      const light = MeshBuilder.CreateSphere(`vcia_rwy_light_${rx}_${s}`, { diameter: 0.55, segments: 8 }, scene);
      light.position.set(rx, 0.68, -375 + s * 11.5);
      light.material = s > 0 ? neonCyan : strobeMat;
      light.parent = root;
    }
  }
}

export function buildGreaterLeonidaBiomeProps(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  parent: TransformNode
): void {
  const root = new TransformNode('greater_leonida_biome_props', scene);
  root.parent = parent;

  // Allied Crystal Refinery Twin Smokestacks & Pipe Bridge
  const alliedXZ = posterUVToWorld(0.546, 0.362);
  const baseY = sampleLeonidaHeight(alliedXZ.x, alliedXZ.z);
  for (const sx of [-10, 10]) {
    const stack = MeshBuilder.CreateCylinder(`allied_stack_${sx}`, { diameterTop: 2.0, diameterBottom: 3.2, height: 32, tessellation: 16 }, scene);
    stack.position.set(alliedXZ.x + sx, baseY + 16, alliedXZ.z - 12);
    stack.material = concreteMat;
    stack.parent = root;
    gfx.registerShadowCaster(stack, false);
  }
  const pipe = MeshBuilder.CreateCylinder('allied_pipe_truss', { diameter: 1.4, height: 24, tessellation: 12 }, scene);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(alliedXZ.x + 12, baseY + 14, alliedXZ.z);
  pipe.material = concreteMat;
  pipe.parent = root;

  // Buckskin Swamp Cypress & Mangrove Clusters around Stilt House (IMG_8172)
  const grXZ = posterUVToWorld(0.450, 0.660);
  const barkMat = new PBRMaterial('cypressBarkMat', scene);
  barkMat.albedoColor = new Color3(0.28, 0.24, 0.19);
  barkMat.roughness = 0.92;

  const mossLeafMat = new PBRMaterial('cypressCanopyMat', scene);
  mossLeafMat.albedoColor = new Color3(0.18, 0.38, 0.2);
  mossLeafMat.roughness = 0.78;

  const cypressShape = [
    new Vector3(0.85, 0, 0),
    new Vector3(0.42, 2.4, 0),
    new Vector3(0.28, 6.2, 0),
    new Vector3(0.14, 9.6, 0),
  ];
  const swampOffsets: Array<[number, number, number]> = [
    [-22, -16, 1.0], [-14, 18, 1.2], [20, -14, 0.9], [24, 16, 1.15],
    [-32, 8, 1.1], [12, 28, 0.95], [-18, -32, 1.05], [34, -4, 1.2],
  ];
  swampOffsets.forEach(([ox, oz, scale], i) => {
    const cx = grXZ.x + ox;
    const cz = grXZ.z + oz;
    const cy = sampleLeonidaHeight(cx, cz);
    const trunk = MeshBuilder.CreateLathe(`cypress_trunk_${i}`, { shape: cypressShape, tessellation: 14 }, scene);
    trunk.scaling.setAll(scale);
    trunk.position.set(cx, cy - 0.3, cz);
    trunk.material = barkMat;
    trunk.parent = root;

    for (let t = 0; t < 2; t++) {
      const crown = MeshBuilder.CreateCylinder(
        `cypress_crown_${i}_${t}`,
        { diameterTop: 0.4, diameterBottom: (5.2 - t * 1.3) * scale, height: 3.4 * scale, tessellation: 12 },
        scene
      );
      crown.position.set(cx, cy + (7.2 + t * 2.2) * scale, cz);
      crown.material = mossLeafMat;
      crown.parent = root;
    }
  });

  // Mount Kalaga National Park Timber Ranger Lookout & Pine Stand (canonical reg_mount_kalaga UV)
  const kalagaXZ = posterUVToWorld(0.505, 0.215);
  const ky = sampleLeonidaHeight(kalagaXZ.x, kalagaXZ.z);
  const towerLegs = MeshBuilder.CreateBox('kalaga_lookout_frame', { width: 5.5, height: 11, depth: 5.5 }, scene);
  towerLegs.position.set(kalagaXZ.x, ky + 5.5, kalagaXZ.z);
  towerLegs.material = barkMat;
  towerLegs.parent = root;

  const lookoutCab = MeshBuilder.CreateBox('kalaga_lookout_cab', { width: 6.8, height: 3.4, depth: 6.8 }, scene);
  lookoutCab.position.set(kalagaXZ.x, ky + 12.6, kalagaXZ.z);
  lookoutCab.material = concreteMat;
  lookoutCab.parent = root;

  for (let p = 0; p < 10; p++) {
    const ang = (p / 10) * Math.PI * 2;
    const px = kalagaXZ.x + Math.cos(ang) * (18 + (p % 3) * 14);
    const pz = kalagaXZ.z + Math.sin(ang) * (18 + (p % 2) * 14);
    const py = sampleLeonidaHeight(px, pz);
    const pine = MeshBuilder.CreateCylinder(`kalaga_pine_${p}`, { diameterTop: 0.3, diameterBottom: 5.2, height: 11, tessellation: 10 }, scene);
    pine.position.set(px, py + 5.5, pz);
    pine.material = mossLeafMat;
    pine.parent = root;
  }
}
