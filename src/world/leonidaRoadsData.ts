import type { UVPoint } from './leonidaGeoData';

export interface GeoRoadPolyline {
  id: string;
  label: string;
  routeClass: 'interstate' | 'us' | 'state' | 'county' | 'avenue' | 'bridge' | 'rail';
  lanes: number;
  speedLimitMps: number;
  points: UVPoint[];
}

// Official mapped highway & bridge corridors traced from IMG_8682 & IMG_8384
export const LEONIDA_ROAD_CORRIDORS: GeoRoadPolyline[] = [
  {
    id: 'i_97',
    label: 'Interstate 97',
    routeClass: 'interstate',
    lanes: 4,
    speedLimitMps: 36,
    points: [
      { u: 0.720, v: 0.255 }, { u: 0.745, v: 0.355 }, { u: 0.735, v: 0.415 },
      { u: 0.710, v: 0.482 }, { u: 0.708, v: 0.530 }, { u: 0.665, v: 0.585 }, { u: 0.635, v: 0.640 },
    ],
  },
  {
    id: 'i_404',
    label: 'Interstate 404',
    routeClass: 'interstate',
    lanes: 4,
    speedLimitMps: 36,
    points: [
      { u: 0.305, v: 0.335 }, { u: 0.325, v: 0.415 }, { u: 0.335, v: 0.488 },
      { u: 0.415, v: 0.515 }, { u: 0.520, v: 0.522 }, { u: 0.625, v: 0.512 }, { u: 0.710, v: 0.482 },
    ],
  },
  {
    id: 'i_397',
    label: 'Interstate 397',
    routeClass: 'interstate',
    lanes: 4,
    speedLimitMps: 34,
    points: [
      { u: 0.708, v: 0.530 }, { u: 0.735, v: 0.548 }, { u: 0.798, v: 0.550 },
    ],
  },
  {
    id: 'i_297',
    label: 'Interstate 297',
    routeClass: 'interstate',
    lanes: 4,
    speedLimitMps: 34,
    points: [
      { u: 0.365, v: 0.255 }, { u: 0.465, v: 0.275 }, { u: 0.555, v: 0.265 },
      { u: 0.655, v: 0.235 }, { u: 0.720, v: 0.255 },
    ],
  },
  {
    id: 'us_35',
    label: 'U.S. 35',
    routeClass: 'us',
    lanes: 2,
    speedLimitMps: 28,
    points: [
      { u: 0.550, v: 0.265 }, { u: 0.550, v: 0.345 }, { u: 0.548, v: 0.440 },
      { u: 0.562, v: 0.510 }, { u: 0.610, v: 0.595 }, { u: 0.625, v: 0.665 },
    ],
  },
  {
    id: 'us_183',
    label: 'U.S. 183',
    routeClass: 'us',
    lanes: 2,
    speedLimitMps: 26,
    points: [
      { u: 0.415, v: 0.385 }, { u: 0.422, v: 0.460 }, { u: 0.375, v: 0.505 },
      { u: 0.305, v: 0.525 }, { u: 0.305, v: 0.575 },
    ],
  },
  {
    id: 'us_82',
    label: 'U.S. 82',
    routeClass: 'us',
    lanes: 2,
    speedLimitMps: 28,
    points: [
      { u: 0.305, v: 0.575 }, { u: 0.395, v: 0.608 }, { u: 0.475, v: 0.620 }, { u: 0.555, v: 0.648 },
    ],
  },
  {
    id: 'sr_1a',
    label: 'State Route 1A (Leonida Keys)',
    routeClass: 'bridge',
    lanes: 2,
    speedLimitMps: 28,
    points: [
      { u: 0.692, v: 0.655 }, { u: 0.668, v: 0.728 }, { u: 0.618, v: 0.772 },
      { u: 0.555, v: 0.832 }, { u: 0.485, v: 0.878 }, { u: 0.390, v: 0.875 }, { u: 0.295, v: 0.860 },
    ],
  },
];
