/**
 * Autonomous Road Traffic AI obeying Synchronized Traffic Lights & RoadNetwork
 * Vehicles cruise road graph lanes, yield at red/yellow signals, and queue behind lead traffic.
 */

import { Color3, Scene, TransformNode, Vector3, type PBRMaterial } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { VehicleClass } from '../core/types';
import { clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import { buildSculptedVehicleRig } from '../gameplay/vehicleSculptor';
import { HANDLING_PROFILES } from '../gameplay/vehicleModels';

export interface TrafficAgent {
  id: string;
  vehicleClass: VehicleClass;
  fromNode: string;
  toNode: string;
  progress: number; // 0..1 along edge
  speedMps: number;
  maxSpeedMps: number;
  laneOffset: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  wheelRoll: number;
  stoppedAtSignal: boolean;
  root: TransformNode;
  wheels: TransformNode[];
  brakeLightMat: PBRMaterial;
}

const TRAFFIC_TEMPLATES: Array<{ tag: string; vehicleClass: VehicleClass; colorHex: string; speed: number }> = [
  { tag: 'sedan', vehicleClass: 'sedan', colorHex: '#e2e8f0', speed: 12.5 },
  { tag: 'convertible', vehicleClass: 'muscle', colorHex: '#f5f0e1', speed: 14.2 },
  { tag: 'taxi', vehicleClass: 'taxi', colorHex: '#facc15', speed: 13.0 },
  { tag: 'mixer', vehicleClass: 'truck', colorHex: '#f1f5f9', speed: 10.0 },
  { tag: 'sports', vehicleClass: 'sports', colorHex: '#3b82f6', speed: 15.5 },
  { tag: 'mail', vehicleClass: 'truck', colorHex: '#e5e7eb', speed: 11.2 },
  { tag: 'suv', vehicleClass: 'suv', colorHex: '#334155', speed: 12.0 },
  { tag: 'bus', vehicleClass: 'bus', colorHex: '#0284c7', speed: 10.2 },
];

export class TrafficAISystem implements GameModule {
  public readonly moduleId = 'verkehr_ki';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private scene!: Scene;
  private root!: TransformNode;
  public agents: TrafficAgent[] = [];

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.root = new TransformNode('trafficAIRoot', this.scene);

    const drivableEdges = this.world.roadNetwork.edges.filter(
      (e) => e.roadType !== 'rail' && e.roadType !== 'waterway' && !e.closed
    );
    const seedCount = Math.min(24, drivableEdges.length);

    for (let i = 0; i < seedCount; i++) {
      const edge = drivableEdges[(i * 2) % drivableEdges.length];
      const a = this.world.roadNetwork.nodes.get(edge.from);
      const b = this.world.roadNetwork.nodes.get(edge.to);
      if (!a || !b) continue;

      const tpl = TRAFFIC_TEMPLATES[i % TRAFFIC_TEMPLATES.length];
      const profile = HANDLING_PROFILES[tpl.vehicleClass];
      const id = `traffic_${tpl.tag}_${i}`;
      const rig = buildSculptedVehicleRig(this.scene, this.gfx, id, tpl.vehicleClass, profile, tpl.colorHex, `LND-${100 + i}`);
      rig.root.parent = this.root;

      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const t = 0.25 + ((i * 0.17) % 0.6);
      const px = a.x + (b.x - a.x) * t;
      const pz = a.z + (b.z - a.z) * t;
      const py = this.world.getTerrainHeight(px, pz) + 0.08;
      rig.root.position.set(px, py, pz);
      rig.root.rotation.y = yaw;

      this.agents.push({
        id,
        vehicleClass: tpl.vehicleClass,
        fromNode: edge.from,
        toNode: edge.to,
        progress: t,
        speedMps: tpl.speed * 0.6,
        maxSpeedMps: tpl.speed,
        laneOffset: 2.35,
        x: px,
        y: py,
        z: pz,
        yaw,
        wheelRoll: 0,
        stoppedAtSignal: false,
        root: rig.root,
        wheels: rig.wheels,
        brakeLightMat: rig.brakeLightMat,
      });
    }

    this.readiness = 'initialized';
  }

  private pickNextEdge(currentTo: string, cameFrom: string): { from: string; to: string } | null {
    const candidates = this.world.roadNetwork.edges.filter(
      (e) => e.from === currentTo && e.roadType !== 'rail' && e.roadType !== 'waterway' && !e.closed
    );
    if (candidates.length === 0) return null;
    const nonUTurn = candidates.filter((c) => c.to !== cameFrom);
    const pool = nonUTurn.length > 0 ? nonUTurn : candidates;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return { from: chosen.from, to: chosen.to };
  }

  update(simDt: number): void {
    const playerPos = this.registry.getActiveCharacter().position;

    for (const ag of this.agents) {
      const a = this.world.roadNetwork.nodes.get(ag.fromNode);
      const b = this.world.roadNetwork.nodes.get(ag.toNode);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.max(4, Math.hypot(dx, dz));
      const axis: 'ns' | 'ew' = Math.abs(dz) >= Math.abs(dx) ? 'ns' : 'ew';

      // Check upcoming intersection signal green phase
      const distToNodeB = (1 - ag.progress) * segLen;
      const nearStopLine = distToNodeB < 18 && distToNodeB > 4;
      const green = this.world.foliageAndLights.isGreenForAxis(b.x, b.z, axis);

      // Distance check against player and other traffic ahead
      let blockedAhead = nearStopLine && !green;
      ag.stoppedAtSignal = blockedAhead;

      const fwdX = dx / segLen;
      const fwdZ = dz / segLen;
      const pDx = playerPos.x - ag.x;
      const pDz = playerPos.z - ag.z;
      const pAhead = pDx * fwdX + pDz * fwdZ;
      const pLat = Math.abs(pDx * fwdZ - pDz * fwdX);
      if (pAhead > 0 && pAhead < 11 && pLat < 3.4) blockedAhead = true;

      if (!blockedAhead) {
        for (const other of this.agents) {
          if (other.id === ag.id) continue;
          const oDx = other.x - ag.x;
          const oDz = other.z - ag.z;
          const oAhead = oDx * fwdX + oDz * fwdZ;
          const oLat = Math.abs(oDx * fwdZ - oDz * fwdX);
          if (oAhead > 0 && oAhead < 9.5 && oLat < 2.6) {
            blockedAhead = true;
            break;
          }
        }
      }

      const targetSpeed = blockedAhead ? 0 : ag.maxSpeedMps;
      ag.speedMps += (targetSpeed - ag.speedMps) * clamp(simDt * (blockedAhead ? 7 : 2.8), 0, 1);

      ag.progress += (ag.speedMps * simDt) / segLen;
      if (ag.progress >= 1) {
        const next = this.pickNextEdge(ag.toNode, ag.fromNode);
        if (next) {
          ag.fromNode = next.from;
          ag.toNode = next.to;
          ag.progress = 0;
        } else {
          const prevFrom = ag.fromNode;
          ag.fromNode = ag.toNode;
          ag.toNode = prevFrom;
          ag.progress = 0;
        }
      }

      const na = this.world.roadNetwork.nodes.get(ag.fromNode);
      const nb = this.world.roadNetwork.nodes.get(ag.toNode);
      if (!na || !nb) continue;

      const ux = nb.x - na.x;
      const uz = nb.z - na.z;
      const uLen = Math.max(1, Math.hypot(ux, uz));
      const rightX = uz / uLen;
      const rightZ = -ux / uLen;

      ag.x = na.x + ux * ag.progress + rightX * ag.laneOffset;
      ag.z = na.z + uz * ag.progress + rightZ * ag.laneOffset;
      ag.y = this.world.getTerrainHeight(ag.x, ag.z) + 0.08;
      ag.yaw = Math.atan2(ux, uz);

      // LOD distance disable beyond 650m from player
      const distPlayer = Math.hypot(ag.x - playerPos.x, ag.z - playerPos.z);
      const visible = distPlayer < 650;
      if (ag.root.isEnabled() !== visible) ag.root.setEnabled(visible);
      if (visible) {
        ag.root.position.set(ag.x, ag.y, ag.z);
        ag.root.rotation.y = ag.yaw;
        ag.wheelRoll += (ag.speedMps * simDt) / 0.36;
        for (const wNode of ag.wheels) {
          for (const ch of wNode.getChildren()) {
            if ('rotation' in ch) (ch as { rotation: Vector3 }).rotation.x = ag.wheelRoll;
          }
        }
        const braking = blockedAhead || ag.speedMps < 1.2;
        ag.brakeLightMat.emissiveColor = braking ? new Color3(1.0, 0.08, 0.08) : new Color3(0.28, 0.02, 0.02);
      }
    }
  }

  start(): void {
    this.readiness = 'running';
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.root?.dispose();
    this.agents = [];
    this.readiness = 'disposed';
  }
}
