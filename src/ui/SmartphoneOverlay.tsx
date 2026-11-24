import React, { useState } from 'react';
import {
  CarFront,
  Wrench,
  TrendingUp,
  Building2,
  Cpu,
  Siren,
  Share2,
  Radio,
  ArrowLeft,
  X,
  Sliders,
} from 'lucide-react';
import type { GameRuntime } from '../core/gameRuntime';
import { i18n } from './localization';
import { PhoneApps, type PhoneAppId } from './PhoneApps';

interface SmartphoneOverlayProps {
  runtime: GameRuntime;
  onClose: () => void;
}

const APPS: Array<{ id: PhoneAppId; labelKey: string; color: string; icon: React.ReactNode }> = [
  { id: 'taxi', labelKey: 'phone.app.taxi', color: 'bg-amber-500 text-neutral-950', icon: <CarFront className="w-5 h-5" /> },
  { id: 'mechanic', labelKey: 'phone.app.mechanic', color: 'bg-orange-500 text-neutral-950', icon: <Wrench className="w-5 h-5" /> },
  { id: 'tuning', labelKey: 'Customs', color: 'bg-indigo-500 text-white', icon: <Sliders className="w-5 h-5" /> },
  { id: 'stocks', labelKey: 'phone.app.stocks', color: 'bg-emerald-500 text-neutral-950', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'properties', labelKey: 'phone.app.properties', color: 'bg-purple-500 text-white', icon: <Building2 className="w-5 h-5" /> },
  { id: 'hack', labelKey: 'phone.app.hack', color: 'bg-cyan-500 text-neutral-950', icon: <Cpu className="w-5 h-5" /> },
  { id: 'emergency', labelKey: 'phone.app.emergency', color: 'bg-red-500 text-white', icon: <Siren className="w-5 h-5" /> },
  { id: 'social', labelKey: 'phone.app.social', color: 'bg-pink-500 text-white', icon: <Share2 className="w-5 h-5" /> },
  { id: 'radio', labelKey: 'phone.app.radio', color: 'bg-sky-500 text-neutral-950', icon: <Radio className="w-5 h-5" /> },
];

export const SmartphoneOverlay: React.FC<SmartphoneOverlayProps> = ({ runtime, onClose }) => {
  const [activeApp, setActiveApp] = useState<PhoneAppId>('home');
  const [, setTick] = useState(0);

  const hrs = Math.floor(runtime.registry.clock.dayTimeHours);
  const mins = Math.floor((runtime.registry.clock.dayTimeHours - hrs) * 60);
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-80 max-w-[92vw] bg-neutral-950 border-2 border-neutral-700 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-white/10 text-[11px] text-neutral-300">
        <span className="font-semibold text-white">{i18n.t('phone.title')}</span>
        <span className="font-mono-tabular">{timeStr} · 5G</span>
        <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Screen Content */}
      <div className="p-4 min-h-[340px] max-h-[420px] overflow-y-auto">
        {activeApp === 'home' ? (
          <div className="space-y-4">
            <div className="bg-neutral-900 rounded-xl p-3 border border-white/10">
              <div className="text-xs text-neutral-400">Active Missions</div>
              <div className="space-y-1.5 mt-1.5">
                {Array.from(runtime.registry.state.missions.values()).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-neutral-200">{m.titleKey}</span>
                    {m.status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => {
                          runtime.activities.startMission(m.id);
                          setTick((t) => t + 1);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-semibold shrink-0 cursor-pointer"
                      >
                        Start
                      </button>
                    ) : (
                      <span className="text-emerald-400 capitalize shrink-0">{m.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setActiveApp(app.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow ${app.color} group-hover:scale-105 transition-transform`}>
                    {app.icon}
                  </div>
                  <span className="text-[10px] text-neutral-300 text-center leading-tight">{i18n.t(app.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveApp('home')}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <PhoneApps runtime={runtime} activeApp={activeApp} onRefresh={() => setTick((t) => t + 1)} />
          </div>
        )}
      </div>
    </div>
  );
};
