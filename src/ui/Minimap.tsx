import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.28; // meters -> px
    const px = hud.playerPos.x;
    const pz = hud.playerPos.z;

    ctx.clearRect(0, 0, w, h);

    // Atlantic & Gulf Ocean gradient backdrop matching IMG_8682
    ctx.fillStyle = '#0782a6';
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

    // Mainland with shallow coastal sand halo
    fillPoly(MAINLAND_XZ, '#5d8c52', '#e5cf9b', 4.5);

    // Inland lakes, rivers, swamps
    for (const wb of WATER_XZ) {
      fillPoly(wb.xz, wb.colorHex, '#59b5c9', 1.2);
    }

    // Islands (Starfish, Waxman, Rialto, Vice Beach, Keys, etc.)
    for (const isl of ISLANDS_XZ) {
      fillPoly(isl.xz, isl.colorHex, '#e5cf9b', 1.8);
    }

    // Road Network Edges (Starter + Official State Highways)
    const net = runtime.world.roadNetwork;
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
      ctx.strokeStyle =
        edge.roadType === 'rail'
          ? '#06b6d4'
          : edge.closed
          ? '#ef4444'
          : edge.roadType === 'highway'
          ? '#cbd5e1'
          : '#94a3b8';
      ctx.lineWidth = edge.roadType === 'highway' ? 3.2 : 2.0;
      ctx.stroke();
    }

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
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.6;
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
      ctx.fillStyle = '#facc15';
      ctx.fillRect(tx - 3.5, ty - 3.5, 7, 7);
    }

    // Police markers when wanted
    if (hud.wantedStars > 0) {
      for (const u of runtime.police.units) {
        const [ux, uy] = toMap(u.position.x, u.position.z);
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(ux, uy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Player Direction Arrow at center
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (!rotate) ctx.rotate(hud.playerYaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [runtime, hud, rotate]);

  // Determine nearest verified place label
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
    <div className="relative w-52 sm:w-60 bg-neutral-950/90 border border-white/20 rounded-lg overflow-hidden shadow-lg pointer-events-auto">
      <canvas
        ref={canvasRef}
        width={240}
        height={146}
        onClick={onOpenWorldMap}
        title="Click to open Full Leonida Map"
        className="w-full h-32 block cursor-pointer"
      />
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-neutral-900/95 border-t border-white/10 text-[11px] text-neutral-200">
        <span className="truncate font-medium">{nearestName}</span>
        <div className="flex items-center gap-2 shrink-0">
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
