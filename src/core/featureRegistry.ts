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
    name: 'Babylon.js WebGPU / WebGL2 Fallback, ACES Pipeline (No DoF/CA Blur), Clock',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/rendering/engineGrafik.ts', 'src/core/registry.ts', 'src/core/clock.ts'],
    notes: 'Round 4 disabled chromaticAberrationEnabled & depthOfFieldEnabled for sharp photorealism + set environment IBL intensity.',
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
    name: 'Full-Color Canonical World Map, Minimap & A* Road GPS',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/ui/WorldMapOverlay.tsx', 'src/ui/Minimap.tsx', 'src/world/roadNetwork.ts'],
    notes: 'Synced 1:1 to leonidaGeoData & RoadNetwork A* with pan/zoom/search/filters; A* verified in runTests.ts.',
  },
  {
    id: 'photorealistic_assets',
    section: '5 & 28D-F. Graphics, Landmarks & Density',
    name: 'Zigzag Marina Pavilion, Art Deco Balconies, Weathered Stilt House, Vehicles & Roads',
    status: 'PARTIAL',
    owners: ['src/gameplay/vehicleSculptor.ts', 'src/world/landmarkDetails.ts', 'src/world/districtBuilders.ts', 'src/world/roadMarkings.ts'],
    notes: 'Round 4 added IMG_8171 zigzag marina pavilion + bay stripes, IMG_8168 rounded hotel balconies, and IMG_8172 stilt stairs/roof/satellite dish; deeper city block interiors & foliage density ongoing.',
  },
  {
    id: 'vehicles_physics',
    section: '6. Vehicles, Tuning & Physics',
    name: 'Torque/RPM/Gears, Clear-Coat Droplets, RGB Underglow, Phone Customs, Trailers',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/vehiclePhysics.ts', 'src/gameplay/vehicleDamage.ts', 'src/gameplay/vehicleSculptor.ts', 'src/ui/VehicleTuningApp.tsx'],
    notes: 'Sculpted 32-segment cars, convertible seated drivers, brake/reverse lights, steering wheel rotation & Vice Customs Phone App wired.',
  },
  {
    id: 'water_aviation',
    section: '7-8. Water, Diving, Boats & Aircraft',
    name: 'Gerstner Waves, Shoreline Foam, Sculpted Jetski/Yacht/Freighter, Heli & Airliner + Transit Boarding',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/world/waterDiving.ts', 'src/gameplay/aviationMarine.ts', 'src/gameplay/marineSculptor.ts', 'src/gameplay/transportSystems.ts'],
    notes: 'Round 4 upgraded to 84-subdivision ocean + animated shoreline breaking foam strips, sculpted cylindrical airliner w/ retractable gear, rotor-spinning helicopter, sculpted boats & playable Metro/Bus boarding.',
  },
  {
    id: 'characters_anim',
    section: '9. Characters, First-Person & Animation',
    name: 'Sculpted Anatomical Lucia & Jason, 1P Foreground Arms, Seated Driving & Elbow/Knee IK',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/characterParts.ts', 'src/gameplay/characterRig.ts', 'src/gameplay/combatAnimation.ts', 'src/gameplay/playerController.ts'],
    notes: 'Round 4 replaced boxy limbs with multi-segment 32-seg head/face/hair, elbow/knee pivots, 1P view arms, and convertible seated driving posture.',
  },
  {
    id: 'ai_traffic_lights',
    section: '10 & 28G. NPC, Crowd, Traffic & Wildlife AI',
    name: 'Articulated Pedestrians & Beachgoers, Autonomous Traffic Signals & Wildlife',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/ai/npcModels.ts', 'src/ai/npcCrowdAI.ts', 'src/ai/trafficAI.ts', 'src/ai/wildlifeAI.ts'],
    notes: 'Round 4 replaced capsule NPCs with articulated anatomical pedestrian & Vice Beach beachgoer rigs with animated walk strides.',
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
    name: 'Multi-Stage Missions + Fail/Retry, Utility Gear Wheel, Economy, Properties, Phone & Photo Studio',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/gameplay/activitiesMissions.ts', 'src/ui/WeaponWheelOverlay.tsx', 'src/ai/economyEncounters.ts', 'src/ui/PhoneApps.tsx', 'src/ui/PhotoModeOverlay.tsx'],
    notes: 'Round 4 added 2-stage Vice Welcome & Banco Heist missions with fail/retry + Utility Gear Wheel quick tools.',
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
