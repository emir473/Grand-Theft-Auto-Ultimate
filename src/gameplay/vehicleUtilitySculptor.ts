/**
 * Specialized Utility Vehicle Silhouettes & Wheel-Well Fenders:
 * - Cement Mixer Drum & Chute (IMG_8170)
 * - US National Mail Step-Van Cargo Box & Livery (IMG_8170)
 * - Sculpted Half-Arch Wheel Well Fender Flares
 */

import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { VehicleClass } from '../core/types';
import type { VehicleHandlingProfile } from './vehicleModels';

function makeMailLiveryTexture(scene: Scene, id: string): DynamicTexture {
  const tex = new DynamicTexture(`mailTex_${id}`, { width: 512, height: 192 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 128, 512, 18);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 148, 512, 8);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('U.S. NATIONAL', 256, 68);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('MAIL SERVICE', 256, 106);
  tex.update(true);
  return tex;
}

export function buildUtilityVehicleSuperstructure(
  scene: Scene,
  id: string,
  vc: VehicleClass,
  profile: VehicleHandlingProfile,
  trimMat: PBRMaterial,
  root: TransformNode
): void {
  if (vc !== 'truck' && vc !== 'bus') return;

  const isMixer = id.includes('mixer');
  const isMailVan = id.includes('mail');

  if (isMixer) {
    // Ribbed Lathe Cement Mixer Drum with red/blue racing stripes (IMG_8170)
    const drumMat = new PBRMaterial(`mixerDrumMat_${id}`, scene);
    drumMat.albedoColor = new Color3(0.92, 0.94, 0.96);
    drumMat.metallic = 0.25;
    drumMat.roughness = 0.35;

    const stripeMat = new PBRMaterial(`mixerStripeMat_${id}`, scene);
    stripeMat.albedoColor = new Color3(0.16, 0.28, 0.72);
    stripeMat.roughness = 0.4;

    const shape = [
      new Vector3(0.45, -1.6, 0),
      new Vector3(0.98, -0.7, 0),
      new Vector3(1.06, 0.2, 0),
      new Vector3(0.86, 1.15, 0),
      new Vector3(0.55, 1.65, 0),
    ];
    const drum = MeshBuilder.CreateLathe(`mixerDrum_${id}`, { shape, tessellation: 28 }, scene);
    drum.position.set(0, 1.98, -profile.length * 0.14);
    drum.rotation.x = Math.PI * 0.42;
    drum.material = drumMat;
    drum.parent = root;

    const band = MeshBuilder.CreateTorus(`mixerBand_${id}`, { diameter: 2.14, thickness: 0.18, tessellation: 28 }, scene);
    band.position.set(0, 1.98, -profile.length * 0.14);
    band.rotation.x = Math.PI * 0.92;
    band.material = stripeMat;
    band.parent = root;

    const chute = MeshBuilder.CreateBox(`mixerChute_${id}`, { width: 0.42, height: 0.24, depth: 1.45 }, scene);
    chute.position.set(0, 1.62, -profile.length * 0.44);
    chute.rotation.x = 0.45;
    chute.material = trimMat;
    chute.parent = root;
    return;
  }

  if (isMailVan) {
    // Box Step-Van Cargo Shell + Roll-up Door Trim (IMG_8170 right lane)
    const boxMat = new PBRMaterial(`mailBoxMat_${id}`, scene);
    boxMat.albedoTexture = makeMailLiveryTexture(scene, id);
    boxMat.roughness = 0.48;

    const cargo = MeshBuilder.CreateBox(
      `mailCargo_${id}`,
      { width: profile.width * 0.96, height: 1.95, depth: profile.length * 0.68 },
      scene
    );
    cargo.position.set(0, 1.95, -profile.length * 0.14);
    cargo.material = boxMat;
    cargo.parent = root;

    const rollDoor = MeshBuilder.CreateBox(
      `mailDoor_${id}`,
      { width: profile.width * 0.72, height: 1.6, depth: 0.08 },
      scene
    );
    rollDoor.position.set(0, 1.82, -profile.length * 0.485);
    rollDoor.material = trimMat;
    rollDoor.parent = root;
  }
}

export function buildWheelWellArches(
  scene: Scene,
  id: string,
  profile: VehicleHandlingProfile,
  wheelDiam: number,
  isMoto: boolean,
  trimMat: PBRMaterial,
  root: TransformNode
): void {
  if (isMoto) return;
  const offsets: Array<[number, number]> = [
    [-profile.width * 0.47, profile.length * 0.32],
    [profile.width * 0.47, profile.length * 0.32],
    [-profile.width * 0.47, -profile.length * 0.32],
    [profile.width * 0.47, -profile.length * 0.32],
  ];
  offsets.forEach(([wx, wz], idx) => {
    const arch = MeshBuilder.CreateTorus(
      `vehArch_${id}_${idx}`,
      { diameter: wheelDiam * 1.18, thickness: 0.065, tessellation: 18 },
      scene
    );
    arch.rotation.z = Math.PI / 2;
    arch.scaling.set(0.75, 1.0, 1.05);
    arch.position.set(wx < 0 ? wx - 0.03 : wx + 0.03, wheelDiam * 0.54, wz);
    arch.material = trimMat;
    arch.parent = root;
  });
}
