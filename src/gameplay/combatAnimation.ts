/**
 * MODULE 8 – kampf_animation.js
 * State-Based Procedural Animation Blend Tree, Real-Geometry Cover System,
 * Hybrid Ragdoll/Knockout Simulation, Fictional Melee/Block/Dodge/Takedown/Hostage States,
 * Body Carrying & Trunk Stowing, and Cinematic Director/Replay Camera.
 */

import { Ray, Vector3 } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { LocomotionState, Vec3 } from '../core/types';
import { CENTRAL_LIMITS, clamp } from '../core/types';
import type { PlayerController } from './playerController';

export interface ReplayFrame {
  timeSec: number;
  playerPos: Vec3;
  playerYaw: number;
  locomotion: LocomotionState;
  vehiclePos: Vec3 | null;
  vehicleYaw: number;
}

export type MeleePhase = 'none' | 'windup' | 'active' | 'recovery' | 'block' | 'dodge';

export interface RagdollBodyState {
  entityId: string;
  active: boolean;
  velocity: Vec3;
  angularSpin: number;
  timerSec: number;
  knockedOut: boolean;
  carriedByPlayer: boolean;
  stowedInVehicleId: string | null;
}

export class CombatAnimationSystem implements GameModule {
  public readonly moduleId = 'kampf_animation';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private player!: PlayerController;

  private meleePhase: MeleePhase = 'none';
  private meleeTimer = 0;
  private meleeHitIssued = false;
  public inCover = false;
  public coverNormal: Vec3 = { x: 0, y: 0, z: 1 };
  public carriedEntityId: string | null = null;
  public hostageEntityId: string | null = null;

  public ragdolls = new Map<string, RagdollBodyState>();
  private replayBuffer: ReplayFrame[] = [];
  private replayPlayIndex = 0;
  private directorOrbitAngle = 0;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.player = registry.getModule<PlayerController>('spieler_steuerung');
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.readiness = 'initialized';
  }

  triggerMeleeAttack(): boolean {
    if (this.meleePhase !== 'none') return false;
    this.meleePhase = 'windup';
    this.meleeTimer = 0.14;
    this.meleeHitIssued = false;
    return true;
  }

  triggerDodge(): void {
    if (this.meleePhase === 'none') {
      this.meleePhase = 'dodge';
      this.meleeTimer = 0.35;
    }
  }

  toggleCover(pos: Vec3): boolean {
    if (this.inCover) {
      this.inCover = false;
      return false;
    }
    // Raycast-like check against nearby building cover zones (walls / barriers)
    const scene = this.registry.scene;
    if (!scene) return false;
    const dirs = [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ];
    for (const d of dirs) {
      const origin = new Vector3(pos.x, pos.y + 0.9, pos.z);
      const hit = scene.pickWithRay(new Ray(origin, d, 2.2));
      if (hit?.hit && hit.pickedMesh && !hit.pickedMesh.name.startsWith('charRoot')) {
        const norm = hit.getNormal(true);
        this.inCover = true;
        this.coverNormal = norm ? { x: norm.x, y: norm.y, z: norm.z } : { x: -d.x, y: 0, z: -d.z };
        return true;
      }
    }
    return false;
  }

  activateRagdoll(entityId: string, impulse: Vec3, knockedOut = true): void {
    this.ragdolls.set(entityId, {
      entityId,
      active: true,
      velocity: { ...impulse },
      angularSpin: 3.4,
      timerSec: knockedOut ? 14 : 2.5,
      knockedOut,
      carriedByPlayer: false,
      stowedInVehicleId: null,
    });
  }

  tryPickupOrDropBody(targetId: string | null): boolean {
    if (this.carriedEntityId) {
      const rag = this.ragdolls.get(this.carriedEntityId);
      if (rag) rag.carriedByPlayer = false;
      this.carriedEntityId = null;
      return true;
    }
    if (!targetId) return false;
    const rag = this.ragdolls.get(targetId);
    if (!rag || !rag.knockedOut || rag.stowedInVehicleId) return false;
    rag.carriedByPlayer = true;
    this.carriedEntityId = targetId;
    return true;
  }

  stowCarriedBodyInVehicle(vehicleId: string): boolean {
    if (!this.carriedEntityId) return false;
    const rag = this.ragdolls.get(this.carriedEntityId);
    if (!rag) return false;
    rag.carriedByPlayer = false;
    rag.stowedInVehicleId = vehicleId;
    this.carriedEntityId = null;
    return true;
  }

  toggleDirectorMode(): boolean {
    const active = !this.registry.state.directorModeActive;
    this.registry.state.directorModeActive = active;
    if (active) {
      this.replayPlayIndex = 0;
      this.registry.clock.setDirectorSlowMo(0.45);
    } else {
      this.registry.clock.setDirectorSlowMo(null);
    }
    return active;
  }

  getMeleeState(): { phase: MeleePhase; canHitNow: boolean } {
    const canHit = this.meleePhase === 'active' && !this.meleeHitIssued;
    return { phase: this.meleePhase, canHitNow: canHit };
  }

  markMeleeHitConsumed(): void {
    this.meleeHitIssued = true;
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number, renderDt: number): void {
    const char = this.registry.getActiveCharacter();
    const t = this.registry.clock.animationTime;

    // 1. Update procedural blend tree for both character rigs
    for (const cid of ['lucia', 'jason'] as const) {
      const cState = this.registry.state.characters[cid];
      const rig = this.player.rigs[cid];
      if (!rig || cState.inVehicleId !== null) continue;

      const loco = cid === char.id && this.meleePhase !== 'none' ? 'melee' : cState.locomotion;
      const isMoving = loco === 'walk' || loco === 'fast_walk' || loco === 'run' || loco === 'sprint' || loco === 'swim';
      const freq = loco === 'sprint' ? 12 : loco === 'run' ? 9 : 6;
      const amp = loco === 'sprint' ? 0.65 : isMoving ? 0.42 : 0.04;
      const swing = Math.sin(t * freq) * amp;

      // Crouch / crawl torso posture
      if (loco === 'crouch' || (cid === char.id && this.inCover)) {
        rig.torso.position.y = 0.85;
        rig.head.position.y = 1.32;
      } else if (loco === 'crawl') {
        rig.torso.position.y = 0.42;
        rig.torso.rotation.x = Math.PI * 0.42;
        rig.head.position.y = 0.52;
      } else {
        rig.torso.position.y = 1.15;
        rig.torso.rotation.x = 0;
        rig.head.position.y = 1.66;
      }

      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;

      if (loco === 'aim' || loco === 'shoot') {
        rig.rightArm.rotation.x = -Math.PI * 0.48;
        rig.leftArm.rotation.x = -Math.PI * 0.35;
      } else if (loco === 'melee') {
        rig.rightArm.rotation.x = -Math.PI * 0.72 * Math.sin(t * 16);
        rig.leftArm.rotation.x = 0.25;
      } else if (cid === char.id && this.carriedEntityId) {
        rig.leftArm.rotation.x = -Math.PI * 0.4;
        rig.rightArm.rotation.x = -Math.PI * 0.4;
      } else {
        rig.leftArm.rotation.x = -swing * 0.85;
        rig.rightArm.rotation.x = swing * 0.85;
      }
    }

    // 2. Melee phase state machine
    if (this.meleePhase !== 'none') {
      this.meleeTimer -= simDt;
      if (this.meleeTimer <= 0) {
        if (this.meleePhase === 'windup') {
          this.meleePhase = 'active';
          this.meleeTimer = 0.16;
        } else if (this.meleePhase === 'active') {
          this.meleePhase = 'recovery';
          this.meleeTimer = 0.22;
        } else {
          this.meleePhase = 'none';
        }
      }
    }

    // 3. Record replay snapshots (bounded buffer)
    if (!this.registry.state.directorModeActive && simDt > 0) {
      const veh = char.inVehicleId ? this.registry.state.vehicles.get(char.inVehicleId) : null;
      this.replayBuffer.push({
        timeSec: this.registry.clock.simulationTime,
        playerPos: { ...char.position },
        playerYaw: char.yaw,
        locomotion: char.locomotion,
        vehiclePos: veh ? { ...veh.position } : null,
        vehicleYaw: veh ? veh.yaw : 0,
      });
      if (this.replayBuffer.length > CENTRAL_LIMITS.maxReplayFrames) {
        this.replayBuffer.shift();
      }
    }

    // 4. Director Camera playback without resetting active simulation
    if (this.registry.state.directorModeActive && this.replayBuffer.length > 0) {
      const frame = this.replayBuffer[this.replayPlayIndex % this.replayBuffer.length];
      this.replayPlayIndex = (this.replayPlayIndex + 1) % this.replayBuffer.length;
      this.directorOrbitAngle += renderDt * 0.55;
      const focus = frame.vehiclePos ?? frame.playerPos;
      this.player.camera.position.set(
        focus.x + Math.cos(this.directorOrbitAngle) * 7.5,
        focus.y + 3.2,
        focus.z + Math.sin(this.directorOrbitAngle) * 7.5
      );
      this.player.camera.setTarget(new Vector3(focus.x, focus.y + 1.2, focus.z));
    }
  }

  getReplayFrameCount(): number {
    return this.replayBuffer.length;
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.ragdolls.clear();
    this.replayBuffer = [];
    this.readiness = 'disposed';
  }
}
