/**
 * MODULE 12A – NPC Crowd AI, Social Recording & Downtown Cab Co. A* Taxi System
 * Implements shared NPC entities with simulation tiers (near/medium/far),
 * full FSM states, weather/crime reactions, NPC video recording -> separate witness report,
 * and A* drivable Downtown Cab Co. rideshare.
 */

import { Color3, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { SimulationTier, Vec3 } from '../core/types';
import { CENTRAL_LIMITS } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { CombatAnimationSystem } from '../gameplay/combatAnimation';
import type { WeaponsInventorySystem } from '../gameplay/weaponsInventory';
import { SpatialGrid } from '../world/spatialGrid';
import { DowntownCabSystem, type TaxiRideState } from './taxiSystem';
import { buildArticulatedNpcRig, type NpcVisualRig } from './npcModels';

export type { TaxiRideState };

export type NPCState =
  | 'Idle'
  | 'Wander'
  | 'MoveToTarget'
  | 'Work'
  | 'Wait'
  | 'WeatherReaction'
  | 'Observe'
  | 'Flee'
  | 'SeekHelp'
  | 'RecordVideo'
  | 'Drive'
  | 'Dialogue'
  | 'Rest'
  | 'Injury'
  | 'PoliceReaction';

export interface NPCEntity {
  id: string;
  name: string;
  role: 'pedestrian' | 'employee' | 'passenger' | 'driver';
  state: NPCState;
  tier: SimulationTier;
  position: Vec3;
  yaw: number;
  target: Vec3;
  health: number;
  stateTimer: number;
  witnessCoolDown: number;
  mesh?: TransformNode;
  rig?: NpcVisualRig;
}

export class NPCCrowdSystem implements GameModule {
  public readonly moduleId = 'npc_crowd_ai';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private combat!: CombatAnimationSystem;
  private weapons!: WeaponsInventorySystem;
  private scene!: Scene;

  public npcs: NPCEntity[] = [];
  private cabSystem!: DowntownCabSystem;
  private npcMat!: PBRMaterial;
  private unsubEvents: Array<() => void> = [];

  public get taxiRide(): TaxiRideState | null {
    return this.cabSystem?.taxiRide ?? null;
  }

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.combat = registry.getModule<CombatAnimationSystem>('kampf_animation');
    this.weapons = registry.getModule<WeaponsInventorySystem>('waffen_inventar');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.cabSystem = new DowntownCabSystem(this.registry, this.world, this.scene);
    this.npcMat = new PBRMaterial('npcSharedMat', this.scene);
    this.npcMat.albedoColor = new Color3(0.32, 0.54, 0.72);
    this.npcMat.roughness = 0.75;

    this.spawnInitialCrowd();

    this.unsubEvents.push(
      this.registry.events.on('weapon:fired', (ev) => {
        this.reactToCrimeSound(ev.origin, ev.loudness, 'gunfire');
      }),
      this.registry.events.on('vehicle:stolen', (ev) => {
        if (ev.witnessed) {
          const p = this.registry.getActiveCharacter().position;
          this.reactToCrimeSound(p, 45, 'vehicle_theft');
        }
      })
    );

    this.readiness = 'initialized';
  }

  private spawnInitialCrowd(): void {
    const hubs: Array<{ x: number; z: number; role: NPCEntity['role']; beach?: boolean }> = [
      { x: 172, z: -30, role: 'pedestrian' },
      { x: 224, z: -12, role: 'pedestrian', beach: true },
      { x: 226, z: 36, role: 'pedestrian', beach: true },
      { x: 174, z: 20, role: 'pedestrian' },
      { x: 176, z: 90, role: 'passenger' },
      { x: -138, z: -25, role: 'pedestrian' },
      { x: -145, z: 85, role: 'employee' },
      { x: -142, z: -150, role: 'pedestrian' },
      { x: -238, z: -285, role: 'passenger' },
      { x: 8, z: -22, role: 'pedestrian' },
    ];

    let idx = 0;
    for (const hub of hubs) {
      for (let k = 0; k < 3; k++) {
        if (this.npcs.length >= CENTRAL_LIMITS.maxNpcsNear) break;
        const id = `npc_${idx++}`;
        const px = hub.x + (Math.random() - 0.5) * 14;
        const pz = hub.z + (Math.random() - 0.5) * 14;
        const pos: Vec3 = {
          x: px,
          y: this.world.getTerrainHeight(px, pz),
          z: pz,
        };
        const rig = buildArticulatedNpcRig(this.scene, id, idx, Boolean(hub.beach));
        rig.root.position.set(pos.x, pos.y, pos.z);

        const npc: NPCEntity = {
          id,
          name: hub.beach ? `Beachgoer #${idx}` : `Citizen #${idx}`,
          role: hub.role,
          state: 'Wander',
          tier: 'near',
          position: pos,
          yaw: Math.random() * Math.PI * 2,
          target: { x: pos.x + 12, y: pos.y, z: pos.z + 12 },
          health: 100,
          stateTimer: 4 + Math.random() * 5,
          witnessCoolDown: 0,
          mesh: rig.root,
          rig,
        };
        this.npcs.push(npc);
        this.world.spatialGrid.insert(id, 'npc', pos, npc);

        this.weapons.registerTarget({
          id,
          getPosition: () => npc.position,
          getRadius: () => 0.48,
          onHit: (damage, zone, point, impulse, attackerId) => {
            this.handleNpcHit(npc, damage, zone, point, impulse, attackerId);
          },
        });
      }
    }
  }

  private handleNpcHit(npc: NPCEntity, damage: number, _zone: string, point: Vec3, impulse: Vec3, attackerId: string): void {
    if (npc.state === 'Injury') return;
    npc.health -= damage;
    if (npc.health <= 0) {
      npc.health = 0;
      npc.state = 'Injury';
      npc.stateTimer = 14;
      if (npc.mesh) npc.mesh.rotation.x = Math.PI / 2;
      this.combat.activateRagdoll(npc.id, impulse, true);
      this.registry.events.emit('combat:knockout', { attackerId, targetId: npc.id, location: point });
      this.reactToCrimeSound(point, 55, 'assault');
    } else {
      npc.state = 'Flee';
      npc.stateTimer = 8;
      this.reactToCrimeSound(point, 50, 'assault');
    }
  }

  private reactToCrimeSound(origin: Vec3, loudness: number, crimeType: string): void {
    for (const npc of this.npcs) {
      if (npc.state === 'Injury') continue;
      const dist = Math.hypot(npc.position.x - origin.x, npc.position.z - origin.z);
      if (dist > loudness) continue;

      if (npc.witnessCoolDown <= 0 && dist < 35 && Math.random() < 0.55) {
        npc.state = 'RecordVideo';
        npc.stateTimer = 3.5;
        npc.witnessCoolDown = 20;

        const post = {
          id: `clip_${Date.now()}_${npc.id}`,
          authorName: `@${npc.name.replace(/\s+/g, '')}`,
          isNpc: true,
          caption: `Caught wild ${crimeType.replace('_', ' ')} live on Vice Street!`,
          eventTag: crimeType,
          likes: Math.floor(40 + Math.random() * 400),
          reach: Math.floor(800 + Math.random() * 5000),
          timestampGameSec: this.registry.clock.gameTime,
          location: { ...origin },
        };
        this.registry.state.socialFeed.unshift(post);
        this.registry.events.emit('social:clipPublished', { post });

        // Separate police reporting event from witness!
        this.registry.events.emit('police:crimeReported', {
          severity: crimeType === 'gunfire' ? 2 : 1,
          clue: {
            id: `clue_${Date.now()}_${npc.id}`,
            kind: 'witness',
            crimeType,
            location: { ...origin },
            timestampSec: this.registry.clock.gameTime,
            suspectId: this.registry.state.activeCharacterId,
            obtainedByPolice: true,
            investigated: false,
          },
        });
      } else {
        npc.state = 'Flee';
        npc.stateTimer = 7;
        const dx = npc.position.x - origin.x;
        const dz = npc.position.z - origin.z;
        const inv = 1 / Math.max(0.1, Math.hypot(dx, dz));
        npc.target = { x: npc.position.x + dx * inv * 45, y: npc.position.y, z: npc.position.z + dz * inv * 45 };
      }
    }
  }

  // --- Downtown Cab Co. / Rideshare A* System ---
  requestTaxi(): { ok: boolean; error?: string; requestId?: string } {
    return this.cabSystem.requestTaxi();
  }

  selectTaxiDestination(destPos: Vec3): { ok: boolean; error?: string; fareCents?: number } {
    return this.cabSystem.selectTaxiDestination(destPos);
  }

  skipOrCancelTaxi(action: 'skip' | 'cancel' | 'speedup'): void {
    this.cabSystem.skipOrCancelTaxi(action);
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    const pPos = this.registry.getActiveCharacter().position;
    const raining = this.registry.state.weather === 'rain' || this.registry.state.weather === 'hurricane';

    for (const npc of this.npcs) {
      if (npc.witnessCoolDown > 0) npc.witnessCoolDown -= simDt;
      const distToPlayer = Math.hypot(npc.position.x - pPos.x, npc.position.z - pPos.z);
      npc.tier = SpatialGrid.computeSimulationTier(distToPlayer);

      if (npc.state === 'Injury') {
        npc.stateTimer -= simDt;
        if (npc.stateTimer <= 0) {
          npc.health = 100;
          npc.state = 'Wander';
          if (npc.mesh) npc.mesh.rotation.x = 0;
        }
        continue;
      }

      if (raining && npc.state === 'Wander') {
        npc.state = 'WeatherReaction';
        npc.stateTimer = 4;
      }

      npc.stateTimer -= simDt;
      if (npc.stateTimer <= 0) {
        npc.state = npc.state === 'Idle' ? 'Wander' : 'Idle';
        npc.stateTimer = 3 + Math.random() * 5;
        if (npc.state === 'Wander') {
          npc.target = {
            x: npc.position.x + (Math.random() - 0.5) * 26,
            y: npc.position.y,
            z: npc.position.z + (Math.random() - 0.5) * 26,
          };
        }
      }

      let walkingSpeed = 0;
      if (npc.state === 'Wander' || npc.state === 'Flee' || npc.state === 'WeatherReaction') {
        const dx = npc.target.x - npc.position.x;
        const dz = npc.target.z - npc.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6) {
          walkingSpeed = npc.state === 'Flee' ? 4.8 : npc.state === 'WeatherReaction' ? 3.2 : 1.5;
          npc.yaw = Math.atan2(dx, dz);
          npc.position.x += (dx / d) * walkingSpeed * simDt;
          npc.position.z += (dz / d) * walkingSpeed * simDt;
          npc.position.y = this.world.getTerrainHeight(npc.position.x, npc.position.z);
          this.world.spatialGrid.updatePosition(npc.id, npc.position);
        }
      }

      if (npc.mesh) {
        const show = npc.tier !== 'far';
        npc.mesh.setEnabled(show);
        npc.mesh.position.set(npc.position.x, npc.position.y, npc.position.z);
        npc.mesh.rotation.y = npc.yaw;
        if (show && npc.rig) {
          const swing = walkingSpeed > 0.1
            ? Math.sin(this.registry.clock.animationTime * (walkingSpeed > 3 ? 11 : 6.2) + npc.rig.phaseOffset) * 0.48
            : 0;
          npc.rig.leftLeg.rotation.x = swing;
          npc.rig.rightLeg.rotation.x = -swing;
          npc.rig.leftArm.rotation.x = -swing * 0.8;
          npc.rig.rightArm.rotation.x = swing * 0.8;
        }
      }
    }

    this.cabSystem.update(simDt);
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const unsub of this.unsubEvents) unsub();
    for (const n of this.npcs) {
      this.weapons.unregisterTarget(n.id);
      n.mesh?.dispose();
    }
    this.cabSystem?.dispose();
    this.npcMat?.dispose();
    this.npcs = [];
    this.readiness = 'disposed';
  }
}
