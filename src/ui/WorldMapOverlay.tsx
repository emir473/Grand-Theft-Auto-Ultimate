import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Layers, MapPin, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { GameRuntime, HudSnapshot } from '../core/gameRuntime';
import {
  LEONIDA_COUNTIES,
  LEONIDA_ISLANDS,
  LEONIDA_MAINLAND_POLYGON,
  LEONIDA_WATER_BODIES,
  posterUVToWorld,
} from '../world/leonidaGeoData';
import { getVerifiedPlacesWithWorldCoords, LEONIDA_PLACES } from '../world/leonidaPlaces';

interface WorldMapOverlayProps {
  runtime: GameRuntime;
  hud: HudSnapshot;
  onClose: () => void;
  onRefreshHud: () => void;
}

const MAINLAND_XZ = LEONIDA_MAINLAND_POLYGON.map((p) => posterUVToWorld(p.u, p.v));
const ISLANDS_XZ = LEONIDA_ISLANDS.map((isl) => ({
  ...isl,
  xz: isl.points.map((p) => posterUVToWorld(p.u, p.v)),
}));
const WATER_XZ = LEONIDA_WATER_BODIES.map((w) => ({
  ...w,
  xz: w.points.map((p) => posterUVToWorld(p.u, p.v)),
}));
const COUNTIES_XZ = LEONIDA_COUNTIES.map((c) => ({
  ...c,
  xz: c.points.map((p) => posterUVToWorld(p.u, p.v)),
}));

export const WorldMapOverlay: React.FC<WorldMapOverlayProps> = ({
  runtime,
  hud,
  onClose,
  onRefreshHud,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(0.32);
  const [pan, setPan] = useState<{ x: number; z: number }>({
    x: hud.playerPos.x,
    z: hud.playerPos.z,
  });
  const [search, setSearch] = useState('');
  const [showCounties, setShowCounties] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showUnverified, setShowUnverified] = useState(false);

  const dragging = useRef<{ active: boolean; lastX: number; lastY: number; moved: boolean }>({
    active: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

  const verifiedPlaces = useMemo(() => getVerifiedPlacesWithWorldCoords(), []);
  const unverifiedPlaces = useMemo(
    () => LEONIDA_PLACES.filter((p) => p.status === 'UNVERIFIED_POSITION_UNKNOWN'),
    []
  );
  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return verifiedPlaces;
    return verifiedPlaces.filter(
      (p) =>
        p.canonicalName.toLowerCase().includes(q) ||
        p.county?.toLowerCase().includes(q) ||
        p.legacyAliases?.some((a) => a.toLowerCase().includes(q))
    );
  }, [search, verifiedPlaces]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const toScreen = (wx: number, wz: number): [number, number] => [
      w / 2 + (wx - pan.x) * zoom,
      h / 2 - (wz - pan.z) * zoom,
    ];

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#097394');
    grad.addColorStop(0.5, '#0b93b8');
    grad.addColorStop(1, '#066d8c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle cartographic grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let gx = -1600; gx <= 600; gx += 200) {
      const [sx] = toScreen(gx, 0);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let gz = -1400; gz <= 1400; gz += 200) {
      const [, sy] = toScreen(0, gz);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }

    const drawPoly = (pts: Array<{ x: number; z: number }>, fill: string, stroke?: string, lw = 2) => {
      if (pts.length < 3) return;
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const [sx, sy] = toScreen(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };

    // Shallow turquoise coast halo + Mainland
    drawPoly(MAINLAND_XZ, '#5f8f53', '#ead49d', 6);

    if (showCounties) {
      for (const c of COUNTIES_XZ) {
        drawPoly(c.xz, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.22)', 1.2);
      }
    }

    for (const wb of WATER_XZ) {
      drawPoly(wb.xz, wb.colorHex, '#63c5d8', 1.8);
    }
    for (const isl of ISLANDS_XZ) {
      drawPoly(isl.xz, isl.colorHex, '#ead49d', 2.4);
    }

    // Road Network
    const net = runtime.world.roadNetwork;
    if (showRoads) {
      for (const edge of net.edges) {
        if (edge.id.endsWith('_rev')) continue;
        const a = net.nodes.get(edge.from);
        const b = net.nodes.get(edge.to);
        if (!a || !b) continue;
        const [ax, ay] = toScreen(a.x, a.z);
        const [bx, by] = toScreen(b.x, b.z);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle =
          edge.roadType === 'rail' ? '#22d3ee' : edge.closed ? '#ef4444' : edge.roadType === 'highway' ? '#f8fafc' : '#cbd5e1';
        ctx.lineWidth = edge.roadType === 'highway' ? Math.max(2.2, zoom * 10) : Math.max(1.4, zoom * 6);
        ctx.stroke();
      }
    }

    // Active GPS route
    const dest = runtime.registry.state.gpsDestination;
    if (dest) {
      const route = net.findRoute(hud.playerPos, dest);
      if (route.found && route.nodes.length > 1) {
        ctx.beginPath();
        route.nodes.forEach((n, idx) => {
          const [rx, ry] = toScreen(n.x, n.z);
          if (idx === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        });
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      const [dx, dy] = toScreen(dest.x, dest.z);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Canonical Place Labels
    if (showLabels) {
      ctx.textAlign = 'center';
      for (const p of filteredPlaces) {
        if (p.category === 'district' && zoom < 0.36) continue;
        if (p.category === 'county' && !showCounties) continue;
        const [sx, sy] = toScreen(p.x, p.z);
        if (sx < -40 || sx > w + 40 || sy < -20 || sy > h + 20) continue;

        ctx.font =
          p.category === 'county' || p.category === 'city'
            ? 'bold 12px "Chakra Petch", sans-serif'
            : '600 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillText(p.canonicalName.toUpperCase(), sx + 1, sy + 1);
        ctx.fillStyle =
          p.category === 'county'
            ? '#e2e8f0'
            : p.category === 'airport' || p.category === 'port'
            ? '#7dd3fc'
            : p.category === 'water'
            ? '#bae6fd'
            : '#fef08a';
        ctx.fillText(p.canonicalName.toUpperCase(), sx, sy);
      }
    }

    // Player Marker
    const [px, py] = toScreen(hud.playerPos.x, hud.playerPos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hud.playerYaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [runtime, hud, pan, zoom, showCounties, showRoads, showLabels, filteredPlaces]);

  const setGpsAtWorld = (x: number, z: number, label: string) => {
    runtime.registry.state.gpsDestination = {
      x,
      y: runtime.world.getTerrainHeight(x, z),
      z,
      label,
    };
    onRefreshHud();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex flex-col text-neutral-100">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-900 border-b border-white/15">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold tracking-wide text-amber-300">
            THE GREAT STATE OF LEONIDA — OFFICIAL MAP
          </h2>
          <span className="text-xs text-neutral-400">Click anywhere to set GPS route</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search place or county..."
              className="bg-neutral-800 border border-white/15 rounded-md pl-8 pr-3 py-1 text-xs w-48 outline-none focus:border-amber-400"
            />
          </div>
          <button type="button" onClick={() => setShowCounties((v) => !v)} className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${showCounties ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-neutral-800 border-white/10'}`}>Counties</button>
          <button type="button" onClick={() => setShowRoads((v) => !v)} className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${showRoads ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-neutral-800 border-white/10'}`}>Roads</button>
          <button type="button" onClick={() => setShowLabels((v) => !v)} className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${showLabels ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-neutral-800 border-white/10'}`}>Labels</button>
          <button type="button" onClick={() => setShowUnverified((v) => !v)} className="px-2.5 py-1 rounded text-xs border bg-neutral-800 border-white/10 flex items-center gap-1 cursor-pointer">
            <Layers className="w-3.5 h-3.5" /> Unverified ({unverifiedPlaces.length})
          </button>
          <button type="button" onClick={onClose} className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-white/15 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Map Body */}
      <div className="flex-1 relative flex overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1100}
          height={720}
          className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.max(0.16, Math.min(2.2, z * (e.deltaY < 0 ? 1.15 : 0.87))));
          }}
          onPointerDown={(e) => {
            dragging.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
          }}
          onPointerMove={(e) => {
            if (!dragging.current.active) return;
            const dx = e.clientX - dragging.current.lastX;
            const dy = e.clientY - dragging.current.lastY;
            if (Math.hypot(dx, dy) > 3) dragging.current.moved = true;
            dragging.current.lastX = e.clientX;
            dragging.current.lastY = e.clientY;
            setPan((p) => ({ x: p.x - dx / zoom, z: p.z + dy / zoom }));
          }}
          onPointerUp={(e) => {
            const wasClick = dragging.current.active && !dragging.current.moved;
            dragging.current.active = false;
            if (wasClick && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const sx = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
              const sy = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
              const wx = pan.x + (sx - canvasRef.current.width / 2) / zoom;
              const wz = pan.z - (sy - canvasRef.current.height / 2) / zoom;
              setGpsAtWorld(wx, wz, 'Custom GPS Waypoint');
            }
          }}
        />

        {/* Quick Controls & Verified Places Sidebar */}
        <div className="w-64 bg-neutral-900/95 border-l border-white/15 p-3 overflow-y-auto hidden md:flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setZoom((z) => Math.min(2.2, z * 1.25))} className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded flex items-center justify-center gap-1 cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /> Zoom +</button>
            <button type="button" onClick={() => setZoom((z) => Math.max(0.16, z * 0.8))} className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded flex items-center justify-center gap-1 cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /> Zoom -</button>
            <button type="button" onClick={() => setPan({ x: hud.playerPos.x, z: hud.playerPos.z })} title="Center on Player" className="p-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 rounded cursor-pointer"><Crosshair className="w-3.5 h-3.5 text-cyan-300" /></button>
          </div>

          {showUnverified ? (
            <div className="space-y-1.5">
              <div className="font-semibold text-amber-300">Unverified Landmarks (Position Unknown)</div>
              {unverifiedPlaces.map((u) => (
                <div key={u.id} className="p-2 rounded bg-neutral-800/80 border border-white/10">
                  <div className="font-medium text-neutral-200">{u.canonicalName}</div>
                  <div className="text-[10px] text-neutral-400">{u.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-semibold text-neutral-300">Verified Map Anchors ({filteredPlaces.length})</div>
              {filteredPlaces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPan({ x: p.x, z: p.z });
                    setGpsAtWorld(p.x, p.z, p.canonicalName);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate font-medium">{p.canonicalName}</span>
                  <span className="text-[10px] text-cyan-300 flex items-center gap-0.5 shrink-0"><MapPin className="w-3 h-3" />{p.gridCell}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
