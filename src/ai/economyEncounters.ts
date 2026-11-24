/**
 * MODULE 12C – Economy, Stocks (LCN/BAWSAQ), ATMs, Properties, 911 Dispatch, Mechanic Delivery & Random Encounters
 */

import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { Vec3 } from '../core/types';
import { clamp } from '../core/types';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import { ATM_POINTS } from '../world/interiors';

export interface RandomEncounter {
  id: string;
  kind: 'street_race' | 'armored_van' | 'street_deal' | 'roadside_help';
  title: string;
  position: Vec3;
  active: boolean;
  resolved: boolean;
  rewardCents: number;
}

export interface Emergency911Dispatch {
  service: 'police' | 'ambulance' | 'fire';
  status: 'dispatched' | 'unavailable' | 'arrived';
  etaSec: number;
  message: string;
}

export class EconomyEncountersSystem implements GameModule {
  public readonly moduleId = 'economy_encounters';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private world!: WorldArchitecture;
  private vehicles!: VehiclePhysicsSystem;

  private stockTickAccum = 0;
  public encounters: RandomEncounter[] = [];
  public last911Dispatch: Emergency911Dispatch | null = null;
  private unsubEvents: Array<() => void> = [];

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.vehicles = registry.getModule<VehiclePhysicsSystem>('fahrzeug_physik');
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;

    this.encounters = [
      { id: 'enc_race_ocean', kind: 'street_race', title: 'Ocean Drive Midnight Sprint', position: { x: 165, y: 0.6, z: -85 }, active: true, resolved: false, rewardCents: 350000 },
      { id: 'enc_van_dt', kind: 'armored_van', title: 'Gruppe Sechs Security Transport', position: { x: -140, y: 0.6, z: 35 }, active: true, resolved: false, rewardCents: 650000 },
      { id: 'enc_help_star', kind: 'roadside_help', title: 'Stranded Motorist Causeway', position: { x: 105, y: 0.6, z: -28 }, active: true, resolved: false, rewardCents: 75000 },
    ];

    // Connect world events to stock market trends!
    this.unsubEvents.push(
      this.registry.events.on('weapon:fired', () => this.nudgeStock('AMM', 0.004)),
      this.registry.events.on('world:weatherChanged', (ev) => {
        if (ev.to === 'hurricane') this.nudgeStock('VCP', -0.02);
        if (ev.to === 'sunny') this.nudgeStock('VCA', 0.012);
      })
    );
    this.readiness = 'initialized';
  }

  private nudgeStock(symbol: string, deltaBias: number): void {
    const st = this.registry.state.stocks.find((s) => s.symbol === symbol);
    if (st) st.trendBias = clamp(st.trendBias + deltaBias, -0.04, 0.04);
  }

  private recordTransaction(account: 'cash' | 'bank', amountCents: number, trigger: string, description: string): void {
    const char = this.registry.getActiveCharacter();
    const balanceAfterCents = account === 'cash' ? char.cashCents : char.bankCents;
    const rec = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      timestampGameSec: this.registry.clock.gameTime,
      characterId: char.id,
      account,
      amountCents,
      balanceAfterCents,
      trigger,
      description,
    };
    this.registry.state.transactions.push(rec);
    this.registry.events.emit('economy:transactionCompleted', { record: rec });
  }

  isNearATM(): boolean {
    const p = this.registry.getActiveCharacter().position;
    return ATM_POINTS.some((a) => Math.hypot(p.x - a.position.x, p.z - a.position.z) < 4.5);
  }

  atmDeposit(amountCents: number, bypassProximityCheck = false): { ok: boolean; error?: string } {
    const amt = Math.trunc(amountCents);
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'Invalid deposit amount' };
    if (!bypassProximityCheck && !this.isNearATM()) return { ok: false, error: 'Must be near a registered ATM' };

    const char = this.registry.getActiveCharacter();
    if (char.cashCents < amt) return { ok: false, error: 'Insufficient cash' };

    char.cashCents -= amt;
    char.bankCents += amt;
    this.recordTransaction('bank', amt, 'atm_deposit', `ATM Deposit`);
    return { ok: true };
  }

  atmWithdraw(amountCents: number, bypassProximityCheck = false): { ok: boolean; error?: string } {
    const amt = Math.trunc(amountCents);
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'Invalid withdrawal amount' };
    if (!bypassProximityCheck && !this.isNearATM()) return { ok: false, error: 'Must be near a registered ATM' };

    const char = this.registry.getActiveCharacter();
    if (char.bankCents < amt) return { ok: false, error: 'Insufficient bank funds' };

    char.bankCents -= amt;
    char.cashCents += amt;
    this.recordTransaction('bank', -amt, 'atm_withdraw', `ATM Withdrawal`);
    return { ok: true };
  }

  buyStock(symbol: string, shares: number): { ok: boolean; error?: string } {
    const qty = Math.trunc(shares);
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Invalid share quantity' };
    const inst = this.registry.state.stocks.find((s) => s.symbol === symbol);
    if (!inst) return { ok: false, error: 'Unknown ticker' };

    const subtotal = inst.priceCents * qty;
    const fee = Math.max(100, Math.round(subtotal * 0.005));
    const total = subtotal + fee;
    const char = this.registry.getActiveCharacter();
    if (char.bankCents < total) return { ok: false, error: 'Insufficient bank funds (including 0.5% fee)' };

    char.bankCents -= total;
    const list = this.registry.state.holdings[char.id];
    const existing = list.find((h) => h.symbol === symbol);
    if (existing) {
      const totalShares = existing.shares + qty;
      existing.avgCostCents = Math.round((existing.avgCostCents * existing.shares + subtotal) / totalShares);
      existing.shares = totalShares;
    } else {
      list.push({ symbol, shares: qty, avgCostCents: inst.priceCents });
    }
    this.recordTransaction('bank', -total, 'stock_buy', `Bought ${qty} ${symbol}`);
    return { ok: true };
  }

  sellStock(symbol: string, shares: number): { ok: boolean; error?: string } {
    const qty = Math.trunc(shares);
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Invalid share quantity' };
    const inst = this.registry.state.stocks.find((s) => s.symbol === symbol);
    if (!inst) return { ok: false, error: 'Unknown ticker' };

    const char = this.registry.getActiveCharacter();
    const list = this.registry.state.holdings[char.id];
    const holding = list.find((h) => h.symbol === symbol);
    if (!holding || holding.shares < qty) return { ok: false, error: 'Insufficient shares held' };

    const gross = inst.priceCents * qty;
    const fee = Math.max(100, Math.round(gross * 0.005));
    const net = Math.max(0, gross - fee);

    holding.shares -= qty;
    if (holding.shares === 0) {
      const idx = list.indexOf(holding);
      list.splice(idx, 1);
    }
    char.bankCents += net;
    this.recordTransaction('bank', net, 'stock_sell', `Sold ${qty} ${symbol}`);
    return { ok: true };
  }

  purchaseProperty(propertyId: string): { ok: boolean; error?: string } {
    const prop = this.registry.state.properties.get(propertyId);
    if (!prop) return { ok: false, error: 'Property does not exist' };
    if (prop.ownedBy) return { ok: false, error: 'Property already owned' };

    const char = this.registry.getActiveCharacter();
    if (char.bankCents < prop.priceCents) return { ok: false, error: 'Insufficient bank balance' };

    char.bankCents -= prop.priceCents;
    prop.ownedBy = char.id;
    this.recordTransaction('bank', -prop.priceCents, 'property_purchase', `Purchased ${prop.nameKey}`);
    this.registry.events.emit('property:purchased', {
      propertyId,
      buyer: char.id,
      priceCents: prop.priceCents,
    });
    return { ok: true };
  }

  deliverOwnedVehicle(vehicleId: string): { ok: boolean; error?: string } {
    const rt = this.vehicles.runtimes.get(vehicleId);
    const char = this.registry.getActiveCharacter();
    if (!rt) return { ok: false, error: 'Vehicle unavailable' };
    if (rt.data.ownerCharacter !== char.id) return { ok: false, error: 'You do not own this vehicle' };
    if (char.inVehicleId === vehicleId) return { ok: false, error: 'Already driving this vehicle' };

    const roadNode = this.world.roadNetwork.findNearestNode(char.position, ['highway', 'avenue', 'street']);
    if (!roadNode) return { ok: false, error: 'No suitable road nearby for Mechanic delivery' };

    rt.data.position = { x: roadNode.x, y: roadNode.y + 0.1, z: roadNode.z };
    rt.velocity.set(0, 0, 0);
    rt.root.position.set(rt.data.position.x, rt.data.position.y, rt.data.position.z);
    this.vehicles.repairVehicle(vehicleId, 0);
    this.registry.state.gpsDestination = { ...rt.data.position, label: `Delivered: ${rt.data.name}` };
    return { ok: true };
  }

  call911(service: 'police' | 'ambulance' | 'fire'): Emergency911Dispatch {
    if (this.registry.state.weather === 'hurricane' && Math.random() < 0.45) {
      this.last911Dispatch = {
        service,
        status: 'unavailable',
        etaSec: 0,
        message: `All ${service} units delayed due to Category 4 Hurricane emergency.`,
      };
      return this.last911Dispatch;
    }

    const char = this.registry.getActiveCharacter();
    if (service === 'ambulance' && char.health < char.maxHealth) {
      char.health = char.maxHealth;
    }
    this.last911Dispatch = {
      service,
      status: 'dispatched',
      etaSec: 8,
      message: `${service.toUpperCase()} unit dispatched to your Vice City coordinates.`,
    };
    return this.last911Dispatch;
  }

  resolveEncounter(id: string): boolean {
    const enc = this.encounters.find((e) => e.id === id && e.active && !e.resolved);
    if (!enc) return false;
    enc.resolved = true;
    enc.active = false;
    const char = this.registry.getActiveCharacter();
    char.cashCents += enc.rewardCents;
    this.recordTransaction('cash', enc.rewardCents, 'random_encounter', enc.title);
    return true;
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    this.stockTickAccum += simDt;
    if (this.stockTickAccum >= 6.0) {
      this.stockTickAccum = 0;
      for (const st of this.registry.state.stocks) {
        st.prevPriceCents = st.priceCents;
        const pct = st.trendBias + (Math.random() - 0.5) * st.volatility;
        st.priceCents = Math.max(500, Math.round(st.priceCents * (1 + pct)));
        st.trendBias *= 0.85;
        st.historyCents.push(st.priceCents);
        if (st.historyCents.length > 24) st.historyCents.shift();
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const u of this.unsubEvents) u();
    this.readiness = 'disposed';
  }
}
