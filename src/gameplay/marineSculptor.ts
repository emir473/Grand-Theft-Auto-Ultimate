/**
 * Sculpted High-Tessellation Marine Vessels & Public Transit Builders
 * Yacht, Seashark Jet Ski, Cargo Freighter, VCPD Patrol Boat, Elevated Metro & City Bus.
 */

import { Color3, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';

export function buildSculptedBoatRig(
  scene: Scene,
  gfx: GraphicsEngine,
  id: string,
  kind: 'yacht' | 'cargo_ship' | 'police_boat' | 'jetski',
  color: Color3,
  wid: number,
  len: number
): TransformNode {
  const root = new TransformNode(`marine_${id}`, scene);

  const hullMat = new PBRMaterial(`marineMat_${id}`, scene);
  hullMat.albedoColor = color;
  hullMat.roughness = 0.24;
  hullMat.clearCoat.isEnabled = true;
  hullMat.clearCoat.intensity = 0.85;

  const deckMat = new PBRMaterial(`marineDeck_${id}`, scene);
  deckMat.albedoColor = kind === 'yacht' ? new Color3(0.76, 0.56, 0.36) : new Color3(0.24, 0.26, 0.29);
  deckMat.roughness = 0.58;

  const glassMat = new PBRMaterial(`marineGlass_${id}`, scene);
  glassMat.albedoColor = new Color3(0.06, 0.12, 0.18);
  glassMat.roughness = 0.05;
  glassMat.alpha = 0.78;

  // Main hull + pointed bow taper
  const mainHull = MeshBuilder.CreateBox(`${id}_hull`, { width: wid, height: 1.05, depth: len * 0.72 }, scene);
  mainHull.position.set(0, 0.3, -len * 0.1);
  mainHull.material = hullMat;
  mainHull.parent = root;

  const bow = MeshBuilder.CreateCylinder(`${id}_bow`, { diameterTop: wid * 0.95, diameterBottom: wid * 0.7, height: 1.05, tessellation: 12 }, scene);
  bow.scaling.set(0.95, 1.0, (len * 0.36) / wid);
  bow.position.set(0, 0.32, len * 0.3);
  bow.material = hullMat;
  bow.parent = root;

  if (kind === 'jetski') {
    const seat = MeshBuilder.CreateCapsule(`${id}_seat`, { radius: 0.24, height: len * 0.45, tessellation: 14 }, scene);
    seat.rotation.x = Math.PI * 0.5;
    seat.position.set(0, 0.85, -0.15);
    seat.material = deckMat;
    seat.parent = root;

    const cowl = MeshBuilder.CreateBox(`${id}_cowl`, { width: wid * 0.65, height: 0.38, depth: 0.75 }, scene);
    cowl.position.set(0, 0.95, 0.45);
    cowl.rotation.x = -0.35;
    cowl.material = hullMat;
    cowl.parent = root;

    const bars = MeshBuilder.CreateCylinder(`${id}_bars`, { diameter: 0.06, height: wid * 0.85, tessellation: 10 }, scene);
    bars.rotation.z = Math.PI * 0.5;
    bars.position.set(0, 1.2, 0.25);
    bars.material = glassMat;
    bars.parent = root;
  } else if (kind === 'yacht') {
    const teak = MeshBuilder.CreateBox(`${id}_teak`, { width: wid * 0.88, height: 0.12, depth: len * 0.78 }, scene);
    teak.position.set(0, 0.84, -0.4);
    teak.material = deckMat;
    teak.parent = root;

    const cabin = MeshBuilder.CreateBox(`${id}_cabin`, { width: wid * 0.76, height: 1.35, depth: len * 0.45 }, scene);
    cabin.position.set(0, 1.5, -0.5);
    cabin.material = hullMat;
    cabin.parent = root;

    const windscreen = MeshBuilder.CreateBox(`${id}_wind`, { width: wid * 0.78, height: 0.75, depth: len * 0.38 }, scene);
    windscreen.position.set(0, 1.55, 0.2);
    windscreen.material = glassMat;
    windscreen.parent = root;

    const arch = MeshBuilder.CreateBox(`${id}_arch`, { width: wid * 0.72, height: 0.18, depth: 0.45 }, scene);
    arch.position.set(0, 2.75, -0.6);
    arch.material = hullMat;
    arch.parent = root;
  } else if (kind === 'cargo_ship') {
    const bridge = MeshBuilder.CreateBox(`${id}_bridge`, { width: wid * 0.82, height: 4.5, depth: 5.5 }, scene);
    bridge.position.set(0, 3.0, -len * 0.34);
    bridge.material = hullMat;
    bridge.parent = root;
    const cColors = [new Color3(0.82, 0.24, 0.22), new Color3(0.16, 0.48, 0.72), new Color3(0.92, 0.62, 0.15)];
    for (let i = 0; i < 4; i++) {
      const cMat = new PBRMaterial(`${id}_cMat_${i}`, scene);
      cMat.albedoColor = cColors[i % cColors.length];
      cMat.roughness = 0.6;
      const box = MeshBuilder.CreateBox(`${id}_cont_${i}`, { width: wid * 0.72, height: 2.2, depth: 4.8 }, scene);
      box.position.set(0, 1.9, -4 + i * 5.2);
      box.material = cMat;
      box.parent = root;
    }
  } else {
    const cabin = MeshBuilder.CreateBox(`${id}_pCabin`, { width: wid * 0.72, height: 1.25, depth: len * 0.36 }, scene);
    cabin.position.set(0, 1.35, 0.2);
    cabin.material = glassMat;
    cabin.parent = root;

    const strobe = MeshBuilder.CreateBox(`${id}_strobe`, { width: 1.1, height: 0.16, depth: 0.25 }, scene);
    strobe.position.set(0, 2.08, 0.2);
    const sMat = new PBRMaterial(`${id}_sMat`, scene);
    sMat.emissiveColor = new Color3(0.15, 0.6, 1.0);
    strobe.material = sMat;
    strobe.parent = root;
  }

  gfx.registerShadowCaster(root, true);
  return root;
}

export function buildSculptedTransitRig(
  scene: Scene,
  gfx: GraphicsEngine,
  kind: 'subway' | 'bus'
): TransformNode {
  const root = new TransformNode(`transit_${kind}`, scene);
  const bodyMat = new PBRMaterial(`transitMat_${kind}`, scene);
  bodyMat.albedoColor = kind === 'subway' ? new Color3(0.1, 0.72, 0.82) : new Color3(0.95, 0.65, 0.14);
  bodyMat.metallic = 0.55;
  bodyMat.roughness = 0.24;
  bodyMat.clearCoat.isEnabled = true;

  const glassMat = new PBRMaterial(`transitGlass_${kind}`, scene);
  glassMat.albedoColor = new Color3(0.06, 0.1, 0.15);
  glassMat.roughness = 0.05;
  glassMat.alpha = 0.78;

  const len = kind === 'subway' ? 15 : 9.8;
  const wid = kind === 'subway' ? 2.8 : 2.5;

  const lower = MeshBuilder.CreateBox(`${kind}_lower`, { width: wid, height: 1.3, depth: len }, scene);
  lower.position.y = 1.0;
  lower.material = bodyMat;
  lower.parent = root;

  const glassBand = MeshBuilder.CreateBox(`${kind}_glass`, { width: wid * 0.96, height: 1.05, depth: len * 0.92 }, scene);
  glassBand.position.y = 2.15;
  glassBand.material = glassMat;
  glassBand.parent = root;

  const roof = MeshBuilder.CreateBox(`${kind}_roof`, { width: wid * 0.94, height: 0.42, depth: len * 0.96 }, scene);
  roof.position.y = 2.88;
  roof.material = bodyMat;
  roof.parent = root;

  if (kind === 'bus') {
    const wheelMat = new PBRMaterial('busWheelMat', scene);
    wheelMat.albedoColor = new Color3(0.08, 0.08, 0.09);
    wheelMat.roughness = 0.78;
    for (const wx of [-1.25, 1.25]) {
      for (const wz of [-3.2, 3.2]) {
        const w = MeshBuilder.CreateCylinder(`busW_${wx}_${wz}`, { diameter: 0.95, height: 0.34, tessellation: 24 }, scene);
        w.rotation.z = Math.PI * 0.5;
        w.position.set(wx, 0.48, wz);
        w.material = wheelMat;
        w.parent = root;
      }
    }
  }

  gfx.registerShadowCaster(root, true);
  return root;
}
