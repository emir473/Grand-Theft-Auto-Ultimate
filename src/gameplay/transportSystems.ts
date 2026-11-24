/**
 * MODULE 11 – stadt_luftfahrt_marine.js
 * Vice City International Airport (VCIA) 13-Phase Aircraft FSM & 10-Min Scheduler,
 * Flyable Aircraft Takeover, Marine Vessels on Gerstner Waves,
 * Public Transit (City Bus & Vice Metro Subway), and Military Restricted Zones (Fort Zancudo / Port Gellhorn).
 */

import { Color3, Scene, TransformNode } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { Vec3 } from '../core/types';
import { clamp } from '../core/types';
import type { InputActionState } from '../core/input';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { WaterDivingSystem } from '../world/waterDiving';
import type { PlayerController } from './playerController';
import {
  createAircraftMesh,
  stepAirlinerFlightPhase,
  type AircraftPhase,
  type AircraftUnit,
  type MarineUnit,
} from './aviationMarine';
import { buildSculptedBoatRig, buildSculptedTransitRig } from './marineSculptor';

export type { AircraftPhase, AircraftUnit, MarineUnit };

export interface TransitUnit {
  id: string;
  kind: 'subway' | 'bus';
  routeNodeIds: string[];
  routeIndex: number;
  dwellTimer: number;
  doorsOpen: boolean;
  position: Vec3;
  yaw: number;
  root: TransformNode;
}

export class TransportSystems implements GameModule {
  public readonly moduleId = 'stadt_luftfahrt_marine';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private water!: WaterDivingSystem;
  private player!: PlayerController;
  private scene!: Scene;

  public aircraft: AircraftUnit[] = [];
  public marine: MarineUnit[] = [];
  public transit: TransitUnit[] = [];
  public flightScheduleTimerSec = 600; // 10-minute target interval
  public runwayOccupied = false;
  public militaryAlertText: string | null = null;
  public activeCraftId: string | null = null;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.water = registry.getModule<WaterDivingSystem>('physik_wasser_tauchen');
    this.player = registry.getModule<PlayerController>('spieler_steuerung');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.spawnAircraft();
    this.spawnMarineFleet();
    this.spawnTransitFleet();
    this.readiness = 'initialized';
  }

  private spawnAircraft(): void {
    const airlinerRig = createAircraftMesh(this.scene, this.gfx, 'vca_101', new Color3(0.94, 0.96, 0.98), 16, 4.2, 'airliner');
    this.aircraft.push({
      id: 'ac_vca_101',
      callsign: 'VCA-101',
      kind: 'airliner',
      phase: 'parked',
      phaseTimer: 4,
      position: { x: -340, y: 1.5, z: -375 },
      yaw: Math.PI / 2,
      pitch: 0,
      bank: 0,
      speedMps: 0,
      pilotedByPlayer: false,
      root: airlinerRig.root,
      gearNode: airlinerRig.gearNode,
    });

    const heliRig = createAircraftMesh(this.scene, this.gfx, 'villa_heli', new Color3(0.15, 0.18, 0.24), 5.8, 2.2, 'helicopter');
    this.aircraft.push({
      id: 'ac_villa_heli',
      callsign: 'STAR-H1',
      kind: 'helicopter',
      phase: 'parked',
      phaseTimer: 0,
      position: { x: 34, y: 1.4, z: -4 },
      yaw: 0,
      pitch: 0,
      bank: 0,
      speedMps: 0,
      pilotedByPlayer: false,
      root: heliRig.root,
      rotorNode: heliRig.rotorNode,
      tailRotorNode: heliRig.tailRotorNode,
    });
  }

  private spawnMarineFleet(): void {
    const specs: Array<{ id: string; name: string; kind: MarineUnit['kind']; pos: Vec3; color: Color3; len: number; wid: number; mass: number; vol: number }> = [
      { id: 'boat_villa_yacht', name: 'Starlight Yacht', kind: 'yacht', pos: { x: 64, y: 0, z: 22 }, color: new Color3(0.95, 0.95, 0.97), len: 14, wid: 4.2, mass: 18000, vol: 38 },
      { id: 'boat_jetski_1', name: 'Seashark Coral', kind: 'jetski', pos: { x: 52, y: 0, z: -2 }, color: new Color3(0.95, 0.28, 0.48), len: 3.1, wid: 1.2, mass: 340, vol: 0.8 },
      { id: 'boat_cargo_1', name: 'Leonida Freighter', kind: 'cargo_ship', pos: { x: 265, y: 0, z: 80 }, color: new Color3(0.48, 0.2, 0.18), len: 32, wid: 8, mass: 120000, vol: 260 },
      { id: 'boat_police_1', name: 'VCPD Harbor Patrol', kind: 'police_boat', pos: { x: 96, y: 0, z: -65 }, color: new Color3(0.14, 0.22, 0.36), len: 8.5, wid: 2.6, mass: 4200, vol: 9 },
    ];

    for (const s of specs) {
      const root = buildSculptedBoatRig(this.scene, this.gfx, s.id, s.kind, s.color, s.wid, s.len);
      this.marine.push({
        id: s.id,
        name: s.name,
        kind: s.kind,
        position: { ...s.pos },
        yaw: 0,
        speedMps: 0,
        massKg: s.mass,
        displacedVolM3: s.vol,
        pilotedByPlayer: false,
        root,
      });
    }
  }

  private spawnTransitFleet(): void {
    const railNodes = this.world.roadNetwork.getRailStations();
    if (railNodes.length >= 2) {
      const subRoot = buildSculptedTransitRig(this.scene, this.gfx, 'subway');
      this.transit.push({
        id: 'transit_metro_1',
        kind: 'subway',
        routeNodeIds: railNodes.map((n) => n.id),
        routeIndex: 0,
        dwellTimer: 3,
        doorsOpen: true,
        position: { x: railNodes[0].x, y: railNodes[0].y, z: railNodes[0].z },
        yaw: 0,
        root: subRoot,
      });
    }

    const busNodes = ['ocean_south', 'ocean_mid', 'ocean_club', 'dt_bank', 'dt_hospital', 'vcia_terminal'];
    const busStart = this.world.roadNetwork.nodes.get(busNodes[0]);
    if (busStart) {
      const busRoot = buildSculptedTransitRig(this.scene, this.gfx, 'bus');
      this.transit.push({
        id: 'transit_bus_1',
        kind: 'bus',
        routeNodeIds: busNodes,
        routeIndex: 0,
        dwellTimer: 3,
        doorsOpen: true,
        position: { x: busStart.x, y: busStart.y, z: busStart.z },
        yaw: 0,
        root: busRoot,
      });
    }
  }

  triggerAirportFlightCycle(): boolean {
    const ac = this.aircraft.find((a) => a.id === 'ac_vca_101');
    if (!ac || ac.pilotedByPlayer || ac.phase !== 'parked' || this.runwayOccupied) return false;
    ac.phase = 'pushback';
    ac.phaseTimer = 2.0;
    this.runwayOccupied = true;
    return true;
  }

  tryBoardNearestCraft(): boolean {
    const char = this.registry.getActiveCharacter();
    if (this.activeCraftId) {
      // Disembark current boat/aircraft
      const ac = this.aircraft.find((a) => a.id === this.activeCraftId);
      if (ac) ac.pilotedByPlayer = false;
      const m = this.marine.find((b) => b.id === this.activeCraftId);
      if (m) m.pilotedByPlayer = false;
      this.activeCraftId = null;
      char.inVehicleId = null;
      this.player.syncRigFromState(char.id);
      return true;
    }

    for (const ac of this.aircraft) {
      if (Math.hypot(ac.position.x - char.position.x, ac.position.z - char.position.z) < 9) {
        ac.pilotedByPlayer = true;
        this.activeCraftId = ac.id;
        char.inVehicleId = ac.id;
        this.player.syncRigFromState(char.id);
        if (ac.kind === 'airliner') {
          this.registry.state.wantedStars = Math.max(this.registry.state.wantedStars, 3);
          this.registry.events.emit('police:wantedChanged', {
            stars: this.registry.state.wantedStars,
            reason: 'VCIA Airliner Hijacking',
          });
        }
        return true;
      }
    }

    for (const m of this.marine) {
      if (Math.hypot(m.position.x - char.position.x, m.position.z - char.position.z) < 7) {
        m.pilotedByPlayer = true;
        this.activeCraftId = m.id;
        char.inVehicleId = m.id;
        this.player.syncRigFromState(char.id);
        return true;
      }
    }

    for (const tr of this.transit) {
      if (Math.hypot(tr.position.x - char.position.x, tr.position.z - char.position.z) < 8) {
        this.activeCraftId = tr.id;
        char.inVehicleId = tr.id;
        this.player.syncRigFromState(char.id);
        return true;
      }
    }
    return false;
  }

  stepCraftInput(input: InputActionState, simDt: number): void {
    if (!this.activeCraftId) return;
    const char = this.registry.getActiveCharacter();

    const ac = this.aircraft.find((a) => a.id === this.activeCraftId);
    if (ac) {
      if (ac.kind === 'helicopter') {
        const lift = (input.jumpPressed || input.sprint ? 10 : input.diveDownHeld ? -8 : 0);
        ac.position.y = clamp(ac.position.y + lift * simDt, 1.4, 240);
        ac.yaw += input.moveX * 1.4 * simDt;
        ac.bank = clamp(-input.moveX * 0.35, -0.5, 0.5);
        ac.pitch = clamp(input.moveY * 0.25, -0.4, 0.4);
        ac.speedMps = input.moveY * 32;
        ac.position.x += Math.sin(ac.yaw) * ac.speedMps * simDt;
        ac.position.z += Math.cos(ac.yaw) * ac.speedMps * simDt;
      } else {
        ac.speedMps = clamp(ac.speedMps + input.moveY * 26 * simDt, 0, 88);
        ac.bank = clamp(-input.moveX * 0.55, -0.75, 0.75);
        ac.yaw += input.moveX * 0.85 * simDt;
        const climb = ac.speedMps > 32 ? (input.sprint ? 12 : input.diveDownHeld ? -10 : 1.5) : 0;
        ac.position.y = clamp(ac.position.y + climb * simDt, 1.5, 320);
        ac.position.x += Math.sin(ac.yaw) * ac.speedMps * simDt;
        ac.position.z += Math.cos(ac.yaw) * ac.speedMps * simDt;
      }
      char.position = { ...ac.position };
      this.player.updateCameraFollow(ac.position, false, simDt, 14);
      return;
    }

    const boat = this.marine.find((b) => b.id === this.activeCraftId);
    if (boat) {
      boat.yaw += input.moveX * 1.2 * simDt;
      boat.speedMps = clamp(boat.speedMps + input.moveY * 14 * simDt, -6, 28);
      boat.speedMps *= Math.pow(0.7, simDt);
      boat.position.x += Math.sin(boat.yaw) * boat.speedMps * simDt;
      boat.position.z += Math.cos(boat.yaw) * boat.speedMps * simDt;
      char.position = { ...boat.position };
      this.player.updateCameraFollow(boat.position, false, simDt, 9.5);
      return;
    }

    const tr = this.transit.find((t) => t.id === this.activeCraftId);
    if (tr) {
      char.position = { x: tr.position.x, y: tr.position.y + 0.8, z: tr.position.z };
      this.player.updateCameraFollow(tr.position, false, simDt, 11.5);
    }
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    // 1. Automated VCIA 10-minute air traffic scheduler
    this.flightScheduleTimerSec -= simDt;
    if (this.flightScheduleTimerSec <= 0) {
      this.flightScheduleTimerSec = 600;
      this.triggerAirportFlightCycle();
    }

    // 2. Aircraft phase state machine + helicopter rotors + gear retraction
    for (const ac of this.aircraft) {
      if (!ac.pilotedByPlayer && ac.kind === 'airliner') {
        stepAirlinerFlightPhase(ac, simDt, () => {
          this.runwayOccupied = false;
        });
      }
      if (ac.rotorNode) {
        const spinRate = ac.pilotedByPlayer || ac.position.y > 2.2 ? 22 : 3.5;
        ac.rotorNode.rotation.y += spinRate * simDt;
      }
      if (ac.tailRotorNode) {
        const spinRate = ac.pilotedByPlayer || ac.position.y > 2.2 ? 30 : 4.5;
        ac.tailRotorNode.rotation.x += spinRate * simDt;
      }
      if (ac.gearNode) {
        ac.gearNode.setEnabled(ac.position.y < 6.0);
      }
      ac.root.position.set(ac.position.x, ac.position.y, ac.position.z);
      ac.root.rotation.set(ac.pitch, ac.yaw, ac.bank);
    }

    // 3. Marine vessels buoyancy & Gerstner wave response
    for (const m of this.marine) {
      const surf = this.water.sampleWaterSurface(m.position.x, m.position.z);
      const subFrac = clamp((surf.height - m.position.y + 0.65) / 1.3, 0, 1);
      const netBuoyancy = this.water.computeBuoyancyForce(m.massKg, m.displacedVolM3, subFrac);
      m.position.y += clamp((netBuoyancy / m.massKg) * simDt * 0.15, -0.5, 0.5);
      m.position.y += (surf.height - m.position.y) * clamp(simDt * 4, 0, 1);
      if (!m.pilotedByPlayer) {
        m.position.x += surf.current.x * simDt * 0.25;
        m.position.z += surf.current.z * simDt * 0.25;
      }
      m.root.position.set(m.position.x, m.position.y, m.position.z);
      m.root.rotation.set(surf.normal.z * 0.25, m.yaw, -surf.normal.x * 0.25);
    }

    // 4. Public transit bus & subway schedule progression
    for (const tr of this.transit) {
      if (tr.dwellTimer > 0) {
        tr.dwellTimer -= simDt;
        tr.doorsOpen = true;
      } else {
        tr.doorsOpen = false;
        const nextIdx = (tr.routeIndex + 1) % tr.routeNodeIds.length;
        const targetNode = this.world.roadNetwork.nodes.get(tr.routeNodeIds[nextIdx]);
        if (targetNode) {
          const dx = targetNode.x - tr.position.x;
          const dz = targetNode.z - tr.position.z;
          const dist = Math.hypot(dx, dz);
          const spd = tr.kind === 'subway' ? 24 : 14;
          if (dist < 2.0) {
            tr.routeIndex = nextIdx;
            tr.dwellTimer = 3.5;
          } else {
            tr.yaw = Math.atan2(dx, dz);
            tr.position.x += (dx / dist) * spd * simDt;
            tr.position.z += (dz / dist) * spd * simDt;
            tr.position.y = targetNode.y;
          }
        }
      }
      tr.root.position.set(tr.position.x, tr.position.y, tr.position.z);
      tr.root.rotation.y = tr.yaw;
    }

    // 5. Fort Zancudo & Port Gellhorn restricted military zones
    const p = this.registry.getActiveCharacter().position;
    const inZancudo = Math.hypot(p.x + 395, p.z - 95) < 62;
    const inGellhorn = Math.hypot(p.x + 395, p.z + 155) < 55;
    if (inZancudo || inGellhorn) {
      const zoneName = inZancudo ? 'Fort Zancudo Airbase' : 'Port Gellhorn Naval Base';
      this.militaryAlertText = p.y > 18
        ? `RESTRICTED AIRSPACE (${zoneName}): Fictional SAM Radar Lock!`
        : `RESTRICTED MILITARY ZONE (${zoneName}): 4-Star Alert`;
      if (this.registry.state.wantedStars < 4) {
        this.registry.state.wantedStars = 4;
        this.registry.events.emit('police:wantedChanged', { stars: 4, reason: `Trespassing ${zoneName}` });
      }
    } else {
      this.militaryAlertText = null;
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const a of this.aircraft) a.root.dispose();
    for (const m of this.marine) m.root.dispose();
    for (const t of this.transit) t.root.dispose();
    this.aircraft = [];
    this.marine = [];
    this.transit = [];
    this.readiness = 'disposed';
  }
}
