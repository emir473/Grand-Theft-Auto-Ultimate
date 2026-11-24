/**
 * High-Level SaveManager: Validates, serializes, and restores full game state via IndexedDB
 */

import type { GameRegistry } from '../core/registry';
import type {
  CharacterId,
  CharacterSaveState,
  InventoryItem,
  LanguageCode,
  MissionState,
  QualityProfile,
  SocialPost,
  SpeedUnit,
  StockHolding,
  StockInstrument,
  TransactionRecord,
  VehicleStateData,
} from '../core/types';
import { clamp, sanitizeVec3 } from '../core/types';
import { LeonidaDatabase } from './db';

export interface SerializedGameState {
  activeCharacterId: CharacterId;
  characters: Record<CharacterId, CharacterSaveState>;
  trustSynergy: number;
  inventories: Record<CharacterId, InventoryItem[]>;
  activeWeapons: Record<CharacterId, string>;
  vehicles: VehicleStateData[];
  ownedPropertyIds: Array<{ id: string; ownedBy: CharacterId }>;
  collectedSalvageIds: string[];
  missions: MissionState[];
  transactions: TransactionRecord[];
  stocks: StockInstrument[];
  holdings: Record<CharacterId, StockHolding[]>;
  socialFeed: SocialPost[];
  dayTimeHours: number;
  gameTime: number;
  language: LanguageCode;
  speedUnit: SpeedUnit;
  qualityProfile: QualityProfile;
  minimapRotate: boolean;
  cameraMode?: 'third' | 'first';
  hapticsEnabled?: boolean;
  hapticsIntensity?: number;
  touchControlsMode?: 'auto' | 'on' | 'off';
  touchLayout?: 'right' | 'left';
  touchOpacity?: number;
}

export class SaveManager {
  public readonly db = new LeonidaDatabase();

  constructor(private readonly registry: GameRegistry) {}

  serializeState(): SerializedGameState {
    const s = this.registry.state;
    const ownedPropertyIds: Array<{ id: string; ownedBy: CharacterId }> = [];
    for (const prop of s.properties.values()) {
      if (prop.ownedBy) {
        ownedPropertyIds.push({ id: prop.id, ownedBy: prop.ownedBy });
      }
    }
    return {
      activeCharacterId: s.activeCharacterId,
      characters: structuredClone(s.characters),
      trustSynergy: s.trustSynergy,
      inventories: structuredClone(s.inventories),
      activeWeapons: structuredClone(s.activeWeapons),
      vehicles: Array.from(s.vehicles.values()).map((v) => structuredClone(v)),
      ownedPropertyIds,
      collectedSalvageIds: Array.from(s.collectedSalvageIds),
      missions: Array.from(s.missions.values()).map((m) => structuredClone(m)),
      transactions: s.transactions.slice(-200),
      stocks: structuredClone(s.stocks),
      holdings: structuredClone(s.holdings),
      socialFeed: s.socialFeed.slice(-50),
      dayTimeHours: this.registry.clock.dayTimeHours,
      gameTime: this.registry.clock.gameTime,
      language: s.language,
      speedUnit: s.speedUnit,
      qualityProfile: s.qualityProfile,
      minimapRotate: s.minimapRotate,
      cameraMode: s.cameraMode,
      hapticsEnabled: s.hapticsEnabled,
      hapticsIntensity: s.hapticsIntensity,
      touchControlsMode: s.touchControlsMode,
      touchLayout: s.touchLayout,
      touchOpacity: s.touchOpacity,
    };
  }

  async save(slotId = 'autosave'): Promise<boolean> {
    try {
      const payload = this.serializeState() as unknown as Record<string, unknown>;
      const env = await this.db.writeSave(slotId, payload);
      this.registry.events.emit('save:completed', { slotId, timestampMs: env.savedAtMs });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.registry.events.emit('save:failed', { slotId, error: msg });
      return false;
    }
  }

  async load(slotId = 'autosave'): Promise<boolean> {
    try {
      const env = await this.db.readSave(slotId);
      if (!env) return false;
      const data = env.payload as unknown as Partial<SerializedGameState>;
      if (!data.characters || !data.activeCharacterId) {
        throw new Error('Corrupted save payload: missing characters');
      }

      const s = this.registry.state;
      if (data.activeCharacterId === 'lucia' || data.activeCharacterId === 'jason') {
        s.activeCharacterId = data.activeCharacterId;
      }

      for (const cid of ['lucia', 'jason'] as CharacterId[]) {
        const incoming = data.characters[cid];
        if (incoming) {
          incoming.position = sanitizeVec3(incoming.position);
          incoming.cashCents = Math.max(0, Math.trunc(incoming.cashCents || 0));
          incoming.bankCents = Math.max(0, Math.trunc(incoming.bankCents || 0));
          incoming.health = clamp(incoming.health, 1, incoming.maxHealth || 100);
          incoming.inVehicleId = null; // Respawn safely outside moving traffic
          s.characters[cid] = incoming;
        }
      }

      if (typeof data.trustSynergy === 'number') {
        s.trustSynergy = clamp(data.trustSynergy, 0, 100);
      }
      if (data.inventories) {
        s.inventories = data.inventories;
      }
      if (data.activeWeapons) {
        s.activeWeapons = data.activeWeapons;
      }
      if (Array.isArray(data.vehicles)) {
        for (const v of data.vehicles) {
          const existing = s.vehicles.get(v.id);
          if (existing) {
            existing.ownerCharacter = v.ownerCharacter;
            existing.tuning = v.tuning;
            existing.trunkWeapons = v.trunkWeapons ?? [];
            existing.fuelLiters = clamp(v.fuelLiters, 0, existing.maxFuelLiters);
          }
        }
      }
      if (Array.isArray(data.ownedPropertyIds)) {
        for (const p of data.ownedPropertyIds) {
          const prop = s.properties.get(p.id);
          if (prop) prop.ownedBy = p.ownedBy;
        }
      }
      if (Array.isArray(data.collectedSalvageIds)) {
        s.collectedSalvageIds = new Set(data.collectedSalvageIds);
      }
      if (Array.isArray(data.missions)) {
        for (const m of data.missions) {
          s.missions.set(m.id, m);
        }
      }
      if (Array.isArray(data.transactions)) {
        s.transactions = data.transactions;
      }
      if (Array.isArray(data.stocks)) {
        s.stocks = data.stocks;
      }
      if (data.holdings) {
        s.holdings = data.holdings;
      }
      if (Array.isArray(data.socialFeed)) {
        s.socialFeed = data.socialFeed;
      }
      if (typeof data.dayTimeHours === 'number') {
        this.registry.clock.setDayTimeHours(data.dayTimeHours);
      }
      if (data.language) s.language = data.language;
      if (data.speedUnit) s.speedUnit = data.speedUnit;
      if (data.qualityProfile) s.qualityProfile = data.qualityProfile;
      if (typeof data.minimapRotate === 'boolean') s.minimapRotate = data.minimapRotate;
      if (data.cameraMode === 'third' || data.cameraMode === 'first') s.cameraMode = data.cameraMode;
      if (typeof data.hapticsEnabled === 'boolean') s.hapticsEnabled = data.hapticsEnabled;
      if (typeof data.hapticsIntensity === 'number') s.hapticsIntensity = clamp(data.hapticsIntensity, 0, 1);
      if (data.touchControlsMode) s.touchControlsMode = data.touchControlsMode;
      if (data.touchLayout) s.touchLayout = data.touchLayout;
      if (typeof data.touchOpacity === 'number') s.touchOpacity = clamp(data.touchOpacity, 0.3, 1);

      s.resumedFromSave = true;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.registry.events.emit('save:failed', { slotId, error: msg });
      return false;
    }
  }
}
