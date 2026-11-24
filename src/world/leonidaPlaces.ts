/**
 * Official Leonida Place-Name, Landmark, Water & Road Index with strict Verification Status.
 * Preserves legacy aliases (e.g., Wakman Island -> Waxman Island) in notes while plotting
 * only poster-verified features on the live map and keeping unconfirmed POIs marked UNKNOWN.
 */

import { posterUVToWorld } from './leonidaGeoData';

export type VerificationStatus =
  | 'OFFICIALLY_LABELLED'
  | 'VISUALLY_CONFIRMED'
  | 'SECONDARY_CROSS_CHECK_ONLY'
  | 'UNVERIFIED_POSITION_UNKNOWN';

export type PlaceCategory =
  | 'region'
  | 'county'
  | 'city'
  | 'district'
  | 'island'
  | 'landmark'
  | 'water'
  | 'airport'
  | 'port';

export interface LeonidaPlaceRecord {
  id: string;
  canonicalName: string;
  legacyAliases?: string[];
  category: PlaceCategory;
  county?: string;
  gridCell: string;
  u: number | null;
  v: number | null;
  status: VerificationStatus;
  evidenceSource: string;
}

export const LEONIDA_PLACES: LeonidaPlaceRecord[] = [
  // Six Major Region Anchors
  { id: 'reg_vice_city', canonicalName: 'Vice City', category: 'city', county: 'Vice-Dale County', gridCell: 'G7', u: 0.708, v: 0.512, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'reg_leonida_keys', canonicalName: 'Leonida Keys', category: 'region', county: 'Mariana County', gridCell: 'K5', u: 0.555, v: 0.832, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'reg_grassrivers', canonicalName: 'Grassrivers', category: 'region', county: 'Mariana County', gridCell: 'I4', u: 0.450, v: 0.660, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'reg_port_gellhorn', canonicalName: 'Port Gellhorn', category: 'city', county: 'Kelly County', gridCell: 'E3', u: 0.305, v: 0.355, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'reg_ambrosia', canonicalName: 'Ambrosia', category: 'city', county: 'Leonard County', gridCell: 'E5', u: 0.548, v: 0.338, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'reg_mount_kalaga', canonicalName: 'Mount Kalaga National Park', category: 'region', county: 'Lummox County', gridCell: 'C5', u: 0.505, v: 0.215, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },

  // Counties
  { id: 'cnt_lummox', canonicalName: 'Lummox County', category: 'county', gridCell: 'C5', u: 0.495, v: 0.195, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'cnt_leonard', canonicalName: 'Leonard County', category: 'county', gridCell: 'E7', u: 0.690, v: 0.355, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'cnt_kelly', canonicalName: 'Kelly County', category: 'county', gridCell: 'E4', u: 0.415, v: 0.395, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'cnt_vicedale', canonicalName: 'Vice-Dale County', category: 'county', gridCell: 'H7', u: 0.730, v: 0.568, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'cnt_mariana', canonicalName: 'Mariana County', category: 'county', gridCell: 'J4', u: 0.425, v: 0.725, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },

  // Vice City & Vice Beach Districts (IMG_8384)
  { id: 'dst_downtown', canonicalName: 'Downtown', category: 'district', county: 'Vice-Dale County', gridCell: 'G7', u: 0.712, v: 0.518, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_ocean_beach', canonicalName: 'Ocean Beach', category: 'district', county: 'Vice-Dale County', gridCell: 'G8', u: 0.855, v: 0.512, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_washington_beach', canonicalName: 'Washington Beach', category: 'district', county: 'Vice-Dale County', gridCell: 'F8', u: 0.862, v: 0.438, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_vice_beach', canonicalName: 'Vice Beach', category: 'district', county: 'Vice-Dale County', gridCell: 'G8', u: 0.850, v: 0.478, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384 & IMG_8168' },
  { id: 'dst_leaf_links', canonicalName: 'Leaf Links', category: 'district', county: 'Vice-Dale County', gridCell: 'F7', u: 0.785, v: 0.415, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_little_cuba', canonicalName: 'Little Cuba', category: 'district', county: 'Vice-Dale County', gridCell: 'G7', u: 0.672, v: 0.518, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_crosstown', canonicalName: 'Crosstown', category: 'district', county: 'Vice-Dale County', gridCell: 'G7', u: 0.715, v: 0.484, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_bayside', canonicalName: 'Bayside', category: 'district', county: 'Vice-Dale County', gridCell: 'F7', u: 0.728, v: 0.452, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_la_perle', canonicalName: 'La Perle', category: 'district', county: 'Vice-Dale County', gridCell: 'F7', u: 0.688, v: 0.445, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_stockyard', canonicalName: 'Stockyard', category: 'district', county: 'Vice-Dale County', gridCell: 'F7', u: 0.728, v: 0.425, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_rockridge', canonicalName: 'Rockridge', category: 'district', county: 'Vice-Dale County', gridCell: 'G6', u: 0.655, v: 0.484, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_balsero', canonicalName: 'Balsero', category: 'district', county: 'Vice-Dale County', gridCell: 'G6', u: 0.608, v: 0.488, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_salton', canonicalName: 'Salton', category: 'district', county: 'Vice-Dale County', gridCell: 'G6', u: 0.635, v: 0.530, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_tequesta', canonicalName: 'Tequesta', category: 'district', county: 'Vice-Dale County', gridCell: 'H7', u: 0.678, v: 0.578, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_southside', canonicalName: 'Southside', category: 'district', county: 'Vice-Dale County', gridCell: 'I6', u: 0.625, v: 0.635, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'dst_tisha_wocka', canonicalName: 'Tisha-Wocka Flea Market', category: 'landmark', county: 'Vice-Dale County', gridCell: 'G6', u: 0.558, v: 0.494, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },

  // Lagoon Islands & Key Settlements
  { id: 'isl_lbl_starfish', canonicalName: 'Starfish Island', legacyAliases: ['Star Island'], category: 'island', county: 'Vice-Dale County', gridCell: 'G7', u: 0.770, v: 0.495, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'isl_lbl_waxman', canonicalName: 'Waxman Island', legacyAliases: ['Wakman Island'], category: 'island', county: 'Vice-Dale County', gridCell: 'G7', u: 0.758, v: 0.518, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'isl_lbl_vespucci', canonicalName: 'Vespucci Island', category: 'island', county: 'Vice-Dale County', gridCell: 'G7', u: 0.775, v: 0.464, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'isl_lbl_rialto', canonicalName: 'Rialto Islands', category: 'island', county: 'Vice-Dale County', gridCell: 'F7', u: 0.768, v: 0.448, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'isl_lbl_key_lento', canonicalName: 'Key Lento', category: 'island', county: 'Mariana County', gridCell: 'K5', u: 0.555, v: 0.832, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'lnd_mile_zero', canonicalName: 'Mile Zero Air Station', category: 'airport', county: 'Mariana County', gridCell: 'L3', u: 0.275, v: 0.865, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },

  // Major Confirmed Landmarks & Towns
  { id: 'lnd_vcia', canonicalName: 'VCI Airport', legacyAliases: ['VCIA', 'Vice City International Airport'], category: 'airport', county: 'Vice-Dale County', gridCell: 'H6', u: 0.562, v: 0.578, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_vc_port', canonicalName: 'VC Port / Port Vice City', category: 'port', county: 'Vice-Dale County', gridCell: 'H8', u: 0.805, v: 0.550, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_sahara_arena', canonicalName: 'Sahara Arena', category: 'landmark', county: 'Vice-Dale County', gridCell: 'G7', u: 0.738, v: 0.498, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'lnd_fleeca_field', canonicalName: 'Fleeca Field', category: 'landmark', county: 'Vice-Dale County', gridCell: 'G6', u: 0.642, v: 0.474, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8384' },
  { id: 'lnd_allied_crystal', canonicalName: 'Allied Crystal Sugar Refinery', category: 'landmark', county: 'Leonard County', gridCell: 'E5', u: 0.546, v: 0.362, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_ambrosia_raceway', canonicalName: 'Ambrosia Raceway Park', category: 'landmark', county: 'Leonard County', gridCell: 'D5', u: 0.545, v: 0.308, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_gellhorn_raceway', canonicalName: 'Gellhorn Raceway', category: 'landmark', county: 'Kelly County', gridCell: 'F3', u: 0.285, v: 0.432, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_state_prison', canonicalName: 'Leonida State Prison', legacyAliases: ['Leonida Penitentiary'], category: 'landmark', county: 'Kelly County', gridCell: 'F4', u: 0.405, v: 0.448, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_hamlet', canonicalName: 'Hamlet', category: 'city', county: 'Mariana County', gridCell: 'I5', u: 0.558, v: 0.688, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'lnd_hamlet_corr', canonicalName: 'Hamlet Correctional Institution', category: 'landmark', county: 'Mariana County', gridCell: 'I5', u: 0.548, v: 0.672, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_belville', canonicalName: 'Belville', category: 'city', county: 'Leonard County', gridCell: 'E6', u: 0.650, v: 0.392, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_waning_sands', canonicalName: 'Waning Sands', category: 'city', county: 'Leonard County', gridCell: 'D7', u: 0.742, v: 0.320, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_capri', canonicalName: 'Capri', category: 'city', county: 'Kelly County', gridCell: 'G3', u: 0.282, v: 0.525, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'lnd_bonanza', canonicalName: 'Bonanza', category: 'city', county: 'Lummox County', gridCell: 'B5', u: 0.478, v: 0.140, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'lnd_grayson', canonicalName: 'Grayson', category: 'city', county: 'Lummox County', gridCell: 'C4', u: 0.378, v: 0.212, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'lnd_millport', canonicalName: 'Millport', category: 'city', county: 'Leonard County', gridCell: 'C6', u: 0.655, v: 0.228, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682' },
  { id: 'wtr_lake_leonida', canonicalName: 'Lake Leonida', category: 'water', county: 'Leonard County', gridCell: 'D6', u: 0.610, v: 0.292, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },
  { id: 'wtr_buckskin', canonicalName: 'Buckskin Swamp', category: 'water', county: 'Kelly County', gridCell: 'F4', u: 0.485, v: 0.452, status: 'OFFICIALLY_LABELLED', evidenceSource: 'IMG_8682 & IMG_8384' },

  // Visually Confirmed Landmarks without Poster Pin or Exact Position Unverified (never guessed!)
  { id: 'vis_megamundo', canonicalName: 'Megamundo Tower', category: 'landmark', county: 'Vice-Dale County', gridCell: 'G7', u: 0.710, v: 0.515, status: 'VISUALLY_CONFIRMED', evidenceSource: 'IMG_8169 Downtown dusk screenshot' },
  { id: 'unv_ocean_view', canonicalName: 'Ocean View Hotel', category: 'landmark', county: 'Vice-Dale County', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index (awaiting exact poster pin)' },
  { id: 'unv_hotel_dixon', canonicalName: 'Hotel Dixon', category: 'landmark', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index' },
  { id: 'unv_galina_opera', canonicalName: 'Galina Ballet Opera House', category: 'landmark', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index' },
  { id: 'unv_palaestra', canonicalName: 'Palaestra Tower', category: 'landmark', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index' },
  { id: 'unv_hanks_waffles', canonicalName: "Hank's Waffles", category: 'landmark', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index' },
  { id: 'unv_brians_boat', canonicalName: "Brian's Boat Works & Marina", category: 'landmark', gridCell: 'UNKNOWN', u: null, v: null, status: 'UNVERIFIED_POSITION_UNKNOWN', evidenceSource: 'User Mega Prompt index' },
];

export function getVerifiedPlacesWithWorldCoords(): Array<LeonidaPlaceRecord & { x: number; z: number }> {
  const out: Array<LeonidaPlaceRecord & { x: number; z: number }> = [];
  for (const p of LEONIDA_PLACES) {
    if (p.u !== null && p.v !== null && p.status !== 'UNVERIFIED_POSITION_UNKNOWN') {
      const xz = posterUVToWorld(p.u, p.v);
      out.push({ ...p, x: xz.x, z: xz.z });
    }
  }
  return out;
}
