import React, { useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import { formatMoney } from '../core/types';
import { WEAPON_CATALOG } from '../gameplay/weaponsInventory';
import { HackingMinigame } from './HackingMinigame';

interface ActivityOverlayProps {
  runtime: GameRuntime;
  mode: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const ActivityOverlay: React.FC<ActivityOverlayProps> = ({ runtime, mode, onClose, onRefresh }) => {
  const [msg, setMsg] = useState('');
  const [atmAmount, setAtmAmount] = useState('500');
  const char = runtime.registry.getActiveCharacter();

  const ownedVeh = Array.from(runtime.registry.state.vehicles.values()).find((v) => v.ownerCharacter === char.id);

  return (
    <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-4 text-neutral-100 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold capitalize">{mode.replace('_', ' ')}</h2>
          <button type="button" onClick={onClose} className="text-xs text-neutral-400 hover:text-white cursor-pointer">
            Close
          </button>
        </div>

        {mode === 'atm' && (
          <div className="space-y-3">
            <div className="flex justify-between font-mono-tabular text-xs bg-neutral-950 p-3 rounded-lg">
              <span>Cash: {formatMoney(char.cashCents)}</span>
              <span>Bank: {formatMoney(char.bankCents)}</span>
            </div>
            <input
              type="number"
              min={1}
              value={atmAmount}
              onChange={(e) => setAtmAmount(e.target.value)}
              className="w-full bg-neutral-800 border border-white/15 rounded px-3 py-2 font-mono-tabular"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = runtime.economy.atmDeposit(Number(atmAmount) * 100);
                  setMsg(res.ok ? 'Deposit complete.' : res.error ?? 'Error');
                  onRefresh();
                }}
                className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold cursor-pointer"
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = runtime.economy.atmWithdraw(Number(atmAmount) * 100);
                  setMsg(res.ok ? 'Withdrawal complete.' : res.error ?? 'Error');
                  onRefresh();
                }}
                className="flex-1 py-2 rounded bg-sky-600 hover:bg-sky-500 font-semibold cursor-pointer"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}

        {mode === 'tuning' && ownedVeh && (
          <div className="space-y-2.5 text-xs">
            <div className="text-neutral-300">Tuning: <span className="font-semibold text-white">{ownedVeh.name}</span></div>
            <button
              type="button"
              onClick={() => {
                const res = runtime.activities.purchaseVehicleTuning(ownedVeh.id, { engineLevel: Math.min(3, ownedVeh.tuning.engineLevel + 1) }, 250000);
                setMsg(res.ok ? 'Upgraded Engine Tune (+14% Power)!' : res.reason ?? 'Error');
                onRefresh();
              }}
              className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold cursor-pointer"
            >
              Upgrade Engine Level ({ownedVeh.tuning.engineLevel}/3) — $2,500
            </button>
            <button
              type="button"
              onClick={() => {
                const res = runtime.activities.purchaseVehicleTuning(ownedVeh.id, { tireCompound: 'sport', primaryColorHex: '#06b6d4' }, 120000);
                setMsg(res.ok ? 'Installed Sport Tires & Miami Cyan Paint!' : res.reason ?? 'Error');
                onRefresh();
              }}
              className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer"
            >
              Sport Tires + Cyan Metallic — $1,200
            </button>
            <button
              type="button"
              onClick={() => {
                runtime.vehicles.repairVehicle(ownedVeh.id, 0);
                setMsg('Vehicle repaired.');
              }}
              className="w-full py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
            >
              Repair Vehicle Free (Owner Garage)
            </button>
          </div>
        )}

        {mode === 'wardrobe' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: 'vice_resort_coral', label: 'Coral Resort', color: '#db5b6b' },
              { id: 'ocean_teal', label: 'Ocean Drive Teal', color: '#0d9488' },
              { id: 'midnight_black', label: 'Star Island Noir', color: '#1e293b' },
              { id: 'golden_sunset', label: 'Sunset Gold', color: '#d97706' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  runtime.activities.updateWardrobe(o.id, o.color, 0);
                  setMsg(`Equipped ${o.label}`);
                }}
                className="p-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-left cursor-pointer"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {mode === 'weapon_shop' && (
          <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
            {Object.values(WEAPON_CATALOG)
              .filter((w) => w.priceCents > 0)
              .map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-neutral-800 p-2 rounded">
                  <div>
                    <div className="font-semibold text-white">{w.nameKey}</div>
                    <div className="text-neutral-400">{formatMoney(w.priceCents)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = runtime.weapons.purchaseWeapon(w.id);
                      setMsg(res.ok ? `Purchased ${w.nameKey}` : res.reason ?? 'Failed');
                      onRefresh();
                    }}
                    className="px-3 py-1 rounded bg-amber-500 text-neutral-950 font-semibold cursor-pointer"
                  >
                    Buy
                  </button>
                </div>
              ))}
          </div>
        )}

        {mode === 'robbery' && (
          <HackingMinigame
            runtime={runtime}
            difficulty="bank_vault"
            onResult={(ok, reward) => {
              setMsg(ok ? `Vault Cleared! +${formatMoney(reward)}` : 'Silent Alarm Tripped!');
              onRefresh();
            }}
          />
        )}

        {['darts', 'pool', 'poker', 'arm_wrestling', 'fishing', 'hunting', 'nightlife'].includes(mode) && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">Play {mode.replace('_', ' ')} for Leonida cash rewards and skill progression.</p>
            <button
              type="button"
              onClick={() => {
                const actKind = (mode === 'nightlife' ? 'poker' : mode) as 'darts' | 'pool' | 'poker' | 'arm_wrestling' | 'fishing' | 'hunting';
                const score = Math.floor(35 + Math.random() * 65);
                const res = runtime.activities.resolveMiniActivity(actKind, score);
                setMsg(res.summary);
                onRefresh();
              }}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold cursor-pointer"
            >
              Play Round
            </button>
          </div>
        )}

        {msg && <div className="text-xs text-amber-300 font-medium">{msg}</div>}
      </div>
    </div>
  );
};
