import React, { useState } from 'react';
import { Camera, Download, Share2, Sun, X } from 'lucide-react';
import type { GameRuntime } from '../core/gameRuntime';

interface PhotoModeOverlayProps {
  runtime: GameRuntime;
  onClose: () => void;
  onRefresh: () => void;
}

export const PhotoModeOverlay: React.FC<PhotoModeOverlayProps> = ({ runtime, onClose, onRefresh }) => {
  const cam = runtime.player.camera;
  const [fov, setFov] = useState(cam ? Math.round((cam.fov * 180) / Math.PI) : 52);
  const [dayHour, setDayHour] = useState(runtime.registry.clock.dayTimeHours);
  const [showGrid, setShowGrid] = useState(true);
  const [caption, setCaption] = useState('Postcard from Vice Beach');
  const [feedback, setFeedback] = useState('');

  const applyFov = (deg: number) => {
    setFov(deg);
    if (cam) cam.fov = (deg * Math.PI) / 180;
  };

  const applyTime = (hr: number) => {
    setDayHour(hr);
    runtime.registry.clock.dayTimeHours = hr;
    runtime.weather.update(0.016);
  };

  const handleDownloadSnapshot = () => {
    const canvas = runtime.registry.canvas;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `leonida-legacy-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setFeedback('Snapshot saved as PNG.');
    } catch {
      setFeedback('Canvas capture unavailable in current context.');
    }
  };

  const handlePostFeed = () => {
    const char = runtime.registry.getActiveCharacter();
    runtime.registry.state.socialFeed.unshift({
      id: `photo_${Date.now()}`,
      authorName: `@${char.id}_leonida`,
      isNpc: false,
      caption: caption.trim() || 'Sunset over Leonida',
      eventTag: 'photo_mode',
      likes: 42,
      reach: 520,
      timestampGameSec: runtime.registry.clock.gameTime,
      location: { ...char.position },
    });
    setFeedback('Posted photo moment to Leonida Social!');
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-4">
      {showGrid && (
        <div className="fixed inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-35">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="border border-white/40" />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between pointer-events-auto">
        <div className="bg-neutral-950/85 border border-white/15 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-white">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="font-display font-bold">Leonida Photo Studio</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-neutral-950/90 border border-white/15 text-xs text-white flex items-center gap-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Exit Photo Mode</span>
        </button>
      </div>

      <div className="relative bg-neutral-950/90 border border-white/15 rounded-2xl p-4 max-w-md w-full mx-auto pointer-events-auto text-xs text-neutral-100 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Lens FOV</span>
              <span className="font-mono-tabular text-white">{fov}°</span>
            </div>
            <input
              type="range"
              min={28}
              max={88}
              value={fov}
              onChange={(e) => applyFov(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Time</span>
              <span className="font-mono-tabular text-white">{dayHour.toFixed(1)}h</span>
            </div>
            <input
              type="range"
              min={0}
              max={23.9}
              step={0.5}
              value={dayHour}
              onChange={(e) => applyTime(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
            placeholder="Caption..."
          />
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
          >
            {showGrid ? 'Grid On' : 'Grid Off'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            className="py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePostFeed}
            className="py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Post to Feed</span>
          </button>
        </div>
        {feedback && <div className="text-center text-emerald-300">{feedback}</div>}
      </div>
    </div>
  );
};
