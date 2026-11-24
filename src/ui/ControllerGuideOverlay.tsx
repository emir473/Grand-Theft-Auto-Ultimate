import React, { useState } from 'react';
import { Gamepad2, Maximize2, Smartphone, Vibrate, X } from 'lucide-react';
import type { GameRuntime } from '../core/gameRuntime';
import { DUALSENSE_GUIDE, type ControlContextMode } from '../core/gamepadManager';
import { InputManager } from '../core/input';

interface ControllerGuideOverlayProps {
  runtime: GameRuntime;
  onClose: () => void;
  onRefresh: () => void;
}

export const ControllerGuideOverlay: React.FC<ControllerGuideOverlayProps> = ({ runtime, onClose, onRefresh }) => {
  const s = runtime.registry.state;
  const gp = runtime.input.gamepad;
  const [tab, setTab] = useState<ControlContextMode>('on_foot');
  const [fsActive, setFsActive] = useState(Boolean(typeof document !== 'undefined' && document.fullscreenElement));

  const rows = DUALSENSE_GUIDE[tab];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-neutral-900 border border-white/15 rounded-2xl p-5 max-w-lg w-full text-neutral-100 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display text-lg font-bold">DualSense, Touch &amp; Haptics</h2>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Gamepad & Haptic Capability Status */}
        <div className="bg-neutral-950/75 border border-white/10 rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">Controller Status</span>
            <span className={gp.isConnected ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
              {gp.isConnected ? (gp.isDualSense ? 'PS5 DualSense Active' : 'Gamepad Active') : 'Keyboard / Mouse / Touch'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Device ID</span>
            <span className="font-mono-tabular text-neutral-300 truncate max-w-[260px]">{gp.connectedLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Dual-Rumble Haptics</span>
            <span className={gp.hapticsSupported ? 'text-cyan-400' : 'text-neutral-400'}>
              {gp.hapticsSupported ? 'Hardware Supported' : 'Fallback / Browser Limited'}
            </span>
          </div>
        </div>

        {/* Controls & Accessibility Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-neutral-950/60 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>iPad Touch Overlay</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Mode</span>
              <select
                value={s.touchControlsMode}
                onChange={(e) => {
                  s.touchControlsMode = e.target.value as 'auto' | 'on' | 'off';
                  onRefresh();
                }}
                className="bg-neutral-800 border border-white/15 rounded px-2 py-1"
              >
                <option value="auto">Auto Detect</option>
                <option value="on">Force On (iPad Test)</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Handedness</span>
              <button
                type="button"
                onClick={() => {
                  s.touchLayout = s.touchLayout === 'right' ? 'left' : 'right';
                  onRefresh();
                }}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 capitalize cursor-pointer"
              >
                {s.touchLayout}-handed
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Opacity</span>
              <input
                type="range"
                min={0.35}
                max={1}
                step={0.05}
                value={s.touchOpacity}
                onChange={(e) => {
                  s.touchOpacity = Number(e.target.value);
                  onRefresh();
                }}
                className="w-24 accent-cyan-400"
              />
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <Vibrate className="w-4 h-4 text-rose-400" />
              <span>Haptics &amp; Fullscreen</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Vibration</span>
              <button
                type="button"
                onClick={() => {
                  s.hapticsEnabled = !s.hapticsEnabled;
                  onRefresh();
                }}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${s.hapticsEnabled ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {s.hapticsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Strength</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={s.hapticsIntensity}
                onChange={(e) => {
                  s.hapticsIntensity = Number(e.target.value);
                  onRefresh();
                }}
                className="w-24 accent-rose-400"
              />
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => gp.triggerHaptics(0.7, 0.5, 180, s.hapticsEnabled, s.hapticsIntensity)}
                className="flex-1 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                Test Pulse
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await InputManager.toggleFullscreen(runtime.registry.canvas?.parentElement);
                  setFsActive(res);
                }}
                className="flex-1 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{fsActive ? 'Exit FS' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Context-Sensitive DualSense Button Guide */}
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {(['on_foot', 'vehicle', 'aircraft'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTab(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  tab === m ? 'bg-cyan-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="bg-neutral-950/70 border border-white/10 rounded-xl divide-y divide-white/5 text-xs">
            {rows.map((r) => (
              <div key={r.button} className="flex justify-between px-3 py-1.5">
                <span className="font-semibold text-amber-300">{r.button}</span>
                <span className="text-neutral-200">{r.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
