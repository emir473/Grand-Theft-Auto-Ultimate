import type { GameRegistry } from '../core/registry';
import type { CharacterId, Vec3 } from '../core/types';
import type { InputActionState } from '../core/input';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WaterDivingSystem } from '../world/waterDiving';
import { ACTIVITY_SPOTS, ATM_POINTS, ENTERABLE_INTERIORS } from '../world/interiors';

export interface NearbyPrompt {
  key: string;
  params?: Record<string, string | number>;
  action: 'vehicle' | 'interior' | 'exit_interior' | 'atm' | 'salvage' | 'activity' | 'robbery';
  targetId: string;
}

export function triggerPlayerWasted(registry: GameRegistry, gfx: GraphicsEngine, cause = 'fatal_injury'): void {
  const s = registry.state;
  const eventId = `death_${s.activeCharacterId}_${Math.floor(registry.clock.gameTime * 10)}`;
  if (s.gameOverState !== 'none' || s.lastDeathEventId === eventId) return;

  s.lastDeathEventId = eventId;
  s.gameOverState = 'wasted';
  s.phoneOpen = false;
  s.weaponWheelOpen = false;
  registry.clock.setWeaponWheelSlowMo(false);
  gfx.setGameOverPostFX('wasted');

  const char = registry.getActiveCharacter();
  const fineCents = Math.min(500000, Math.floor(char.cashCents * 0.1));
  char.cashCents = Math.max(0, char.cashCents - fineCents);
  char.inVehicleId = null;
  s.wantedStars = 0;

  const inv = s.inventories[char.id];
  for (const item of inv) {
    if (item.weaponId === 'rpg_launcher' || item.weaponId === 'carbine_mk2') {
      item.reserveAmmo = Math.floor(item.reserveAmmo * 0.5);
    }
  }

  registry.events.emit('player:died', {
    characterId: char.id,
    location: { ...char.position },
    cause,
  });

  registry.events.emit('economy:transactionCompleted', {
    record: {
      id: `tx_hospital_${Date.now()}`,
      timestampGameSec: registry.clock.gameTime,
      characterId: char.id,
      account: 'cash',
      amountCents: -fineCents,
      balanceAfterCents: char.cashCents,
      trigger: 'wasted_hospital_fee',
      description: 'Vice City General Hospital Emergency Fee',
    },
  });
}

export function triggerPlayerBusted(registry: GameRegistry, gfx: GraphicsEngine): void {
  const s = registry.state;
  const eventId = `arrest_${s.activeCharacterId}_${Math.floor(registry.clock.gameTime * 10)}`;
  if (s.gameOverState !== 'none' || s.lastArrestEventId === eventId) return;

  s.lastArrestEventId = eventId;
  s.gameOverState = 'busted';
  s.phoneOpen = false;
  s.weaponWheelOpen = false;
  registry.clock.setWeaponWheelSlowMo(false);
  gfx.setGameOverPostFX('busted');

  const char = registry.getActiveCharacter();
  const bailCents = Math.min(char.cashCents, 100000 + s.wantedStars * 75000);
  char.cashCents = Math.max(0, char.cashCents - bailCents);
  char.inVehicleId = null;
  s.wantedStars = 0;
  s.policeActiveUnits = 0;

  s.inventories[char.id] = s.inventories[char.id].filter(
    (it) => it.weaponId === 'unarmed' || it.weaponId === 'pistol_9mm'
  );
  s.activeWeapons[char.id] = 'unarmed';

  registry.events.emit('player:arrested', {
    characterId: char.id,
    location: { ...char.position },
    bailCents,
    respawnLocation: 'Leonida State Penitentiary',
  });
}

export function completePlayerRespawn(
  registry: GameRegistry,
  gfx: GraphicsEngine,
  syncRig: (id: CharacterId) => void,
  resetVel: (id: CharacterId) => void
): void {
  const s = registry.state;
  if (s.gameOverState === 'none') return;
  const wasBusted = s.gameOverState === 'busted';
  const char = registry.getActiveCharacter();

  const respawnPos: Vec3 = wasBusted
    ? { x: -275, y: 0.65, z: 215 }
    : { x: -145, y: 0.65, z: -155 };

  char.position = respawnPos;
  char.health = char.maxHealth;
  char.oxygenCurrent = char.maxOxygen;
  char.staminaCurrent = 100;
  char.inInteriorId = null;
  char.inVehicleId = null;
  resetVel(char.id);

  s.gameOverState = 'none';
  gfx.setGameOverPostFX('none');
  syncRig(char.id);

  registry.events.emit('player:respawned', {
    characterId: char.id,
    hospitalPos: respawnPos,
    fineCents: 0,
  });
}

export function evaluateNearbyPrompt(
  registry: GameRegistry,
  water: WaterDivingSystem,
  pos: Vec3,
  input: InputActionState,
  syncRig: (id: CharacterId) => void,
  onRequestAtmUI?: () => void,
  onRequestActivityUI?: (kind: string, targetId: string) => void
): NearbyPrompt | null {
  const char = registry.getActiveCharacter();

  if (char.inInteriorId) {
    const interior = ENTERABLE_INTERIORS.find((i) => i.id === char.inInteriorId);
    if (interior && Math.hypot(pos.x - interior.interiorCenter.x, pos.z - interior.interiorCenter.z) < 12) {
      if (input.interactPressed) {
        char.inInteriorId = null;
        char.position = { ...interior.exitPos };
        syncRig(char.id);
        return null;
      }
      return { key: 'hud.interact.exitInterior', action: 'exit_interior', targetId: interior.id };
    }
  }

  for (const interior of ENTERABLE_INTERIORS) {
    if (Math.hypot(pos.x - interior.entrancePos.x, pos.z - interior.entrancePos.z) < 4.5) {
      if (input.interactPressed) {
        char.inInteriorId = interior.id;
        char.position = { ...interior.interiorCenter };
        syncRig(char.id);
        return null;
      }
      return {
        key: 'hud.interact.enterInterior',
        params: { name: interior.name },
        action: 'interior',
        targetId: interior.id,
      };
    }
  }

  for (const site of water.salvageSites) {
    if (registry.state.collectedSalvageIds.has(site.id)) continue;
    if (Math.hypot(pos.x - site.position.x, pos.y - site.position.y, pos.z - site.position.z) < 4.5) {
      if (input.interactPressed) {
        water.collectSalvage(site.id);
        return null;
      }
      return {
        key: 'hud.interact.salvage',
        params: { name: site.name },
        action: 'salvage',
        targetId: site.id,
      };
    }
  }

  for (const atm of ATM_POINTS) {
    if (Math.hypot(pos.x - atm.position.x, pos.z - atm.position.z) < 3.5) {
      if (input.interactPressed) {
        onRequestAtmUI?.();
        return null;
      }
      return { key: 'hud.interact.atm', action: 'atm', targetId: atm.id };
    }
  }

  for (const act of ACTIVITY_SPOTS) {
    if (Math.hypot(pos.x - act.position.x, pos.z - act.position.z) < 4.5) {
      const key =
        act.kind === 'tuning'
          ? 'hud.interact.tuning'
          : act.kind === 'wardrobe'
          ? 'hud.interact.wardrobe'
          : 'hud.interact.activity';
      if (input.interactPressed) {
        onRequestActivityUI?.(act.kind, act.id);
        return null;
      }
      return { key, params: { name: act.name }, action: 'activity', targetId: act.id };
    }
  }

  return null;
}
