/**
 * Missions, Nightlife, Activities (Darts, Pool, Poker, Arm Wrestling, Fishing, Hunting),
 * Robberies/Hostages, Tuning Shop, and Wardrobe Management.
 */

import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { MissionState, VehicleTuning } from '../core/types';
import { clamp } from '../core/types';
import type { VehiclePhysicsSystem } from './vehiclePhysics';
import type { PlayerController } from './playerController';

export interface ActivityResult {
  activity: string;
  won: boolean;
  payoutCents: number;
  summary: string;
}

export class ActivitiesMissionsSystem implements GameModule {
  public readonly moduleId = 'activities_missions';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private vehicles!: VehiclePhysicsSystem;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.vehicles = registry.getModule<VehiclePhysicsSystem>('fahrzeug_physik');
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    const mMap = this.registry.state.missions;
    if (mMap.size === 0) {
      const defaults: MissionState[] = [
        {
          id: 'mission_vice_welcome',
          titleKey: 'Vice Welcome: Ocean Drive Run',
          descriptionKey: 'Drive from Star Island Villa to Ocean Drive & Club Malibu.',
          status: 'available',
          stageIndex: 0,
          targetPosition: { x: 165, y: 1, z: 95 },
          rewardCents: 250000, // $2,500
        },
        {
          id: 'mission_banco_heist',
          titleKey: 'Banco de Leonida Score',
          descriptionKey: 'Infiltrate Banco de Leonida, hack the vault terminal, and escape police.',
          status: 'available',
          stageIndex: 0,
          targetPosition: { x: -155, y: 1, z: 95 },
          rewardCents: 2500000, // $25,000
        },
        {
          id: 'mission_deep_salvage',
          titleKey: 'Smuggler Wreck Recovery',
          descriptionKey: 'Dive off Star Island coast and recover the sunken smuggler yacht crate.',
          status: 'available',
          stageIndex: 0,
          targetPosition: { x: 82, y: -5.5, z: 45 },
          rewardCents: 400000, // $4,000
        },
      ];
      for (const m of defaults) mMap.set(m.id, m);
    }
    this.readiness = 'initialized';
  }

  startMission(missionId: string): boolean {
    const m = this.registry.state.missions.get(missionId);
    if (!m || m.status === 'completed') return false;
    m.status = 'active';
    m.stageIndex = 1;
    if (m.id === 'mission_vice_welcome') {
      m.targetPosition = { x: 175, y: 1, z: -20 };
      m.descriptionKey = 'Stage 1/2: Cruise Ocean Drive to Vice Beach Hotel.';
    } else if (m.id === 'mission_banco_heist') {
      m.targetPosition = { x: -155, y: 1, z: 95 };
      m.descriptionKey = 'Stage 1/2: Approach Banco de Leonida main entrance.';
    }
    if (m.targetPosition) {
      this.registry.state.gpsDestination = {
        ...m.targetPosition,
        label: m.titleKey,
      };
    }
    this.registry.events.emit('mission:started', { missionId });
    return true;
  }

  failMission(missionId: string, reason = 'Target lost or interrupted'): boolean {
    const m = this.registry.state.missions.get(missionId);
    if (!m || m.status !== 'active') return false;
    m.status = 'failed';
    m.descriptionKey = `Failed: ${reason}`;
    return true;
  }

  retryMission(missionId: string): boolean {
    const m = this.registry.state.missions.get(missionId);
    if (!m || (m.status !== 'failed' && m.status !== 'active')) return false;
    return this.startMission(missionId);
  }

  completeMission(missionId: string): boolean {
    const m = this.registry.state.missions.get(missionId);
    if (!m || m.status === 'completed') return false;
    m.status = 'completed';
    const char = this.registry.getActiveCharacter();
    char.cashCents += m.rewardCents;
    this.registry.state.trustSynergy = clamp(this.registry.state.trustSynergy + 4, 0, 100);

    this.registry.events.emit('mission:completed', { missionId, rewardCents: m.rewardCents });
    this.registry.events.emit('economy:transactionCompleted', {
      record: {
        id: `tx_mission_${Date.now()}`,
        timestampGameSec: this.registry.clock.gameTime,
        characterId: char.id,
        account: 'cash',
        amountCents: m.rewardCents,
        balanceAfterCents: char.cashCents,
        trigger: 'mission_reward',
        description: `Completed ${m.titleKey}`,
      },
    });
    return true;
  }

  resolveMiniActivity(
    kind: 'darts' | 'pool' | 'poker' | 'arm_wrestling' | 'fishing' | 'hunting',
    playerScore: number
  ): ActivityResult {
    const char = this.registry.getActiveCharacter();
    let won = false;
    let payoutCents = 0;
    let summary = '';

    if (kind === 'darts' || kind === 'pool') {
      won = playerScore >= 60;
      payoutCents = won ? 35000 : 0;
      summary = won ? `Won ${kind} match (+$350)` : `Lost ${kind} match`;
    } else if (kind === 'poker') {
      const stake = 50000;
      if (char.cashCents < stake) {
        return { activity: kind, won: false, payoutCents: 0, summary: 'Need $500 cash buy-in' };
      }
      won = playerScore >= 55;
      payoutCents = won ? 120000 : -stake;
      summary = won ? 'Won Vice Poker pot (+$1,200)' : 'Folded losing hand (-$500)';
    } else if (kind === 'arm_wrestling') {
      const strengthCheck = playerScore + char.fitness.muscleMass * 0.4;
      won = strengthCheck >= 75;
      char.fitness.muscleMass = clamp(char.fitness.muscleMass + 0.4, 0, 100);
      payoutCents = won ? 25000 : 0;
      summary = won ? 'Pinned opponent (+$250, +Muscle)' : 'Outmatched (+Muscle training)';
    } else if (kind === 'fishing' || kind === 'hunting') {
      won = playerScore >= 40;
      payoutCents = won ? (kind === 'fishing' ? 85000 : 110000) : 0;
      summary = won
        ? `Sold ${kind === 'fishing' ? 'Leonida Marlin' : 'Grassrivers Trophy'} (+$${payoutCents / 100})`
        : 'Catch escaped';
    }

    if (payoutCents !== 0) {
      char.cashCents = Math.max(0, char.cashCents + payoutCents);
      this.registry.events.emit('economy:transactionCompleted', {
        record: {
          id: `tx_act_${Date.now()}`,
          timestampGameSec: this.registry.clock.gameTime,
          characterId: char.id,
          account: 'cash',
          amountCents: payoutCents,
          balanceAfterCents: char.cashCents,
          trigger: `activity_${kind}`,
          description: summary,
        },
      });
    }
    return { activity: kind, won, payoutCents, summary };
  }

  purchaseVehicleTuning(
    vehicleId: string,
    patch: Partial<VehicleTuning>,
    priceCents: number
  ): { ok: boolean; reason?: string } {
    const veh = this.registry.state.vehicles.get(vehicleId);
    if (!veh) return { ok: false, reason: 'No vehicle selected' };
    const char = this.registry.getActiveCharacter();
    if (char.cashCents < priceCents) return { ok: false, reason: 'Insufficient cash' };

    char.cashCents -= priceCents;
    veh.tuning = { ...veh.tuning, ...patch };
    this.vehicles.applyTuningChange(vehicleId);

    this.registry.events.emit('economy:transactionCompleted', {
      record: {
        id: `tx_tune_${Date.now()}`,
        timestampGameSec: this.registry.clock.gameTime,
        characterId: char.id,
        account: 'cash',
        amountCents: -priceCents,
        balanceAfterCents: char.cashCents,
        trigger: 'vehicle_tuning',
        description: `Tuned ${veh.name}`,
      },
    });
    return { ok: true };
  }

  updateWardrobe(outfitId: string, colorHex: string, priceCents = 0): { ok: boolean; reason?: string } {
    const char = this.registry.getActiveCharacter();
    if (priceCents > 0 && char.cashCents < priceCents) {
      return { ok: false, reason: 'Insufficient cash' };
    }
    char.cashCents -= priceCents;
    char.wardrobe.outfitId = outfitId;
    const playerMod = this.registry.getModule<PlayerController>('spieler_steuerung');
    const rig = playerMod.rigs[char.id];
    if (rig) {
      const c = /^#([0-9a-f]{6})$/i.exec(colorHex);
      if (c) {
        const n = parseInt(c[1], 16);
        rig.jacketMat.albedoColor.set(
          ((n >> 16) & 255) / 255,
          ((n >> 8) & 255) / 255,
          (n & 255) / 255
        );
      }
    }
    return { ok: true };
  }

  start(): void {
    this.readiness = 'running';
  }

  update(): void {
    const char = this.registry.getActiveCharacter();
    for (const m of this.registry.state.missions.values()) {
      if (m.status !== 'active' || !m.targetPosition) continue;
      if (this.registry.state.gameOverState !== 'none') {
        this.failMission(m.id, 'Protagonist incapacitated');
        continue;
      }
      const d = Math.hypot(char.position.x - m.targetPosition.x, char.position.z - m.targetPosition.z);
      if (d < 8) {
        if (m.id === 'mission_vice_welcome' && m.stageIndex === 1) {
          m.stageIndex = 2;
          m.targetPosition = { x: 165, y: 1, z: 95 };
          m.descriptionKey = 'Stage 2/2: Meet at Club Malibu Vice Beach.';
          this.registry.state.gpsDestination = { ...m.targetPosition, label: `${m.titleKey} (2/2)` };
        } else if (m.id === 'mission_banco_heist' && m.stageIndex === 1) {
          m.stageIndex = 2;
          m.targetPosition = { x: 0, y: 1, z: -6 };
          m.descriptionKey = 'Stage 2/2: Return stolen bonds to Star Island Villa!';
          this.registry.state.wantedStars = Math.max(this.registry.state.wantedStars, 2);
          this.registry.state.gpsDestination = { ...m.targetPosition, label: `${m.titleKey} (Escape)` };
        } else {
          this.completeMission(m.id);
        }
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.readiness = 'disposed';
  }
}
