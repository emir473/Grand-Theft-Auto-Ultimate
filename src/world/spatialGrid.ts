/**
 * Spatial Grid for O(1) Region Queries, Neighbor Lookups, Chunk Streaming, and Simulation Tiers
 */

import type { SimulationTier, Vec3 } from '../core/types';

export interface SpatialEntry<T = unknown> {
  id: string;
  kind: 'npc' | 'vehicle' | 'building' | 'interactable' | 'prop' | 'salvage';
  x: number;
  y: number;
  z: number;
  data: T;
  cellKey: string;
}

export class SpatialGrid<T = unknown> {
  private cells = new Map<string, Map<string, SpatialEntry<T>>>();
  private entries = new Map<string, SpatialEntry<T>>();

  constructor(public readonly cellSizeMeters = 60) {}

  private keyFor(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSizeMeters);
    const cz = Math.floor(z / this.cellSizeMeters);
    return `${cx},${cz}`;
  }

  insert(id: string, kind: SpatialEntry['kind'], pos: Vec3, data: T): void {
    if (this.entries.has(id)) {
      this.updatePosition(id, pos);
      return;
    }
    const cellKey = this.keyFor(pos.x, pos.z);
    const entry: SpatialEntry<T> = { id, kind, x: pos.x, y: pos.y, z: pos.z, data, cellKey };
    this.entries.set(id, entry);
    let bucket = this.cells.get(cellKey);
    if (!bucket) {
      bucket = new Map();
      this.cells.set(cellKey, bucket);
    }
    bucket.set(id, entry);
  }

  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    const bucket = this.cells.get(entry.cellKey);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) this.cells.delete(entry.cellKey);
    }
    this.entries.delete(id);
  }

  updatePosition(id: string, pos: Vec3): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.x = pos.x;
    entry.y = pos.y;
    entry.z = pos.z;
    const newKey = this.keyFor(pos.x, pos.z);
    if (newKey !== entry.cellKey) {
      const oldBucket = this.cells.get(entry.cellKey);
      if (oldBucket) {
        oldBucket.delete(id);
        if (oldBucket.size === 0) this.cells.delete(entry.cellKey);
      }
      entry.cellKey = newKey;
      let newBucket = this.cells.get(newKey);
      if (!newBucket) {
        newBucket = new Map();
        this.cells.set(newKey, newBucket);
      }
      newBucket.set(id, entry);
    }
  }

  queryRadius(center: Vec3, radiusMeters: number, kindFilter?: SpatialEntry['kind']): SpatialEntry<T>[] {
    const rSq = radiusMeters * radiusMeters;
    const minCx = Math.floor((center.x - radiusMeters) / this.cellSizeMeters);
    const maxCx = Math.floor((center.x + radiusMeters) / this.cellSizeMeters);
    const minCz = Math.floor((center.z - radiusMeters) / this.cellSizeMeters);
    const maxCz = Math.floor((center.z + radiusMeters) / this.cellSizeMeters);

    const results: SpatialEntry<T>[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.cells.get(`${cx},${cz}`);
        if (!bucket) continue;
        for (const entry of bucket.values()) {
          if (kindFilter && entry.kind !== kindFilter) continue;
          const dx = entry.x - center.x;
          const dz = entry.z - center.z;
          if (dx * dx + dz * dz <= rSq) {
            results.push(entry);
          }
        }
      }
    }
    return results;
  }

  static computeSimulationTier(distMeters: number): SimulationTier {
    if (distMeters <= 90) return 'near';
    if (distMeters <= 240) return 'medium';
    return 'far';
  }

  getEntryCount(): number {
    return this.entries.size;
  }

  clear(): void {
    this.cells.clear();
    this.entries.clear();
  }
}
