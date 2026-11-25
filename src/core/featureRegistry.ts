export type FeatureStatus =
  | 'IMPLEMENTED_VERIFIED'
  | 'IMPLEMENTED_UNVERIFIED'
  | 'PARTIAL'
  | 'NOT_IMPLEMENTED'
  | 'BLOCKED';

export interface FeatureAuditEntry {
  id: string;
  section: string;
  name: string;
  status: FeatureStatus;
  owners: string[];
  notes: string;
}

export const FEATURE_REGISTRY: FeatureAuditEntry[] = [
  {
    id: 'core_engine',
    section: '2 & 28C. Engine & Crystal-Clear Pipeline',
    name: 'Babylon.js WebGPU / WebGL2 Fallback, ACES Pipeline, Sun God-Rays (No DoF/CA Blur), Clock',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/rendering/engineGrafik.ts', 'src/core/registry.ts', 'src/core/clock.ts'],
    notes: 'Round 7 added hardware-safe VolumetricLightScatteringPostProcess sun shafts on High/Ultra while keeping CA & DoF disabled.',
  },
  {
    id: 'geography_1to1',
    section: '3-4. World Geography & Places',
    name: 'Canonical 1:1 Leonida Coastline, 5 Counties, 6 Major Regions, Place Index',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/world/leonidaGeoData.ts', 'src/world/leonidaPlaces.ts', 'src/world/terrainHeightfield.ts'],
    notes: 'Digitized from IMG_8682 & IMG_8384; heightfield terrain & strict UNVERIFIED tracking added; live WebGL visual verification pending.',
  },
  {
    id: 'maps_gps',
    section: '15 & 28I. Map, Pause Map & Minimap',
    name: 'Full-Color Canonical World Map, IMG_8170 Street/Sat Minimap & A* Road GPS',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/ui/WorldMapOverlay.tsx', 'src/ui/Minimap.tsx', 'src/world/roadNetwork.ts'],
    notes: 'Round 7 added toggleable IMG_8170 light-toned Street Minimap mode (STR/SAT) alongside full-state WorldMapOverlay.',
  },
  {
    id: 'photorealistic_assets',
    section: '5 & 28D-F. Graphics, Landmarks, VFX & Density',
    name: 'Wet Puddles, Magenta Dusk Sky, Dual Clouds, Overseas Keys Bridges, District Infill & Particle VFX',
    status: 'PARTIAL',
    owners: ['src/rendering/wetReflections.ts', 'src/rendering/shaders.ts', 'src/world/viceDistrictsAndKeys.ts', 'src/world/signageAndLandmarks.ts', 'src/world/regionalLandmarks.ts', 'src/world/roadMarkings.ts'],
    notes: 'Round 7 added magenta/violet Vice City dusk gradients, dual cumulus/cirrus clouds, Overseas Keys SR-1A bridges & Key Lento lighthouse, Little Cuba/Bayside/Stockyard/Leaf Links infill, curved Art Deco lifeguard fin, and road grime patches.',
  },
  {
    id: 'vehicles_physics',
    section: '6. Vehicles, Tuning & Physics',
    name: 'Curved Lofted Aero Cars, Utility Trucks, 1P Cockpit Hands/Gauges, Torque/RPM & Underglow',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/vehicleBodyLoft.ts', 'src/gameplay/vehicleSculptor.ts', 'src/gameplay/vehicleUtilitySculptor.ts', 'src/gameplay/vehicleCockpit.ts', 'src/gameplay/vehiclePhysics.ts'],
    notes: 'Round 6 added 1P cockpit driver-seat camera with steering-wheel hands + illuminated gauge cluster, Cement Mixer drum, US Mail step-van, wheel-well arches, and tire smoke/dust + engine fire VFX.',
  },
  {
    id: 'water_aviation',
    section: '7-8. Water, Diving, Boats & Aircraft',
    name: 'Gerstner Waves, Underwater Caustics, Sculpted Salvage Wrecks, Boats & Aircraft',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/world/waterDiving.ts', 'src/gameplay/aviationMarine.ts', 'src/gameplay/marineSculptor.ts', 'src/gameplay/transportSystems.ts', 'src/rendering/vfxParticles.ts'],
    notes: 'Round 7 replaced boxy salvage crates with sculpted sunken hull/plane fuselage wrecks & added animated water caustics.',
  },
  {
    id: 'characters_anim',
    section: '9. Characters, First-Person & Animation',
    name: '48-Seg Lathe Lucia & Jason, 5-Finger Hands, True 1P Viewmodel & Cockpit Steering Hands',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/characterParts.ts', 'src/gameplay/characterRig.ts', 'src/gameplay/fpViewmodel.ts', 'src/gameplay/playerController.ts', 'src/gameplay/vehicleCockpit.ts'],
    notes: '48-seg CreateLathe torsos/limbs + 5-finger hands + sculpted face features, clip-free 1P eye camera + weapon/phone holding, and 1P vehicle steering grip synced to steering angle.',
  },
  {
    id: 'ai_traffic_lights',
    section: '10 & 28G. NPC, Crowd, Traffic & Wildlife AI',
    name: '32-Seg Lathe Pedestrians & Beachgoers, 24-Unit Spinning-Wheel Traffic Fleet & Wildlife',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/ai/npcModels.ts', 'src/ai/npcCrowdAI.ts', 'src/ai/trafficAI.ts', 'src/ai/wildlifeAI.ts'],
    notes: 'Round 6 expanded traffic to 24 sculpted agents including cement mixers, US Mail delivery vans & convertibles with spinning wheels and live red brake lights at signals.',
  },
  {
    id: 'audio_radio',
    section: '16. Web Audio API & 80s Synthwave Radio',
    name: 'Procedural Event Audio, Multi-Station 80s Synthwave Radio, Tire Squeal & Surf',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/audio/spatialAudio.ts', 'src/audio/synthwaveRadio.ts'],
    notes: '4-station original Web Audio synthwave radio, tire drift squeal, surf noise & surface footsteps verified headless.',
  },
  {
    id: 'input_gamepad_touch',
    section: '17. iPad Touch, PS5 DualSense, Fullscreen & Haptics',
    name: 'DualSense Gamepad API, Context Guide, Haptics, Fullscreen, Landscape iPad Touch',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/core/input.ts', 'src/core/gamepadManager.ts', 'src/ui/TouchControls.tsx', 'src/ui/ControllerGuideOverlay.tsx'],
    notes: 'DualSense polling, capability-checked dual-rumble haptics, landscape iPad look pad & settings verified.',
  },
  {
    id: 'missions_economy_phone',
    section: '12-14. Missions, Economy, Gear Wheel & Phone',
    name: '6 Regional Multi-Stage Missions, Dynamic World Events, Sculpted Police/SWAT/Heli Pursuit & Phone',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/activitiesMissions.ts', 'src/gameplay/missionContent.ts', 'src/ai/policeForensics.ts', 'src/ui/WeaponWheelOverlay.tsx', 'src/ai/economyEncounters.ts'],
    notes: 'Round 7 added Greater Leonida regional missions (Allied Convoy, Keys Intercept, Gellhorn Bust), Dynamic World Events, sculpted VCPD cruisers/SWAT Enforcers, and helicopter SpotLight searchlight.',
  },
  {
    id: 'save_localization',
    section: '21. Save/Load & Localization',
    name: 'IndexedDB Persistence (Incl. Controls/Camera Prefs) & EN/DE/ES/FR Localization',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/persistence/saveManager.ts', 'src/ui/localization.ts'],
    notes: 'Round 4 added cameraMode, haptics, and touch settings serialization/migration; verified in runTests.ts.',
  },
];
