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
    section: '2. Engine & Architecture',
    name: 'Babylon.js WebGPU / WebGL2 Fallback, Registry, EventBus, Clock',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/rendering/engineGrafik.ts', 'src/core/registry.ts', 'src/core/clock.ts'],
    notes: 'Single coordinated engine & render loop verified via tsc + headless tests + runtime fix.',
  },
  {
    id: 'geography_1to1',
    section: '3-4. World Geography & Places',
    name: 'Canonical 1:1 Leonida Coastline, 5 Counties, 6 Major Regions, Place Index',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/world/leonidaGeoData.ts', 'src/world/leonidaPlaces.ts', 'src/world/terrainHeightfield.ts'],
    notes: 'Digitized from IMG_8682 & IMG_8384; heightfield terrain & strict UNVERIFIED tracking added; visual 3D inspection in browser pending.',
  },
  {
    id: 'maps_gps',
    section: '15 & 28I. Map, Pause Map & Minimap',
    name: 'Full-Color Canonical World Map, Minimap & A* Road GPS',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/ui/WorldMapOverlay.tsx', 'src/ui/Minimap.tsx', 'src/world/roadNetwork.ts'],
    notes: 'Synced 1:1 to leonidaGeoData & RoadNetwork A* with pan/zoom/search/filters; A* verified in runTests.ts.',
  },
  {
    id: 'photorealistic_assets',
    section: '5 & 28D-F. Graphics, Materials & Density',
    name: 'Sculpted Vehicles, Beach/City/Wetland Landmarks, PBR & Clear-Coat Droplets',
    status: 'PARTIAL',
    owners: ['src/gameplay/vehicleSculptor.ts', 'src/world/districtBuilders.ts', 'src/world/roadMarkings.ts', 'src/rendering/shaders.ts'],
    notes: 'Round 3 added sculpted 32-segment car rigs, clear-coat rain droplet bump maps, RGB underglow, intersection street signs & crosswalks; further architectural/biome density & interior polish needed.',
  },
  {
    id: 'vehicles_physics',
    section: '6. Vehicles, Tuning & Physics',
    name: 'Torque/RPM/Gears, Clear-Coat Droplets, RGB Underglow, Phone Customs, Trailers',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/vehiclePhysics.ts', 'src/gameplay/vehicleDamage.ts', 'src/gameplay/vehicleSculptor.ts', 'src/ui/VehicleTuningApp.tsx'],
    notes: 'Physics + sculpted visuals + brake/reverse lights + rotating steering wheel + Vice Customs Phone App wired; live driving QA in browser pending.',
  },
  {
    id: 'water_aviation',
    section: '7-8. Water, Diving, Boats & Aircraft',
    name: 'Gerstner Waves, Diving/Salvage, Marine Craft & Flight Physics',
    status: 'PARTIAL',
    owners: ['src/world/waterDiving.ts', 'src/gameplay/aviationMarine.ts', 'src/gameplay/transportSystems.ts'],
    notes: 'Waves, buoyancy, diving & basic planes/helis/boats exist; shoreline foam shader, detailed multi-part cockpit/fuselage sculpting & landing gear animation pending.',
  },
  {
    id: 'characters_anim',
    section: '9. Characters, First-Person & Animation',
    name: 'Lucia & Jason, Switching, First-Person & Third-Person Modes, Procedural Blend Tree',
    status: 'PARTIAL',
    owners: ['src/gameplay/playerController.ts', 'src/gameplay/characterRig.ts', 'src/gameplay/combatAnimation.ts'],
    notes: 'Round 3 added First-Person mode (V / Touchpad) with head-clipping guard; high-poly skeletal character rigs, clothing layers & steering-wheel hand IK still pending.',
  },
  {
    id: 'ai_traffic_lights',
    section: '10 & 28G. NPC, Crowd, Traffic & Wildlife AI',
    name: 'Autonomous Traffic AI obeying Signals, NPC Routines, Wetland/Coastal Wildlife',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/ai/trafficAI.ts', 'src/ai/wildlifeAI.ts', 'src/ai/npcCrowdAI.ts', 'src/world/foliageAndProps.ts'],
    notes: 'Round 3 added autonomous TrafficAISystem obeying 3D traffic signals + Grassrivers alligators, coastal pelicans & reef fish; full browser runtime behavior unverified.',
  },
  {
    id: 'audio_radio',
    section: '16. Web Audio API & 80s Synthwave Radio',
    name: 'Procedural Event Audio, Multi-Station 80s Synthwave Radio, Tire Squeal & Surf',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/audio/spatialAudio.ts', 'src/audio/synthwaveRadio.ts'],
    notes: 'Round 3 added 4-station original Web Audio synthwave radio, tire drift screech, surf noise & surface footsteps; cycling & Doppler math verified in runTests.ts.',
  },
  {
    id: 'input_gamepad_touch',
    section: '17. iPad Touch, PS5 DualSense, Fullscreen & Haptics',
    name: 'DualSense Gamepad API, Context Guide, Haptics, Fullscreen, Landscape iPad Touch',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/core/input.ts', 'src/core/gamepadManager.ts', 'src/ui/TouchControls.tsx', 'src/ui/ControllerGuideOverlay.tsx'],
    notes: 'Round 3 added DualSense polling, capability-checked dual-rumble haptics, landscape iPad right-side look pad, handedness/opacity UI & Fullscreen helper.',
  },
  {
    id: 'missions_economy_phone',
    section: '12-14. Missions, Economy, Properties, Phone & Photo Studio',
    name: 'Missions, Taxi, Banking, Properties, Customs, Photo Mode & Smartphone Apps',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/activitiesMissions.ts', 'src/ai/economyEncounters.ts', 'src/ui/PhoneApps.tsx', 'src/ui/PhotoModeOverlay.tsx'],
    notes: 'Round 3 added Vice Customs tuning app & Photo Mode PNG/Social capture; missions & utility gear wheel expansion ongoing.',
  },
  {
    id: 'save_localization',
    section: '21. Save/Load & Localization',
    name: 'IndexedDB Persistence & EN/DE/ES/FR Localization',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/persistence/saveManager.ts', 'src/ui/localization.ts'],
    notes: 'Verified via runTests.ts.',
  },
];
