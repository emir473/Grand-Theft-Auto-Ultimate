/**
 * Urban & Highway Street Furniture:
 * Crosswalks, intersection street-name signage, roadside safety bollards, and beach boardwalk props.
 */

import { Color3, DynamicTexture, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import { sampleLeonidaHeight } from './terrainHeightfield';

export function buildRoadSignageAndCrosswalks(scene: Scene, parent: TransformNode): void {
  const root = new TransformNode('roadMarkingsAndSigns', scene);
  root.parent = parent;

  const paintMat = new PBRMaterial('crosswalkPaintMat', scene);
  paintMat.albedoColor = new Color3(0.92, 0.92, 0.9);
  paintMat.roughness = 0.65;

  const metalMat = new PBRMaterial('signPoleMat', scene);
  metalMat.albedoColor = new Color3(0.45, 0.48, 0.52);
  metalMat.metallic = 0.8;
  metalMat.roughness = 0.35;

  const signSpecs: Array<{ name: string; x: number; z: number; yaw: number }> = [
    { name: 'STARFISH BLVD', x: -12, z: -26, yaw: 0 },
    { name: 'OCEAN DRIVE', x: 158, z: -24, yaw: Math.PI / 2 },
    { name: 'BISCAYNE & LNB', x: -136, z: -24, yaw: 0 },
    { name: 'INTERSTATE 404 W', x: -242, z: -30, yaw: Math.PI / 2 },
    { name: 'VC PORT DOCKS', x: -75, z: -158, yaw: 0 },
  ];

  for (const sp of signSpecs) {
    const groundY = Math.max(0.45, sampleLeonidaHeight(sp.x, sp.z));

    const pole = MeshBuilder.CreateCylinder(`signPole_${sp.name}`, { diameter: 0.14, height: 3.4, tessellation: 8 }, scene);
    pole.position.set(sp.x + 5.8, groundY + 1.7, sp.z + 5.8);
    pole.material = metalMat;
    pole.parent = root;

    const plate = MeshBuilder.CreateBox(`signPlate_${sp.name}`, { width: 1.8, height: 0.45, depth: 0.06 }, scene);
    plate.position.set(sp.x + 5.8, groundY + 3.25, sp.z + 5.8);
    plate.rotation.y = sp.yaw;

    const tex = new DynamicTexture(`signTex_${sp.name}`, { width: 256, height: 64 }, scene, true);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sp.name, 128, 40);
    tex.update(true);

    const signMat = new PBRMaterial(`signMat_${sp.name}`, scene);
    signMat.albedoTexture = tex;
    signMat.roughness = 0.45;
    plate.material = signMat;
    plate.parent = root;

    // Crosswalk zebra stripes across street
    for (let s = -3; s <= 3; s++) {
      const bar = MeshBuilder.CreateBox(`zebra_${sp.name}_${s}`, { width: 0.55, height: 0.04, depth: 2.8 }, scene);
      bar.position.set(sp.x + s * 1.15, groundY + 0.31, sp.z);
      bar.material = paintMat;
      bar.parent = root;
    }
  }

  // Yellow double center lines & diagonal gore markings (IMG_8170)
  const yellowMat = new PBRMaterial('yellowGorePaintMat', scene);
  yellowMat.albedoColor = new Color3(0.95, 0.74, 0.14);
  yellowMat.roughness = 0.6;
  const goreZones = [
    { x: -162, z: -28 },
    { x: 164, z: -24 },
    { x: 0, z: -28 },
  ];
  goreZones.forEach((gz, gi) => {
    const gy = Math.max(0.45, sampleLeonidaHeight(gz.x, gz.z));
    for (let s = -3; s <= 3; s++) {
      const strip = MeshBuilder.CreateBox(`gore_${gi}_${s}`, { width: 0.24, height: 0.04, depth: 3.1 }, scene);
      strip.position.set(gz.x + s * 2.2, gy + 0.31, gz.z);
      strip.rotation.y = 0.45;
      strip.material = yellowMat;
      strip.parent = root;
    }
  });

  // Asphalt wear patches, subtle intersection tire skid marks & curb storm grates (IMG_8170/IMG_8171)
  const patchMat = new PBRMaterial('asphaltPatchMat', scene);
  patchMat.albedoColor = new Color3(0.11, 0.12, 0.13);
  patchMat.roughness = 0.85;

  const grateMat = new PBRMaterial('stormGrateMat', scene);
  grateMat.albedoColor = new Color3(0.22, 0.24, 0.26);
  grateMat.metallic = 0.82;
  grateMat.roughness = 0.42;

  const wearSpots = [
    { x: -158, z: -22 },
    { x: -195, z: 32 },
    { x: 162, z: -28 },
    { x: 170, z: 45 },
    { x: -8, z: -28 },
  ];
  wearSpots.forEach((ws, idx) => {
    const wy = Math.max(0.45, sampleLeonidaHeight(ws.x, ws.z));
    const patch = MeshBuilder.CreateBox(`roadPatch_${idx}`, { width: 3.4, height: 0.03, depth: 5.2 }, scene);
    patch.position.set(ws.x + 1.8, wy + 0.3, ws.z + 1.4);
    patch.rotation.y = idx * 0.22;
    patch.material = patchMat;
    patch.parent = root;

    for (const lane of [-1.2, 1.2]) {
      const skid = MeshBuilder.CreateBox(`skid_${idx}_${lane}`, { width: 0.22, height: 0.025, depth: 6.5 }, scene);
      skid.position.set(ws.x + lane, wy + 0.305, ws.z - 2.0);
      skid.rotation.y = 0.14;
      skid.material = patchMat;
      skid.parent = root;
    }

    const grate = MeshBuilder.CreateBox(`stormGrate_${idx}`, { width: 0.9, height: 0.05, depth: 1.4 }, scene);
    grate.position.set(ws.x + 4.4, wy + 0.29, ws.z);
    grate.material = grateMat;
    grate.parent = root;
  });
}
