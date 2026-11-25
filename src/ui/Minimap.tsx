import React, { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import type { GameRuntime, HudSnapshot } from '../core/gameRuntime';
import {
  LEONIDA_ISLANDS,
  LEONIDA_MAINLAND_POLYGON,
  LEONIDA_WATER_BODIES,
  posterUVToWorld,
} from '../world/leonidaGeoData';
import { getVerifiedPlacesWithWorldCoords } from '../world/leonidaPlaces';

interface MinimapProps {
  runtime: GameRuntime;
  hud: HudSnapshot;
  rotate: boolean;
  onToggleRotate: () => void;
  onOpenWorldMap?: () => void;
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
const VERIFIED_PLACES = getVerifiedPlacesWithWorldCoords();

export const Minimap: React.FC<MinimapProps> = ({
  runtime,
  hud,
  rotate,
  onToggleRotate,
  onOpenWorldMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // IMG_8170 light-toned street map style vs full-color satellite poster mode
  const [mapStyle, setMapStyle] = useState<'street' | 'sat'>('street');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.28;
    const px = hud.playerPos.x;
    const pz = hud.playerPos.z;
    const isStreet = mapStyle === 'street';

    ctx.clearRect(0, 0, w, h);

    // Water backdrop: pale aqua (IMG_8170 street mode) vs deep Leonida ocean (IMG_8682 sat)
    ctx.fillStyle = isStreet ? '#a4d4e6' : '#0782a6';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (rotate) {
      ctx.rotate(hud.playerYaw);
    }

    const toMap = (wx: number, wz: number): [number, number] => [
      (wx - px) * scale,
      -(wz - pz) * scale,
    ];

    const fillPoly = (pts: Array<{ x: number; z: number }>, fill: string, stroke?: string, lineWidth = 1) => {
      if (pts.length < 3) return;
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const [mx, my] = toMap(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // Mainland fill & coastal shoreline
    fillPoly(MAINLAND_XZ, isStreet ? '#e6e3dc' : '#5d8c52', isStreet ? '#d5d0c5' : '#e5cf9b', 4.5);

    // Inland lakes, rivers, swamps & parks
    for (const wb of WATER_XZ) {
      const fillCol = isStreet
        ? wb.kind === 'swamp'
          ? '#cbe0c4'
          : '#a4d4e6'
        : wb.colorHex;
      fillPoly(wb.xz, fillCol, isStreet ? '#8ac2d8' : '#59b5c9', 1.2);
    }

    // Islands (Starfish, Waxman, Rialto, Vice Beach, Keys, Leaf Links)
    for (const isl of ISLANDS_XZ) {
      const fillCol = isStreet
        ? isl.id === 'isl_leaf_links'
          ? '#c7e2be'
          : '#ebe8e1'
        : isl.colorHex;
      fillPoly(isl.xz, fillCol, isStreet ? '#d5d0c5' : '#e5cf9b', 1.8);
    }

    // Road Network Edges (Double-pass crisp outlined white streets in STREET mode matching IMG_8170)
    const net = runtime.world.roadNetwork;
    const drawRoadsPass = (casing: boolean) => {
      for (const edge of net.edges) {
        if (edge.id.endsWith('_rev')) continue;
        const a = net.nodes.get(edge.from);
        const b = net.nodes.get(edge.to);
        if (!a || !b) continue;
        const [ax, ay] = toMap(a.x, a.z);
        const [bx, by] = toMap(b.x, b.z);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        if (casing) {
          ctx.strokeStyle = isStreet ? '#b8b4aa' : '#334155';
          ctx.lineWidth = (edge.roadType === 'highway' ? 4.8 : 3.2);
        } else {
          ctx.strokeStyle =
            edge.roadType === 'rail'
              ? '#06b6d4'
              : edge.closed
              ? '#ef4444'
              : isStreet
              ? '#ffffff'
              : edge.roadType === 'highway'
              ? '#cbd5e1'
              : '#94a3b8';
          ctx.lineWidth = edge.roadType === 'highway' ? 3.2 : 2.0;
        }
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };
    drawRoadsPass(true);
    drawRoadsPass(false);

    // GPS Route
    const dest = runtime.registry.state.gpsDestination;
    if (dest) {
      const route = net.findRoute(hud.playerPos, dest);
      if (route.found && route.nodes.length > 1) {
        ctx.beginPath();
        route.nodes.forEach((n, idx) => {
          const [rx, ry] = toMap(n.x, n.z);
          if (idx === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        });
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.8;
        ctx.stroke();
      }
      const [dx, dy] = toMap(dest.x, dest.z);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active Taxi marker
    const taxi = runtime.crowd.taxiRide;
    if (taxi) {
      const [tx, ty] = toMap(taxi.position.x, taxi.position.z);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(tx - 3.5, ty - 3.5, 7, 7);
    }

    // Police markers when wanted
    if (hud.wantedStars > 0) {
      for (const u of runtime.police.units) {
        const [ux, uy] = toMap(u.position.x, u.position.z);
        ctx.fillStyle = u.kind === 'helicopter' ? '#ef4444' : '#2563eb';
        ctx.beginPath();
        ctx.arc(ux, uy, u.kind === 'helicopter' ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Player Direction Arrow at center
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (!rotate) ctx.rotate(hud.playerYaw);
    ctx.fillStyle = isStreet ? '#111827' : '#ffffff';
    ctx.strokeStyle = isStreet ? '#ffffff' : '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [runtime, hud, rotate, mapStyle]);

  let nearestName = 'Leonida';
  let nearestDist = Infinity;
  for (const p of VERIFIED_PLACES) {
    if (p.category === 'county') continue;
    const d = Math.hypot(hud.playerPos.x - p.x, hud.playerPos.z - p.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearestName = p.canonicalName;
    }
  }

  return (
    <div className="relative w-52 sm:w-60 bg-neutral-950/90 border border-white/25 rounded-lg overflow-hidden shadow-lg pointer-events-auto">
      <canvas
        ref={canvasRef}
        width={240}
        height={146}
        onClick={onOpenWorldMap}
        title="Click to open Full Leonida Map"
        className="w-full h-32 block cursor-pointer"
      />
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 bg-neutral-900/95 border-t border-white/10 text-[11px] text-neutral-200">
        <span className="truncate font-medium">{nearestName}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'street' ? 'sat' : 'street'))}
            className="text-sky-300 hover:text-sky-200 font-medium cursor-pointer"
            title="Toggle Street / Satellite Minimap"
          >
            {mapStyle === 'street' ? 'STR' : 'SAT'}
          </button>
          <button
            type="button"
            onClick={onToggleRotate}
            className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
          >
            {rotate ? 'ROT' : 'N-UP'}
          </button>
          {onOpenWorldMap && (
            <button
              type="button"
              onClick={onOpenWorldMap}
              title="Full Leonida Map"
              className="text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
