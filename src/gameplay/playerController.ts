/**
 * MODULE 7 – spieler_steuerung.js
 * Playable Lucia & Jason Character Controllers, Camera Rig, Character Switching,
 * Trust/Synergy Matrix, Attributes, Fitness, Ground/Slope Physics, Dirt & Cleaning,
 * Enterable Interior Transitions, and Idempotent WASTED / BUSTED Respawn Flows.
 */

import {
  Color3,
  Scene,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { CharacterId, LocomotionState, Vec3 } from '../core/types';
import { clamp, sanitizeVec3 } from '../core/types';
import type { InputActionState } from '../core/input';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WorldArchitecture } from '../world/worldArchitecture';
import type { WaterDivingSystem } from '../world/waterDiving';
import { buildCharacterRig, type CharacterRig } from './characterRig';
import {
  completePlayerRespawn,
  evaluateNearbyPrompt,
  triggerPlayerBusted,
  triggerPlayerWasted,
  type NearbyPrompt,
} from './playerLifecycle';

export type { CharacterRig, NearbyPrompt };

export class PlayerController implements GameModule {
  public readonly moduleId = 'spieler_steuerung';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private world!: WorldArchitecture;
  private water!: WaterDivingSystem;
  private scene!: Scene;

  public camera!: UniversalCamera;
  public rigs: Record<CharacterId, CharacterRig> = {} as Record<CharacterId, CharacterRig>;
  public velocities: Record<CharacterId, Vector3> = {
    lucia: Vector3.Zero(),
    jason: Vector3.Zero(),
  };

  private camYaw = 0;
  private camPitch = 0.24;
  private camDistance = 5.4;
  private switchBlend = 1.0;
  private switchStartPos = Vector3.Zero();
  private grounded: Record<CharacterId, boolean> = { lucia: true, jason: true };
  private crouchToggle = false;
  private crawlToggle = false;
  public currentPrompt: NearbyPrompt | null = null;

  public onRequestActivityUI?: (kind: string, targetId: string) => void;
  public onRequestAtmUI?: () => void;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.water = registry.getModule<WaterDivingSystem>('physik_wasser_tauchen');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;

    this.rigs.lucia = buildCharacterRig(this.scene, this.gfx, 'lucia', new Color3(0.86, 0.36, 0.42), new Color3(0.62, 0.42, 0.32));
    this.rigs.jason = buildCharacterRig(this.scene, this.gfx, 'jason', new Color3(0.22, 0.46, 0.62), new Color3(0.72, 0.54, 0.42));

    this.syncRigFromState('lucia');
    this.syncRigFromState('jason');

    const active = this.registry.getActiveCharacter();
    this.camera = new UniversalCamera('playerFollowCam', new Vector3(active.position.x, active.position.y + 3, active.position.z - 6), this.scene);
    this.camera.minZ = 0.2;
    this.camera.maxZ = 2800;
    this.camera.fov = 0.92;
    this.scene.activeCamera = this.camera;

    this.rigs.lucia.fpArms.parent = this.camera;
    this.rigs.jason.fpArms.parent = this.camera;
    this.syncRigFromState('lucia');
    this.syncRigFromState('jason');

    this.gfx.setupPostProcessingAndShadows();

    this.readiness = 'initialized';
  }

  syncRigFromState(id: CharacterId): void {
    const c = this.registry.state.characters[id];
    const rig = this.rigs[id];
    if (!rig) return;
    const isConvertibleDriver = c.inVehicleId !== null && c.inVehicleId.includes('buccaneer');
    if (isConvertibleDriver && c.inVehicleId) {
      const veh = this.registry.state.vehicles.get(c.inVehicleId);
      if (veh) {
        const rightOffset = -0.36;
        const fwdOffset = -0.08;
        const cosY = Math.cos(veh.yaw);
        const sinY = Math.sin(veh.yaw);
        rig.root.position.set(
          veh.position.x + cosY * rightOffset + sinY * fwdOffset,
          veh.position.y + 0.08,
          veh.position.z - sinY * rightOffset + cosY * fwdOffset
        );
        rig.root.rotation.y = veh.yaw;
      }
    } else {
      rig.root.position.set(c.position.x, c.position.y, c.position.z);
      rig.root.rotation.y = c.yaw;
    }
    const enabled = c.inVehicleId === null || isConvertibleDriver;
    rig.root.setEnabled(enabled);
    const isActive = id === this.registry.state.activeCharacterId;
    const isActiveFirst = c.inVehicleId === null && isActive && this.registry.state.cameraMode === 'first';
    rig.head.isVisible = !isActiveFirst;
    rig.fpArms.setEnabled(isActiveFirst);
  }

  toggleCameraMode(): 'third' | 'first' {
    const next = this.registry.state.cameraMode === 'third' ? 'first' : 'third';
    this.registry.state.cameraMode = next;
    this.syncRigFromState('lucia');
    this.syncRigFromState('jason');
    return next;
  }

  switchCharacter(targetId?: CharacterId): void {
    const prevId = this.registry.state.activeCharacterId;
    const nextId: CharacterId = targetId ?? (prevId === 'lucia' ? 'jason' : 'lucia');
    if (prevId === nextId) return;

    this.switchStartPos = this.camera.position.clone();
    this.switchBlend = 0;

    const nextChar = this.registry.state.characters[nextId];
    nextChar.position = sanitizeVec3(nextChar.position);
    const groundY = this.world.getTerrainHeight(nextChar.position.x, nextChar.position.z);
    if (nextChar.position.y < groundY) nextChar.position.y = groundY;

    this.registry.state.activeCharacterId = nextId;
    this.registry.state.trustSynergy = clamp(this.registry.state.trustSynergy + 0.5, 0, 100);
    this.crouchToggle = false;
    this.crawlToggle = false;

    this.registry.events.emit('player:characterChanged', {
      from: prevId,
      to: nextId,
      position: { ...nextChar.position },
    });
  }

  applyDamage(amount: number, cause = 'combat'): void {
    if (this.registry.state.gameOverState !== 'none') return;
    const char = this.registry.getActiveCharacter();
    const safeAmt = Math.max(0, amount);
    if (char.armor > 0) {
      const absorbed = Math.min(char.armor, safeAmt * 0.7);
      char.armor -= absorbed;
      char.health -= safeAmt - absorbed;
    } else {
      char.health -= safeAmt;
    }
    char.dirt.scuff = clamp(char.dirt.scuff + safeAmt * 0.015, 0, 1);

    if (char.health <= 0) {
      char.health = 0;
      this.triggerWasted(cause);
    }
  }

  triggerWasted(cause = 'fatal_injury'): void {
    triggerPlayerWasted(this.registry, this.gfx, cause);
  }

  triggerBusted(): void {
    triggerPlayerBusted(this.registry, this.gfx);
  }

  completeRespawn(): void {
    completePlayerRespawn(
      this.registry,
      this.gfx,
      (id) => this.syncRigFromState(id),
      (id) => this.velocities[id].set(0, 0, 0)
    );
  }

  stepFromInput(input: InputActionState, simDt: number): void {
    if (this.registry.state.gameOverState !== 'none') return;
    const char = this.registry.getActiveCharacter();

    // Camera orbit from look deltas
    this.camYaw += input.lookDeltaX * 0.0045;
    this.camPitch = clamp(this.camPitch + input.lookDeltaY * 0.004, -0.35, 1.15);

    if (input.switchCharPressed && char.inVehicleId === null) {
      this.switchCharacter();
      return;
    }

    if (char.inVehicleId !== null) {
      this.syncRigFromState(char.id);
      return;
    }

    if (input.crouchPressed) {
      this.crouchToggle = !this.crouchToggle;
      if (this.crouchToggle) this.crawlToggle = false;
    }
    if (input.crawlPressed) {
      this.crawlToggle = !this.crawlToggle;
      if (this.crawlToggle) this.crouchToggle = false;
    }

    const groundY = this.world.getTerrainHeight(char.position.x, char.position.z);
    const waterEval = this.water.evaluateCharacterWaterState(char.position, groundY, input.diveDownHeld, simDt);
    char.waterState = waterEval.state;

    let moveSpeed = 3.2; // walk m/s
    let loco: LocomotionState = 'idle';
    const mag = Math.hypot(input.moveX, input.moveY);

    if (waterEval.state === 'swimming' || waterEval.state === 'underwater' || waterEval.state === 'low_oxygen') {
      moveSpeed = input.sprint ? 4.4 : 2.8;
      loco = waterEval.state === 'underwater' || waterEval.state === 'low_oxygen' ? 'dive' : 'swim';
      if (mag > 0.1) char.attributes.lungCapacity = clamp(char.attributes.lungCapacity + simDt * 0.08, 0, 100);
      // Clean dirt in water!
      char.dirt.mud = Math.max(0, char.dirt.mud - simDt * 0.6);
      char.dirt.sand = Math.max(0, char.dirt.sand - simDt * 0.6);
      char.dirt.dust = Math.max(0, char.dirt.dust - simDt * 0.6);
    } else if (this.crawlToggle) {
      moveSpeed = 1.6;
      loco = mag > 0.1 ? 'crawl' : 'crawl';
    } else if (this.crouchToggle) {
      moveSpeed = 2.6;
      loco = mag > 0.1 ? 'crouch' : 'crouch';
    } else if (mag > 0.1) {
      if (input.sprint && char.staminaCurrent > 2) {
        moveSpeed = 7.8 + char.attributes.stamina * 0.018;
        loco = 'sprint';
        char.staminaCurrent = clamp(char.staminaCurrent - simDt * 14, 0, 100);
        char.attributes.stamina = clamp(char.attributes.stamina + simDt * 0.05, 0, 100);
      } else if (input.fastWalk) {
        moveSpeed = 4.6;
        loco = 'fast_walk';
      } else {
        moveSpeed = 5.6;
        loco = 'run';
      }
    }

    if (loco !== 'sprint') {
      char.staminaCurrent = clamp(char.staminaCurrent + simDt * 18, 0, 100);
    }
    if (input.aimHeld) loco = 'aim';

    char.locomotion = loco;

    // Frame-rate independent directional velocity
    const forward = new Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const wishDir = forward.scale(input.moveY).add(right.scale(input.moveX));
    if (wishDir.lengthSquared() > 0.001) {
      wishDir.normalize();
      char.yaw = Math.atan2(wishDir.x, wishDir.z);
    }

    const vel = this.velocities[char.id];
    const accel = this.grounded[char.id] ? 16 : 5;
    vel.x += (wishDir.x * moveSpeed + waterEval.current.x - vel.x) * clamp(simDt * accel, 0, 1);
    vel.z += (wishDir.z * moveSpeed + waterEval.current.z - vel.z) * clamp(simDt * accel, 0, 1);

    if (waterEval.state === 'underwater' || waterEval.state === 'low_oxygen' || waterEval.state === 'swimming') {
      const targetWaterY = input.diveDownHeld ? Math.max(groundY + 0.5, char.position.y - 2.4 * simDt) : waterEval.waterHeight - 0.65;
      vel.y = (targetWaterY - char.position.y) * 5;
      this.grounded[char.id] = false;
    } else {
      if (input.jumpPressed && this.grounded[char.id]) {
        vel.y = 5.8;
        this.grounded[char.id] = false;
      }
      vel.y -= 18.5 * simDt;
    }

    char.position.x = clamp(char.position.x + vel.x * simDt, -1680, 640);
    char.position.y += vel.y * simDt;
    char.position.z = clamp(char.position.z + vel.z * simDt, -1480, 1420);

    const newGroundY = this.world.getTerrainHeight(char.position.x, char.position.z);
    if (char.position.y <= newGroundY && waterEval.state === 'land') {
      char.position.y = newGroundY;
      vel.y = 0;
      this.grounded[char.id] = true;
    }

    // Surface dirt accumulation
    const surf = this.world.getSurfaceMaterial(char.position.x, char.position.z);
    if (mag > 0.1 && this.grounded[char.id]) {
      if (surf === 'mud') char.dirt.mud = clamp(char.dirt.mud + simDt * 0.08, 0, 1);
      else if (surf === 'sand') char.dirt.sand = clamp(char.dirt.sand + simDt * 0.06, 0, 1);
      else if (surf === 'gravel') char.dirt.dust = clamp(char.dirt.dust + simDt * 0.04, 0, 1);
    }

    this.syncRigFromState(char.id);
    this.currentPrompt = evaluateNearbyPrompt(
      this.registry,
      this.water,
      char.position,
      input,
      (id) => this.syncRigFromState(id),
      this.onRequestAtmUI,
      this.onRequestActivityUI
    );
    this.updateCameraFollow(char.position, input.aimHeld, simDt);
  }

  public updateCameraFollow(targetPos: Vec3, aiming: boolean, renderDt: number, vehicleOffset = 0): void {
    if (this.registry.state.directorModeActive || this.registry.state.photoModeActive) return;

    if (vehicleOffset === 0 && this.registry.state.cameraMode === 'first') {
      const char = this.registry.getActiveCharacter();
      const eyeHeight = char.locomotion === 'crouch' ? 1.04 : char.locomotion === 'crawl' ? 0.52 : 1.62;
      const moveMag = Math.hypot(this.velocities[char.id].x, this.velocities[char.id].z);
      const bob = moveMag > 0.6 ? Math.sin(this.registry.clock.animationTime * 9.5) * 0.032 : 0;
      const eyePos = new Vector3(targetPos.x, targetPos.y + eyeHeight + bob, targetPos.z);
      const lookDir = new Vector3(
        Math.sin(this.camYaw) * Math.cos(this.camPitch),
        -Math.sin(this.camPitch) * 0.85,
        Math.cos(this.camYaw) * Math.cos(this.camPitch)
      );
      this.camera.position = Vector3.Lerp(this.camera.position, eyePos, clamp(renderDt * 22, 0, 1));
      this.camera.setTarget(this.camera.position.add(lookDir.scale(8)));
      char.yaw = this.camYaw;
      return;
    }

    const dist = vehicleOffset > 0 ? vehicleOffset : aiming ? 2.4 : this.camDistance;
    const height = vehicleOffset > 0 ? 2.2 : aiming ? 1.55 : 1.75;
    const shoulder = aiming ? 0.65 : 0;

    const horizDist = dist * Math.cos(this.camPitch);
    const camX = targetPos.x - Math.sin(this.camYaw) * horizDist + Math.cos(this.camYaw) * shoulder;
    const camY = targetPos.y + height + dist * Math.sin(this.camPitch);
    const camZ = targetPos.z - Math.cos(this.camYaw) * horizDist - Math.sin(this.camYaw) * shoulder;

    const desired = new Vector3(camX, Math.max(0.4, camY), camZ);
    if (this.switchBlend < 1) {
      this.switchBlend = clamp(this.switchBlend + renderDt * 1.4, 0, 1);
      this.camera.position = Vector3.Lerp(this.switchStartPos, desired, this.switchBlend);
    } else {
      this.camera.position = Vector3.Lerp(this.camera.position, desired, clamp(renderDt * 14, 0, 1));
    }

    const lookAt = new Vector3(
      targetPos.x + Math.cos(this.camYaw) * shoulder,
      targetPos.y + (aiming ? 1.45 : 1.25),
      targetPos.z - Math.sin(this.camYaw) * shoulder
    );
    this.camera.setTarget(lookAt);
  }

  getCameraYaw(): number {
    return this.camYaw;
  }

  start(): void {
    this.readiness = 'running';
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.rigs.lucia?.root.dispose();
    this.rigs.jason?.root.dispose();
    this.readiness = 'disposed';
  }
}
