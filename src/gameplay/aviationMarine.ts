/**
 * VCIA Airliner 13-Phase Flight State Machine & Aircraft/Marine Mesh Builders
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

export function createAircraftMesh(
  scene: Scene,
  gfx: GraphicsEngine,
  name: string,
  color: Color3,
  length: number,
  span: number
): TransformNode {
  const root = new TransformNode(`acRoot_${name}`, scene);
  const mat = new PBRMaterial(`acMat_${name}`, scene);
  mat.albedoColor = color;
  mat.metallic = 0.45;
  mat.roughness = 0.28;

  const fuse = MeshBuilder.CreateBox(`${name}_fuse`, { width: span * 0.45, height: span * 0.4, depth: length }, scene);
  fuse.material = mat;
  fuse.parent = root;

  const wings = MeshBuilder.CreateBox(`${name}_wing`, { width: length * 0.9, height: 0.25, depth: span * 0.55 }, scene);
  wings.material = mat;
  wings.parent = root;

  gfx.registerShadowCaster(root, true);
  return root;
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
