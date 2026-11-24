import React, { useState } from 'react';
import type { GameRuntime } from '../core/gameRuntime';
import { formatMoney } from '../core/types';
import { HackingMinigame } from './HackingMinigame';

export type PhoneAppId =
  | 'home'
  | 'taxi'
  | 'mechanic'
  | 'stocks'
  | 'properties'
  | 'hack'
  | 'emergency'
  | 'social'
  | 'radio';

interface PhoneAppsProps {
  runtime: GameRuntime;
  activeApp: PhoneAppId;
  onRefresh: () => void;
}

const TAXI_DESTINATIONS = [
  { label: 'Star Island Villa', pos: { x: 0, y: 1, z: -26 } },
  { label: 'Ocean Drive & Club Malibu', pos: { x: 165, y: 0.6, z: 95 } },
  { label: 'Banco de Leonida (Downtown)', pos: { x: -140, y: 0.6, z: 95 } },
  { label: 'Vice City International Airport', pos: { x: -240, y: 0.6, z: -290 } },
  { label: 'Vice City General Hospital', pos: { x: -140, y: 0.6, z: -155 } },
];

const RADIO_STATIONS = [
  { name: 'Wave 103.5 Vice', genre: 'Synthwave & Coastal Pop', track: 'Sunset Over Star Island — Neon Palms' },
  { name: 'Radio Espantoso', genre: 'Latin & Vice Salsa', track: 'Noche en Calle Ocho — Orquesta Leonida' },
  { name: 'V-Rock Leonida', genre: 'Classic Rock', track: 'Highway 95 Thunder — Iron Pelicans' },
  { name: 'WCTR Vice News', genre: 'Talk & Live Traffic/Weather', track: 'Live Leonida News Desk' },
];

export const PhoneApps: React.FC<PhoneAppsProps> = ({ runtime, activeApp, onRefresh }) => {
  const [feedback, setFeedback] = useState<string>('');
  const [postText, setPostText] = useState('');
  const [stationIdx, setStationIdx] = useState(0);
  const char = runtime.registry.getActiveCharacter();

  if (activeApp === 'taxi') {
    const ride = runtime.crowd.taxiRide;
    return (
      <div className="space-y-3 text-xs">
        <h3 className="font-display text-sm font-bold text-amber-400">Downtown Cab Co.</h3>
        {!ride ? (
          <button
            type="button"
            onClick={() => {
              const res = runtime.crowd.requestTaxi();
              setFeedback(res.ok ? 'Taxi dispatched via A* road network!' : res.error ?? 'Dispatch failed');
              onRefresh();
            }}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold cursor-pointer"
          >
            Request Nearby Taxi
          </button>
        ) : (
          <div className="space-y-2 bg-neutral-900 p-2.5 rounded-lg border border-white/10">
            <div className="flex justify-between">
              <span className="text-neutral-400">Status</span>
              <span className="font-semibold text-amber-300 uppercase">{ride.status}</span>
            </div>
            {(ride.status === 'arrived' || ride.status === 'boarding') && (
              <div className="space-y-1.5 pt-1">
                <div className="text-neutral-300 font-medium">Select Destination:</div>
                {TAXI_DESTINATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      const res = runtime.crowd.selectTaxiDestination(d.pos);
                      setFeedback(res.ok ? `Route locked (${formatMoney(res.fareCents ?? 0)})` : res.error ?? 'Invalid route');
                      onRefresh();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-100 cursor-pointer"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {ride.status === 'en_route' && (
                <>
                  <button
                    type="button"
                    onClick={() => runtime.crowd.skipOrCancelTaxi('speedup')}
                    className="flex-1 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                  >
                    Hurry
                  </button>
                  <button
                    type="button"
                    onClick={() => { runtime.crowd.skipOrCancelTaxi('skip'); onRefresh(); }}
                    className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                  >
                    Skip Ride
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { runtime.crowd.skipOrCancelTaxi('cancel'); onRefresh(); }}
                className="flex-1 py-1.5 rounded bg-red-600/80 hover:bg-red-500 text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {feedback && <div className="text-sky-300">{feedback}</div>}
      </div>
    );
  }

  if (activeApp === 'mechanic') {
    const owned = Array.from(runtime.registry.state.vehicles.values()).filter((v) => v.ownerCharacter === char.id);
    return (
      <div className="space-y-2.5 text-xs">
        <h3 className="font-display text-sm font-bold text-orange-400">Mechanic · Vehicle Delivery</h3>
        {owned.map((v) => (
          <div key={v.id} className="bg-neutral-900 p-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-white">{v.name}</div>
              <div className="text-neutral-400 font-mono-tabular">{v.plate} · {v.vehicleClass}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = runtime.economy.deliverOwnedVehicle(v.id);
                setFeedback(res.ok ? `${v.name} delivered to nearest road!` : res.error ?? 'Failed');
                onRefresh();
              }}
              className="px-2.5 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-neutral-950 font-semibold cursor-pointer"
            >
              Deliver
            </button>
          </div>
        ))}
        {feedback && <div className="text-emerald-300">{feedback}</div>}
      </div>
    );
  }

  if (activeApp === 'stocks') {
    const holdings = runtime.registry.state.holdings[char.id];
    return (
      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-sm font-bold text-emerald-400">LCN / BAWSAQ</h3>
          <span className="font-mono-tabular text-sky-300">Bank: {formatMoney(char.bankCents)}</span>
        </div>
        {runtime.registry.state.stocks.map((st) => {
          const held = holdings.find((h) => h.symbol === st.symbol)?.shares ?? 0;
          const diff = st.priceCents - st.prevPriceCents;
          return (
            <div key={st.symbol} className="bg-neutral-900 p-2 rounded-lg border border-white/10">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{st.symbol} · {st.exchange}</span>
                <span className={`font-mono-tabular font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMoney(st.priceCents)} ({diff >= 0 ? '+' : ''}{Math.round((diff / st.prevPriceCents) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-neutral-400">Held: {held}</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const r = runtime.economy.buyStock(st.symbol, 1);
                      setFeedback(r.ok ? `Bought 1 ${st.symbol}` : r.error ?? 'Error');
                      onRefresh();
                    }}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    Buy 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const r = runtime.economy.sellStock(st.symbol, 1);
                      setFeedback(r.ok ? `Sold 1 ${st.symbol}` : r.error ?? 'Error');
                      onRefresh();
                    }}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  >
                    Sell 1
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {feedback && <div className="text-amber-300">{feedback}</div>}
      </div>
    );
  }

  if (activeApp === 'properties') {
    const props = Array.from(runtime.registry.state.properties.values());
    return (
      <div className="space-y-2.5 text-xs">
        <h3 className="font-display text-sm font-bold text-purple-400">Dynasty 8 Leonida</h3>
        {props.map((p) => (
          <div key={p.id} className="bg-neutral-900 p-2.5 rounded-lg border border-white/10">
            <div className="flex justify-between">
              <span className="font-semibold text-white">{p.nameKey}</span>
              <span className="font-mono-tabular text-amber-300">{p.priceCents === 0 ? 'Starter' : formatMoney(p.priceCents)}</span>
            </div>
            <div className="text-neutral-400 mt-0.5">{p.district} · Garage: {p.garageCapacity} slots</div>
            <div className="mt-2 flex gap-2">
              {p.ownedBy ? (
                <span className="text-emerald-400 font-semibold">Owned by {p.ownedBy.toUpperCase()}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const res = runtime.economy.purchaseProperty(p.id);
                    setFeedback(res.ok ? `Purchased ${p.nameKey}!` : res.error ?? 'Purchase failed');
                    onRefresh();
                  }}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium cursor-pointer"
                >
                  Buy Property
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  runtime.registry.state.gpsDestination = { ...p.position, label: p.nameKey };
                  setFeedback(`GPS set to ${p.nameKey}`);
                }}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                GPS
              </button>
            </div>
          </div>
        ))}
        {feedback && <div className="text-emerald-300">{feedback}</div>}
      </div>
    );
  }

  if (activeApp === 'hack') {
    return (
      <HackingMinigame
        runtime={runtime}
        difficulty="standard"
        onResult={(ok, reward) => {
          setFeedback(ok ? `Hack Succeeded! +${formatMoney(reward)}` : 'Hack Failed! Police alerted.');
          onRefresh();
        }}
      />
    );
  }

  if (activeApp === 'emergency') {
    const d = runtime.economy.last911Dispatch;
    return (
      <div className="space-y-3 text-xs">
        <h3 className="font-display text-sm font-bold text-red-400">Leonida 911 Dispatch</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['police', 'ambulance', 'fire'] as const).map((svc) => (
            <button
              key={svc}
              type="button"
              onClick={() => {
                runtime.economy.call911(svc);
                onRefresh();
              }}
              className="py-2 rounded bg-red-600/85 hover:bg-red-500 text-white font-semibold capitalize cursor-pointer"
            >
              {svc}
            </button>
          ))}
        </div>
        {d && (
          <div className="bg-neutral-900 p-2.5 rounded border border-white/10">
            <div className="font-semibold text-white uppercase">{d.service} · {d.status}</div>
            <div className="text-neutral-300 mt-1">{d.message}</div>
          </div>
        )}
      </div>
    );
  }

  if (activeApp === 'social') {
    return (
      <div className="space-y-2.5 text-xs">
        <h3 className="font-display text-sm font-bold text-pink-400">Leonida Social Feed</h3>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Share Vice City clip..."
            className="flex-1 bg-neutral-900 border border-white/15 rounded px-2 py-1 text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (!postText.trim()) return;
              const post = {
                id: `clip_player_${Date.now()}`,
                authorName: `@${char.id}_leonida`,
                isNpc: false,
                caption: postText.trim(),
                eventTag: 'player_clip',
                likes: 12,
                reach: 180,
                timestampGameSec: runtime.registry.clock.gameTime,
                location: { ...char.position },
              };
              runtime.registry.state.socialFeed.unshift(post);
              runtime.registry.events.emit('social:clipPublished', { post });
              setPostText('');
              onRefresh();
            }}
            className="px-2.5 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white font-semibold cursor-pointer"
          >
            Post
          </button>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {runtime.registry.state.socialFeed.slice(0, 12).map((post) => (
            <div key={post.id} className="bg-neutral-900 p-2 rounded border border-white/10">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span className="font-semibold text-pink-300">{post.authorName}</span>
                <span className="font-mono-tabular">{post.likes} likes · {post.reach} reach</span>
              </div>
              <div className="text-neutral-200 mt-1">{post.caption}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Radio & News
  const st = RADIO_STATIONS[stationIdx];
  return (
    <div className="space-y-3 text-xs">
      <h3 className="font-display text-sm font-bold text-cyan-400">Vice Radio &amp; Live News</h3>
      <div className="bg-neutral-900 p-3 rounded-lg border border-white/10">
        <div className="text-sm font-bold text-white">{st.name}</div>
        <div className="text-neutral-400">{st.genre}</div>
        <div className="text-amber-300 mt-2 font-medium">{st.track}</div>
        <div className="text-neutral-300 mt-2 pt-2 border-t border-white/10">
          News: Weather is currently <span className="capitalize font-semibold">{runtime.registry.state.weather}</span>.
          {runtime.registry.state.wantedStars > 0
            ? ' VCPD active pursuit reported in Vice City.'
            : ' VCIA flights operating on 10-minute schedule.'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {RADIO_STATIONS.map((s, idx) => (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              setStationIdx(idx);
              runtime.audio.currentStation = s.name;
            }}
            className={`px-2 py-1.5 rounded text-left cursor-pointer ${
              idx === stationIdx ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};
