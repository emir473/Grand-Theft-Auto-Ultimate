/**
 * Shared Core Types, Coordinate System & Unit Conversions
 *
 * Coordinate System (Babylon.js Left-Handed):
 * - +X: East (right)
 * - +Y: Up (altitude in meters above mean sea level y=0)
 * - +Z: North (forward)
 * - Units: Position/distance in meters (m), Time in seconds (s),
 *   Speed in m/s, Acceleration in m/s^2, Force in Newtons (N),
 *   Torque in Nm, Mass in kg, Angles in radians (rad).
 * - Money: Integer in whole Leonida Dollars ($1 = 100 cents internally or exact integer dollars;
 *   here smallest currency unit = 1 cent, so $1.00 = 100 units, formatted via formatMoney).
 */

export const COORDINATE_SYSTEM = {
  handedness: 'left-handed',
  upAxis: '+Y',
  northAxis: '+Z',
  eastAxis: '+X',
  seaLevelMeters: 0,
} as const;

export type CharacterId = 'lucia' | 'jason';
export type QualityProfile = 'low' | 'medium' | 'high' | 'ultra';
export type LanguageCode = 'en' | 'de' | 'es' | 'fr';
export type SpeedUnit = 'kmh' | 'mph';
export type WeatherState = 'sunny' | 'cloudy' | 'rain' | 'hurricane';
export type SurfaceMaterial = 'asphalt' | 'wet_asphalt' | 'gravel' | 'mud' | 'sand' | 'water' | 'wood' | 'marble' | 'metal';
export type SimulationTier = 'near' | 'medium' | 'far';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CharacterAttributes {
  shooting: number; // 0..100
  stamina: number;  // 0..100
  driving: number;  // 0..100
  lungCapacity: number; // 0..100
}

export interface FitnessState {
  muscleMass: number; // 0..100
  bodyFat: number;    // 0..100
  nutrition: number;  // 0..100
  fatigue: number;    // 0..100
}

export interface DirtStatus {
  mud: number;  // 0..1
  sand: number; // 0..1
  dust: number; // 0..1
  scuff: number; // 0..1 (non-graphic injury/combat scuff status)
}

export interface WardrobeState {
  outfitId: string;
  hairstyleId: string;
  tattooId: string;
}

export type WaterMoveState =
  | 'land'
  | 'water'
  | 'surface'
  | 'swimming'
  | 'diving'
  | 'underwater'
  | 'surfacing'
  | 'low_oxygen'
  | 'shore';

export type LocomotionState =
  | 'idle'
  | 'walk'
  | 'fast_walk'
  | 'run'
  | 'sprint'
  | 'crouch'
  | 'crawl'
  | 'climb'
  | 'swim'
  | 'dive'
  | 'cover'
  | 'aim'
  | 'shoot'
  | 'melee'
  | 'impact'
  | 'fall'
  | 'get_up'
  | 'carry'
  | 'vehicle';

export interface CharacterSaveState {
  id: CharacterId;
  displayName: string;
  position: Vec3;
  yaw: number;
  health: number;
  maxHealth: number;
  armor: number;
  staminaCurrent: number;
  oxygenCurrent: number;
  maxOxygen: number;
  cashCents: number;
  bankCents: number;
  attributes: CharacterAttributes;
  fitness: FitnessState;
  dirt: DirtStatus;
  wardrobe: WardrobeState;
  waterState: WaterMoveState;
  locomotion: LocomotionState;
  inInteriorId: string | null;
  inVehicleId: string | null;
}

export type WeaponCategory = 'unarmed' | 'melee' | 'handgun' | 'smg' | 'shotgun' | 'rifle' | 'heavy' | 'equipment';

export interface WeaponDefinition {
  id: string;
  nameKey: string;
  category: WeaponCategory;
  slotType: 'melee' | 'handgun' | 'back' | 'heavy' | 'equipment';
  magazineSize: number;
  maxReserveAmmo: number;
  fireRatePerSec: number;
  spreadRad: number;
  rangeMeters: number;
  fictionalDamage: number;
  projectileSpeedMps: number;
  illegal: boolean;
  priceCents: number;
}

export interface InventoryItem {
  weaponId: string;
  loadedAmmo: number;
  reserveAmmo: number;
  owned: boolean;
}

export interface VehicleTuning {
  engineLevel: number; // 0..3
  torqueLevel: number; // 0..3
  suspensionHeightOffset: number; // -0.08..+0.08 m
  spoilerId: string;
  primaryColorHex: string;
  pearlescentHex: string;
  metallic: number; // 0..1
  wheelType: 'stock' | 'sport' | 'offroad' | 'chrome';
  tireCompound: 'street' | 'sport' | 'allterrain';
}

export type VehicleClass =
  | 'supercar'
  | 'sports'
  | 'sedan'
  | 'suv'
  | 'muscle'
  | 'police'
  | 'taxi'
  | 'bus'
  | 'truck'
  | 'trailer'
  | 'motorcycle';

export interface VehicleDamageZones {
  front: number; // 0..1
  rear: number;
  left: number;
  right: number;
  engine: number; // 0=healthy, 1=wrecked
  detachedParts: string[];
}

export interface VehicleStateData {
  id: string;
  modelId: string;
  vehicleClass: VehicleClass;
  name: string;
  ownerCharacter: CharacterId | 'npc' | 'service' | 'police';
  plate: string;
  position: Vec3;
  yaw: number;
  massKg: number;
  fuelLiters: number;
  maxFuelLiters: number;
  fuelLeakRate: number;
  locked: boolean;
  alarmActive: boolean;
  stolen: boolean;
  tuning: VehicleTuning;
  damage: VehicleDamageZones;
  trunkWeapons: InventoryItem[];
  trunkMaxSlots: number;
  cargoWeightKg: number;
  attachedTrailerId: string | null;
  driverId: string | null;
}

export type RoadType = 'highway' | 'avenue' | 'street' | 'alley' | 'rail' | 'waterway' | 'sidewalk';

export interface RoadNode {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: 'intersection' | 'waypoint' | 'stop' | 'station' | 'gate' | 'harbor';
  name?: string;
}

export interface RoadEdge {
  id: string;
  from: string;
  to: string;
  lengthMeters: number;
  speedLimitMps: number;
  roadType: RoadType;
  lanes: number;
  oneWay: boolean;
  closed: boolean;
  weightMultiplier: number;
}

export interface PropertyDef {
  id: string;
  nameKey: string;
  kind: 'villa' | 'safehouse' | 'garage' | 'workshop' | 'club';
  district: string;
  position: Vec3;
  priceCents: number;
  ownedBy: CharacterId | null;
  garageCapacity: number;
  interiorId: string | null;
}

export interface TransactionRecord {
  id: string;
  timestampGameSec: number;
  characterId: CharacterId;
  account: 'cash' | 'bank';
  amountCents: number; // negative = debit, positive = credit
  balanceAfterCents: number;
  trigger: string;
  description: string;
}

export interface StockInstrument {
  symbol: string;
  exchange: 'LCN' | 'BAWSAQ';
  name: string;
  priceCents: number;
  prevPriceCents: number;
  volatility: number;
  trendBias: number;
  historyCents: number[];
}

export interface StockHolding {
  symbol: string;
  shares: number;
  avgCostCents: number;
}

export interface ForensicClue {
  id: string;
  kind: 'witness' | 'cctv' | 'plate' | 'dna_prints' | 'ballistic';
  crimeType: string;
  location: Vec3;
  timestampSec: number;
  suspectId: CharacterId;
  vehiclePlate?: string;
  obtainedByPolice: boolean;
  investigated: boolean;
}

export interface SocialPost {
  id: string;
  authorName: string;
  isNpc: boolean;
  caption: string;
  eventTag: string;
  likes: number;
  reach: number;
  timestampGameSec: number;
  location: Vec3;
}

export interface MissionState {
  id: string;
  titleKey: string;
  descriptionKey: string;
  status: 'available' | 'active' | 'completed' | 'failed';
  stageIndex: number;
  targetPosition: Vec3 | null;
  rewardCents: number;
}

export interface EngineMetrics {
  fps: number;
  frameTimeMs: number;
  cpuUpdateMs: number;
  renderTimeMs: number;
  frameVarianceMs: number;
  drawCalls: number;
  activeEntities: number;
  physicsBodies: number;
  activeParticles: number;
  texturesCount: number;
  gpuMemoryText: string;
  rendererBackend: 'WebGPU' | 'WebGL2';
}

export const CENTRAL_LIMITS = {
  maxNpcsNear: 28,
  maxNpcsMedium: 48,
  maxNpcsFar: 80,
  maxVehicles: 42,
  maxParticles: 1200,
  maxProjectiles: 64,
  maxDecals: 96,
  maxAudioVoices: 24,
  maxTempMeshes: 48,
  maxLoadedChunks: 16,
  maxReplayFrames: 450,
  maxRenderTargets: 4,
} as const;

export function mpsToKmh(mps: number): number {
  return Number.isFinite(mps) ? mps * 3.6 : 0;
}

export function mpsToMph(mps: number): number {
  return Number.isFinite(mps) ? mps * 2.23693629 : 0;
}

export function formatMoney(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = safe < 0 ? '-' : '';
  const absDollars = Math.abs(safe) / 100;
  return `${sign}$${absDollars.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function sanitizeVec3(v: Vec3): Vec3 {
  return {
    x: Number.isFinite(v.x) ? v.x : 0,
    y: Number.isFinite(v.y) ? v.y : 0,
    z: Number.isFinite(v.z) ? v.z : 0,
  };
}
