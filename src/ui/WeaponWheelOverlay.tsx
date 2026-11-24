import React from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import { WEAPON_CATALOG } from '../gameplay/weaponsInventory';

interface WeaponWheelOverlayProps {
  runtime: GameRuntime;
  onClose: () => void;
}

export const WeaponWheelOverlay: React.FC<WeaponWheelOverlayProps> = ({ runtime, onClose }) => {
  const char = runtime.registry.getActiveCharacter();
  const inv = runtime.registry.state.inventories[char.id];
  const activeId = runtime.registry.state.activeWeapons[char.id];
  const nearestVeh = Array.from(runtime.vehicles.runtimes.values()).find(
    (v) => Math.hypot(v.data.position.x - char.position.x, v.data.position.z - char.position.z) < 6
  );

  const selectAndClose = (weaponId: string) => {
    runtime.weapons.selectWeapon(weaponId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900/95 border border-white/15 rounded-2xl p-6 max-w-xl w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Weapon Wheel · Slow Motion (0.1x)</h2>
            <p className="text-xs text-neutral-400">{char.displayName} · Select active loadout or manage trunk storage</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {inv.map((item) => {
            const def = WEAPON_CATALOG[item.weaponId];
            if (!def) return null;
            const isSelected = item.weaponId === activeId;
            return (
              <div
                key={item.weaponId}
                className={`p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-neutral-800/80 border-white/10 text-neutral-200 hover:border-white/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectAndClose(item.weaponId)}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="text-xs text-neutral-400 capitalize">{def.category}</div>
                  <div className="text-sm font-semibold mt-0.5">{def.nameKey}</div>
                  <div className="text-xs font-mono-tabular text-amber-400 mt-1">
                    {def.magazineSize > 0 ? `${item.loadedAmmo} / ${item.reserveAmmo}` : 'Melee'}
                  </div>
                </button>
                {nearestVeh && item.weaponId !== 'unarmed' && (
                  <button
                    type="button"
                    onClick={() => runtime.weapons.storeWeaponInVehicleTrunk(item.weaponId, nearestVeh.data.id)}
                    className="mt-2 w-full py-1 rounded bg-neutral-900/90 hover:bg-neutral-950 text-[11px] text-sky-300 cursor-pointer"
                  >
                    Stow in {nearestVeh.data.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {nearestVeh && nearestVeh.data.trunkWeapons.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-xs font-semibold text-neutral-300 mb-2">
              {nearestVeh.data.name} Trunk ({nearestVeh.data.trunkWeapons.length}/{nearestVeh.data.trunkMaxSlots})
            </div>
            <div className="flex flex-wrap gap-2">
              {nearestVeh.data.trunkWeapons.map((tw) => (
                <button
                  key={tw.weaponId}
                  type="button"
                  onClick={() => runtime.weapons.retrieveWeaponFromVehicleTrunk(tw.weaponId, nearestVeh.data.id)}
                  className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-100 cursor-pointer"
                >
                  Take {WEAPON_CATALOG[tw.weaponId]?.nameKey ?? tw.weaponId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Utility Gear & Quick Tools */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-xs font-semibold text-neutral-300 mb-2">Utility Gear & Field Kit</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                runtime.toggleCameraMode();
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-sky-300 cursor-pointer"
            >
              Toggle 1P / 3P View
            </button>
            <button
              type="button"
              onClick={() => {
                runtime.audio.cycleStation();
              }}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-pink-300 cursor-pointer"
            >
              Radio: {runtime.audio.currentStation}
            </button>
            {nearestVeh && (
              <button
                type="button"
                onClick={() => {
                  runtime.vehicles.repairVehicle(nearestVeh.data.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-emerald-300 cursor-pointer"
              >
                Field Wrench ({nearestVeh.data.name})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                char.oxygenCurrent = char.maxOxygen;
                char.staminaCurrent = 100;
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-cyan-300 cursor-pointer"
            >
              Rebreather / Energy Kit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
