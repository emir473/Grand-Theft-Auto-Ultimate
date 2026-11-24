import React, { useEffect, useRef } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import type { HudSnapshot } from '../core/gameRuntime';

interface MinimapProps {
  runtime: GameRuntime;
  hud: HudSnapshot;
  rotate: boolean;
  onToggleRotate: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({ runtime, hud, rotate, onToggleRotate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.38; // meters -> px
    const px = hud.playerPos.x;
    const pz = hud.playerPos.z;

    ctx.clearRect(0, 0, w, h);

    // Ocean backdrop
    ctx.fillStyle = '#0c2438';
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

    // Landmass zones
    const drawRectZone = (x1: number, z1: number, x2: number, z2: number, color: string) => {
      const [mx1, my1] = toMap(x1, z2);
      const [mx2, my2] = toMap(x2, z1);
      ctx.fillStyle = color;
      ctx.fillRect(mx1, my1, mx2 - mx1, my2 - my1);
    };
    drawRectZone(-72, -58, 72, 58, '#2d3a2f'); // Star Island
    drawRectZone(130, -230, 255, 265, '#3b372c'); // Vice Beach
    drawRectZone(-455, -445, -90, 270, '#2a2e35'); // Downtown / VCIA / Military
    drawRectZone(-350, 270, -90, 425, '#253324'); // Grassrivers Swamp

    // Road Network Edges
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
      ctx.strokeStyle = edge.roadType === 'rail' ? '#06b6d4' : edge.closed ? '#ef4444' : '#64748b';
      ctx.lineWidth = edge.roadType === 'highway' ? 4 : 2.5;
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
        ctx.lineWidth = 2.5;
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

    // Police markers (only permitted when active/wanted)
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
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [runtime, hud, rotate]);

  return (
    <div className="relative w-48 sm:w-56 bg-neutral-950/85 border border-white/15 rounded-lg overflow-hidden shadow-lg pointer-events-auto">
      <canvas ref={canvasRef} width={224} height={140} className="w-full h-32 block" />
      <div className="flex items-center justify-between px-2.5 py-1 bg-neutral-900/90 border-t border-white/10 text-[11px] text-neutral-300">
        <span className="truncate font-medium">Vice City · Leonida</span>
        <button
          type="button"
          onClick={onToggleRotate}
          className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          {rotate ? 'ROT' : 'N-UP'}
        </button>
      </div>
    </div>
  );
};
