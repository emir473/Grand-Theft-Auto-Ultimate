/**
 * MODULE 9 – waffen_inventar.js
 * Data-Separated Inventory, Visible Carried Slots, Vehicle Trunk Storage,
 * Circular Weapon Wheel (sets simulation timeScale = 0.1 cleanly),
 * and Abstract Fictional Ballistic/Projectile Hit Simulation.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { CharacterId, InventoryItem, Vec3 } from '../core/types';
import { CENTRAL_LIMITS, clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { PlayerController } from './playerController';
import type { CombatAnimationSystem } from './combatAnimation';
import { WEAPON_CATALOG } from './weaponCatalog';
import { updateFirstPersonViewmodel } from './fpViewmodel';

export { WEAPON_CATALOG };

interface ActiveProjectile {
  id: string;
  shooterId: string;
  weaponId: string;
  position: Vector3;
  velocity: Vector3;
  lifeRemaining: number;
  damage: number;
  hitEntities: Set<string>;
  mesh: Mesh;
}

export interface HitTargetCallback {
  id: string;
  getPosition: () => Vec3;
  getRadius: () => number;
  onHit: (damage: number, zone: string, point: Vec3, impulse: Vec3, attackerId: string) => void;
}

export class WeaponsInventorySystem implements GameModule {
  public readonly moduleId = 'waffen_inventar';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private player!: PlayerController;
  private combat!: CombatAnimationSystem;
  private scene!: Scene;

  private projectiles: ActiveProjectile[] = [];
  private targets = new Map<string, HitTargetCallback>();
  private fireCooldownSec = 0;
  private recoilKick = 0;
  private reloadTimerSec = 0;
  private projMat!: PBRMaterial;
  private gunMat!: PBRMaterial;
  private heldMeshes: Partial<Record<CharacterId, TransformNode>> = {};

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.player = registry.getModule<PlayerController>('spieler_steuerung');
    this.combat = registry.getModule<CombatAnimationSystem>('kampf_animation');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.projMat = new PBRMaterial('projTracerMat', this.scene);
    this.projMat.albedoColor = new Color3(1, 0.85, 0.3);
    this.projMat.emissiveColor = new Color3(1, 0.72, 0.15);

    this.gunMat = new PBRMaterial('heldGunMat', this.scene);
    this.gunMat.albedoColor = new Color3(0.14, 0.15, 0.18);
    this.gunMat.metallic = 0.85;
    this.gunMat.roughness = 0.28;

    for (const cid of ['lucia', 'jason'] as CharacterId[]) {
      const rig = this.player.rigs[cid];
      const gun = new TransformNode(`${cid}_heldWeapon`, this.scene);
      gun.parent = rig.rightArmNodes.handMesh;
      gun.position.set(0, -0.02, 0.04);

      const slide = MeshBuilder.CreateCapsule(`${cid}_wSlide`, { radius: 0.024, height: 0.28, tessellation: 14 }, this.scene);
      slide.rotation.x = Math.PI / 2;
      slide.position.set(0, 0.04, 0.1);
      slide.material = this.gunMat;
      slide.parent = gun;

      const grip = MeshBuilder.CreateCapsule(`${cid}_wGrip`, { radius: 0.018, height: 0.11, tessellation: 12 }, this.scene);
      grip.rotation.x = 0.22;
      grip.material = this.gunMat;
      grip.parent = gun;

      gun.setEnabled(false);
      this.heldMeshes[cid] = gun;
    }

    this.readiness = 'initialized';
  }

  registerTarget(target: HitTargetCallback): void {
    this.targets.set(target.id, target);
  }

  unregisterTarget(id: string): void {
    this.targets.delete(id);
  }

  setWeaponWheelOpen(open: boolean): void {
    this.registry.state.weaponWheelOpen = open;
    this.registry.clock.setWeaponWheelSlowMo(open);
  }

  selectWeapon(weaponId: string): boolean {
    const char = this.registry.getActiveCharacter();
    const inv = this.registry.state.inventories[char.id];
    const item = inv.find((i) => i.weaponId === weaponId && i.owned);
    if (!item) return false;

    this.registry.state.activeWeapons[char.id] = weaponId;
    const gunMesh = this.heldMeshes[char.id];
    if (gunMesh) {
      gunMesh.setEnabled(weaponId !== 'unarmed' && this.registry.state.cameraMode !== 'first');
    }
    this.registry.events.emit('inventory:changed', {
      characterId: char.id,
      activeWeaponId: weaponId,
    });
    return true;
  }

  getActiveInventoryItem(): InventoryItem {
    const char = this.registry.getActiveCharacter();
    const activeId = this.registry.state.activeWeapons[char.id] ?? 'unarmed';
    const inv = this.registry.state.inventories[char.id];
    return inv.find((i) => i.weaponId === activeId) ?? { weaponId: 'unarmed', loadedAmmo: 0, reserveAmmo: 0, owned: true };
  }

  purchaseWeapon(weaponId: string): { ok: boolean; reason?: string } {
    const def = WEAPON_CATALOG[weaponId];
    if (!def) return { ok: false, reason: 'Unknown weapon' };
    const char = this.registry.getActiveCharacter();
    if (char.cashCents < def.priceCents) return { ok: false, reason: 'Insufficient cash' };

    const inv = this.registry.state.inventories[char.id];
    let existing = inv.find((i) => i.weaponId === weaponId);
    if (existing) {
      // Refill ammo
      const ammoCost = Math.round(def.priceCents * 0.2);
      if (char.cashCents < ammoCost) return { ok: false, reason: 'Insufficient cash for ammo' };
      char.cashCents -= ammoCost;
      existing.reserveAmmo = def.maxReserveAmmo;
      existing.loadedAmmo = def.magazineSize;
    } else {
      char.cashCents -= def.priceCents;
      existing = {
        weaponId,
        loadedAmmo: def.magazineSize,
        reserveAmmo: def.magazineSize * 3,
        owned: true,
      };
      inv.push(existing);
    }

    this.selectWeapon(weaponId);
    this.registry.events.emit('economy:transactionCompleted', {
      record: {
        id: `tx_ammu_${Date.now()}`,
        timestampGameSec: this.registry.clock.gameTime,
        characterId: char.id,
        account: 'cash',
        amountCents: -def.priceCents,
        balanceAfterCents: char.cashCents,
        trigger: 'ammu_nation_purchase',
        description: `Purchased ${def.nameKey}`,
      },
    });
    return { ok: true };
  }

  storeWeaponInVehicleTrunk(weaponId: string, vehicleId: string): { ok: boolean; reason?: string } {
    if (weaponId === 'unarmed') return { ok: false, reason: 'Cannot store unarmed' };
    const veh = this.registry.state.vehicles.get(vehicleId);
    if (!veh) return { ok: false, reason: 'Vehicle not found' };
    if (veh.trunkWeapons.length >= veh.trunkMaxSlots) return { ok: false, reason: 'Trunk full' };

    const char = this.registry.getActiveCharacter();
    const inv = this.registry.state.inventories[char.id];
    const idx = inv.findIndex((i) => i.weaponId === weaponId);
    if (idx < 0) return { ok: false, reason: 'Weapon not in inventory' };

    const [removed] = inv.splice(idx, 1);
    veh.trunkWeapons.push(removed);
    if (this.registry.state.activeWeapons[char.id] === weaponId) {
      this.selectWeapon('unarmed');
    }
    return { ok: true };
  }

  retrieveWeaponFromVehicleTrunk(weaponId: string, vehicleId: string): boolean {
    const veh = this.registry.state.vehicles.get(vehicleId);
    if (!veh) return false;
    const idx = veh.trunkWeapons.findIndex((i) => i.weaponId === weaponId);
    if (idx < 0) return false;

    const [item] = veh.trunkWeapons.splice(idx, 1);
    const char = this.registry.getActiveCharacter();
    this.registry.state.inventories[char.id].push(item);
    this.selectWeapon(weaponId);
    return true;
  }

  fireActiveWeapon(aimDir?: Vec3): boolean {
    if (this.fireCooldownSec > 0) return false;
    const char = this.registry.getActiveCharacter();
    if (char.inVehicleId !== null) return false;

    const item = this.getActiveInventoryItem();
    const def = WEAPON_CATALOG[item.weaponId] ?? WEAPON_CATALOG.unarmed;

    if (def.category === 'unarmed' || def.category === 'melee') {
      const started = this.combat.triggerMeleeAttack();
      if (started) {
        this.fireCooldownSec = 1 / def.fireRatePerSec;
        this.performMeleeHitCheck(char.id, char.position, char.yaw, def.fictionalDamage, def.rangeMeters);
      }
      return started;
    }

    if (item.loadedAmmo <= 0) {
      if (item.reserveAmmo > 0) {
        const reloadAmt = Math.min(def.magazineSize, item.reserveAmmo);
        item.loadedAmmo += reloadAmt;
        item.reserveAmmo -= reloadAmt;
        this.fireCooldownSec = 0.85;
        this.reloadTimerSec = 0.85;
      }
      return false;
    }

    item.loadedAmmo -= 1;
    this.fireCooldownSec = 1 / def.fireRatePerSec;
    this.recoilKick = clamp(this.recoilKick + (def.id === 'rpg_launcher' ? 1.0 : 0.65), 0, 1.15);
    char.locomotion = 'shoot';

    const yaw = this.player.getCameraYaw();
    const dir = aimDir
      ? new Vector3(aimDir.x, aimDir.y, aimDir.z).normalize()
      : new Vector3(Math.sin(yaw), 0.01, Math.cos(yaw)).normalize();

    // Apply fictional spread modulated by shooting skill
    const skillFactor = 1 - char.attributes.shooting * 0.004;
    const spread = def.spreadRad * skillFactor;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const origin = new Vector3(char.position.x, char.position.y + 1.38, char.position.z).add(dir.scale(0.6));

    if (this.projectiles.length < CENTRAL_LIMITS.maxProjectiles) {
      const tracer = MeshBuilder.CreateBox(`proj_${Date.now()}`, { width: 0.05, height: 0.05, depth: 0.45 }, this.scene);
      tracer.position.copyFrom(origin);
      tracer.material = this.projMat;
      tracer.lookAt(origin.add(dir));

      this.projectiles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        shooterId: char.id,
        weaponId: def.id,
        position: origin,
        velocity: dir.scale(def.projectileSpeedMps),
        lifeRemaining: def.rangeMeters / Math.max(10, def.projectileSpeedMps),
        damage: def.fictionalDamage,
        hitEntities: new Set(),
        mesh: tracer,
      });
    }

    char.attributes.shooting = clamp(char.attributes.shooting + 0.08, 0, 100);
    this.registry.events.emit('weapon:fired', {
      shooterId: char.id,
      weaponId: def.id,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: dir.x, y: dir.y, z: dir.z },
      loudness: def.id === 'rpg_launcher' ? 120 : 75,
    });
    return true;
  }

  private performMeleeHitCheck(attackerId: string, origin: Vec3, yaw: number, damage: number, range: number): void {
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    for (const target of this.targets.values()) {
      if (target.id === attackerId) continue;
      const tp = target.getPosition();
      const dx = tp.x - origin.x;
      const dz = tp.z - origin.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= range + target.getRadius()) {
        const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.01, dist);
        if (dot > 0.25) {
          target.onHit(damage, 'torso', tp, { x: fwdX * 6, y: 2.5, z: fwdZ * 6 }, attackerId);
          this.registry.events.emit('combat:hit', {
            attackerId,
            targetId: target.id,
            zone: 'torso',
            damage,
            point: tp,
          });
          break;
        }
      }
    }
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    if (this.fireCooldownSec > 0) this.fireCooldownSec = Math.max(0, this.fireCooldownSec - simDt);
    if (this.recoilKick > 0) this.recoilKick = Math.max(0, this.recoilKick - simDt * 5.8);
    if (this.reloadTimerSec > 0) this.reloadTimerSec = Math.max(0, this.reloadTimerSec - simDt);

    const char = this.registry.getActiveCharacter();
    const activeWepId = this.registry.state.activeWeapons[char.id] ?? 'unarmed';
    const gun3p = this.heldMeshes[char.id];
    if (gun3p) {
      gun3p.setEnabled(activeWepId !== 'unarmed' && this.registry.state.cameraMode !== 'first' && char.inVehicleId === null);
    }
    const rig = this.player.rigs[char.id];
    if (rig && this.registry.state.cameraMode === 'first' && char.inVehicleId === null) {
      const vel = this.player.velocities[char.id];
      const veh = char.inVehicleId ? this.registry.state.vehicles.get(char.inVehicleId) : null;
      updateFirstPersonViewmodel(rig.fpViewmodel, {
        animTime: this.registry.clock.animationTime,
        speedMps: Math.hypot(vel.x, vel.z),
        sprinting: char.locomotion === 'sprint',
        aiming: char.locomotion === 'aim' || char.locomotion === 'shoot',
        phoneOpen: this.registry.state.phoneOpen,
        inVehicle: Boolean(veh),
        steerAngle: 0,
        weaponId: activeWepId,
        recoilKick: this.recoilKick,
        reloadAlpha: this.reloadTimerSec > 0 ? 1 - this.reloadTimerSec / 0.85 : 0,
      });
    }

    const wind = this.registry.state.windVector;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifeRemaining -= simDt;
      p.velocity.x += wind.x * 0.12 * simDt;
      p.velocity.y -= 9.81 * 0.35 * simDt;
      p.velocity.z += wind.z * 0.12 * simDt;
      p.position.addInPlace(p.velocity.scale(simDt));
      p.mesh.position.copyFrom(p.position);

      let hit = false;
      for (const target of this.targets.values()) {
        if (target.id === p.shooterId || p.hitEntities.has(target.id)) continue;
        const tp = target.getPosition();
        const dist = Math.hypot(tp.x - p.position.x, tp.y + 0.9 - p.position.y, tp.z - p.position.z);
        if (dist <= target.getRadius() + 0.35) {
          p.hitEntities.add(target.id);
          const zone = p.position.y > tp.y + 1.4 ? 'head' : 'torso';
          const mult = zone === 'head' ? 1.8 : 1.0;
          const imp = p.velocity.normalizeToNew().scale(8);
          target.onHit(p.damage * mult, zone, { x: p.position.x, y: p.position.y, z: p.position.z }, { x: imp.x, y: 2.2, z: imp.z }, p.shooterId);
          this.registry.events.emit('combat:hit', {
            attackerId: p.shooterId,
            targetId: target.id,
            zone,
            damage: p.damage * mult,
            point: { x: p.position.x, y: p.position.y, z: p.position.z },
          });
          hit = true;
          break;
        }
      }

      if (hit || p.lifeRemaining <= 0 || p.position.y < -10) {
        p.mesh.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const p of this.projectiles) p.mesh.dispose();
    this.projectiles = [];
    for (const m of Object.values(this.heldMeshes)) m?.dispose();
    this.projMat?.dispose();
    this.gunMat?.dispose();
    this.targets.clear();
    this.readiness = 'disposed';
  }
}
