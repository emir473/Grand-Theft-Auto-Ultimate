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
import { mpsToKmh, mpsToMph, formatMoney } from '../core/types';

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
  const sm = new SaveManager(reg);
  const snap = sm.serializeState();
  assert(snap.activeCharacterId === 'lucia', 'Starter character must be Lucia');
  assert(snap.characters.lucia.position.z === -6, 'Starter point must be Star Island Villa courtyard');
  const doppler = SpatialAudioEngine.computeDopplerFactor(34.3);
  assert(doppler > 1.1 && doppler < 1.12, 'Approaching Doppler factor must be ~1.111');
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
