/**
 * Canonical 1:1 Leonida Geospatial Dataset digitized from the Official Leonida Poster
 * (IMG_8682_9219504e.jpeg, Grid 1-9 x A-M) & Zoomed Central/Southern Map (IMG_8384_505eb1c7.jpeg).
 * All terrain, coastlines, water bodies, road geometry, 2D Pause Map, and Minimap share
 * this single deterministic coordinate system.
 */

export interface UVPoint {
  u: number;
  v: number;
}

export interface WorldXZ {
  x: number;
  z: number;
}

export interface GeoPolygonFeature {
  id: string;
  name: string;
  kind: 'mainland' | 'island' | 'lake' | 'river' | 'swamp' | 'county' | 'park' | 'airport';
  county?: string;
  colorHex: string;
  elevationTargetM: number;
  points: UVPoint[];
}

export type { GeoRoadPolyline } from './leonidaRoadsData';
export { LEONIDA_ROAD_CORRIDORS } from './leonidaRoadsData';

// Deterministic reversible poster <-> world meters transform
// Anchor: Starfish Island (u=0.770, v=0.495) -> World (x=0, z=0)
export const POSTER_ORIGIN_U = 0.770;
export const POSTER_ORIGIN_V = 0.495;
export const WORLD_SCALE_X = 2400;
export const WORLD_SCALE_Z = 3100;

export function posterUVToWorld(u: number, v: number): WorldXZ {
  return {
    x: (u - POSTER_ORIGIN_U) * WORLD_SCALE_X,
    z: -(v - POSTER_ORIGIN_V) * WORLD_SCALE_Z,
  };
}

export function worldToPosterUV(x: number, z: number): UVPoint {
  return {
    u: POSTER_ORIGIN_U + x / WORLD_SCALE_X,
    v: POSTER_ORIGIN_V - z / WORLD_SCALE_Z,
  };
}

// Main organic Leonida mainland silhouette traced clockwise from northern Lummox coast
export const LEONIDA_MAINLAND_POLYGON: UVPoint[] = [
  { u: 0.455, v: 0.120 }, { u: 0.515, v: 0.130 }, { u: 0.575, v: 0.145 },
  { u: 0.640, v: 0.175 }, { u: 0.695, v: 0.215 }, { u: 0.720, v: 0.275 },
  { u: 0.752, v: 0.315 }, { u: 0.778, v: 0.355 }, { u: 0.805, v: 0.390 },
  { u: 0.755, v: 0.405 }, { u: 0.742, v: 0.440 }, { u: 0.725, v: 0.470 },
  { u: 0.725, v: 0.515 }, { u: 0.740, v: 0.545 }, { u: 0.790, v: 0.558 },
  { u: 0.765, v: 0.592 }, { u: 0.720, v: 0.618 }, { u: 0.692, v: 0.655 },
  { u: 0.652, v: 0.688 }, { u: 0.625, v: 0.728 }, { u: 0.575, v: 0.745 },
  { u: 0.535, v: 0.775 }, { u: 0.485, v: 0.785 }, { u: 0.445, v: 0.740 },
  { u: 0.395, v: 0.695 }, { u: 0.355, v: 0.648 }, { u: 0.320, v: 0.605 },
  { u: 0.265, v: 0.585 }, { u: 0.235, v: 0.550 }, { u: 0.260, v: 0.512 },
  { u: 0.315, v: 0.495 }, { u: 0.270, v: 0.455 }, { u: 0.245, v: 0.415 },
  { u: 0.285, v: 0.375 }, { u: 0.305, v: 0.325 }, { u: 0.325, v: 0.265 },
  { u: 0.375, v: 0.205 }, { u: 0.415, v: 0.145 },
];

export const LEONIDA_ISLANDS: GeoPolygonFeature[] = [
  // Central Bay Islands (Zone 2 — canonical poster spellings)
  {
    id: 'isl_starfish',
    name: 'Starfish Island',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#639b56',
    elevationTargetM: 1.0,
    points: [
      { u: 0.742, v: 0.478 }, { u: 0.796, v: 0.478 }, { u: 0.798, v: 0.512 }, { u: 0.742, v: 0.512 },
    ],
  },
  {
    id: 'isl_waxman',
    name: 'Waxman Island',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#7da162',
    elevationTargetM: 1.0,
    points: [
      { u: 0.742, v: 0.515 }, { u: 0.774, v: 0.515 }, { u: 0.774, v: 0.530 }, { u: 0.742, v: 0.530 },
    ],
  },
  {
    id: 'isl_vespucci',
    name: 'Vespucci Island',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#6a9d59',
    elevationTargetM: 1.1,
    points: [
      { u: 0.766, v: 0.456 }, { u: 0.788, v: 0.456 }, { u: 0.788, v: 0.473 }, { u: 0.766, v: 0.473 },
    ],
  },
  {
    id: 'isl_rialto',
    name: 'Rialto Islands',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#6a9d59',
    elevationTargetM: 1.1,
    points: [
      { u: 0.752, v: 0.440 }, { u: 0.782, v: 0.440 }, { u: 0.782, v: 0.454 }, { u: 0.752, v: 0.454 },
    ],
  },
  {
    id: 'isl_casanova',
    name: 'Casanova Island',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#6a9d59',
    elevationTargetM: 1.0,
    points: [
      { u: 0.788, v: 0.448 }, { u: 0.808, v: 0.448 }, { u: 0.808, v: 0.466 }, { u: 0.788, v: 0.466 },
    ],
  },
  // Vice Beach Barrier Island Strip (Washington Beach, Leaf Links, Ocean Beach)
  {
    id: 'isl_vice_beach',
    name: 'Vice Beach',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#d9c48c',
    elevationTargetM: 0.7,
    points: [
      { u: 0.822, v: 0.405 }, { u: 0.868, v: 0.405 }, { u: 0.882, v: 0.485 },
      { u: 0.878, v: 0.565 }, { u: 0.832, v: 0.562 }, { u: 0.820, v: 0.485 },
    ],
  },
  {
    id: 'isl_leaf_links',
    name: 'Leaf Links',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#4f8f47',
    elevationTargetM: 1.2,
    points: [
      { u: 0.758, v: 0.392 }, { u: 0.815, v: 0.392 }, { u: 0.818, v: 0.434 }, { u: 0.758, v: 0.434 },
    ],
  },
  // Port Vice City Harbor Island
  {
    id: 'isl_vc_port',
    name: 'VC Port',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#8d969e',
    elevationTargetM: 1.3,
    points: [
      { u: 0.785, v: 0.542 }, { u: 0.830, v: 0.542 }, { u: 0.835, v: 0.562 }, { u: 0.785, v: 0.562 },
    ],
  },
  // Western Gulf Coast Islands
  {
    id: 'isl_draper',
    name: 'Draper Island',
    kind: 'island',
    county: 'Kelly County',
    colorHex: '#73985a',
    elevationTargetM: 2.5,
    points: [
      { u: 0.195, v: 0.285 }, { u: 0.265, v: 0.285 }, { u: 0.272, v: 0.322 }, { u: 0.205, v: 0.322 },
    ],
  },
  {
    id: 'isl_crude',
    name: 'Crude Islands',
    kind: 'island',
    county: 'Kelly County',
    colorHex: '#a59e72',
    elevationTargetM: 1.8,
    points: [
      { u: 0.155, v: 0.420 }, { u: 0.205, v: 0.420 }, { u: 0.205, v: 0.448 }, { u: 0.155, v: 0.448 },
    ],
  },
  {
    id: 'isl_bobcat',
    name: 'Bobcat Key',
    kind: 'island',
    county: 'Mariana County',
    colorHex: '#668f4d',
    elevationTargetM: 1.5,
    points: [
      { u: 0.305, v: 0.625 }, { u: 0.365, v: 0.630 }, { u: 0.382, v: 0.680 }, { u: 0.322, v: 0.675 },
    ],
  },
  // Leonida Keys Southern Chain
  {
    id: 'isl_corsair_key',
    name: 'Corsair Key',
    kind: 'island',
    county: 'Vice-Dale County',
    colorHex: '#7ea263',
    elevationTargetM: 1.2,
    points: [
      { u: 0.648, v: 0.708 }, { u: 0.682, v: 0.708 }, { u: 0.678, v: 0.750 }, { u: 0.645, v: 0.745 },
    ],
  },
  {
    id: 'isl_shoeless_keys',
    name: 'Shoeless Keys',
    kind: 'island',
    county: 'Mariana County',
    colorHex: '#84a668',
    elevationTargetM: 1.1,
    points: [
      { u: 0.595, v: 0.752 }, { u: 0.645, v: 0.752 }, { u: 0.635, v: 0.790 }, { u: 0.585, v: 0.786 },
    ],
  },
  {
    id: 'isl_key_lento',
    name: 'Key Lento',
    kind: 'island',
    county: 'Mariana County',
    colorHex: '#c8bc85',
    elevationTargetM: 1.3,
    points: [
      { u: 0.515, v: 0.810 }, { u: 0.595, v: 0.805 }, { u: 0.582, v: 0.855 }, { u: 0.505, v: 0.852 },
    ],
  },
  {
    id: 'isl_mile_zero',
    name: 'Mile Zero / Southwind',
    kind: 'island',
    county: 'Mariana County',
    colorHex: '#b9af7d',
    elevationTargetM: 1.4,
    points: [
      { u: 0.228, v: 0.822 }, { u: 0.345, v: 0.822 }, { u: 0.352, v: 0.888 }, { u: 0.228, v: 0.885 },
    ],
  },
  // Far Northern Islands
  {
    id: 'isl_hyde',
    name: 'Hyde Island',
    kind: 'island',
    county: 'Lummox County',
    colorHex: '#5a8248',
    elevationTargetM: 4.0,
    points: [
      { u: 0.545, v: 0.100 }, { u: 0.595, v: 0.100 }, { u: 0.595, v: 0.125 }, { u: 0.545, v: 0.125 },
    ],
  },
  {
    id: 'isl_little_hardin',
    name: 'Little Hardin Island',
    kind: 'island',
    county: 'Leonard County',
    colorHex: '#5f874c',
    elevationTargetM: 3.0,
    points: [
      { u: 0.755, v: 0.232 }, { u: 0.790, v: 0.232 }, { u: 0.785, v: 0.285 }, { u: 0.755, v: 0.285 },
    ],
  },
];

export const LEONIDA_WATER_BODIES: GeoPolygonFeature[] = [
  {
    id: 'water_lake_leonida',
    name: 'Lake Leonida',
    kind: 'lake',
    county: 'Leonard County',
    colorHex: '#1d9ac4',
    elevationTargetM: -4.0,
    points: [
      { u: 0.558, v: 0.245 }, { u: 0.618, v: 0.236 }, { u: 0.665, v: 0.265 },
      { u: 0.662, v: 0.320 }, { u: 0.615, v: 0.348 }, { u: 0.558, v: 0.332 },
    ],
  },
  {
    id: 'water_buckskin_swamp',
    name: 'Buckskin Swamp',
    kind: 'swamp',
    county: 'Kelly County',
    colorHex: '#356a63',
    elevationTargetM: 0.12,
    points: [
      { u: 0.452, v: 0.420 }, { u: 0.520, v: 0.415 }, { u: 0.525, v: 0.482 }, { u: 0.455, v: 0.485 },
    ],
  },
  {
    id: 'water_nehrling_river',
    name: 'Nehrling River',
    kind: 'river',
    county: 'Vice-Dale County',
    colorHex: '#2587a6',
    elevationTargetM: -2.0,
    points: [
      { u: 0.325, v: 0.548 }, { u: 0.435, v: 0.558 }, { u: 0.440, v: 0.576 }, { u: 0.325, v: 0.570 },
    ],
  },
];

export const LEONIDA_COUNTIES: GeoPolygonFeature[] = [
  {
    id: 'county_lummox',
    name: 'Lummox County',
    kind: 'county',
    colorHex: '#4f7a44',
    elevationTargetM: 95,
    points: [
      { u: 0.32, v: 0.12 }, { u: 0.72, v: 0.12 }, { u: 0.72, v: 0.28 }, { u: 0.32, v: 0.28 },
    ],
  },
  {
    id: 'county_leonard',
    name: 'Leonard County',
    kind: 'county',
    colorHex: '#6a9655',
    elevationTargetM: 22,
    points: [
      { u: 0.55, v: 0.23 }, { u: 0.80, v: 0.23 }, { u: 0.80, v: 0.40 }, { u: 0.55, v: 0.40 },
    ],
  },
  {
    id: 'county_kelly',
    name: 'Kelly County',
    kind: 'county',
    colorHex: '#779355',
    elevationTargetM: 28,
    points: [
      { u: 0.22, v: 0.28 }, { u: 0.55, v: 0.28 }, { u: 0.55, v: 0.52 }, { u: 0.22, v: 0.52 },
    ],
  },
  {
    id: 'county_vicedale',
    name: 'Vice-Dale County',
    kind: 'county',
    colorHex: '#798b79',
    elevationTargetM: 4,
    points: [
      { u: 0.44, v: 0.40 }, { u: 0.89, v: 0.40 }, { u: 0.89, v: 0.68 }, { u: 0.44, v: 0.68 },
    ],
  },
  {
    id: 'county_mariana',
    name: 'Mariana County',
    kind: 'county',
    colorHex: '#507d55',
    elevationTargetM: 2,
    points: [
      { u: 0.22, v: 0.52 }, { u: 0.66, v: 0.52 }, { u: 0.66, v: 0.89 }, { u: 0.22, v: 0.89 },
    ],
  },
];
