/**
 * Centralized Dependency Registry, Module Lifecycle & Canonical World State Manager
 */

import type { Engine, Scene, Camera } from '@babylonjs/core';
import { EventBus } from './events';
import { SimulationClock } from './clock';
import type {
  CharacterId,
  CharacterSaveState,
  EngineMetrics,
  ForensicClue,
  InventoryItem,
  LanguageCode,
  MissionState,
  PropertyDef,
  QualityProfile,
  SocialPost,
  SpeedUnit,
  StockHolding,
  StockInstrument,
  TransactionRecord,
  VehicleStateData,
  WeatherState,
} from './types';

export type ModuleReadiness = 'uninitialized' | 'validated' | 'initialized' | 'running' | 'stopped' | 'disposed' | 'error';

export interface GameModule {
  readonly moduleId: string;
  readonly readiness: ModuleReadiness;
  validateDependencies(registry: GameRegistry): void;
  init(): Promise<void> | void;
  start(): void;
  update?(simDt: number, renderDt: number): void;
  fixedUpdate?(fixedDt: number): void;
  stop(): void;
  dispose(): void;
}

export interface CanonicalWorldState {
  activeCharacterId: CharacterId;
  characters: Record<CharacterId, CharacterSaveState>;
  trustSynergy: number; // 0..100 Lucia-Jason synergy
  inventories: Record<CharacterId, InventoryItem[]>;
  activeWeapons: Record<CharacterId, string>;
  vehicles: Map<string, VehicleStateData>;
  properties: Map<string, PropertyDef>;
  collectedSalvageIds: Set<string>;
  missions: Map<string, MissionState>;
  transactions: TransactionRecord[];
  stocks: StockInstrument[];
  holdings: Record<CharacterId, StockHolding[]>;
  socialFeed: SocialPost[];
  forensicClues: ForensicClue[];
  wantedStars: number;
  wantedCooldownSec: number;
  policeActiveUnits: number;
  weather: WeatherState;
  weatherIntensity: number;
  windVector: { x: number; y: number; z: number };
  language: LanguageCode;
  speedUnit: SpeedUnit;
  qualityProfile: QualityProfile;
  minimapRotate: boolean;
  gpsDestination: { x: number; y: number; z: number; label: string } | null;
  phoneOpen: boolean;
  weaponWheelOpen: boolean;
  consoleOpen: boolean;
  pauseMenuOpen: boolean;
  directorModeActive: boolean;
  cameraMode: 'third' | 'first';
  photoModeActive: boolean;
  hapticsEnabled: boolean;
  hapticsIntensity: number; // 0..1
  touchControlsMode: 'auto' | 'on' | 'off';
  touchLayout: 'right' | 'left';
  touchOpacity: number; // 0.3..1
  gameOverState: 'none' | 'wasted' | 'busted';
  lastDeathEventId: string | null;
  lastArrestEventId: string | null;
  resumedFromSave: boolean;
}

export function createDefaultCharacter(id: CharacterId): CharacterSaveState {
  if (id === 'lucia') {
    return {
      id: 'lucia',
      displayName: 'Lucia Caminos',
      // Star Island Villa courtyard starting position
      position: { x: 0, y: 1.0, z: -6 },
      yaw: 0,
      health: 100,
      maxHealth: 100,
      armor: 25,
      staminaCurrent: 100,
      oxygenCurrent: 100,
      maxOxygen: 100,
      cashCents: 425000, // $4,250
      bankCents: 1850000, // $18,500
      attributes: { shooting: 48, stamina: 54, driving: 44, lungCapacity: 45 },
      fitness: { muscleMass: 52, bodyFat: 18, nutrition: 80, fatigue: 5 },
      dirt: { mud: 0, sand: 0, dust: 0, scuff: 0 },
      wardrobe: { outfitId: 'vice_resort_coral', hairstyleId: 'waves_dark', tattooId: 'sleeve_florida' },
      waterState: 'land',
      locomotion: 'idle',
      inInteriorId: null,
      inVehicleId: null,
    };
  }
  return {
    id: 'jason',
    displayName: 'Jason Duval',
    position: { x: 4.5, y: 1.0, z: -4.5 },
    yaw: -0.4,
    health: 100,
    maxHealth: 100,
    armor: 35,
    staminaCurrent: 100,
    oxygenCurrent: 100,
    maxOxygen: 100,
    cashCents: 310000, // $3,100
    bankCents: 1420000, // $14,200
    attributes: { shooting: 55, stamina: 50, driving: 58, lungCapacity: 42 },
    fitness: { muscleMass: 64, bodyFat: 15, nutrition: 76, fatigue: 8 },
    dirt: { mud: 0, sand: 0, dust: 0, scuff: 0 },
    wardrobe: { outfitId: 'leonida_linen_shirt', hairstyleId: 'short_fade', tattooId: 'forearm_anchor' },
    waterState: 'land',
    locomotion: 'idle',
    inInteriorId: null,
    inVehicleId: null,
  };
}

export class GameRegistry {
  public readonly events = new EventBus();
  public readonly clock = new SimulationClock();
  public readonly state: CanonicalWorldState;

  public engine: Engine | null = null;
  public scene: Scene | null = null;
  public camera: Camera | null = null;
  public canvas: HTMLCanvasElement | null = null;

  private modules = new Map<string, GameModule>();
  private orderedIds: string[] = [];
  private services = new Map<string, unknown>();

  public metrics: EngineMetrics = {
    fps: 60,
    frameTimeMs: 16.67,
    cpuUpdateMs: 0,
    renderTimeMs: 0,
    frameVarianceMs: 0,
    drawCalls: 0,
    activeEntities: 0,
    physicsBodies: 0,
    activeParticles: 0,
    texturesCount: 0,
    gpuMemoryText: 'Unavailable (Browser Estimate)',
    rendererBackend: 'WebGL2',
  };

  constructor() {
    this.state = {
      activeCharacterId: 'lucia',
      characters: {
        lucia: createDefaultCharacter('lucia'),
        jason: createDefaultCharacter('jason'),
      },
      trustSynergy: 74,
      inventories: {
        lucia: [
          { weaponId: 'unarmed', loadedAmmo: 0, reserveAmmo: 0, owned: true },
          { weaponId: 'pistol_9mm', loadedAmmo: 15, reserveAmmo: 60, owned: true },
          { weaponId: 'smg_compact', loadedAmmo: 30, reserveAmmo: 90, owned: true },
        ],
        jason: [
          { weaponId: 'unarmed', loadedAmmo: 0, reserveAmmo: 0, owned: true },
          { weaponId: 'pistol_9mm', loadedAmmo: 15, reserveAmmo: 45, owned: true },
          { weaponId: 'shotgun_pump', loadedAmmo: 8, reserveAmmo: 24, owned: true },
          { weaponId: 'carbine_mk2', loadedAmmo: 30, reserveAmmo: 90, owned: true },
        ],
      },
      activeWeapons: {
        lucia: 'unarmed',
        jason: 'unarmed',
      },
      vehicles: new Map(),
      properties: new Map(),
      collectedSalvageIds: new Set(),
      missions: new Map(),
      transactions: [],
      stocks: [
        { symbol: 'VCA', exchange: 'LCN', name: 'Vice City Airways', priceCents: 14250, prevPriceCents: 14100, volatility: 0.035, trendBias: 0.002, historyCents: [13800, 13950, 14100, 14250] },
        { symbol: 'AMM', exchange: 'BAWSAQ', name: 'Ammu-Nation Holdings', priceCents: 8840, prevPriceCents: 8790, volatility: 0.04, trendBias: 0.003, historyCents: [8500, 8620, 8790, 8840] },
        { symbol: 'LNC', exchange: 'LCN', name: 'Leonida Construction', priceCents: 5420, prevPriceCents: 5510, volatility: 0.025, trendBias: 0.001, historyCents: [5600, 5540, 5510, 5420] },
        { symbol: 'STR', exchange: 'BAWSAQ', name: 'Star Island Realty', priceCents: 31200, prevPriceCents: 30900, volatility: 0.02, trendBias: 0.002, historyCents: [30200, 30550, 30900, 31200] },
        { symbol: 'VCP', exchange: 'LCN', name: 'Vice Coastal Energy', priceCents: 6780, prevPriceCents: 6750, volatility: 0.045, trendBias: -0.001, historyCents: [6900, 6810, 6750, 6780] },
      ],
      holdings: { lucia: [], jason: [] },
      socialFeed: [
        {
          id: 'post_init_1',
          authorName: '@ViceBeachWatch',
          isNpc: true,
          caption: 'Clear morning skies over Star Island and Ocean Drive. Watch out for VCIA arrivals every 10 minutes!',
          eventTag: 'weather',
          likes: 184,
          reach: 2450,
          timestampGameSec: 0,
          location: { x: 0, y: 1, z: 0 },
        },
      ],
      forensicClues: [],
      wantedStars: 0,
      wantedCooldownSec: 0,
      policeActiveUnits: 0,
      weather: 'sunny',
      weatherIntensity: 0.15,
      windVector: { x: 2.2, y: 0, z: -1.1 },
      language: 'en',
      speedUnit: 'mph',
      qualityProfile: 'high',
      minimapRotate: true,
      gpsDestination: null,
      phoneOpen: false,
      weaponWheelOpen: false,
      consoleOpen: false,
      pauseMenuOpen: false,
      directorModeActive: false,
      cameraMode: 'third',
      photoModeActive: false,
      hapticsEnabled: true,
      hapticsIntensity: 0.75,
      touchControlsMode: 'auto',
      touchLayout: 'right',
      touchOpacity: 0.85,
      gameOverState: 'none',
      lastDeathEventId: null,
      lastArrestEventId: null,
      resumedFromSave: false,
    };
  }

  registerModule(mod: GameModule): void {
    if (this.modules.has(mod.moduleId)) {
      throw new Error(`Duplicate module registration: ${mod.moduleId}`);
    }
    this.modules.set(mod.moduleId, mod);
    this.orderedIds.push(mod.moduleId);
  }

  getModule<T extends GameModule>(moduleId: string): T {
    const mod = this.modules.get(moduleId);
    if (!mod) {
      throw new Error(`Missing required module: ${moduleId}`);
    }
    return mod as T;
  }

  hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  registerService<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  getService<T>(key: string): T {
    const svc = this.services.get(key);
    if (!svc) {
      throw new Error(`Missing required service: ${key}`);
    }
    return svc as T;
  }

  hasService(key: string): boolean {
    return this.services.has(key);
  }

  getAllModules(): GameModule[] {
    return this.orderedIds.map((id) => this.modules.get(id)!);
  }

  getActiveCharacter(): CharacterSaveState {
    return this.state.characters[this.state.activeCharacterId];
  }

  isGameplayInputBlocked(): boolean {
    return (
      this.state.consoleOpen ||
      this.state.pauseMenuOpen ||
      this.state.gameOverState !== 'none'
    );
  }

  disposeAll(): void {
    const reversed = [...this.orderedIds].reverse();
    for (const id of reversed) {
      const mod = this.modules.get(id);
      if (mod) {
        try {
          mod.stop();
          mod.dispose();
        } catch (err) {
          console.error(`[GameRegistry] Error disposing ${id}:`, err);
        }
      }
    }
    this.modules.clear();
    this.orderedIds = [];
    this.services.clear();
    this.events.clear();
  }
}
