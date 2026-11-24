import React, { useRef } from 'react';
import type { InputManager } from '../core/input';

interface TouchControlsProps {
  input: InputManager;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ input }) => {
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const handlePadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    originRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!originRef.current) return;
    const dx = Math.max(-40, Math.min(40, e.clientX - originRef.current.x));
    const dy = Math.max(-40, Math.min(40, e.clientY - originRef.current.y));
    input.touchMoveX = dx / 40;
    input.touchMoveY = -dy / 40;
  };

  const handlePadUp = () => {
    originRef.current = null;
    input.touchMoveX = 0;
    input.touchMoveY = 0;
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-20 flex items-center justify-between px-4 pointer-events-none md:hidden">
      <div
        onPointerDown={handlePadDown}
        onPointerMove={handlePadMove}
        onPointerUp={handlePadUp}
        onPointerCancel={handlePadUp}
        className="w-24 h-24 rounded-full bg-neutral-900/60 border border-white/20 flex items-center justify-center text-[11px] text-neutral-300 pointer-events-auto touch-none"
      >
        MOVE
      </div>

      <div className="flex gap-2 pointer-events-auto">
        <button
          type="button"
          onPointerDown={() => { input.touchSprint = true; }}
          onPointerUp={() => { input.touchSprint = false; }}
          className="w-12 h-12 rounded-full bg-neutral-900/75 border border-white/20 text-[11px] font-semibold text-white"
        >
          RUN
        </button>
        <button
          type="button"
          onClick={() => input.triggerVirtualKey('KeyF')}
          className="w-12 h-12 rounded-full bg-amber-500/85 text-[11px] font-bold text-neutral-950"
        >
          VEH
        </button>
        <button
          type="button"
          onPointerDown={() => { input.touchFire = true; }}
          onPointerUp={() => { input.touchFire = false; }}
          className="w-12 h-12 rounded-full bg-rose-600/85 text-[11px] font-bold text-white"
        >
          ACT
        </button>
      </div>
    </div>
  );
};
