/**
 * Furnished Enterable Interiors & Warm Interior Lighting
 * Populates Starfish Villa, Ammu-Nation, Banco de Leonida, Club Malibu,
 * 24/7 Gas & Mart, and Vice Threads with real 3D furniture & props.
 */

import { Color3, MeshBuilder, PBRMaterial, PointLight, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { ENTERABLE_INTERIORS } from './interiors';

export function buildInteriorFurnishings(
  scene: Scene,
  woodMat: PBRMaterial,
  neonCoral: PBRMaterial,
  neonCyan: PBRMaterial,
  parent: TransformNode
): void {
  const metalMat = new PBRMaterial('intMetalMat', scene);
  metalMat.albedoColor = new Color3(0.68, 0.72, 0.78);
  metalMat.metallic = 0.88;
  metalMat.roughness = 0.24;

  const velvetMat = new PBRMaterial('intVelvetMat', scene);
  velvetMat.albedoColor = new Color3(0.18, 0.22, 0.3);
  velvetMat.roughness = 0.85;

  for (const int of ENTERABLE_INTERIORS) {
    const cx = int.interiorCenter.x;
    const cy = int.interiorCenter.y;
    const cz = int.interiorCenter.z;

    const light = new PointLight(`intLight_${int.id}`, new Vector3(cx, cy + int.size.h - 0.8, cz), scene);
    light.diffuse = int.kind === 'nightclub' ? new Color3(0.95, 0.35, 0.85) : new Color3(1.0, 0.92, 0.78);
    light.intensity = int.kind === 'nightclub' ? 1.8 : 1.3;
    light.range = Math.max(int.size.w, int.size.d) * 1.4;

    if (int.kind === 'villa') {
      const sofa = MeshBuilder.CreateBox('villa_sofa', { width: 4.2, height: 0.85, depth: 1.1 }, scene);
      sofa.position.set(cx - 2.5, cy + 0.45, cz + 2.5);
      sofa.material = velvetMat;
      sofa.parent = parent;

      const table = MeshBuilder.CreateCylinder('villa_table', { diameter: 1.8, height: 0.55, tessellation: 24 }, scene);
      table.position.set(cx - 2.5, cy + 0.3, cz + 0.5);
      table.material = woodMat;
      table.parent = parent;

      const bar = MeshBuilder.CreateBox('villa_bar', { width: 4.0, height: 1.1, depth: 0.85 }, scene);
      bar.position.set(cx + 4.5, cy + 0.55, cz + 1.5);
      bar.material = woodMat;
      bar.parent = parent;
    } else if (int.kind === 'ammu_nation') {
      const counter = MeshBuilder.CreateBox('ammu_counter', { width: 6.4, height: 1.05, depth: 0.9 }, scene);
      counter.position.set(cx, cy + 0.55, cz + 1.2);
      counter.material = woodMat;
      counter.parent = parent;

      for (let i = -2; i <= 2; i++) {
        const rack = MeshBuilder.CreateBox(`ammu_rack_${i}`, { width: 0.9, height: 1.8, depth: 0.25 }, scene);
        rack.position.set(cx + i * 1.6, cy + 1.4, cz + 4.6);
        rack.material = metalMat;
        rack.parent = parent;
      }
    } else if (int.kind === 'bank') {
      const desk = MeshBuilder.CreateBox('bank_teller_desk', { width: 11, height: 1.15, depth: 1.0 }, scene);
      desk.position.set(cx, cy + 0.6, cz + 2.0);
      desk.material = woodMat;
      desk.parent = parent;

      const vaultDoor = MeshBuilder.CreateCylinder('bank_vault_door', { diameter: 3.1, height: 0.45, tessellation: 32 }, scene);
      vaultDoor.rotation.x = Math.PI / 2;
      vaultDoor.position.set(cx, cy + 1.7, cz + 7.2);
      vaultDoor.material = metalMat;
      vaultDoor.parent = parent;
    } else if (int.kind === 'nightclub') {
      const booth = MeshBuilder.CreateBox('club_dj_booth', { width: 4.4, height: 1.25, depth: 1.5 }, scene);
      booth.position.set(cx, cy + 0.65, cz + 5.5);
      booth.material = neonCyan;
      booth.parent = parent;

      const floor = MeshBuilder.CreateBox('club_dance_floor', { width: 8.5, height: 0.08, depth: 7.5 }, scene);
      floor.position.set(cx, cy + 0.05, cz - 0.5);
      floor.material = neonCoral;
      floor.parent = parent;
    } else {
      const counter = MeshBuilder.CreateBox(`shop_ctr_${int.id}`, { width: 3.6, height: 1.0, depth: 0.85 }, scene);
      counter.position.set(cx + 2.2, cy + 0.5, cz + 2.2);
      counter.material = woodMat;
      counter.parent = parent;

      const rack = MeshBuilder.CreateBox(`shop_rack_${int.id}`, { width: 3.4, height: 1.65, depth: 0.6 }, scene);
      rack.position.set(cx - 2.4, cy + 0.85, cz - 1.2);
      rack.material = metalMat;
      rack.parent = parent;
    }
  }
}
