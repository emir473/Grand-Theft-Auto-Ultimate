import React from 'react';
import { Phone, ShieldAlert, Pause, Terminal, Disc, Users, Video, Volume2, VolumeX, Map as MapIcon } from 'lucide-react';
import type { GameRuntime, HudSnapshot } from '../core/gameRuntime';
import { formatMoney } from '../core/types';
import { i18n } from './localization';
import { Minimap } from './Minimap';

interface HudOverlayProps {
  runtime: GameRuntime;
  hud: HudSnapshot;
  minimapRotate: boolean;
  muted: boolean;
  onToggleMinimapRotate: () => void;
  onOpenWorldMap: () => void;
  onOpenPhone: () => void;
  onOpenWeaponWheel: () => void;
  onOpenPause: () => void;
  onOpenConsole: () => void;
  onSwitchCharacter: () => void;
  onToggleDirector: () => void;
  onToggleMute: () => void;
  onInteract: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  runtime,
  hud,
  minimapRotate,
  muted,
  onToggleMinimapRotate,
  onOpenWorldMap,
  onOpenPhone,
  onOpenWeaponWheel,
  onOpenPause,
  onOpenConsole,
  onSwitchCharacter,
  onToggleDirector,
  onToggleMute,
  onInteract,
}) => {
  const hrs = Math.floor(hud.dayTimeHours);
  const mins = Math.floor((hud.dayTimeHours - hrs) * 60);
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Row: Wanted/Alerts Left + Character/Economy/Action Buttons Right */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-md">
          {hud.wantedStars > 0 && (
            <div className="flex items-center gap-2 bg-neutral-950/85 border border-red-500/40 px-3 py-1.5 rounded-md">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-semibold text-neutral-100 mr-1">{i18n.t('hud.wanted')}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-sm leading-none ${star <= hud.wantedStars ? 'text-amber-400' : 'text-neutral-700'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}

          {hud.militaryAlert && (
            <div className="bg-red-950/90 border border-red-500/60 text-red-100 px-3 py-1.5 rounded-md text-xs font-semibold">
              {hud.militaryAlert}
            </div>
          )}

          {hud.wantedStars > 0 && hud.lastRadioDispatch && (
            <div className="bg-neutral-950/80 border border-white/10 text-neutral-200 px-3 py-1.5 rounded-md text-xs">
              {hud.lastRadioDispatch}
            </div>
          )}
        </div>

        {/* Top-Right Economy & Quick Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="bg-neutral-950/80 border border-white/10 rounded-lg px-3.5 py-2 text-right">
            <div className="flex items-center justify-end gap-2 text-xs text-neutral-300">
              <span className="font-semibold text-white">{hud.characterName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{timeStr}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{hud.weather}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-cyan-400">{hud.backend} {hud.fps} FPS</span>
            </div>
            <div className="flex items-center justify-end gap-3 mt-1 font-mono-tabular">
              <span className="text-sm font-semibold text-emerald-400">{i18n.t('hud.cash')}: {formatMoney(hud.cashCents)}</span>
              <span className="text-sm font-medium text-sky-300">{i18n.t('hud.bank')}: {formatMoney(hud.bankCents)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onSwitchCharacter}
              title="Switch Lucia / Jason (K)"
              className="px-2.5 py-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs font-medium text-neutral-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch (K)</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorldMap}
              title="Leonida World Map"
              className="px-2.5 py-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs font-medium text-neutral-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={onOpenPhone}
              title="Open iFruit Phone (M)"
              className="px-2.5 py-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs font-medium text-neutral-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Phone (M)</span>
            </button>
            <button
              type="button"
              onClick={onOpenWeaponWheel}
              title="Weapon Wheel (Tab)"
              className="px-2.5 py-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs font-medium text-neutral-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Disc className="w-3.5 h-3.5 text-rose-400" />
              <span>Weapons (Tab)</span>
            </button>
            <button
              type="button"
              onClick={onToggleDirector}
              title="Director Replay Camera (F3)"
              className="p-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-neutral-200 cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title="Mute/Unmute Audio"
              className="p-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-neutral-200 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onOpenConsole}
              title="Developer Console (~)"
              className="p-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-neutral-200 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              title="Pause Menu (Esc)"
              className="p-1.5 rounded-md bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-neutral-200 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Reticle when aiming/armed + Context Prompt */}
      <div className="flex flex-col items-center justify-center gap-3">
        {hud.activeWeaponId !== 'unarmed' && !hud.inVehicle && (
          <div className="w-2 h-2 rounded-full border border-white/90 bg-white/30" />
        )}

        {hud.promptText && (
          <button
            type="button"
            onClick={onInteract}
            className="pointer-events-auto bg-neutral-950/90 border border-amber-400/50 text-neutral-100 px-4 py-2 rounded-md text-xs font-semibold shadow-md hover:bg-neutral-900 cursor-pointer"
          >
            {hud.promptText}
          </button>
        )}
      </div>

      {/* Bottom Row: Minimap & Vitals Left | Vehicle/Aircraft/Weapon Telemetry Right */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          {hud.gpsLabel && (
            <div className="bg-neutral-950/85 border border-amber-500/40 rounded-md px-3 py-1.5 max-w-[230px]">
              <div className="text-[11px] text-amber-400 font-semibold truncate">{hud.gpsLabel} · {hud.gpsDistanceMeters}m</div>
              {hud.gpsInstruction && <div className="text-xs text-neutral-100 truncate">{hud.gpsInstruction}</div>}
            </div>
          )}

          <Minimap runtime={runtime} hud={hud} rotate={minimapRotate} onToggleRotate={onToggleMinimapRotate} onOpenWorldMap={onOpenWorldMap} />

          {/* Vitals Bars */}
          <div className="w-48 sm:w-56 bg-neutral-950/85 border border-white/10 rounded-md p-2 flex flex-col gap-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <div className="text-[10px] text-neutral-400 flex justify-between">
                  <span>{i18n.t('hud.health')}</span>
                  <span className="font-mono-tabular">{hud.health}</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded overflow-hidden mt-0.5">
                  <div className="h-full bg-emerald-500" style={{ width: `${hud.health}%` }} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 flex justify-between">
                  <span>{i18n.t('hud.armor')}</span>
                  <span className="font-mono-tabular">{hud.armor}</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded overflow-hidden mt-0.5">
                  <div className="h-full bg-sky-500" style={{ width: `${hud.armor}%` }} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 flex justify-between">
                  <span>{hud.inWater ? i18n.t('hud.oxygen') : i18n.t('hud.stamina')}</span>
                  <span className="font-mono-tabular">{hud.inWater ? hud.oxygen : hud.stamina}</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded overflow-hidden mt-0.5">
                  <div
                    className={`h-full ${hud.inWater ? 'bg-cyan-400' : 'bg-amber-400'}`}
                    style={{ width: `${hud.inWater ? hud.oxygen : hud.stamina}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-Right Vehicle / Aircraft / Weapon Panel */}
        <div className="flex flex-col items-end gap-2">
          {(hud.inVehicle || hud.inAircraft) && (
            <div className="bg-neutral-950/85 border border-white/15 rounded-lg px-4 py-2.5 min-w-[210px]">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="font-semibold text-white">{hud.vehicleName}</span>
                {hud.inVehicle && <span className="font-mono-tabular text-amber-400">G{hud.gear}</span>}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-3xl font-bold text-white tabular-nums">{hud.speedDisplay}</span>
                <span className="text-xs text-neutral-400 uppercase">{hud.speedUnit}</span>
              </div>

              {hud.inAircraft ? (
                <div className="flex items-center justify-between text-xs text-cyan-300 font-mono-tabular mt-1.5">
                  <span>{i18n.t('hud.altitude')}: {hud.altitudeMeters}m</span>
                  <span>{i18n.t('hud.bankAngle')}: {hud.bankDeg}°</span>
                </div>
              ) : (
                <div className="mt-1.5 flex flex-col gap-1">
                  <div className="h-1.5 bg-neutral-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.min(100, (hud.rpm / Math.max(1000, hud.maxRpm)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono-tabular">
                    <span>{i18n.t('hud.fuel')}: {hud.fuelPct}%</span>
                    {hud.hydroplaning && <span className="text-cyan-400 font-semibold">HYDROPLANING</span>}
                    {hud.engineDamagePct > 35 && <span className="text-red-400 font-semibold">{i18n.t('hud.engineWarn')}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-neutral-950/85 border border-white/10 rounded-md px-3.5 py-2 text-right">
            <div className="text-xs font-semibold text-neutral-200">{hud.activeWeaponId.replace('_', ' ').toUpperCase()}</div>
            <div className="text-xs font-mono-tabular text-amber-400">
              {hud.activeWeaponId === 'unarmed' || hud.activeWeaponId === 'bat_aluminum'
                ? 'Melee · WASD / Shift / F Vehicle / E Interact'
                : `${hud.ammoLoaded} / ${hud.ammoReserve}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
