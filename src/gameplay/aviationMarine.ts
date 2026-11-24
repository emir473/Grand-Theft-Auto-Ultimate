/**
 * VCIA Airliner 13-Phase Flight State Machine & High-Tessellation Aircraft / Helicopter Builders
 */

import { Color3, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { Vec3 } from '../core/types';
import { clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';

export type AircraftPhase =
  | 'parked'
  | 'pushback'
  | 'taxi'
  | 'takeoff'
  | 'liftoff'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'approach'
  | 'landing'
  | 'rollout'
  | 'reverse_thrust';

export interface AircraftUnit {
  id: string;
  callsign: string;
  kind: 'airliner' | 'cargo' | 'helicopter';
  phase: AircraftPhase;
  phaseTimer: number;
  position: Vec3;
  yaw: number;
  pitch: number;
  bank: number;
  speedMps: number;
  pilotedByPlayer: boolean;
  root: TransformNode;
  rotorNode?: TransformNode;
  tailRotorNode?: TransformNode;
  gearNode?: TransformNode;
}

export interface MarineUnit {
  id: string;
  name: string;
  kind: 'yacht' | 'cargo_ship' | 'police_boat' | 'jetski';
  position: Vec3;
  yaw: number;
  speedMps: number;
  massKg: number;
  displacedVolM3: number;
  pilotedByPlayer: boolean;
  root: TransformNode;
}

export interface BuiltAircraftRig {
  root: TransformNode;
  rotorNode?: TransformNode;
  tailRotorNode?: TransformNode;
  gearNode?: TransformNode;
}

export function createAircraftMesh(
  scene: Scene,
  gfx: GraphicsEngine,
  name: string,
  color: Color3,
  length: number,
  span: number,
  kind: AircraftUnit['kind'] = 'airliner'
): BuiltAircraftRig {
  const root = new TransformNode(`acRoot_${name}`, scene);
  const bodyMat = new PBRMaterial(`acMat_${name}`, scene);
  bodyMat.albedoColor = color;
  bodyMat.metallic = 0.42;
  bodyMat.roughness = 0.22;
  bodyMat.clearCoat.isEnabled = true;
  bodyMat.clearCoat.intensity = 0.85;

  const glassMat = new PBRMaterial(`acGlass_${name}`, scene);
  glassMat.albedoColor = new Color3(0.08, 0.14, 0.2);
  glassMat.metallic = 0.3;
  glassMat.roughness = 0.06;
  glassMat.alpha = 0.82;

  const darkMat = new PBRMaterial(`acDark_${name}`, scene);
  darkMat.albedoColor = new Color3(0.12, 0.13, 0.15);
  darkMat.metallic = 0.7;
  darkMat.roughness = 0.35;

  if (kind === 'helicopter') {
    // Sculpted teardrop fuselage cabin
    const cabin = MeshBuilder.CreateSphere(`${name}_cabin`, { diameterX: span * 0.75, diameterY: span * 0.65, diameterZ: length * 0.62, segments: 24 }, scene);
    cabin.position.y = 0.85;
    cabin.material = bodyMat;
    cabin.parent = root;

    const canopy = MeshBuilder.CreateSphere(`${name}_canopy`, { diameterX: span * 0.68, diameterY: span * 0.48, diameterZ: length * 0.44, segments: 20 }, scene);
    canopy.position.set(0, 0.92, length * 0.16);
    canopy.material = glassMat;
    canopy.parent = root;

    const tailBoom = MeshBuilder.CreateCylinder(`${name}_boom`, { diameterTop: 0.18, diameterBottom: 0.42, height: length * 0.75, tessellation: 16 }, scene);
    tailBoom.rotation.x = Math.PI * 0.5;
    tailBoom.position.set(0, 0.92, -length * 0.46);
    tailBoom.material = bodyMat;
    tailBoom.parent = root;

    const vFin = MeshBuilder.CreateBox(`${name}_vFin`, { width: 0.1, height: 0.95, depth: 0.55 }, scene);
    vFin.position.set(0, 1.25, -length * 0.8);
    vFin.rotation.x = -0.25;
    vFin.material = bodyMat;
    vFin.parent = root;

    // Skids
    for (const sx of [-0.75, 0.75]) {
      const skid = MeshBuilder.CreateCylinder(`${name}_skid_${sx}`, { diameter: 0.08, height: length * 0.65, tessellation: 12 }, scene);
      skid.rotation.x = Math.PI * 0.5;
      skid.position.set(sx, 0.1, 0.2);
      skid.material = darkMat;
      skid.parent = root;
      for (const sz of [-0.8, 0.8]) {
        const strut = MeshBuilder.CreateCylinder(`${name}_strut_${sx}_${sz}`, { diameter: 0.06, height: 0.68, tessellation: 10 }, scene);
        strut.position.set(sx * 0.85, 0.4, sz);
        strut.rotation.z = sx * -0.35;
        strut.material = darkMat;
        strut.parent = root;
      }
    }

    // Spinning 4-blade Main Rotor + Tail Rotor
    const rotorNode = new TransformNode(`${name}_rotorNode`, scene);
    rotorNode.position.set(0, 1.72, 0.1);
    rotorNode.parent = root;
    const hub = MeshBuilder.CreateCylinder(`${name}_hub`, { diameter: 0.28, height: 0.35, tessellation: 16 }, scene);
    hub.material = darkMat;
    hub.parent = rotorNode;
    for (let b = 0; b < 4; b++) {
      const blade = MeshBuilder.CreateBox(`${name}_blade_${b}`, { width: span * 2.5, height: 0.04, depth: 0.22 }, scene);
      blade.rotation.y = (b * Math.PI) / 2;
      blade.position.y = 0.14;
      blade.material = darkMat;
      blade.parent = rotorNode;
    }

    const tailRotorNode = new TransformNode(`${name}_tailRotor`, scene);
    tailRotorNode.position.set(0.18, 1.25, -length * 0.8);
    tailRotorNode.parent = root;
    const tBlade = MeshBuilder.CreateBox(`${name}_tBlade`, { width: 0.05, height: 1.15, depth: 0.12 }, scene);
    tBlade.material = darkMat;
    tBlade.parent = tailRotorNode;

    gfx.registerShadowCaster(root, true);
    return { root, rotorNode, tailRotorNode };
  }

  // Sculpted cylindrical airliner fuselage + nose cone + cockpit + swept wings + turbofans + retractable gear
  const fuse = MeshBuilder.CreateCylinder(`${name}_fuse`, { diameter: span * 0.44, height: length * 0.78, tessellation: 28 }, scene);
  fuse.rotation.x = Math.PI * 0.5;
  fuse.position.y = 1.65;
  fuse.material = bodyMat;
  fuse.parent = root;

  const nose = MeshBuilder.CreateSphere(`${name}_nose`, { diameterX: span * 0.43, diameterY: span * 0.4, diameterZ: length * 0.24, segments: 24 }, scene);
  nose.position.set(0, 1.6, length * 0.39);
  nose.material = bodyMat;
  nose.parent = root;

  const cockpit = MeshBuilder.CreateBox(`${name}_cockpit`, { width: span * 0.3, height: span * 0.13, depth: 1.4 }, scene);
  cockpit.position.set(0, 1.98, length * 0.41);
  cockpit.rotation.x = 0.22;
  cockpit.material = glassMat;
  cockpit.parent = root;

  const tailCone = MeshBuilder.CreateCylinder(`${name}_tailCone`, { diameterTop: span * 0.12, diameterBottom: span * 0.43, height: length * 0.22, tessellation: 24 }, scene);
  tailCone.rotation.x = -Math.PI * 0.5;
  tailCone.position.set(0, 1.72, -length * 0.46);
  tailCone.material = bodyMat;
  tailCone.parent = root;

  // Swept wings & twin turbofans
  for (const sx of [-1, 1]) {
    const wing = MeshBuilder.CreateBox(`${name}_wing_${sx}`, { width: length * 0.44, height: 0.22, depth: span * 0.58 }, scene);
    wing.position.set(sx * length * 0.22, 1.42, 0.2);
    wing.rotation.y = sx * -0.24;
    wing.material = bodyMat;
    wing.parent = root;

    const enginePod = MeshBuilder.CreateCylinder(`${name}_eng_${sx}`, { diameter: span * 0.22, height: length * 0.2, tessellation: 20 }, scene);
    enginePod.rotation.x = Math.PI * 0.5;
    enginePod.position.set(sx * length * 0.18, 1.05, 0.8);
    enginePod.material = darkMat;
    enginePod.parent = root;

    const hStab = MeshBuilder.CreateBox(`${name}_hStab_${sx}`, { width: length * 0.16, height: 0.14, depth: span * 0.26 }, scene);
    hStab.position.set(sx * length * 0.08, 1.8, -length * 0.48);
    hStab.rotation.y = sx * -0.25;
    hStab.material = bodyMat;
    hStab.parent = root;
  }

  const vTail = MeshBuilder.CreateBox(`${name}_vTail`, { width: 0.24, height: span * 0.68, depth: span * 0.48 }, scene);
  vTail.position.set(0, 1.85 + span * 0.34, -length * 0.46);
  vTail.rotation.x = -0.28;
  vTail.material = bodyMat;
  vTail.parent = root;

  const gearNode = new TransformNode(`${name}_gear`, scene);
  gearNode.parent = root;
  for (const [gx, gz] of [[0, length * 0.32], [-2.1, -0.4], [2.1, -0.4]] as Array<[number, number]>) {
    const strut = MeshBuilder.CreateCylinder(`${name}_gStrut_${gx}`, { diameter: 0.16, height: 1.05, tessellation: 10 }, scene);
    strut.position.set(gx, 0.65, gz);
    strut.material = darkMat;
    strut.parent = gearNode;
    const tire = MeshBuilder.CreateCylinder(`${name}_gTire_${gx}`, { diameter: 0.62, height: 0.26, tessellation: 18 }, scene);
    tire.rotation.z = Math.PI * 0.5;
    tire.position.set(gx, 0.28, gz);
    tire.material = darkMat;
    tire.parent = gearNode;
  }

  gfx.registerShadowCaster(root, true);
  return { root, gearNode };
}

export function stepAirlinerFlightPhase(
  ac: AircraftUnit,
  dt: number,
  onRunwayFree: () => void
): void {
  ac.phaseTimer -= dt;
  switch (ac.phase) {
    case 'parked':
      ac.speedMps = 0;
      onRunwayFree();
      break;
    case 'pushback':
      ac.speedMps = -2;
      if (ac.phaseTimer <= 0) { ac.phase = 'taxi'; ac.phaseTimer = 4; }
      break;
    case 'taxi':
      ac.speedMps = 9;
      if (ac.phaseTimer <= 0) { ac.phase = 'takeoff'; ac.phaseTimer = 5; }
      break;
    case 'takeoff':
      ac.speedMps = clamp(ac.speedMps + 12 * dt, 9, 64);
      if (ac.phaseTimer <= 0) { ac.phase = 'liftoff'; ac.phaseTimer = 3; }
      break;
    case 'liftoff':
      ac.pitch = -0.18;
      ac.position.y += 8 * dt;
      if (ac.phaseTimer <= 0) { ac.phase = 'climb'; ac.phaseTimer = 6; }
      break;
    case 'climb':
      ac.position.y += 14 * dt;
      if (ac.phaseTimer <= 0) { ac.phase = 'cruise'; ac.phaseTimer = 8; }
      break;
    case 'cruise':
      ac.pitch = 0;
      ac.yaw += 0.35 * dt;
      if (ac.phaseTimer <= 0) { ac.phase = 'descent'; ac.phaseTimer = 6; }
      break;
    case 'descent':
      ac.pitch = 0.1;
      ac.position.y = Math.max(18, ac.position.y - 12 * dt);
      if (ac.phaseTimer <= 0) { ac.phase = 'approach'; ac.phaseTimer = 4; }
      break;
    case 'approach':
      ac.yaw = Math.PI / 2;
      ac.position = { x: -420, y: 12, z: -375 };
      ac.phase = 'landing';
      ac.phaseTimer = 3;
      break;
    case 'landing':
      ac.position.y = Math.max(1.5, ac.position.y - 4 * dt);
      if (ac.phaseTimer <= 0) { ac.phase = 'rollout'; ac.phaseTimer = 3; }
      break;
    case 'rollout':
      ac.pitch = 0;
      ac.speedMps = Math.max(12, ac.speedMps - 14 * dt);
      if (ac.phaseTimer <= 0) { ac.phase = 'reverse_thrust'; ac.phaseTimer = 2.5; }
      break;
    case 'reverse_thrust':
      ac.speedMps = Math.max(0, ac.speedMps - 18 * dt);
      if (ac.phaseTimer <= 0) {
        ac.phase = 'parked';
        ac.position = { x: -340, y: 1.5, z: -375 };
        ac.yaw = Math.PI / 2;
        onRunwayFree();
      }
      break;
  }
  ac.position.x += Math.sin(ac.yaw) * ac.speedMps * dt;
  ac.position.z += Math.cos(ac.yaw) * ac.speedMps * dt;
}
