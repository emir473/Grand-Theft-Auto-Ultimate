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
    notes: 'Digitized from IMG_8682 & IMG_8384; heightfield terrain & strict UNVERIFIED tracking added; live browser preview pending.',
  },
  {
    id: 'maps_gps',
    section: '15 & 28I. Map, Pause Map & Minimap',
    name: 'Full-Color Canonical World Map, Minimap & A* Road GPS',
    status: 'IMPLEMENTED_UNVERIFIED',
    owners: ['src/ui/WorldMapOverlay.tsx', 'src/ui/Minimap.tsx', 'src/world/roadNetwork.ts'],
    notes: 'Synced 1:1 to leonidaGeoData & RoadNetwork A* with pan/zoom/search/filters.',
  },
  {
    id: 'photorealistic_assets',
    section: '5 & 28D-F. Graphics, Materials & Density',
    name: 'High-Detail Vehicles, Beach/City/Wetland Landmarks, PBR & Reflections',
    status: 'PARTIAL',
    owners: ['src/world/districtBuilders.ts', 'src/gameplay/vehicleModels.ts', 'src/rendering/shaders.ts'],
    notes: 'Added beach umbrellas, lifeguard tower, Megamundo-style lit towers, Sahara Arena, VC Port, stilt houses; multi-part sculpted car rigs, RGB underglow & wet reflections queued for Round 3.',
  },
  {
    id: 'vehicles_physics',
    section: '6. Vehicles, Tuning & Physics',
    name: 'Torque/RPM/Gears, Surface Friction, Hydroplaning, Damage, Trailers',
    status: 'PARTIAL',
    owners: ['src/gameplay/vehiclePhysics.ts', 'src/gameplay/vehicleDamage.ts', 'src/gameplay/vehicleModels.ts'],
    notes: 'Physics core works; visual car sculpting, headlights/brake lights, RGB neon underglow pending Round 3.',
  },
  {
    id: 'water_aviation',
    section: '7-8. Water, Diving, Boats & Aircraft',
    name: 'Gerstner Waves, Diving/Salvage, Marine Craft & Flight Physics',
    status: 'PARTIAL',
    owners: ['src/world/waterDiving.ts', 'src/gameplay/aviationMarine.ts'],
    notes: 'Waves, buoyancy, diving & basic planes/helis/boats exist; shoreline foam, detailed cockpits & landing gear animation pending.',
  },
  {
    id: 'characters_anim',
    section: '9. Characters, First-Person & Animation',
    name: 'Lucia & Jason, Switching, Third-Person, Ragdoll, Locomotion',
    status: 'PARTIAL',
    owners: ['src/gameplay/playerController.ts', 'src/gameplay/characterRig.ts', 'src/gameplay/combatAnimation.ts'],
    notes: 'Switching & movement work; true skeletal animations, IK hand-on-wheel & first-person body/cockpit mode pending.',
  },
  {
    id: 'ai_traffic_lights',
    section: '10 & 28G. NPC, Crowd, Traffic & Wildlife AI',
    name: 'Autonomous NPC Routines, Synchronized Traffic Lights, Wildlife',
    status: 'PARTIAL',
    owners: ['src/ai/npcCrowdAI.ts', 'src/world/foliageAndProps.ts', 'src/ai/policeForensics.ts'],
    notes: '3D traffic signals added; AI vehicle traffic lane-following + alligator/bird wildlife queued for Round 3.',
  },
  {
    id: 'audio_radio',
    section: '16. Web Audio API & 80s Synthwave Radio',
    name: 'Procedural Event Audio & Original Synthwave Radio Stations',
    status: 'PARTIAL',
    owners: ['src/audio/spatialAudio.ts'],
    notes: 'Engine/siren/rain/shot audio works; multi-station 80s synthwave radio synthesizer & surface footsteps queued for Round 3.',
  },
  {
    id: 'input_gamepad_touch',
    section: '17. iPad Touch, PS5 DualSense, Fullscreen & Haptics',
    name: 'Keyboard/Pointer, DualSense Gamepad API, Haptics, Fullscreen, iPad Layout',
    status: 'PARTIAL',
    owners: ['src/core/input.ts', 'src/ui/TouchControls.tsx'],
    notes: 'Keyboard/pointer/basic touch work; PS5 DualSense button guide, vibrationActuator haptics, fullscreen & right-side touch look pad queued for Round 3.',
  },
  {
    id: 'missions_economy_phone',
    section: '12-14. Missions, Economy, Properties & iFruit Phone',
    name: 'Missions, Taxi, Banking, Properties, Stock Sim, Smartphone Apps',
    status: 'IMPLEMENTED_VERIFIED',
    owners: ['src/gameplay/activitiesMissions.ts', 'src/ai/economyEncounters.ts', 'src/ui/PhoneApps.tsx'],
    notes: 'Connected apps & economy verified in headless/integration checks; Photo Mode & Utility Gear Wheel expansion queued.',
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
