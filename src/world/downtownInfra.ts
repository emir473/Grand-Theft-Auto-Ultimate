/**
 * Downtown Vice City Monorail Viaduct & Elevated Highway Overpass Builder
 * Matches IMG_8169 dusk infrastructure: elevated concrete monorail piers + guideway
 * past Megamundo & Sahara Arena, plus elevated I-97/I-404 highway overpass deck.
 */

import { MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';

export function buildDowntownMonorailAndOverpass(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  asphaltMat: PBRMaterial,
  neonCyanMat: PBRMaterial,
  parent: TransformNode
): void {
  // Elevated Metro Monorail concrete piers & twin guideway beam past Megamundo (x = -196)
  const monoX = -196;
  const deckY = 7.4;
  const beam = MeshBuilder.CreateBox('dt_monorail_beam', { width: 3.6, height: 0.9, depth: 340 }, scene);
  beam.position.set(monoX, deckY, 10);
  beam.material = concreteMat;
  beam.parent = parent;
  gfx.registerShadowCaster(beam, false);

  const railGlow = MeshBuilder.CreateBox('dt_monorail_trim', { width: 3.7, height: 0.14, depth: 340 }, scene);
  railGlow.position.set(monoX, deckY - 0.35, 10);
  railGlow.material = neonCyanMat;
  railGlow.parent = parent;

  for (let z = -150; z <= 170; z += 32) {
    const pier = MeshBuilder.CreateCylinder(`dt_mono_pier_${z}`, { diameter: 1.5, height: deckY, tessellation: 16 }, scene);
    pier.position.set(monoX, deckY * 0.5, z);
    pier.material = concreteMat;
    pier.parent = parent;
    gfx.registerShadowCaster(pier, false);

    const cap = MeshBuilder.CreateBox(`dt_mono_cap_${z}`, { width: 4.4, height: 0.65, depth: 1.8 }, scene);
    cap.position.set(monoX, deckY - 0.55, z);
    cap.material = concreteMat;
    cap.parent = parent;
  }

  // Elevated Highway Overpass spanning East-West across Downtown (IMG_8169)
  const ovpY = 6.2;
  const ovpZ = -132;
  const deck = MeshBuilder.CreateBox('dt_overpass_deck', { width: 220, height: 0.85, depth: 14 }, scene);
  deck.position.set(-210, ovpY, ovpZ);
  deck.material = asphaltMat;
  deck.parent = parent;
  deck.receiveShadows = true;
  gfx.registerShadowCaster(deck, false);

  for (const s of [-1, 1]) {
    const parapet = MeshBuilder.CreateBox(`dt_ovp_rail_${s}`, { width: 220, height: 0.9, depth: 0.45 }, scene);
    parapet.position.set(-210, ovpY + 0.75, ovpZ + s * 6.8);
    parapet.material = concreteMat;
    parapet.parent = parent;
  }

  for (let x = -300; x <= -120; x += 36) {
    for (const pz of [-4, 4]) {
      const col = MeshBuilder.CreateCylinder(`dt_ovp_col_${x}_${pz}`, { diameter: 1.3, height: ovpY, tessellation: 14 }, scene);
      col.position.set(x, ovpY * 0.5, ovpZ + pz);
      col.material = concreteMat;
      col.parent = parent;
      gfx.registerShadowCaster(col, false);
    }
  }
}
