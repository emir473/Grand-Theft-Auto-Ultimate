import React, { useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import type { LanguageCode, QualityProfile, SpeedUnit } from '../core/types';
import { i18n } from './localization';

interface PauseMenuProps {
  runtime: GameRuntime;
  onResume: () => void;
  onRefresh: () => void;
  onOpenWorldMap?: () => void;
  onOpenControls?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ runtime, onResume, onRefresh, onOpenWorldMap, onOpenControls }) => {
  const s = runtime.registry.state;
  const [statusMsg, setStatusMsg] = useState('');

  const handleSave = async () => {
    const ok = await runtime.saveManager.save('autosave');
    setStatusMsg(ok ? i18n.t('save.ok') : i18n.t('save.fail', { reason: 'IndexedDB error' }));
  };

  const handleLoad = async () => {
    const ok = await runtime.saveManager.load('autosave');
    if (ok) {
      i18n.setLanguage(runtime.registry.state.language);
      runtime.graphics.applyQualityProfile(runtime.registry.state.qualityProfile);
      runtime.player.syncRigFromState('lucia');
      runtime.player.syncRigFromState('jason');
      setStatusMsg('Loaded autosave from IndexedDB.');
      onRefresh();
    } else {
      setStatusMsg('No saved game found in IndexedDB.');
    }
  };

  const handleReset = async () => {
    await runtime.saveManager.db.deleteSave('autosave').catch(() => undefined);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-4 text-neutral-100">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{i18n.t('menu.pause')}</h2>
          <span className="text-xs font-mono-tabular text-cyan-400">{runtime.graphics.backend}</span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">{i18n.t('menu.quality')}</span>
            <select
              value={s.qualityProfile}
              onChange={(e) => {
                runtime.graphics.applyQualityProfile(e.target.value as QualityProfile);
                onRefresh();
              }}
              className="bg-neutral-800 border border-white/15 rounded px-2.5 py-1 text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra (4K Shadows / DoF)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">{i18n.t('menu.language')}</span>
            <select
              value={s.language}
              onChange={(e) => {
                const lang = e.target.value as LanguageCode;
                s.language = lang;
                i18n.setLanguage(lang);
                onRefresh();
              }}
              className="bg-neutral-800 border border-white/15 rounded px-2.5 py-1 text-xs"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">{i18n.t('menu.units')}</span>
            <select
              value={s.speedUnit}
              onChange={(e) => {
                s.speedUnit = e.target.value as SpeedUnit;
                onRefresh();
              }}
              className="bg-neutral-800 border border-white/15 rounded px-2.5 py-1 text-xs"
            >
              <option value="mph">MPH</option>
              <option value="kmh">KM/H</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-300">{i18n.t('menu.minimap')}</span>
            <button
              type="button"
              onClick={() => {
                s.minimapRotate = !s.minimapRotate;
                onRefresh();
              }}
              className="bg-neutral-800 hover:bg-neutral-700 border border-white/15 rounded px-2.5 py-1 text-xs cursor-pointer"
            >
              {s.minimapRotate ? i18n.t('menu.minimap.rotate') : i18n.t('menu.minimap.north')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {onOpenWorldMap && (
            <button
              type="button"
              onClick={onOpenWorldMap}
              className="col-span-2 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer"
            >
              Open Full Leonida Map
            </button>
          )}
          {onOpenControls && (
            <button
              type="button"
              onClick={onOpenControls}
              className="col-span-2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
            >
              PS5 DualSense, Touch &amp; Haptics Settings
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold cursor-pointer"
          >
            {i18n.t('menu.save')}
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold cursor-pointer"
          >
            {i18n.t('menu.load')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-xs font-semibold cursor-pointer"
          >
            {i18n.t('menu.newGame')}
          </button>
          <button
            type="button"
            onClick={onResume}
            className="py-2 rounded-lg bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-semibold cursor-pointer"
          >
            {i18n.t('menu.resume')}
          </button>
        </div>

        {statusMsg && <div className="text-xs text-amber-300 text-center">{statusMsg}</div>}
      </div>
    </div>
  );
};
