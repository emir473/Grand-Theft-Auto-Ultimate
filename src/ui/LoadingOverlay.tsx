import React from 'react';
import type { AssetLoadProgress } from '../assets/assetLoader';
import { i18n } from './localization';

interface LoadingOverlayProps {
  progress: AssetLoadProgress;
  onCancelOptional: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, onCancelOptional }) => {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between p-8 sm:p-14 text-neutral-100">
      <div className="max-w-2xl">
        <div className="text-xs font-medium text-amber-400 tracking-wide">
          {i18n.t('game.subtitle')}
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white mt-2">
          {i18n.t('loading.title')}
        </h1>
        <p className="text-sm text-neutral-400 mt-2">{i18n.t(progress.statusKey)}</p>
      </div>

      <div className="max-w-xl w-full space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-300 font-mono-tabular">
          <span>Asset: {progress.currentAsset}</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-400 transition-all duration-150"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {progress.errors.length > 0 && (
          <div className="text-xs text-red-400 space-y-1">
            {progress.errors.map((e, i) => (
              <div key={i}>{i18n.t('loading.error', { detail: e })}</div>
            ))}
          </div>
        )}
        {!progress.requiredComplete && (
          <button
            type="button"
            onClick={onCancelOptional}
            className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
          >
            {i18n.t('loading.cancel')}
          </button>
        )}
      </div>
    </div>
  );
};
