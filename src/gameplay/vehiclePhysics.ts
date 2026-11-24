/**
 * MODULE 10 – fahrzeug_physik.js
 * Multi-class Vehicle Physics: 4-Point Suspension, Torque Curve / RPM / Gears,
 * Surface Grip & Hydroplaning, Deformation Zones & Detachable Parts, Fuel & Breakdowns,
 * Cockpit View + Rear-View Mirror Budget, Theft State & Alarm, and Trailers/Towing.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { CharacterId, Vec3, VehicleClass, VehicleStateData } from '../core/types';
import { clamp } from '../core/types';
import type { InputActionState } from '../core/input';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { WeatherClimateSystem } from '../world/weatherSystem';
import type { PlayerController } from './playerController';
import {
  buildVehicleVisualRig,
  HANDLING_PROFILES,
  INITIAL_FLEET_SPECS,
  type VehicleHandlingProfile,
} from './vehicleModels';
import {
  applyVehicleImpactDamage,
  applyVehicleTuningVisuals,
  repairVehicleRuntime,
  stepDetachedDebris,
  type DetachedDebrisPart,
  type VehicleRuntime,
} from './vehicleDamage';

export type { VehicleHandlingProfile, VehicleRuntime };

export class VehiclePhysicsSystem implements GameModule {
  public readonly moduleId = 'fahrzeug_physik';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private weather!: WeatherClimateSystem;
  private player!: PlayerController;
  private scene!: Scene;

  public runtimes = new Map<string, VehicleRuntime>();
  private detachedParts: DetachedDebrisPart[] = [];

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.weather = registry.getModule<WeatherClimateSystem>('welt_und_wetter');
    this.player = registry.getModule<PlayerController>('spieler_steuerung');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.spawnInitialFleet();
    this.readiness = 'initialized';
  }

  private spawnInitialFleet(): void {
    for (const spec of INITIAL_FLEET_SPECS) {
      this.spawnVehicle(spec);
    }
  }

  spawnVehicle(opts: {
    id: string;
    modelId: string;
    vehicleClass: VehicleClass;
    name: string;
    ownerCharacter: CharacterId | 'npc' | 'service' | 'police';
    plate: string;
    position: Vec3;
    yaw: number;
    colorHex: string;
    locked?: boolean;
    attachedTrailerId?: string | null;
    cargoWeightKg?: number;
  }): VehicleRuntime {
    if (this.runtimes.has(opts.id)) return this.runtimes.get(opts.id)!;

    const profile = HANDLING_PROFILES[opts.vehicleClass];
    const data: VehicleStateData = {
      id: opts.id,
      modelId: opts.modelId,
      vehicleClass: opts.vehicleClass,
      name: opts.name,
      ownerCharacter: opts.ownerCharacter,
      plate: opts.plate,
      position: { ...opts.position },
      yaw: opts.yaw,
      massKg: profile.massKg,
      fuelLiters: 64,
      maxFuelLiters: 70,
      fuelLeakRate: 0,
      locked: opts.locked ?? false,
      alarmActive: false,
      stolen: false,
      tuning: {
        engineLevel: 0,
        torqueLevel: 0,
        suspensionHeightOffset: 0,
        spoilerId: 'stock',
        primaryColorHex: opts.colorHex,
        pearlescentHex: '#ffffff',
        metallic: 0.72,
        wheelType: 'stock',
        tireCompound: 'street',
      },
      damage: { front: 0, rear: 0, left: 0, right: 0, engine: 0, detachedParts: [] },
      trunkWeapons: [],
      trunkMaxSlots: opts.vehicleClass === 'motorcycle' ? 0 : 4,
      cargoWeightKg: opts.cargoWeightKg ?? 0,
      attachedTrailerId: opts.attachedTrailerId ?? null,
      driverId: null,
    };
    this.registry.state.vehicles.set(opts.id, data);

    const { root, chassis, hood, bodyMat, wheels } = buildVehicleVisualRig(
      this.scene,
      this.gfx,
      opts.id,
      opts.vehicleClass,
      profile,
      opts.colorHex
    );
    root.position.set(opts.position.x, opts.position.y, opts.position.z);
    root.rotation.y = opts.yaw;

    const runtime: VehicleRuntime = {
      data,
      profile,
      root,
      chassis,
      hood,
      bodyMat,
      wheels,
      velocity: Vector3.Zero(),
      angularVelY: 0,
      steerAngle: 0,
      rpm: 900,
      gear: 1,
      wheelRoll: 0,
      pitchAngle: 0,
      rollAngle: 0,
      isHydroplaning: false,
      cockpitView: false,
    };
    this.runtimes.set(opts.id, runtime);
    return runtime;
  }

  applyTuningChange(vehicleId: string): void {
    const rt = this.runtimes.get(vehicleId);
    if (rt) applyVehicleTuningVisuals(rt);
  }

  repairVehicle(vehicleId: string, costCents = 0): void {
    const rt = this.runtimes.get(vehicleId);
    if (rt) repairVehicleRuntime(rt, this.registry, costCents);
  }

  tryEnterNearestVehicle(): boolean {
    const char = this.registry.getActiveCharacter();
    if (char.inVehicleId !== null) return false;

    let best: VehicleRuntime | null = null;
    let bestDist = 4.5;
    for (const rt of this.runtimes.values()) {
      if (rt.data.vehicleClass === 'trailer') continue;
      const d = Math.hypot(rt.data.position.x - char.position.x, rt.data.position.z - char.position.z);
      if (d < bestDist) {
        bestDist = d;
        best = rt;
      }
    }
    if (!best) return false;

    // Theft state handling if locked NPC/Police vehicle
    if (best.data.locked && best.data.ownerCharacter !== char.id) {
      best.data.alarmActive = true;
      best.data.locked = false;
      best.data.stolen = true;
      const witnessed = Math.random() < 0.7;
      this.registry.events.emit('vehicle:stolen', {
        vehicleId: best.data.id,
        characterId: char.id,
        witnessed,
      });
    }

    best.data.driverId = char.id;
    char.inVehicleId = best.data.id;
    char.locomotion = 'vehicle';
    this.player.syncRigFromState(char.id);
    this.registry.events.emit('vehicle:entered', {
      vehicleId: best.data.id,
      characterId: char.id,
      seat: 'driver',
    });
    return true;
  }

  exitCurrentVehicle(): boolean {
    const char = this.registry.getActiveCharacter();
    if (!char.inVehicleId) return false;
    const rt = this.runtimes.get(char.inVehicleId);
    const prevId = char.inVehicleId;
    if (rt) {
      rt.data.driverId = null;
      char.position = {
        x: rt.data.position.x - Math.cos(rt.data.yaw) * 2.3,
        y: rt.data.position.y + 0.1,
        z: rt.data.position.z + Math.sin(rt.data.yaw) * 2.3,
      };
    }
    char.inVehicleId = null;
    char.locomotion = 'idle';
    this.player.syncRigFromState(char.id);
    this.registry.events.emit('vehicle:exited', { vehicleId: prevId, characterId: char.id });
    return true;
  }

  toggleCockpitCamera(): void {
    const char = this.registry.getActiveCharacter();
    if (!char.inVehicleId) return;
    const rt = this.runtimes.get(char.inVehicleId);
    if (rt) rt.cockpitView = !rt.cockpitView;
  }

  applyImpactDamage(rt: VehicleRuntime, impactEnergy: number, zone: 'front' | 'rear' | 'left' | 'right'): void {
    applyVehicleImpactDamage(rt, this.scene, this.registry, this.detachedParts, impactEnergy, zone);
  }

  stepPlayerVehicleInput(input: InputActionState, fixedDt: number): void {
    const char = this.registry.getActiveCharacter();
    if (input.enterVehiclePressed) {
      if (char.inVehicleId) {
        this.exitCurrentVehicle();
      } else {
        this.tryEnterNearestVehicle();
      }
      return;
    }

    if (!char.inVehicleId) return;
    const rt = this.runtimes.get(char.inVehicleId);
    if (!rt) return;

    this.simulateVehicleStep(rt, input.moveY, input.moveX, input.handbrake, fixedDt);
    char.position = { ...rt.data.position };
    char.yaw = rt.data.yaw;
    char.attributes.driving = clamp(char.attributes.driving + (rt.velocity.length() > 8 ? fixedDt * 0.06 : 0), 0, 100);
  }

  public simulateVehicleStep(rt: VehicleRuntime, throttleIn: number, steerIn: number, handbrake: boolean, dt: number): void {
    const p = rt.profile;
    const d = rt.data;
    const surf = this.world.getSurfaceMaterial(d.position.x, d.position.z);
    const wetness = this.weather.currentWetness;

    const fwd = new Vector3(Math.sin(d.yaw), 0, Math.cos(d.yaw));
    const right = new Vector3(Math.cos(d.yaw), 0, -Math.sin(d.yaw));
    const forwardSpeed = Vector3.Dot(rt.velocity, fwd);
    const lateralSpeed = Vector3.Dot(rt.velocity, right);

    // Surface & hydroplaning grip calculation
    let surfaceGrip = 1.0;
    if (surf === 'wet_asphalt') surfaceGrip = 0.82 - wetness * 0.14;
    else if (surf === 'gravel') surfaceGrip = 0.78;
    else if (surf === 'sand') surfaceGrip = 0.66;
    else if (surf === 'mud') surfaceGrip = 0.54;

    const compoundMult = d.tuning.tireCompound === 'sport' ? 1.12 : d.tuning.tireCompound === 'allterrain' ? 1.05 : 1.0;
    const absSpeed = Math.abs(forwardSpeed);
    rt.isHydroplaning = wetness > 0.55 && absSpeed > 22 && d.tuning.tireCompound !== 'allterrain';
    if (rt.isHydroplaning) {
      surfaceGrip *= 0.42; // Gradual hydroplaning loss of traction, never teleporting
    }

    const effectiveGrip = p.baseGrip * surfaceGrip * compoundMult * (handbrake ? 0.45 : 1.0);
    const totalMass = p.massKg + d.cargoWeightKg;
    const engineHealthMult = clamp(1 - d.damage.engine * 0.75, 0.1, 1);
    const canDrive = d.fuelLiters > 0 && d.damage.engine < 0.96;

    // Torque curve & gearing
    const gearIdx = clamp(rt.gear - 1, 0, p.gearRatios.length - 1);
    const gearRatio = p.gearRatios[gearIdx];
    const powerBonus = 1 + d.tuning.engineLevel * 0.14 + d.tuning.torqueLevel * 0.1;
    const driveTorque = canDrive ? throttleIn * p.maxTorqueNm * powerBonus * gearRatio * engineHealthMult : 0;

    // Longitudinal drive force & aerodynamic drag
    const driveForce = driveTorque / 0.36;
    const aeroDrag = 0.5 * 1.225 * p.dragCoeff * 2.2 * forwardSpeed * absSpeed;
    const rollingRes = forwardSpeed * 18;
    const brakeForce = handbrake ? -Math.sign(forwardSpeed) * totalMass * 12 : 0;

    const longAccel = (driveForce - aeroDrag - rollingRes + brakeForce) / totalMass;
    const nextForward = forwardSpeed + longAccel * dt;

    // Lateral tire friction
    const maxLatAccel = effectiveGrip * 9.81;
    const latFriction = clamp(-lateralSpeed / Math.max(0.05, dt), -maxLatAccel, maxLatAccel);
    const nextLateral = lateralSpeed + latFriction * dt;

    rt.velocity = fwd.scale(nextForward).add(right.scale(nextLateral));

    // Steering & yaw dynamics
    const targetSteer = steerIn * p.steerMaxRad * clamp(1 - absSpeed / 55, 0.35, 1);
    rt.steerAngle += (targetSteer - rt.steerAngle) * clamp(dt * 9, 0, 1);
    const yawRate = (nextForward / Math.max(2.2, p.length * 0.65)) * Math.tan(rt.steerAngle) * clamp(effectiveGrip, 0.4, 1.2);
    d.yaw += yawRate * dt;

    // Integrate position & ground suspension across full Leonida world
    d.position.x = clamp(d.position.x + rt.velocity.x * dt, -1680, 640);
    d.position.z = clamp(d.position.z + rt.velocity.z * dt, -1480, 1420);
    const groundY = this.world.getTerrainHeight(d.position.x, d.position.z);
    d.position.y = groundY + 0.08 + d.tuning.suspensionHeightOffset;

    // Suspension roll & pitch response
    const targetPitch = clamp(-longAccel * 0.012, -0.09, 0.09);
    const targetRoll = clamp(yawRate * absSpeed * 0.008, -0.11, 0.11);
    rt.pitchAngle += (targetPitch - rt.pitchAngle) * clamp(dt * 10, 0, 1);
    rt.rollAngle += (targetRoll - rt.rollAngle) * clamp(dt * 10, 0, 1);

    // RPM & auto gearbox
    const wheelRpm = (absSpeed / (2 * Math.PI * 0.36)) * 60;
    rt.rpm = clamp(850 + wheelRpm * gearRatio * 3.4 + Math.abs(throttleIn) * 600, 800, p.maxRpm);
    if (rt.rpm > p.maxRpm * 0.88 && rt.gear < p.gearRatios.length) rt.gear++;
    else if (rt.rpm < p.maxRpm * 0.34 && rt.gear > 1) rt.gear--;

    // Fuel consumption & leak
    const fuelBurn = (Math.abs(throttleIn) * 0.015 + d.fuelLeakRate) * dt;
    d.fuelLiters = Math.max(0, d.fuelLiters - fuelBurn);

    // Visual transforms
    rt.root.position.set(d.position.x, d.position.y, d.position.z);
    rt.root.rotation.set(rt.pitchAngle, d.yaw, rt.rollAngle);
    rt.wheelRoll += (nextForward * dt) / 0.36;
    rt.wheels.forEach((w, idx) => {
      w.rotation.x = rt.wheelRoll;
      if (idx < 2) w.rotation.y = rt.steerAngle;
    });

    // Coupled Trailer articulation
    if (d.attachedTrailerId) {
      const trailer = this.runtimes.get(d.attachedTrailerId);
      if (trailer) {
        const hitchX = d.position.x - Math.sin(d.yaw) * 3.6;
        const hitchZ = d.position.z - Math.cos(d.yaw) * 3.6;
        const dx = hitchX - trailer.data.position.x;
        const dz = hitchZ - trailer.data.position.z;
        trailer.data.yaw = Math.atan2(dx, dz);
        trailer.data.position.x = hitchX - Math.sin(trailer.data.yaw) * 3.2;
        trailer.data.position.z = hitchZ - Math.cos(trailer.data.yaw) * 3.2;
        trailer.data.position.y = this.world.getTerrainHeight(trailer.data.position.x, trailer.data.position.z) + 0.08;
        trailer.root.position.set(trailer.data.position.x, trailer.data.position.y, trailer.data.position.z);
        trailer.root.rotation.y = trailer.data.yaw;
      }
    }
  }

  start(): void {
    this.readiness = 'running';
  }

  fixedUpdate(fixedDt: number): void {
    stepDetachedDebris(this.detachedParts, fixedDt);
  }

  update(_simDt: number, renderDt: number): void {
    const char = this.registry.getActiveCharacter();
    if (!char.inVehicleId || this.registry.state.directorModeActive) return;
    const rt = this.runtimes.get(char.inVehicleId);
    if (!rt) return;

    if (rt.cockpitView) {
      const fwd = new Vector3(Math.sin(rt.data.yaw), 0, Math.cos(rt.data.yaw));
      this.player.camera.position.set(rt.data.position.x, rt.data.position.y + 1.38, rt.data.position.z);
      this.player.camera.setTarget(this.player.camera.position.add(fwd.scale(15)));
    } else {
      const speed = rt.velocity.length();
      this.player.camera.fov = clamp(0.92 + speed * 0.005, 0.92, 1.15);
      this.player.updateCameraFollow(rt.data.position, false, renderDt, 7.2);
    }
  }

  getActiveVehicleRuntime(): VehicleRuntime | null {
    const id = this.registry.getActiveCharacter().inVehicleId;
    return id ? this.runtimes.get(id) ?? null : null;
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const rt of this.runtimes.values()) rt.root.dispose();
    for (const d of this.detachedParts) d.mesh.dispose();
    this.runtimes.clear();
    this.detachedParts = [];
    this.readiness = 'disposed';
  }
}
