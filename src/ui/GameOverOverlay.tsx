import React from 'react';
import { formatMoney } from '../core/types';
import { i18n } from './localization';

interface GameOverOverlayProps {
  mode: 'wasted' | 'busted';
  fineCents: number;
  onRespawn: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ mode, fineCents, onRespawn }) => {
  const isWasted = mode === 'wasted';
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
      <h2
        className={`font-display text-5xl sm:text-7xl font-bold tracking-wider ${
          isWasted ? 'text-red-500' : 'text-sky-400'
        }`}
      >
        {i18n.t(isWasted ? 'gameover.wasted' : 'gameover.busted')}
      </h2>
      <p className="text-sm sm:text-base text-neutral-200 mt-3 max-w-md">
        {i18n.t(isWasted ? 'gameover.wastedSub' : 'gameover.bustedSub', {
          fine: formatMoney(fineCents),
        })}
      </p>
      <button
        type="button"
        onClick={onRespawn}
        className="mt-6 px-6 py-2.5 rounded-lg bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-200 cursor-pointer"
      >
        Respawn
      </button>
    </div>
  );
};
