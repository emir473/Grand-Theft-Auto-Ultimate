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
}
