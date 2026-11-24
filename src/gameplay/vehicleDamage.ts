import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { GameRegistry } from '../core/registry';
import type { VehicleStateData } from '../core/types';
import { clamp } from '../core/types';
import type { VehicleHandlingProfile } from './vehicleModels';

export interface VehicleRuntime {
  data: VehicleStateData;
  profile: VehicleHandlingProfile;
  root: TransformNode;
  chassis: Mesh;
  hood: Mesh;
  bodyMat: PBRMaterial;
  wheels: Mesh[];
  velocity: Vector3;
  angularVelY: number;
  steerAngle: number;
  rpm: number;
  gear: number;
  wheelRoll: number;
  pitchAngle: number;
  rollAngle: number;
  isHydroplaning: boolean;
  cockpitView: boolean;
}

export interface DetachedDebrisPart {
  mesh: Mesh;
  vel: Vector3;
  lifeSec: number;
}

export function applyVehicleTuningVisuals(rt: VehicleRuntime): void {
  rt.bodyMat.albedoColor = Color3.FromHexString(rt.data.tuning.primaryColorHex);
  rt.bodyMat.metallic = rt.data.tuning.metallic;
}

export function repairVehicleRuntime(rt: VehicleRuntime, registry: GameRegistry, costCents = 0): void {
  rt.data.damage = { front: 0, rear: 0, left: 0, right: 0, engine: 0, detachedParts: [] };
  rt.data.fuelLiters = rt.data.maxFuelLiters;
  rt.data.fuelLeakRate = 0;
  rt.hood.isVisible = true;
  rt.chassis.scaling.set(1, 1, 1);
  registry.events.emit('vehicle:repaired', { vehicleId: rt.data.id, costCents });
}

export function applyVehicleImpactDamage(
  rt: VehicleRuntime,
  scene: Scene,
  registry: GameRegistry,
  detachedParts: DetachedDebrisPart[],
  impactEnergy: number,
  zone: 'front' | 'rear' | 'left' | 'right'
): void {
  const norm = clamp(impactEnergy / 120000, 0.05, 0.55);
  rt.data.damage[zone] = clamp(rt.data.damage[zone] + norm, 0, 1);
  rt.data.damage.engine = clamp(rt.data.damage.engine + norm * 0.45, 0, 1);
  if (zone === 'front' && rt.data.damage.front > 0.45 && rt.hood.isVisible) {
    rt.hood.isVisible = false;
    rt.data.damage.detachedParts.push('hood');
    const debris = MeshBuilder.CreateBox(
      `debris_${Date.now()}`,
      { width: rt.profile.width * 0.8, height: 0.1, depth: 1.1 },
      scene
    );
    debris.position.set(rt.data.position.x, rt.data.position.y + 1.6, rt.data.position.z);
    debris.material = rt.bodyMat;
    detachedParts.push({
      mesh: debris,
      vel: new Vector3((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6),
      lifeSec: 8,
    });
  }
  if (rt.data.damage.engine > 0.65) {
    rt.data.fuelLeakRate = 0.25;
  }
  rt.chassis.scaling.z = 1 - (rt.data.damage.front + rt.data.damage.rear) * 0.08;
  registry.events.emit('vehicle:damaged', { vehicleId: rt.data.id, impactEnergy, zone });
}

export function stepDetachedDebris(detachedParts: DetachedDebrisPart[], fixedDt: number): void {
  for (let i = detachedParts.length - 1; i >= 0; i--) {
    const part = detachedParts[i];
    part.lifeSec -= fixedDt;
    part.vel.y -= 9.81 * fixedDt;
    part.mesh.position.addInPlace(part.vel.scale(fixedDt));
    if (part.mesh.position.y < 0.6) {
      part.mesh.position.y = 0.6;
      part.vel.scaleInPlace(0.4);
    }
    if (part.lifeSec <= 0) {
      part.mesh.dispose();
      detachedParts.splice(i, 1);
    }
  }
}
