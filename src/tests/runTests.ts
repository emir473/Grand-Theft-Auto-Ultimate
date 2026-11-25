/**
 * Headless CLI Unit & Integration Test Runner (executed via `npx tsx src/tests/runTests.ts`)
 * Verifies EventBus, SimulationClock, LocalizationManager, RoadNetwork A*,
 * Economy/Stocks/Properties, SaveManager validation, and SpatialAudio Doppler math.
 */

import { GameRegistry } from '../core/registry';
import { RoadNetwork } from '../world/roadNetwork';
import { i18n } from '../ui/localization';
import { SaveManager } from '../persistence/saveManager';
import { SpatialAudioEngine } from '../audio/spatialAudio';
import { SynthwaveRadioEngine } from '../audio/synthwaveRadio';
import { GamepadManager } from '../core/gamepadManager';
import { mpsToKmh, mpsToMph, formatMoney } from '../core/types';
import { FEATURE_REGISTRY } from '../core/featureRegistry';
import { ENTERABLE_INTERIORS } from '../world/interiors';
import { sampleLeonidaHeight, sampleLeonidaSurface } from '../world/terrainHeightfield';
import { getVerifiedPlacesWithWorldCoords } from '../world/leonidaPlaces';
import { posterUVToWorld } from '../world/leonidaGeoData';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name} ->`, err instanceof Error ? err.message : err);
    failed++;
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

test('Coordinate units & currency formatting', () => {
  assert(Math.round(mpsToKmh(10)) === 36, '10 m/s should equal 36 km/h');
  assert(Math.round(mpsToMph(20)) === 45, '20 m/s should equal ~45 mph');
  assert(formatMoney(425000) === '$4,250', '425000 cents should format as $4,250');
});

test('EventBus isolates listener errors and prevents recursive loops', () => {
  const reg = new GameRegistry();
  let calls = 0;
  reg.events.on('mission:started', () => {
    calls++;
    reg.events.emit('mission:started', { missionId: 'loop' });
  });
  reg.events.on('mission:started', () => {
    throw new Error('Boom');
  });
  reg.events.emit('mission:started', { missionId: 'test' });
  assert(calls > 0 && calls <= 4, 'Recursion guard must cap depth');
  assert(reg.events.errorLog.length > 0, 'Error must be logged without crashing');
});

test('SimulationClock separates time domains and respects Weapon Wheel 0.1x slow-mo', () => {
  const reg = new GameRegistry();
  reg.clock.setWeaponWheelSlowMo(true);
  assert(reg.clock.effectiveTimeScale === 0.1, 'Weapon wheel must set time scale to 0.1');
  let fixedCount = 0;
  const res = reg.clock.tick(0.5, () => {
    fixedCount++;
  });
  assert(res.simDt <= 0.011, 'Raw dt clamped to 0.1 * 0.1 scale');
  assert(fixedCount <= reg.clock.maxPhysicsStepsPerFrame, 'Fixed steps capped');
  reg.clock.setWeaponWheelSlowMo(false);
  assert(reg.clock.effectiveTimeScale === 1.0, 'Time scale restored after closing weapon wheel');
});

test('LocalizationManager switches between EN, DE, ES, FR cleanly', () => {
  i18n.setLanguage('de');
  assert(i18n.t('gameover.wasted') === 'AUSSER GEFECHT', 'German translation failed');
  i18n.setLanguage('es');
  assert(i18n.t('gameover.busted') === 'ARRESTADO', 'Spanish translation failed');
  i18n.setLanguage('fr');
  assert(i18n.t('menu.resume') === 'Reprendre', 'French translation failed');
  i18n.setLanguage('en');
  assert(i18n.t('gameover.wasted') === 'WASTED', 'English fallback failed');
});

test('RoadNetwork A* finds valid route and respects road closures', () => {
  const net = new RoadNetwork();
  const route = net.findRoute({ x: 0, y: 1, z: -26 }, { x: 165, y: 0.5, z: 95 });
  assert(route.found && route.nodes.length >= 3, 'Should find route from Star Island to Club Malibu');
  net.setEdgeClosed('r_star_2', true);
  const detour = net.findRoute({ x: 0, y: 1, z: -26 }, { x: 165, y: 0.5, z: 95 });
  assert(detour.found, 'Should reroute via Downtown when East bridge is closed');
});

test('SaveManager serializes valid state & SpatialAudio Doppler math', () => {
  const reg = new GameRegistry();
  reg.state.cameraMode = 'first';
  reg.state.hapticsIntensity = 0.72;
  const sm = new SaveManager(reg);
  const snap = sm.serializeState();
  assert(snap.activeCharacterId === 'lucia', 'Starter character must be Lucia');
  assert(snap.characters.lucia.position.z === -6, 'Starter point must be Star Island Villa courtyard');
  assert(snap.cameraMode === 'first' && snap.hapticsIntensity === 0.72, 'Round 3-4 settings must serialize');
  const doppler = SpatialAudioEngine.computeDopplerFactor(34.3);
  assert(doppler > 1.1 && doppler < 1.12, 'Approaching Doppler factor must be ~1.111');
});

test('SynthwaveRadio cycles stations & GamepadManager degrades safely headless', () => {
  const radio = new SynthwaveRadioEngine();
  const s1 = radio.currentStation.name;
  const s2 = radio.cycleStation().name;
  assert(s1 !== s2 && s1 === 'Wave 103.5 Vice', 'Radio must cycle to next 80s/tropical station');
  radio.setStationByName('V-Rock Leonida');
  assert(radio.currentStation.name === 'V-Rock Leonida', 'setStationByName must switch station');

  const gp = new GamepadManager();
  const sample = gp.poll();
  assert(!sample.connected && !sample.hapticsSupported, 'Headless environment must report unconnected gamepad safely');
  gp.triggerHaptics(1, 1, 100, true, 1); // Must not throw without navigator
});

test('FeatureRegistry & Enterable Interiors metadata integrity', () => {
  assert(FEATURE_REGISTRY.length >= 12, 'Feature registry must cover all major subsystems');
  assert(ENTERABLE_INTERIORS.length >= 6, 'At least 6 enterable furnished interiors expected');
  assert(
    FEATURE_REGISTRY.every((f) => f.owners.length > 0 && f.notes.length > 10),
    'Every feature audit entry must specify owner files and status notes'
  );
});

test('Leonida Heightfield & Surface queries cover regional biomes consistently', () => {
  const starY = sampleLeonidaHeight(0, 0);
  const kalagaXZ = posterUVToWorld(0.505, 0.215);
  const kalagaY = sampleLeonidaHeight(kalagaXZ.x, kalagaXZ.z);
  const grassriversXZ = posterUVToWorld(0.450, 0.660);
  const swampSurf = sampleLeonidaSurface(grassriversXZ.x, grassriversXZ.z, 0.1);
  const wetBridgeSurf = sampleLeonidaSurface(0, -28, 0.8);
  const places = getVerifiedPlacesWithWorldCoords();
  assert(Math.abs(starY - 0.9) < 0.01, 'Starfish Island plateau height must remain 0.9m');
  assert(kalagaY > 15, 'Mount Kalaga northern highlands must rise well above sea level');
  assert(swampSurf === 'mud' || swampSurf === 'water', 'Grassrivers wetland must report mud or water');
  assert(wetBridgeSurf === 'wet_asphalt', 'Rainy causeway surface must report wet_asphalt');
  assert(places.length >= 25, 'Verified Leonida place catalog must stay intact');
});

import { createInitialMissions, DYNAMIC_WORLD_EVENTS, getMissionStage2Target } from '../gameplay/missionContent';
import { LEONIDA_ISLANDS } from '../world/leonidaGeoData';

test('Round 7 Regional Missions, Dynamic World Events & Keys Islands integrity', () => {
  const missions = createInitialMissions();
  assert(missions.length >= 6, 'Expected at least 6 Greater Leonida missions');
  const stage2 = getMissionStage2Target('mission_keys_intercept');
  assert(Boolean(stage2 && stage2.pos.x > 100), 'Keys Offshore Intercept Stage 2 must target Vice Beach Marina');
  assert(DYNAMIC_WORLD_EVENTS.length >= 3, 'Expected scheduled dynamic world events');
  const keys = LEONIDA_ISLANDS.filter((i) =>
    ['isl_corsair_key', 'isl_shoeless_keys', 'isl_key_lento', 'isl_mile_zero'].includes(i.id)
  );
  assert(keys.length === 4, 'All 4 southern Overseas Keys islands must exist in leonidaGeoData');
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
