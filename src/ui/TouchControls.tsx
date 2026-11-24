import React, { useRef, useState } from 'react';
import { InputManager } from '../core/input';

interface TouchControlsProps {
  input: InputManager;
  mode: 'auto' | 'on' | 'off';
  layout: 'right' | 'left';
  opacity: number;
  inVehicle: boolean;
  inAircraft: boolean;
  onToggleCamera: () => void;
  onCycleRadio: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  input,
  mode,
  layout,
  opacity,
  inVehicle,
  inAircraft,
  onToggleCamera,
  onCycleRadio,
}) => {
  const moveOriginRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const lookPrevRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const visible = mode === 'on' || (mode === 'auto' && InputManager.isTouchDevice());
  if (!visible) return null;

  const isLeftHanded = layout === 'left';

  const onMoveDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    moveOriginRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onMoveMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!moveOriginRef.current || moveOriginRef.current.id !== e.pointerId) return;
    const dx = Math.max(-44, Math.min(44, e.clientX - moveOriginRef.current.x));
    const dy = Math.max(-44, Math.min(44, e.clientY - moveOriginRef.current.y));
    setKnobOffset({ x: dx, y: dy });
    input.touchMoveX = dx / 44;
    input.touchMoveY = -dy / 44;
  };

  const onMoveUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (moveOriginRef.current?.id === e.pointerId) {
      moveOriginRef.current = null;
      setKnobOffset({ x: 0, y: 0 });
      input.touchMoveX = 0;
      input.touchMoveY = 0;
    }
  };

  const onLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPrevRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookPrevRef.current || lookPrevRef.current.id !== e.pointerId) return;
    const dx = e.clientX - lookPrevRef.current.x;
    const dy = e.clientY - lookPrevRef.current.y;
    lookPrevRef.current.x = e.clientX;
    lookPrevRef.current.y = e.clientY;
    input.touchLookDeltaX += dx * 1.15;
    input.touchLookDeltaY += dy * 1.15;
  };

  const onLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPrevRef.current?.id === e.pointerId) {
      lookPrevRef.current = null;
    }
  };

  const joystickBlock = (
    <div
      onPointerDown={onMoveDown}
      onPointerMove={onMoveMove}
      onPointerUp={onMoveUp}
      onPointerCancel={onMoveUp}
      className="relative w-28 h-28 rounded-full bg-neutral-950/65 border-2 border-white/25 flex items-center justify-center pointer-events-auto touch-none select-none shadow-lg"
    >
      <div
        className="w-11 h-11 rounded-full bg-white/80 border border-cyan-300 shadow transition-transform duration-75"
        style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
      />
      <span className="absolute bottom-1 text-[9px] uppercase tracking-wider text-neutral-300 font-semibold">
        {inVehicle ? 'Steer' : inAircraft ? 'Pitch/Roll' : 'Move'}
      </span>
    </div>
  );

  const actionCluster = (
    <div className="flex flex-col items-end gap-2 pointer-events-auto touch-none select-none">
      {/* Right-side Camera Look Pad */}
      <div
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
        className="w-36 h-20 rounded-xl bg-neutral-950/45 border border-white/20 flex items-center justify-center text-[10px] font-semibold text-neutral-300 uppercase tracking-wider"
      >
        Drag To Look
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleCamera}
          className="px-2.5 py-2 rounded-lg bg-neutral-900/80 border border-white/20 text-[10px] font-semibold text-cyan-300"
        >
          CAM
        </button>
        {(inVehicle || inAircraft) && (
          <button
            type="button"
            onClick={onCycleRadio}
            className="px-2.5 py-2 rounded-lg bg-neutral-900/80 border border-white/20 text-[10px] font-semibold text-pink-300"
          >
            RADIO
          </button>
        )}
        <button
          type="button"
          onClick={() => input.triggerVirtualKey('KeyF')}
          className="w-12 h-12 rounded-full bg-amber-500/90 border border-white/30 text-[11px] font-bold text-neutral-950"
        >
          {inVehicle || inAircraft ? 'EXIT' : 'VEH'}
        </button>
      </div>

      {inVehicle || inAircraft ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => { input.touchHandbrake = true; }}
            onPointerUp={() => { input.touchHandbrake = false; }}
            onPointerCancel={() => { input.touchHandbrake = false; }}
            className="w-12 h-12 rounded-full bg-sky-600/85 border border-white/25 text-[10px] font-bold text-white"
          >
            DRIFT
          </button>
          <button
            type="button"
            onPointerDown={() => { input.touchThrottle = -1; }}
            onPointerUp={() => { input.touchThrottle = 0; }}
            onPointerCancel={() => { input.touchThrottle = 0; }}
            className="w-12 h-12 rounded-full bg-rose-600/85 border border-white/25 text-[10px] font-bold text-white"
          >
            BRK
          </button>
          <button
            type="button"
            onPointerDown={() => { input.touchThrottle = 1; }}
            onPointerUp={() => { input.touchThrottle = 0; }}
            onPointerCancel={() => { input.touchThrottle = 0; }}
            className="w-14 h-14 rounded-full bg-emerald-500/90 border border-white/30 text-[11px] font-bold text-neutral-950"
          >
            GAS
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => { input.touchSprint = true; }}
            onPointerUp={() => { input.touchSprint = false; }}
            onPointerCancel={() => { input.touchSprint = false; }}
            className="w-12 h-12 rounded-full bg-neutral-900/80 border border-white/25 text-[10px] font-bold text-white"
          >
            RUN
          </button>
          <button
            type="button"
            onClick={() => input.triggerVirtualKey('Space')}
            className="w-12 h-12 rounded-full bg-sky-600/85 border border-white/25 text-[10px] font-bold text-white"
          >
            JUMP
          </button>
          <button
            type="button"
            onPointerDown={() => { input.touchFire = true; }}
            onPointerUp={() => { input.touchFire = false; }}
            onPointerCancel={() => { input.touchFire = false; }}
            className="w-14 h-14 rounded-full bg-rose-600/90 border border-white/30 text-[11px] font-bold text-white"
          >
            ACT
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`fixed inset-x-0 bottom-20 z-20 flex items-end justify-between px-4 sm:px-8 pointer-events-none ${
        isLeftHanded ? 'flex-row-reverse' : 'flex-row'
      }`}
      style={{ opacity }}
    >
      {joystickBlock}
      {actionCluster}
    </div>
  );
};
