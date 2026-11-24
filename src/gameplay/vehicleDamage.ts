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
  steeringWheel: Mesh;
  spoiler: Mesh;
  bodyMat: PBRMaterial;
  glassMat: PBRMaterial;
  rimMat: PBRMaterial;
  brakeLightMat: PBRMaterial;
  reverseLightMat: PBRMaterial;
  headLightMat: PBRMaterial;
  underglowMat: PBRMaterial;
  underglowPlane: Mesh;
  wheels: TransformNode[];
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
  lateralSlipMps: number;
}

export interface DetachedDebrisPart {
  mesh: Mesh;
  vel: Vector3;
  lifeSec: number;
}

export function applyVehicleTuningVisuals(rt: VehicleRuntime): void {
  const t = rt.data.tuning;
  rt.bodyMat.albedoColor = Color3.FromHexString(t.primaryColorHex);
  rt.bodyMat.metallic = t.metallic;
  rt.bodyMat.clearCoat.tintColor = Color3.FromHexString(t.pearlescentHex || '#ffffff');
  rt.spoiler.isVisible = t.spoilerId !== 'none';
  rt.glassMat.alpha = clamp(0.95 - (t.windowTint ?? 0.25) * 0.45, 0.35, 0.92);

  if (t.wheelType === 'chrome') {
    rt.rimMat.albedoColor = new Color3(0.92, 0.94, 0.98);
    rt.rimMat.metallic = 0.98;
  } else if (t.wheelType === 'sport') {
    rt.rimMat.albedoColor = new Color3(0.18, 0.2, 0.24);
    rt.rimMat.metallic = 0.85;
  } else if (t.wheelType === 'offroad') {
    rt.rimMat.albedoColor = new Color3(0.45, 0.42, 0.36);
    rt.rimMat.metallic = 0.55;
  }

  rt.underglowPlane.isVisible = Boolean(t.underglowEnabled);
  if (t.underglowEnabled) {
    const col = Color3.FromHexString(t.underglowHex || '#00f0ff');
    rt.underglowMat.albedoColor = col;
    rt.underglowMat.emissiveColor = col;
  }
}

export function stepVehicleLightsAndDroplets(
  rt: VehicleRuntime,
  throttleIn: number,
  forwardSpeed: number,
  handbrake: boolean,
  wetness: number,
  elapsedSec: number
): void {
  const braking = handbrake || (forwardSpeed > 1.2 && throttleIn < -0.1) || (Math.abs(forwardSpeed) < 0.8 && throttleIn === 0);
  const reversing = forwardSpeed < -0.5 || (forwardSpeed <= 0.4 && throttleIn < -0.1);
  rt.brakeLightMat.emissiveColor = braking ? new Color3(1.0, 0.08, 0.08) : new Color3(0.28, 0.02, 0.02);
  rt.reverseLightMat.emissiveColor = reversing ? new Color3(0.95, 0.98, 1.0) : new Color3(0, 0, 0);

  // Clear-coat rain droplets visibility & sheen response
  if (rt.bodyMat.clearCoat.bumpTexture) {
    rt.bodyMat.clearCoat.bumpTexture.level = wetness > 0.2 ? clamp(wetness * 0.65, 0.08, 0.7) : 0.0;
  }
  rt.bodyMat.clearCoat.roughness = wetness > 0.2 ? 0.03 : 0.06;

  // Dynamic RGB neon underglow modes
  if (rt.data.tuning.underglowEnabled) {
    const mode = rt.data.tuning.underglowMode ?? 'static';
    if (mode === 'rainbow') {
      const r = 0.5 + 0.5 * Math.sin(elapsedSec * 2.4);
      const g = 0.5 + 0.5 * Math.sin(elapsedSec * 2.4 + 2.09);
      const b = 0.5 + 0.5 * Math.sin(elapsedSec * 2.4 + 4.18);
      rt.underglowMat.emissiveColor = new Color3(r, g, b);
    } else if (mode === 'pulse') {
      const base = Color3.FromHexString(rt.data.tuning.underglowHex || '#00f0ff');
      const pulse = 0.45 + 0.55 * Math.sin(elapsedSec * 4.2);
      rt.underglowMat.emissiveColor = base.scale(pulse);
    }
  }
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
