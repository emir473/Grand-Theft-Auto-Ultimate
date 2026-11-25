/**
 * Greater Leonida Story Missions, Regional Waypoints & Scheduled World Events
 */

import type { MissionState, Vec3 } from '../core/types';
import { posterUVToWorld } from '../world/leonidaGeoData';

export interface DynamicWorldEvent {
  id: string;
  title: string;
  authorHandle: string;
  caption: string;
  triggerHour: number;
  location: Vec3;
}

export function createInitialMissions(): MissionState[] {
  const alliedXZ = posterUVToWorld(0.546, 0.362);
  const vcPortXZ = posterUVToWorld(0.805, 0.550);
  const keyLentoXZ = posterUVToWorld(0.548, 0.832);
  const portGellhornXZ = posterUVToWorld(0.305, 0.355);

  return [
    {
      id: 'mission_vice_welcome',
      titleKey: 'Vice Welcome: Ocean Drive Run',
      descriptionKey: 'Drive from Star Island Villa to Ocean Drive & Club Malibu.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: 165, y: 1, z: 95 },
      rewardCents: 250000,
    },
    {
      id: 'mission_banco_heist',
      titleKey: 'Banco de Leonida Score',
      descriptionKey: 'Infiltrate Banco de Leonida, hack the vault terminal, and escape police.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: -155, y: 1, z: 95 },
      rewardCents: 2500000,
    },
    {
      id: 'mission_deep_salvage',
      titleKey: 'Smuggler Wreck Recovery',
      descriptionKey: 'Dive off Star Island coast and recover the sunken smuggler yacht crate.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: 82, y: -5.5, z: 45 },
      rewardCents: 400000,
    },
    {
      id: 'mission_allied_convoy',
      titleKey: 'Allied Crystal Convoy Run',
      descriptionKey: 'Intercept a sugar-refinery manifest near Ambrosia and haul it to VC Port.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: alliedXZ.x, y: 1.5, z: alliedXZ.z },
      rewardCents: 950000,
    },
    {
      id: 'mission_keys_intercept',
      titleKey: 'Keys Offshore Intercept',
      descriptionKey: 'Race across Overseas Keys SR-1A to the Key Lento Lighthouse pier.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: keyLentoXZ.x, y: 1.5, z: keyLentoXZ.z },
      rewardCents: 1150000,
    },
    {
      id: 'mission_gellhorn_smuggler',
      titleKey: 'Port Gellhorn Smuggler Bust',
      descriptionKey: 'Meet informant at Port Gellhorn Docks, then deliver cargo to Buckskin Stilt Cabin.',
      status: 'available',
      stageIndex: 0,
      targetPosition: { x: portGellhornXZ.x, y: 1.5, z: portGellhornXZ.z },
      rewardCents: 1400000,
    },
  ];
}

export function getMissionStage2Target(missionId: string): { pos: Vec3; desc: string; label: string; wanted?: number } | null {
  if (missionId === 'mission_vice_welcome') {
    return {
      pos: { x: 165, y: 1, z: 95 },
      desc: 'Stage 2/2: Meet at Club Malibu Vice Beach.',
      label: 'Vice Welcome (2/2)',
    };
  }
  if (missionId === 'mission_banco_heist') {
    return {
      pos: { x: 0, y: 1, z: -6 },
      desc: 'Stage 2/2: Return stolen bonds to Star Island Villa!',
      label: 'Banco Score (Escape)',
      wanted: 2,
    };
  }
  if (missionId === 'mission_allied_convoy') {
    const port = posterUVToWorld(0.805, 0.550);
    return {
      pos: { x: port.x, y: 1.5, z: port.z },
      desc: 'Stage 2/2: Deliver manifest to VC Port Shipping Pier.',
      label: 'Allied Convoy -> VC Port',
      wanted: 1,
    };
  }
  if (missionId === 'mission_keys_intercept') {
    return {
      pos: { x: 168, y: 1, z: -26 },
      desc: 'Stage 2/2: Return offshore transponder to Vice Beach Marina Pavilion.',
      label: 'Keys Intercept -> Marina',
    };
  }
  if (missionId === 'mission_gellhorn_smuggler') {
    const cabin = posterUVToWorld(0.450, 0.660);
    return {
      pos: { x: cabin.x, y: 1.5, z: cabin.z },
      desc: 'Stage 2/2: Drop cargo at Buckskin Swamp Stilt House.',
      label: 'Gellhorn -> Stilt Cabin',
      wanted: 2,
    };
  }
  return null;
}

export const DYNAMIC_WORLD_EVENTS: DynamicWorldEvent[] = [
  {
    id: 'evt_marina_meet',
    title: 'Vice Beach Marina Supercar Meet',
    authorHandle: '@ViceCarCulture',
    caption: 'Custom supercars & lowriders gathering at the Zigzag Marina lot on Ocean Drive!',
    triggerHour: 15,
    location: { x: 168, y: 1, z: -26 },
  },
  {
    id: 'evt_dusk_skyline',
    title: 'Downtown Magenta Dusk Cruise',
    authorHandle: '@MegamundoLive',
    caption: 'Sahara Arena & Megamundo Tower lit up in Vice City twilight. Cruisers out on Biscayne!',
    triggerHour: 18,
    location: { x: -175, y: 1, z: 25 },
  },
  {
    id: 'evt_keys_run',
    title: 'Key Lento Midnight Lighthouse Sprint',
    authorHandle: '@KeysOutlaws',
    caption: 'Open highway sprint down SR-1A to Key Lento pier — no speed traps past Mile 40.',
    triggerHour: 22,
    location: (() => {
      const p = posterUVToWorld(0.548, 0.832);
      return { x: p.x, y: 1.5, z: p.z };
    })(),
  },
];
