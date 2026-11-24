/**
 * MODULE 9 – waffen_inventar.js
 * Data-Separated Inventory, Visible Carried Slots, Vehicle Trunk Storage,
 * Circular Weapon Wheel (sets simulation timeScale = 0.1 cleanly),
 * and Abstract Fictional Ballistic/Projectile Hit Simulation.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, Vector3 } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { CharacterId, InventoryItem, Vec3, WeaponDefinition } from '../core/types';
import { CENTRAL_LIMITS, clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { PlayerController } from './playerController';
import type { CombatAnimationSystem } from './combatAnimation';

export const WEAPON_CATALOG: Record<string, WeaponDefinition> = {
  unarmed: {
    id: 'unarmed',
    nameKey: 'Unarmed',
    category: 'unarmed',
    slotType: 'melee',
    magazineSize: 0,
    maxReserveAmmo: 0,
    fireRatePerSec: 1.8,
    spreadRad: 0,
    rangeMeters: 2.2,
    fictionalDamage: 18,
    projectileSpeedMps: 0,
    illegal: false,
    priceCents: 0,
  },
  bat_aluminum: {
    id: 'bat_aluminum',
    nameKey: 'Leonida Bat',
    category: 'melee',
    slotType: 'melee',
    magazineSize: 0,
    maxReserveAmmo: 0,
    fireRatePerSec: 1.5,
    spreadRad: 0,
    rangeMeters: 2.6,
    fictionalDamage: 34,
    projectileSpeedMps: 0,
    illegal: false,
    priceCents: 15000,
  },
  pistol_9mm: {
    id: 'pistol_9mm',
    nameKey: 'Vice 9mm',
    category: 'handgun',
    slotType: 'handgun',
    magazineSize: 15,
    maxReserveAmmo: 150,
    fireRatePerSec: 4.5,
    spreadRad: 0.018,
    rangeMeters: 65,
    fictionalDamage: 26,
    projectileSpeedMps: 210,
    illegal: false,
    priceCents: 65000,
  },
  smg_compact: {
    id: 'smg_compact',
    nameKey: 'Coral SMG',
    category: 'smg',
    slotType: 'back',
    magazineSize: 30,
    maxReserveAmmo: 240,
    fireRatePerSec: 9.5,
    spreadRad: 0.036,
    rangeMeters: 75,
    fictionalDamage: 20,
    projectileSpeedMps: 220,
    illegal: true,
    priceCents: 185000,
  },
  shotgun_pump: {
    id: 'shotgun_pump',
    nameKey: 'Everglades 12G',
    category: 'shotgun',
    slotType: 'back',
    magazineSize: 8,
    maxReserveAmmo: 64,
    fireRatePerSec: 1.2,
    spreadRad: 0.075,
    rangeMeters: 35,
    fictionalDamage: 58,
    projectileSpeedMps: 185,
    illegal: false,
    priceCents: 145000,
  },
  carbine_mk2: {
    id: 'carbine_mk2',
    nameKey: 'Leonida Carbine',
    category: 'rifle',
    slotType: 'back',
    magazineSize: 30,
    maxReserveAmmo: 240,
    fireRatePerSec: 7.5,
    spreadRad: 0.015,
    rangeMeters: 120,
    fictionalDamage: 34,
    projectileSpeedMps: 280,
    illegal: true,
    priceCents: 320000,
  },
  rpg_launcher: {
    id: 'rpg_launcher',
    nameKey: 'Apex Launcher',
    category: 'heavy',
    slotType: 'heavy',
    magazineSize: 1,
    maxReserveAmmo: 6,
    fireRatePerSec: 0.5,
    spreadRad: 0.02,
    rangeMeters: 140,
    fictionalDamage: 140,
    projectileSpeedMps: 85,
    illegal: true,
    priceCents: 850000,
  },
};

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
  private projMat!: PBRMaterial;
  private heldMeshes: Partial<Record<CharacterId, Mesh>> = {};

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

    for (const cid of ['lucia', 'jason'] as CharacterId[]) {
      const rig = this.player.rigs[cid];
      const gun = MeshBuilder.CreateBox(`${cid}_heldWeapon`, { width: 0.08, height: 0.12, depth: 0.36 }, this.scene);
      gun.parent = rig.rightArm;
      gun.position.set(0, -0.24, 0.18);
      gun.isVisible = false;
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
      gunMesh.isVisible = weaponId !== 'unarmed';
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
      }
      return false;
    }

    item.loadedAmmo -= 1;
    this.fireCooldownSec = 1 / def.fireRatePerSec;
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
    this.targets.clear();
    this.readiness = 'disposed';
  }
}
