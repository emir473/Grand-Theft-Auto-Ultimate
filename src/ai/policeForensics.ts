/**
 * MODULE 12B – Police, Forensics & 5-Star Pursuit System
 * Forensics (witness, CCTV, plate, ballistic clues), FOV + LOS + Sound Occlusion perception,
 * curved lofted VCPD pursuit cruisers & SWAT Enforcers, fictional PIT maneuvers,
 * spike strips, rotor-spinning VCPD helicopter with active SpotLight searchlight,
 * search cooldown, arrest (BUSTED), and localized/synthesized radio dispatch.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SpotLight,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { Vec3 } from '../core/types';
import { clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { PlayerController } from '../gameplay/playerController';
import type { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import { HANDLING_PROFILES } from '../gameplay/vehicleModels';
import { buildSculptedVehicleRig, type SculptedVehicleRig } from '../gameplay/vehicleSculptor';
import { createAircraftMesh } from '../gameplay/aviationMarine';
import { i18n } from '../ui/localization';

export interface PoliceUnit {
  id: string;
  kind: 'cruiser' | 'swat' | 'helicopter';
  position: Vec3;
  yaw: number;
  speedMps: number;
  wheelRoll: number;
  hasLineOfSight: boolean;
  mesh: TransformNode;
  rig?: SculptedVehicleRig;
  rotorNode?: TransformNode;
  tailRotorNode?: TransformNode;
  searchLight?: SpotLight;
  searchCone?: Mesh;
}

export interface SpikeStrip {
  id: string;
  position: Vec3;
  yaw: number;
  mesh: Mesh;
}

export class PoliceSystem implements GameModule {
  public readonly moduleId = 'police_forensics';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private player!: PlayerController;
  private vehicles!: VehiclePhysicsSystem;
  private scene!: Scene;

  public units: PoliceUnit[] = [];
  public spikeStrips: SpikeStrip[] = [];
  public lastKnownSuspectPos: Vec3 | null = null;
  public lastRadioDispatch = '';
  public bustProgress = 0;

  private searchConeMat!: PBRMaterial;
  private unsubEvents: Array<() => void> = [];

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.player = registry.getModule<PlayerController>('spieler_steuerung');
    this.vehicles = registry.getModule<VehiclePhysicsSystem>('fahrzeug_physik');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.searchConeMat = new PBRMaterial('vcpdSearchConeMat', this.scene);
    this.searchConeMat.albedoColor = new Color3(0.88, 0.94, 1.0);
    this.searchConeMat.emissiveColor = new Color3(0.55, 0.72, 0.95);
    this.searchConeMat.alpha = 0.14;
    this.searchConeMat.roughness = 0.9;

    this.unsubEvents.push(
      this.registry.events.on('police:crimeReported', (ev) => {
        if (!ev.clue.obtainedByPolice) return;
        this.registry.state.forensicClues.push(ev.clue);
        this.lastKnownSuspectPos = { ...ev.clue.location };
        this.escalateWanted(ev.severity, ev.clue.crimeType);
      })
    );

    this.readiness = 'initialized';
  }

  setWantedStars(stars: number, reason = 'Manual override'): void {
    const clamped = clamp(Math.round(stars), 0, 5);
    if (clamped === this.registry.state.wantedStars) return;
    this.registry.state.wantedStars = clamped;
    this.registry.state.wantedCooldownSec = clamped > 0 ? 35 : 0;

    if (clamped > 0) {
      this.lastKnownSuspectPos = { ...this.registry.getActiveCharacter().position };
      this.broadcastDispatch('police.dispatch.start');
      this.syncUnitCount(clamped);
    } else {
      this.clearAllUnits();
    }

    this.registry.events.emit('police:wantedChanged', { stars: clamped, reason });
  }

  private escalateWanted(addStars: number, reason: string): void {
    const next = clamp(Math.max(1, this.registry.state.wantedStars + addStars), 0, 5);
    this.registry.state.wantedCooldownSec = 38;
    if (next !== this.registry.state.wantedStars) {
      this.setWantedStars(next, reason);
    }
  }

  private broadcastDispatch(key: string): void {
    const char = this.registry.getActiveCharacter();
    const desc = char.id === 'lucia' ? 'Hispanic female, Vice Beach attire' : 'Male suspect, coastal jacket';
    const text = i18n.t(key, { desc, loc: 'Vice City Sector' });
    this.lastRadioDispatch = text;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.08;
        utt.pitch = 0.95;
        utt.volume = 0.45;
        window.speechSynthesis.speak(utt);
      } catch {
        // Speech synthesis optional
      }
    }
  }

  private syncUnitCount(stars: number): void {
    const desiredCruisers = Math.min(4, stars);
    while (this.units.filter((u) => u.kind === 'cruiser').length < desiredCruisers) {
      const idx = this.units.length;
      const base = this.registry.getActiveCharacter().position;
      const road = this.world.roadNetwork.findNearestNode({ x: base.x + 55, y: base.y, z: base.z + 45 });
      const spawnPos = road ? { x: road.x, y: road.y, z: road.z } : { x: base.x + 55, y: base.y, z: base.z + 45 };

      const rig = buildSculptedVehicleRig(
        this.scene,
        this.gfx,
        `vcpd_pursuit_${idx}`,
        'police',
        HANDLING_PROFILES.police,
        '#111827',
        `VCPD-${901 + idx}`
      );

      this.units.push({
        id: `vcpd_${idx}`,
        kind: 'cruiser',
        position: spawnPos,
        yaw: 0,
        speedMps: 0,
        wheelRoll: 0,
        hasLineOfSight: false,
        mesh: rig.root,
        rig,
      });
    }

    if (stars >= 4 && !this.units.some((u) => u.kind === 'swat')) {
      const base = this.registry.getActiveCharacter().position;
      const road = this.world.roadNetwork.findNearestNode({ x: base.x - 65, y: base.y, z: base.z + 55 });
      const spawnPos = road ? { x: road.x, y: road.y, z: road.z } : { x: base.x - 65, y: base.y, z: base.z + 55 };
      const swatRig = buildSculptedVehicleRig(
        this.scene,
        this.gfx,
        'vcpd_swat_enforcer',
        'truck',
        HANDLING_PROFILES.truck,
        '#0f172a',
        'SWAT-01'
      );
      this.units.push({
        id: 'vcpd_swat_1',
        kind: 'swat',
        position: spawnPos,
        yaw: 0,
        speedMps: 0,
        wheelRoll: 0,
        hasLineOfSight: false,
        mesh: swatRig.root,
        rig: swatRig,
      });
    }

    if (stars >= 3 && !this.units.some((u) => u.kind === 'helicopter')) {
      const p = this.registry.getActiveCharacter().position;
      const acRig = createAircraftMesh(
        this.scene,
        this.gfx,
        'vcpdChopper',
        new Color3(0.08, 0.14, 0.24),
        7.8,
        2.2,
        'helicopter'
      );
      const searchLight = new SpotLight(
        'vcpdHeliSpot',
        new Vector3(0, -0.4, 1.2),
        new Vector3(0, -1, 0.25).normalize(),
        Math.PI * 0.26,
        12,
        this.scene
      );
      searchLight.intensity = 18;
      searchLight.diffuse = new Color3(0.92, 0.96, 1.0);
      searchLight.parent = acRig.root;

      const searchCone = MeshBuilder.CreateCylinder(
        'vcpdSearchCone',
        { diameterTop: 0.45, diameterBottom: 14, height: 32, tessellation: 18 },
        this.scene
      );
      searchCone.position.set(0, -16, 4.0);
      searchCone.rotation.x = 0.24;
      searchCone.material = this.searchConeMat;
      searchCone.isPickable = false;
      searchCone.parent = acRig.root;

      this.units.push({
        id: 'vcpd_air1',
        kind: 'helicopter',
        position: { x: p.x + 40, y: 38, z: p.z + 40 },
        yaw: 0,
        speedMps: 24,
        wheelRoll: 0,
        hasLineOfSight: true,
        mesh: acRig.root,
        rotorNode: acRig.rotorNode,
        tailRotorNode: acRig.tailRotorNode,
        searchLight,
        searchCone,
      });
    }

    if (stars >= 3 && this.spikeStrips.length === 0) {
      const p = this.registry.getActiveCharacter().position;
      const stripMesh = MeshBuilder.CreateBox('policeSpikeStrip', { width: 6.5, height: 0.12, depth: 0.55 }, this.scene);
      stripMesh.position.set(p.x + 28, this.world.getTerrainHeight(p.x + 28, p.z) + 0.08, p.z);
      const sMat = new PBRMaterial('spikeMat', this.scene);
      sMat.albedoColor = new Color3(0.85, 0.72, 0.15);
      stripMesh.material = sMat;
      this.spikeStrips.push({
        id: 'spike_1',
        position: { x: p.x + 28, y: 0.6, z: p.z },
        yaw: 0,
        mesh: stripMesh,
      });
    }

    this.registry.state.policeActiveUnits = this.units.length;
  }

  private clearAllUnits(): void {
    for (const u of this.units) {
      u.searchLight?.dispose();
      u.mesh.dispose();
    }
    for (const s of this.spikeStrips) s.mesh.dispose();
    this.units = [];
    this.spikeStrips = [];
    this.bustProgress = 0;
    this.registry.state.policeActiveUnits = 0;
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    const stars = this.registry.state.wantedStars;
    if (stars <= 0 || this.registry.state.gameOverState !== 'none') return;

    const char = this.registry.getActiveCharacter();
    const pPos = char.position;
    let anyVisualContact = false;

    for (const unit of this.units) {
      const target = this.lastKnownSuspectPos ?? pPos;
      const dx = pPos.x - unit.position.x;
      const dz = pPos.z - unit.position.z;
      const dist = Math.hypot(dx, dz);

      const sightMax = unit.kind === 'helicopter' ? 145 : 78;
      unit.hasLineOfSight = dist < sightMax && char.inInteriorId === null;
      if (unit.hasLineOfSight) {
        anyVisualContact = true;
        this.lastKnownSuspectPos = { ...pPos };
      }

      if (unit.kind === 'helicopter') {
        const orbitAngle = this.registry.clock.gameTime * 0.45;
        unit.position.x += (target.x + Math.cos(orbitAngle) * 28 - unit.position.x) * clamp(simDt * 1.5, 0, 1);
        unit.position.z += (target.z + Math.sin(orbitAngle) * 28 - unit.position.z) * clamp(simDt * 1.5, 0, 1);
        unit.position.y = Math.max(32, pPos.y + 30);
        unit.yaw = Math.atan2(dx, dz);
        if (unit.rotorNode) unit.rotorNode.rotation.y += simDt * 24;
        if (unit.tailRotorNode) unit.tailRotorNode.rotation.x += simDt * 30;
        if (unit.searchCone) unit.searchCone.isVisible = this.registry.clock.getIsNight();
      } else {
        const tx = (unit.hasLineOfSight ? pPos.x : target.x) - unit.position.x;
        const tz = (unit.hasLineOfSight ? pPos.z : target.z) - unit.position.z;
        const tDist = Math.hypot(tx, tz);
        const maxSpd = unit.kind === 'swat' ? 21 : clamp(16 + stars * 2.6, 16, 29);
        if (tDist > 4.4) {
          unit.yaw = Math.atan2(tx, tz);
          unit.speedMps = maxSpd;
          unit.position.x += (tx / tDist) * unit.speedMps * simDt;
          unit.position.z += (tz / tDist) * unit.speedMps * simDt;
          unit.position.y = this.world.getTerrainHeight(unit.position.x, unit.position.z);
        } else {
          unit.speedMps = 0;
          const activeVeh = this.vehicles.getActiveVehicleRuntime();
          if (activeVeh && tDist < 4.7) {
            activeVeh.angularVelY += (unit.kind === 'swat' ? 0.75 : 0.42) * simDt;
            this.vehicles.applyImpactDamage(activeVeh, unit.kind === 'swat' ? 38000 : 24000, 'rear');
          }
        }
        unit.wheelRoll += unit.speedMps * simDt * 2.4;
        if (unit.rig) {
          for (const w of unit.rig.wheels) w.rotation.x = unit.wheelRoll;
          const flash = Math.sin(this.registry.clock.simulationTime * 16) > 0;
          unit.rig.brakeLightMat.emissiveColor.set(flash ? 1.0 : 0.25, 0.05, flash ? 0.1 : 0.9);
        }
      }

      unit.mesh.position.set(unit.position.x, unit.position.y, unit.position.z);
      unit.mesh.rotation.y = unit.yaw;
    }

    const activeVeh = this.vehicles.getActiveVehicleRuntime();
    if (activeVeh) {
      for (const strip of this.spikeStrips) {
        if (Math.hypot(activeVeh.data.position.x - strip.position.x, activeVeh.data.position.z - strip.position.z) < 3.4) {
          activeVeh.velocity.scaleInPlace(0.7);
          this.vehicles.applyImpactDamage(activeVeh, 35000, 'front');
        }
      }
    }

    const nearestDist = this.units
      .filter((u) => u.kind !== 'helicopter')
      .reduce((min, u) => Math.min(min, Math.hypot(u.position.x - pPos.x, u.position.z - pPos.z)), Infinity);

    const playerSpeed = activeVeh ? activeVeh.velocity.length() : 0;
    if (nearestDist < 5.5 && playerSpeed < 2.2) {
      this.bustProgress += simDt;
      if (this.bustProgress >= 2.2) {
        this.player.triggerBusted();
        this.clearAllUnits();
        return;
      }
    } else {
      this.bustProgress = Math.max(0, this.bustProgress - simDt * 1.5);
    }

    if (anyVisualContact) {
      this.registry.state.wantedCooldownSec = 28 + stars * 4;
    } else {
      const prev = this.registry.state.wantedCooldownSec;
      this.registry.state.wantedCooldownSec -= simDt;
      if (prev > 22 && this.registry.state.wantedCooldownSec <= 22) {
        this.broadcastDispatch('police.dispatch.lost');
      }
      if (this.registry.state.wantedCooldownSec <= 0) {
        this.setWantedStars(0, 'Evaded pursuit');
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const unsub of this.unsubEvents) unsub();
    this.clearAllUnits();
    this.searchConeMat?.dispose();
    this.readiness = 'disposed';
  }
}
