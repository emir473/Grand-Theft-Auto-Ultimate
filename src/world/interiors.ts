/**
 * Seamlessly Enterable Interiors & Interactive Service Points
 * Distinguishes exterior shells from enterable rooms, entrances/exits, lighting, and activities.
 */

import type { Vec3 } from '../core/types';

export interface InteriorZone {
  id: string;
  name: string;
  kind: 'villa' | 'ammu_nation' | 'clothing' | 'gas_shop' | 'bank' | 'nightclub' | 'hospital' | 'prison';
  entrancePos: Vec3;
  interiorCenter: Vec3;
  exitPos: Vec3;
  size: { w: number; h: number; d: number };
  activityType?: 'wardrobe' | 'weapon_shop' | 'robbery' | 'nightlife' | 'safe' | 'tuning';
}

export interface ATMPoint {
  id: string;
  label: string;
  position: Vec3;
}

export interface ActivitySpot {
  id: string;
  name: string;
  kind: 'darts' | 'pool' | 'poker' | 'arm_wrestling' | 'fishing' | 'hunting' | 'tuning' | 'wardrobe';
  position: Vec3;
}

export const ENTERABLE_INTERIORS: InteriorZone[] = [
  {
    id: 'int_star_villa',
    name: 'Star Island Villa Mansion',
    kind: 'villa',
    entrancePos: { x: 0, y: 1.0, z: 8.5 },
    interiorCenter: { x: 0, y: 1.1, z: 16.5 },
    exitPos: { x: 0, y: 1.0, z: 6.5 },
    size: { w: 18, h: 4.5, d: 14 },
    activityType: 'safe',
  },
  {
    id: 'int_ammu_downtown',
    name: 'Ammu-Nation Vice City',
    kind: 'ammu_nation',
    entrancePos: { x: -240, y: 0.6, z: -16 },
    interiorCenter: { x: -240, y: 0.6, z: -8 },
    exitPos: { x: -240, y: 0.6, z: -19 },
    size: { w: 14, h: 4.0, d: 12 },
    activityType: 'weapon_shop',
  },
  {
    id: 'int_clothing_ocean',
    name: 'Vice Threads Boutique',
    kind: 'clothing',
    entrancePos: { x: 178, y: 0.6, z: -48 },
    interiorCenter: { x: 186, y: 0.6, z: -48 },
    exitPos: { x: 174, y: 0.6, z: -48 },
    size: { w: 12, h: 4.0, d: 12 },
    activityType: 'wardrobe',
  },
  {
    id: 'int_gas_247',
    name: '24/7 Leonida Gas & Mart',
    kind: 'gas_shop',
    entrancePos: { x: -125, y: 0.6, z: -42 },
    interiorCenter: { x: -118, y: 0.6, z: -42 },
    exitPos: { x: -129, y: 0.6, z: -42 },
    size: { w: 12, h: 3.8, d: 10 },
    activityType: 'robbery',
  },
  {
    id: 'int_vice_bank',
    name: 'Banco de Leonida',
    kind: 'bank',
    entrancePos: { x: -155, y: 0.6, z: 95 },
    interiorCenter: { x: -168, y: 0.6, z: 95 },
    exitPos: { x: -150, y: 0.6, z: 95 },
    size: { w: 22, h: 5.5, d: 18 },
    activityType: 'robbery',
  },
  {
    id: 'int_malibu_club',
    name: 'Club Malibu Vice',
    kind: 'nightclub',
    entrancePos: { x: 178, y: 0.6, z: 95 },
    interiorCenter: { x: 190, y: 0.6, z: 95 },
    exitPos: { x: 173, y: 0.6, z: 95 },
    size: { w: 20, h: 5.0, d: 18 },
    activityType: 'nightlife',
  },
];

export const ATM_POINTS: ATMPoint[] = [
  { id: 'atm_star', label: 'Star Island Gate ATM', position: { x: -6, y: 0.6, z: -24 } },
  { id: 'atm_bank', label: 'Banco de Leonida ATM', position: { x: -150, y: 0.6, z: 86 } },
  { id: 'atm_ocean', label: 'Ocean Drive ATM', position: { x: 172, y: 0.6, z: -20 } },
  { id: 'atm_vcia', label: 'VCIA Concourse ATM', position: { x: -232, y: 0.6, z: -280 } },
];

export const ACTIVITY_SPOTS: ActivitySpot[] = [
  { id: 'act_wardrobe_villa', name: 'Villa Master Wardrobe', kind: 'wardrobe', position: { x: -5, y: 1.1, z: 18 } },
  { id: 'act_tuning_downtown', name: 'Vice Customs Garage', kind: 'tuning', position: { x: -158, y: 0.6, z: -22 } },
  { id: 'act_darts_club', name: 'Club Malibu Darts', kind: 'darts', position: { x: 194, y: 0.6, z: 89 } },
  { id: 'act_pool_club', name: 'Club Malibu Pool Table', kind: 'pool', position: { x: 188, y: 0.6, z: 100 } },
  { id: 'act_poker_club', name: 'High-Stakes Poker', kind: 'poker', position: { x: 184, y: 0.6, z: 91 } },
  { id: 'act_arm_club', name: 'Arm Wrestling Pit', kind: 'arm_wrestling', position: { x: 193, y: 0.6, z: 96 } },
  { id: 'act_fishing_pier', name: 'Deep-Sea Charter Pier', kind: 'fishing', position: { x: 205, y: 0.8, z: -150 } },
  { id: 'act_hunting_swamp', name: 'Grassrivers Wildlife Stand', kind: 'hunting', position: { x: -170, y: 0.6, z: 300 } },
];
