import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene } from '@babylonjs/core';
import type { GameRegistry } from '../core/registry';
import type { RoadNode, Vec3 } from '../core/types';
import type { WorldArchitecture } from '../world/worldArchitecture';

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

export class DowntownCabSystem {
  public taxiRide: TaxiRideState | null = null;

  constructor(
    private registry: GameRegistry,
    private world: WorldArchitecture,
    private scene: Scene
  ) {}

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

    this.registry.events.emit('taxi:requested', {
      requestId,
      pickup: { x: pickupNode.x, y: pickupNode.y, z: pickupNode.z },
    });
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

  update(simDt: number): void {
    if (!this.taxiRide || (this.taxiRide.status !== 'dispatched' && this.taxiRide.status !== 'en_route')) return;
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

  dispose(): void {
    this.taxiRide?.mesh?.dispose();
    this.taxiRide = null;
  }
}
