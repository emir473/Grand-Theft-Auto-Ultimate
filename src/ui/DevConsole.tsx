import React, { useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import type { VehicleClass, WeatherState } from '../core/types';
import { runLiveIntegrationChecks } from '../tests/integrationTests';

interface DevConsoleProps {
  runtime: GameRuntime;
  onClose: () => void;
}

export const DevConsole: React.FC<DevConsoleProps> = ({ runtime, onClose }) => {
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<string[]>([
    'Leonida Engine Developer Console. Type "help" for commands.',
  ]);

  const m = runtime.registry.metrics;
  const sDoc = runtime.graphics.shadowDoc;

  const append = (line: string) => setLogs((prev) => [...prev.slice(-40), line]);

  const execute = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    append(`> ${trimmed}`);
    const parts = trimmed.split(/\s+/);
    const name = parts[0].toLowerCase();

    if (name === 'help') {
      append('Commands: tp <x> <y> <z> | weather <sunny|cloudy|rain|hurricane> | time <0-24> | wanted <0-5> | spawn_veh <class> | cash <dollars> | flight | inspect | run_tests | clear');
      return;
    }
    if (name === 'clear') {
      setLogs([]);
      return;
    }
    if (name === 'tp' && parts.length >= 4) {
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if ([x, y, z].every(Number.isFinite)) {
        const char = runtime.registry.getActiveCharacter();
        char.position = { x, y, z };
        runtime.player.syncRigFromState(char.id);
        append(`Teleported ${char.id} to (${x}, ${y}, ${z})`);
      } else {
        append('Error: Invalid coordinates');
      }
      return;
    }
    if (name === 'weather' && parts[1]) {
      const w = parts[1] as WeatherState;
      if (['sunny', 'cloudy', 'rain', 'hurricane'].includes(w)) {
        runtime.weather.setWeather(w, 4);
        append(`Weather transitioning to ${w}`);
      } else {
        append('Error: Use sunny, cloudy, rain, or hurricane');
      }
      return;
    }
    if (name === 'time' && parts[1]) {
      const hr = Number(parts[1]);
      if (Number.isFinite(hr)) {
        runtime.registry.clock.setDayTimeHours(hr);
        append(`Day time set to ${hr.toFixed(2)}h`);
      }
      return;
    }
    if (name === 'wanted' && parts[1]) {
      const stars = Number(parts[1]);
      runtime.police.setWantedStars(stars, 'Console command');
      append(`Wanted level set to ${runtime.registry.state.wantedStars}`);
      return;
    }
    if (name === 'spawn_veh') {
      const vc = (parts[1] ?? 'supercar') as VehicleClass;
      const valid: VehicleClass[] = ['supercar', 'sports', 'sedan', 'suv', 'muscle', 'police', 'taxi', 'bus', 'truck', 'motorcycle'];
      if (!valid.includes(vc)) {
        append(`Error: Valid classes: ${valid.join(', ')}`);
        return;
      }
      const p = runtime.registry.getActiveCharacter().position;
      const id = `dev_${vc}_${Date.now()}`;
      runtime.vehicles.spawnVehicle({
        id,
        modelId: vc,
        vehicleClass: vc,
        name: `Dev ${vc.toUpperCase()}`,
        ownerCharacter: runtime.registry.state.activeCharacterId,
        plate: 'DEV-999',
        position: { x: p.x + 4, y: p.y + 0.3, z: p.z + 4 },
        yaw: 0,
        colorHex: '#06b6d4',
      });
      append(`Spawned ${vc} (${id})`);
      return;
    }
    if (name === 'cash' && parts[1]) {
      const dollars = Number(parts[1]);
      if (Number.isFinite(dollars)) {
        const char = runtime.registry.getActiveCharacter();
        char.cashCents = Math.max(0, char.cashCents + Math.round(dollars * 100));
        append(`Added $${dollars} to ${char.id}`);
      }
      return;
    }
    if (name === 'flight') {
      const ok = runtime.transport.triggerAirportFlightCycle();
      append(ok ? 'VCIA VCA-101 flight cycle triggered' : 'Runway busy or aircraft not parked');
      return;
    }
    if (name === 'inspect') {
      const char = runtime.registry.getActiveCharacter();
      append(`Active=${char.id} Pos=(${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)}, ${char.position.z.toFixed(1)}) Water=${char.waterState} Loco=${char.locomotion}`);
      append(`Shadows=${sDoc.activeMethod} ${sDoc.mapSize}px ${sDoc.filter} cascades=${sDoc.numCascades} | Errors=${runtime.registry.events.errorLog.length}`);
      return;
    }
    if (name === 'run_tests') {
      const results = runLiveIntegrationChecks(runtime);
      for (const r of results) {
        append(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}: ${r.detail}`);
      }
      return;
    }
    append(`Unknown command: ${name}`);
  };

  return (
    <div className="fixed inset-x-4 top-4 z-50 bg-neutral-950/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl text-xs font-mono-tabular text-neutral-200 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="font-semibold text-cyan-400">
          Dev Console · {m.rendererBackend} · {m.fps} FPS ({m.frameTimeMs}ms | CPU {m.cpuUpdateMs}ms | Render {m.renderTimeMs}ms)
        </span>
        <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-[11px] text-neutral-400 border-b border-white/10">
        <div>Draw Calls: <span className="text-white">{m.drawCalls}</span></div>
        <div>Entities: <span className="text-white">{m.activeEntities}</span></div>
        <div>Textures: <span className="text-white">{m.texturesCount}</span></div>
        <div>Memory: <span className="text-white">{m.gpuMemoryText}</span></div>
      </div>

      <div className="h-44 overflow-y-auto py-2 space-y-1 text-[11px]">
        {logs.map((l, i) => (
          <div key={i} className={l.startsWith('[FAIL]') || l.startsWith('Error') ? 'text-red-400' : l.startsWith('[PASS]') ? 'text-emerald-400' : 'text-neutral-300'}>
            {l}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute(cmd);
          setCmd('');
        }}
        className="flex gap-2 pt-2 border-t border-white/10"
      >
        <input
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="Type command (e.g. help, run_tests, weather hurricane, tp 0 2 -6)..."
          autoFocus
          className="flex-1 bg-neutral-900 border border-white/15 rounded px-2.5 py-1.5 text-white outline-none focus:border-cyan-400"
        />
        <button type="submit" className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer">
          Run
        </button>
      </form>
    </div>
  );
};
