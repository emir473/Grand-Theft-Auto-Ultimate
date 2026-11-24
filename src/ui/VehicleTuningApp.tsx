import React, { useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import { formatMoney } from '../core/types';

interface VehicleTuningAppProps {
  runtime: GameRuntime;
  onRefresh: () => void;
}

const PAINT_SWATCHES = ['#ec4899', '#2563eb', '#65a30d', '#5eead4', '#ea580c', '#111827', '#facc15', '#f8fafc'];
const GLOW_SWATCHES = ['#00f0ff', '#ec4899', '#84cc16', '#f97316', '#a855f7', '#ffffff'];

export const VehicleTuningApp: React.FC<VehicleTuningAppProps> = ({ runtime, onRefresh }) => {
  const char = runtime.registry.getActiveCharacter();
  const activeVeh = runtime.vehicles.getActiveVehicleRuntime();
  const fallbackVeh = Array.from(runtime.vehicles.runtimes.values()).find((v) => v.data.ownerCharacter === char.id);
  const target = activeVeh ?? fallbackVeh;
  const [, forceUpdate] = useState(0);

  if (!target) {
    return <div className="text-xs text-neutral-400">Enter or own a vehicle to customize paint, wheels &amp; RGB underglow.</div>;
  }

  const t = target.data.tuning;
  const updateTuning = (patch: Partial<typeof t>) => {
    Object.assign(target.data.tuning, patch);
    runtime.vehicles.applyTuningChange(target.data.id);
    forceUpdate((n) => n + 1);
    onRefresh();
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-cyan-400">Vice Customs · {target.data.name}</h3>
        <span className="font-mono-tabular text-neutral-400">{target.data.plate}</span>
      </div>

      <div>
        <div className="text-neutral-400 mb-1">Clear-Coat Metallic Paint</div>
        <div className="flex flex-wrap gap-1.5">
          {PAINT_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => updateTuning({ primaryColorHex: hex })}
              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${t.primaryColorHex === hex ? 'border-white scale-110' : 'border-white/20'}`}
              style={{ backgroundColor: hex }}
              aria-label={`Paint ${hex}`}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-neutral-400 mb-1">
          <span>RGB Neon Underglow</span>
          <button
            type="button"
            onClick={() => updateTuning({ underglowEnabled: !t.underglowEnabled })}
            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${t.underglowEnabled ? 'bg-cyan-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {t.underglowEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mb-1.5">
          {GLOW_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => updateTuning({ underglowEnabled: true, underglowHex: hex })}
              className={`w-5 h-5 rounded-full border cursor-pointer ${t.underglowHex === hex ? 'border-white' : 'border-white/20'}`}
              style={{ backgroundColor: hex }}
              aria-label={`Glow ${hex}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(['static', 'pulse', 'rainbow'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => updateTuning({ underglowEnabled: true, underglowMode: m })}
              className={`py-1 rounded capitalize cursor-pointer ${t.underglowMode === m ? 'bg-cyan-600 text-white font-semibold' : 'bg-neutral-800 text-neutral-300'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-neutral-400 mb-1">Wheels &amp; Stance</div>
        <div className="grid grid-cols-4 gap-1">
          {(['stock', 'sport', 'chrome', 'offroad'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateTuning({ wheelType: w })}
              className={`py-1 rounded capitalize cursor-pointer ${t.wheelType === w ? 'bg-amber-500 text-neutral-950 font-semibold' : 'bg-neutral-800 text-neutral-300'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => updateTuning({ spoilerId: t.spoilerId === 'none' ? 'gt_wing' : 'none' })}
          className="py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
        >
          Spoiler: {t.spoilerId === 'none' ? 'Off' : 'GT Wing'}
        </button>
        <button
          type="button"
          onClick={() => {
            runtime.vehicles.repairVehicle(target.data.id, 0);
            forceUpdate((n) => n + 1);
            onRefresh();
          }}
          className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
        >
          Free Service ({formatMoney(char.cashCents)})
        </button>
      </div>
    </div>
  );
};
