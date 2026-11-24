/**
 * Vehicle Handling Profiles & PBR Mesh Builder
 */

import { Scene, Texture } from '@babylonjs/core';
import type { VehicleClass } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { buildSculptedVehicleRig, type SculptedVehicleRig } from './vehicleSculptor';

export interface VehicleHandlingProfile {
  massKg: number;
  maxTorqueNm: number;
  maxRpm: number;
  gearRatios: number[];
  dragCoeff: number;
  baseGrip: number;
  steerMaxRad: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  width: number;
  length: number;
}

export const HANDLING_PROFILES: Record<VehicleClass, VehicleHandlingProfile> = {
  supercar: { massKg: 1420, maxTorqueNm: 680, maxRpm: 8400, gearRatios: [3.2, 2.2, 1.6, 1.2, 0.92, 0.74], dragCoeff: 0.31, baseGrip: 1.18, steerMaxRad: 0.56, suspensionStiffness: 34000, suspensionDamping: 4200, width: 2.0, length: 4.5 },
  sports: { massKg: 1520, maxTorqueNm: 540, maxRpm: 7600, gearRatios: [3.4, 2.3, 1.65, 1.22, 0.95, 0.78], dragCoeff: 0.34, baseGrip: 1.1, steerMaxRad: 0.58, suspensionStiffness: 31000, suspensionDamping: 3900, width: 1.95, length: 4.4 },
  muscle: { massKg: 1740, maxTorqueNm: 620, maxRpm: 6800, gearRatios: [3.3, 2.1, 1.5, 1.1, 0.88], dragCoeff: 0.4, baseGrip: 0.95, steerMaxRad: 0.54, suspensionStiffness: 28000, suspensionDamping: 3500, width: 2.0, length: 4.7 },
  sedan: { massKg: 1620, maxTorqueNm: 340, maxRpm: 6400, gearRatios: [3.5, 2.2, 1.5, 1.05, 0.84], dragCoeff: 0.36, baseGrip: 1.0, steerMaxRad: 0.6, suspensionStiffness: 25000, suspensionDamping: 3300, width: 1.88, length: 4.6 },
  suv: { massKg: 2350, maxTorqueNm: 490, maxRpm: 6000, gearRatios: [3.7, 2.4, 1.6, 1.15, 0.9], dragCoeff: 0.46, baseGrip: 0.98, steerMaxRad: 0.56, suspensionStiffness: 33000, suspensionDamping: 4400, width: 2.1, length: 4.9 },
  police: { massKg: 1850, maxTorqueNm: 560, maxRpm: 7200, gearRatios: [3.4, 2.2, 1.55, 1.15, 0.88], dragCoeff: 0.36, baseGrip: 1.12, steerMaxRad: 0.62, suspensionStiffness: 32000, suspensionDamping: 4100, width: 1.96, length: 4.7 },
  taxi: { massKg: 1680, maxTorqueNm: 360, maxRpm: 6200, gearRatios: [3.5, 2.2, 1.5, 1.08, 0.85], dragCoeff: 0.38, baseGrip: 1.02, steerMaxRad: 0.62, suspensionStiffness: 26000, suspensionDamping: 3400, width: 1.9, length: 4.65 },
  bus: { massKg: 8400, maxTorqueNm: 1150, maxRpm: 3200, gearRatios: [4.8, 3.0, 2.0, 1.3, 0.9], dragCoeff: 0.72, baseGrip: 0.86, steerMaxRad: 0.52, suspensionStiffness: 56000, suspensionDamping: 8200, width: 2.55, length: 9.8 },
  truck: { massKg: 5400, maxTorqueNm: 1250, maxRpm: 3600, gearRatios: [4.6, 2.9, 1.9, 1.25, 0.88], dragCoeff: 0.68, baseGrip: 0.9, steerMaxRad: 0.52, suspensionStiffness: 48000, suspensionDamping: 7200, width: 2.45, length: 6.4 },
  trailer: { massKg: 2800, maxTorqueNm: 0, maxRpm: 0, gearRatios: [1], dragCoeff: 0.6, baseGrip: 0.9, steerMaxRad: 0, suspensionStiffness: 36000, suspensionDamping: 5200, width: 2.4, length: 6.0 },
  motorcycle: { massKg: 240, maxTorqueNm: 145, maxRpm: 11000, gearRatios: [2.8, 2.0, 1.5, 1.2, 1.0], dragCoeff: 0.42, baseGrip: 1.08, steerMaxRad: 0.64, suspensionStiffness: 18000, suspensionDamping: 2200, width: 0.75, length: 2.1 },
};

export function buildVehicleVisualRig(
  scene: Scene,
  gfx: GraphicsEngine,
  id: string,
  vehicleClass: VehicleClass,
  profile: VehicleHandlingProfile,
  colorHex: string,
  plate = 'VICE-001',
  rainDropTex?: Texture
): SculptedVehicleRig {
  return buildSculptedVehicleRig(scene, gfx, id, vehicleClass, profile, colorHex, plate, rainDropTex);
}

export const INITIAL_FLEET_SPECS: Array<{
  id: string;
  modelId: string;
  vehicleClass: VehicleClass;
  name: string;
  ownerCharacter: 'lucia' | 'jason' | 'npc' | 'service' | 'police';
  plate: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  colorHex: string;
  locked: boolean;
  underglowHex?: string;
  attachedTrailerId?: string;
  cargoWeightKg?: number;
}> = [
  { id: 'veh_lucia_banshee', modelId: 'banshee_gt', vehicleClass: 'supercar', name: 'Banshee GT Vice', ownerCharacter: 'lucia', plate: 'VICE-001', position: { x: -12, y: 0.9, z: -12 }, yaw: 0.25, colorHex: '#ec4899', underglowHex: '#00f0ff', locked: false },
  { id: 'veh_jason_cavalcade', modelId: 'cavalcade_xl', vehicleClass: 'suv', name: 'Cavalcade XL', ownerCharacter: 'jason', plate: 'LEON-420', position: { x: 11, y: 0.9, z: -14 }, yaw: -0.2, colorHex: '#1e293b', underglowHex: '#f59e0b', locked: false },
  { id: 'veh_ocean_cheetah', modelId: 'cheetah_classic', vehicleClass: 'sports', name: 'Cheetah Classic', ownerCharacter: 'npc', plate: 'OCN-778', position: { x: 162, y: 0.6, z: -40 }, yaw: 0.35, colorHex: '#2563eb', underglowHex: '#ec4899', locked: false },
  { id: 'veh_marina_buccaneer', modelId: 'buccaneer_drop', vehicleClass: 'muscle', name: 'Buccaneer Convertible', ownerCharacter: 'npc', plate: 'LOW-305', position: { x: 168, y: 0.6, z: -26 }, yaw: -0.45, colorHex: '#65a30d', underglowHex: '#84cc16', locked: false },
  { id: 'veh_marina_donk', modelId: 'faction_donk', vehicleClass: 'sedan', name: 'Faction Mint Custom', ownerCharacter: 'npc', plate: 'DONK-88', position: { x: 175, y: 0.6, z: -34 }, yaw: -1.1, colorHex: '#5eead4', locked: false },
  { id: 'veh_marina_vcpd', modelId: 'interceptor_vcpd', vehicleClass: 'police', name: 'VCPD Pursuit Coupe', ownerCharacter: 'police', plate: 'VCPD-911', position: { x: 154, y: 0.6, z: -32 }, yaw: 0.9, colorHex: '#111827', locked: true },
  { id: 'veh_marina_cyclone', modelId: 'cyclone_rs', vehicleClass: 'supercar', name: 'Coquette D10 Sunset', ownerCharacter: 'npc', plate: 'SUN-992', position: { x: 170, y: 0.6, z: -14 }, yaw: -0.25, colorHex: '#ea580c', underglowHex: '#fb923c', locked: false },
  { id: 'veh_swamp_pickup', modelId: 'vapid_classic', vehicleClass: 'truck', name: 'Vapid Rebel Classic', ownerCharacter: 'npc', plate: 'SWMP-12', position: { x: -498, y: 1.4, z: 332 }, yaw: 0.5, colorHex: '#38bdf8', locked: false },
  { id: 'veh_hauler_1', modelId: 'phantom_hauler', vehicleClass: 'truck', name: 'Phantom Hauler', ownerCharacter: 'npc', plate: 'TRK-904', position: { x: -150, y: 0.6, z: -60 }, yaw: 0, colorHex: '#475569', locked: false, attachedTrailerId: 'veh_trailer_1' },
  { id: 'veh_trailer_1', modelId: 'flatbed_cargo', vehicleClass: 'trailer', name: 'Cargo Flatbed Trailer', ownerCharacter: 'service', plate: 'TRL-904', position: { x: -150, y: 0.6, z: -67 }, yaw: 0, colorHex: '#64748b', locked: false, cargoWeightKg: 1400 },
];

