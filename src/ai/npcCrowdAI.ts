/**
 * MODULE 12A – NPC Crowd AI, Social Recording & Downtown Cab Co. A* Taxi System
 * Implements shared NPC entities with simulation tiers (near/medium/far),
 * full FSM states, weather/crime reactions, NPC video recording -> separate witness report,
 * and A* drivable Downtown Cab Co. rideshare.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { RoadNode, SimulationTier, Vec3 } from '../core/types';
import { CENTRAL_LIMITS, clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { CombatAnimationSystem } from '../gameplay/combatAnimation';
import type { WeaponsInventorySystem } from '../gameplay/weaponsInventory';
import { SpatialGrid } from '../world/spatialGrid';

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
}

export interface TaxiRideState {
  requestId: string;
  status: 'idle' | 'dispatched' | 'arrived' | 'boarding' | 'en_route' | 'completed' | 'cancelled';
  taxiId: string;
  position: Vec3;
  yaw: number;
  routeNodes: RoadNode[];
  routeIdx: number;
  fareCents: number;
  speedMultiplier: number;
  mesh?: Mesh;
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
  public taxiRide: TaxiRideState | null = null;
  private npcMat!: PBRMaterial;
  private unsubEvents: Array<() => void> = [];

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
    const hubs: Array<{ x: number; z: number; role: NPCEntity['role'] }> = [
      { x: 172, z: -30, role: 'pedestrian' },
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
        const pos: Vec3 = {
          x: hub.x + (Math.random() - 0.5) * 14,
          y: this.world.getTerrainHeight(hub.x, hub.z),
          z: hub.z + (Math.random() - 0.5) * 14,
        };
        const root = new TransformNode(`npcRoot_${id}`, this.scene);
        const body = MeshBuilder.CreateCapsule(`npcBody_${id}`, { radius: 0.28, height: 1.72 }, this.scene);
        body.position.y = 0.86;
        body.material = this.npcMat;
        body.parent = root;
        root.position.set(pos.x, pos.y, pos.z);

        const npc: NPCEntity = {
          id,
          name: `Citizen #${idx}`,
          role: hub.role,
          state: 'Wander',
          tier: 'near',
          position: pos,
          yaw: Math.random() * Math.PI * 2,
          target: { x: pos.x + 12, y: pos.y, z: pos.z + 12 },
          health: 100,
          stateTimer: 4 + Math.random() * 5,
          witnessCoolDown: 0,
          mesh: root,
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
    const char = this.registry.getActiveCharacter();
    const pickupNode = this.world.roadNetwork.findNearestNode(char.position, ['highway', 'avenue', 'street']);
    if (!pickupNode) {
      return { ok: false, error: 'No drivable pickup road nearby' };
    }

    const startNode = this.world.roadNetwork.findNearestNode(
      { x: pickupNode.x + 65, y: pickupNode.y, z: pickupNode.z + 25 },
      ['highway', 'avenue', 'street']
    );
    const route = this.world.roadNetwork.findRoute(startNode ?? pickupNode, pickupNode);
    if (!route.found) {
      return { ok: false, error: 'Road closure prevents taxi dispatch' };
    }

    if (this.taxiRide?.mesh) this.taxiRide.mesh.dispose();
    const taxiMesh = MeshBuilder.CreateBox('downtownCabMesh', { width: 1.9, height: 1.3, depth: 4.6 }, this.scene);
    const mat = new PBRMaterial('taxiCabMat', this.scene);
    mat.albedoColor = new Color3(0.95, 0.78, 0.12);
    mat.roughness = 0.28;
    taxiMesh.material = mat;

    const spawnPos = route.nodes[0];
    const requestId = `taxi_${Date.now()}`;
    this.taxiRide = {
      requestId,
      status: 'dispatched',
      taxiId: 'cab_01',
      position: { x: spawnPos.x, y: spawnPos.y + 0.65, z: spawnPos.z },
      yaw: 0,
      routeNodes: route.nodes,
      routeIdx: 0,
      fareCents: 0,
      speedMultiplier: 1,
      mesh: taxiMesh,
    };

    this.registry.events.emit('taxi:requested', { requestId, pickup: { x: pickupNode.x, y: pickupNode.y, z: pickupNode.z } });
    return { ok: true, requestId };
  }

  selectTaxiDestination(destPos: Vec3): { ok: boolean; error?: string; fareCents?: number } {
    if (!this.taxiRide || (this.taxiRide.status !== 'arrived' && this.taxiRide.status !== 'boarding')) {
      return { ok: false, error: 'Taxi has not arrived yet' };
    }
    const route = this.world.roadNetwork.findRoute(this.taxiRide.position, destPos);
    if (!route.found || route.nodes.length === 0) {
      return { ok: false, error: 'Destination unreachable on road graph' };
    }
    const fareCents = Math.max(1500, Math.round(route.totalMeters * 15));
    const char = this.registry.getActiveCharacter();
    if (char.cashCents < fareCents) {
      return { ok: false, error: 'Insufficient cash for taxi fare' };
    }

    this.taxiRide.routeNodes = route.nodes;
    this.taxiRide.routeIdx = 0;
    this.taxiRide.fareCents = fareCents;
    this.taxiRide.status = 'en_route';
    this.registry.events.emit('taxi:destinationSelected', {
      requestId: this.taxiRide.requestId,
      destination: destPos,
      routeNodes: route.nodes.length,
      fareCents,
    });
    return { ok: true, fareCents };
  }

  skipOrCancelTaxi(action: 'skip' | 'cancel' | 'speedup'): void {
    if (!this.taxiRide) return;
    if (action === 'cancel') {
      this.taxiRide.status = 'cancelled';
      this.taxiRide.mesh?.dispose();
      this.taxiRide = null;
      return;
    }
    if (action === 'speedup') {
      this.taxiRide.speedMultiplier = 2.4;
      return;
    }
    if (action === 'skip' && this.taxiRide.status === 'en_route' && this.taxiRide.routeNodes.length > 0) {
      const dest = this.taxiRide.routeNodes[this.taxiRide.routeNodes.length - 1];
      this.taxiRide.position = { x: dest.x, y: dest.y + 0.65, z: dest.z };
      this.completeTaxiTrip(true);
    }
  }

  private completeTaxiTrip(skipped: boolean): void {
    if (!this.taxiRide) return;
    const char = this.registry.getActiveCharacter();
    const fare = Math.min(char.cashCents, this.taxiRide.fareCents);
    char.cashCents = Math.max(0, char.cashCents - fare);
    char.position = { x: this.taxiRide.position.x + 2, y: this.taxiRide.position.y, z: this.taxiRide.position.z };

    this.registry.events.emit('taxi:tripCompleted', {
      requestId: this.taxiRide.requestId,
      fareCents: fare,
      skipped,
    });
    this.registry.events.emit('economy:transactionCompleted', {
      record: {
        id: `tx_taxi_${Date.now()}`,
        timestampGameSec: this.registry.clock.gameTime,
        characterId: char.id,
        account: 'cash',
        amountCents: -fare,
        balanceAfterCents: char.cashCents,
        trigger: 'downtown_cab_fare',
        description: 'Downtown Cab Co. Ride',
      },
    });
    this.taxiRide.status = 'completed';
    this.taxiRide.mesh?.dispose();
    this.taxiRide = null;
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

      if (npc.state === 'Wander' || npc.state === 'Flee' || npc.state === 'WeatherReaction') {
        const dx = npc.target.x - npc.position.x;
        const dz = npc.target.z - npc.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6) {
          const spd = npc.state === 'Flee' ? 4.8 : npc.state === 'WeatherReaction' ? 3.2 : 1.5;
          npc.yaw = Math.atan2(dx, dz);
          npc.position.x += (dx / d) * spd * simDt;
          npc.position.z += (dz / d) * spd * simDt;
          npc.position.y = this.world.getTerrainHeight(npc.position.x, npc.position.z);
          this.world.spatialGrid.updatePosition(npc.id, npc.position);
        }
      }

      if (npc.mesh) {
        npc.mesh.setEnabled(npc.tier !== 'far');
        npc.mesh.position.set(npc.position.x, npc.position.y, npc.position.z);
        npc.mesh.rotation.y = npc.yaw;
      }
    }

    // Taxi navigation update
    if (this.taxiRide && (this.taxiRide.status === 'dispatched' || this.taxiRide.status === 'en_route')) {
      const targetNode = this.taxiRide.routeNodes[this.taxiRide.routeIdx];
      if (targetNode) {
        const dx = targetNode.x - this.taxiRide.position.x;
        const dz = targetNode.z - this.taxiRide.position.z;
        const dist = Math.hypot(dx, dz);
        const speed = 16 * this.taxiRide.speedMultiplier;
        if (dist < 2.2) {
          this.taxiRide.routeIdx++;
          if (this.taxiRide.routeIdx >= this.taxiRide.routeNodes.length) {
            if (this.taxiRide.status === 'dispatched') {
              this.taxiRide.status = 'arrived';
              this.registry.events.emit('taxi:arrived', {
                requestId: this.taxiRide.requestId,
                taxiId: this.taxiRide.taxiId,
                position: { ...this.taxiRide.position },
              });
            } else {
              this.completeTaxiTrip(false);
              return;
            }
          }
        } else {
          this.taxiRide.yaw = Math.atan2(dx, dz);
          this.taxiRide.position.x += (dx / dist) * speed * simDt;
          this.taxiRide.position.z += (dz / dist) * speed * simDt;
        }
      }
      if (this.taxiRide?.mesh) {
        this.taxiRide.mesh.position.set(this.taxiRide.position.x, this.taxiRide.position.y, this.taxiRide.position.z);
        this.taxiRide.mesh.rotation.y = this.taxiRide.yaw;
      }
      if (this.taxiRide?.status === 'en_route') {
        const char = this.registry.getActiveCharacter();
        char.position = { ...this.taxiRide.position };
      }
    }
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
    this.taxiRide?.mesh?.dispose();
    this.npcMat?.dispose();
    this.npcs = [];
    this.readiness = 'disposed';
  }
}
