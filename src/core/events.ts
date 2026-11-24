/**
 * Centralized Validated Event Contract & Event Bus
 * Prevents cyclic event loops, isolates handler exceptions, and supports clean disposal.
 */

import type {
  CharacterId,
  ForensicClue,
  SocialPost,
  TransactionRecord,
  Vec3,
  WeatherState,
} from './types';

export interface GameEventMap {
  'game:initialized': { backend: 'WebGPU' | 'WebGL2'; resumedSave: boolean };
  'world:chunkLoaded': { chunkId: string; district: string };
  'world:chunkUnloaded': { chunkId: string };
  'world:weatherChanged': { from: WeatherState; to: WeatherState; intensity: number };
  'world:timeChanged': { dayTimeHours: number; isNight: boolean };
  'player:characterChanged': { from: CharacterId; to: CharacterId; position: Vec3 };
  'player:died': { characterId: CharacterId; location: Vec3; cause: string };
  'player:respawned': { characterId: CharacterId; hospitalPos: Vec3; fineCents: number };
  'player:arrested': { characterId: CharacterId; location: Vec3; bailCents: number; respawnLocation: string };
  'vehicle:entered': { vehicleId: string; characterId: CharacterId; seat: 'driver' | 'passenger' };
  'vehicle:exited': { vehicleId: string; characterId: CharacterId };
  'vehicle:damaged': { vehicleId: string; impactEnergy: number; zone: string };
  'vehicle:stolen': { vehicleId: string; characterId: CharacterId; witnessed: boolean };
  'vehicle:repaired': { vehicleId: string; costCents: number };
  'taxi:requested': { requestId: string; pickup: Vec3 };
  'taxi:arrived': { requestId: string; taxiId: string; position: Vec3 };
  'taxi:destinationSelected': { requestId: string; destination: Vec3; routeNodes: number; fareCents: number };
  'taxi:tripCompleted': { requestId: string; fareCents: number; skipped: boolean };
  'weapon:fired': { shooterId: string; weaponId: string; origin: Vec3; direction: Vec3; loudness: number };
  'combat:hit': { attackerId: string; targetId: string; zone: string; damage: number; point: Vec3 };
  'combat:knockout': { attackerId: string; targetId: string; location: Vec3 };
  'police:wantedChanged': { stars: number; reason: string };
  'police:crimeReported': { clue: ForensicClue; severity: number };
  'economy:transactionCompleted': { record: TransactionRecord };
  'property:purchased': { propertyId: string; buyer: CharacterId; priceCents: number };
  'mission:started': { missionId: string };
  'mission:completed': { missionId: string; rewardCents: number };
  'mission:failed': { missionId: string; reason: string };
  'inventory:changed': { characterId: CharacterId; activeWeaponId: string };
  'phone:opened': { characterId: CharacterId };
  'phone:closed': { characterId: CharacterId };
  'social:clipPublished': { post: SocialPost };
  'save:completed': { slotId: string; timestampMs: number };
  'save:failed': { slotId: string; error: string };
}

export type GameEventName = keyof GameEventMap;
export type EventHandler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export interface EventErrorLog {
  timestamp: number;
  event: string;
  error: string;
}

export class EventBus {
  private listeners = new Map<GameEventName, Set<EventHandler<GameEventName>>>();
  private dispatchDepth = new Map<GameEventName, number>();
  private readonly maxRecursionDepth = 4;
  public readonly errorLog: EventErrorLog[] = [];

  on<K extends GameEventName>(event: K, handler: EventHandler<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const wrapped = handler as EventHandler<GameEventName>;
    set.add(wrapped);
    return () => {
      this.off(event, handler);
    };
  }

  off<K extends GameEventName>(event: K, handler: EventHandler<K>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler as EventHandler<GameEventName>);
    }
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
    const depth = this.dispatchDepth.get(event) ?? 0;
    if (depth >= this.maxRecursionDepth) {
      this.errorLog.push({
        timestamp: Date.now(),
        event,
        error: `Blocked recursive event loop at depth ${depth}`,
      });
      return;
    }

    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    this.dispatchDepth.set(event, depth + 1);
    try {
      for (const listener of Array.from(set)) {
        try {
          listener(payload);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.errorLog.push({ timestamp: Date.now(), event, error: msg });
          console.error(`[EventBus] Handler failure for ${event}:`, err);
        }
      }
    } finally {
      this.dispatchDepth.set(event, depth);
    }
  }

  clear(): void {
    this.listeners.clear();
    this.dispatchDepth.clear();
  }
}
