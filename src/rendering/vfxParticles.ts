/**
 * Layered Procedural Particle VFX System:
 * - Tire Drift / Burnout Smoke & Sand/Mud Dust Trails
 * - Vehicle Engine Damage Smoke & Explosion Fire Plumes
 * - Marine Vessel & Jetski Turquoise-Foam Wake Spray
 * Uses a Canvas-generated radial soft-alpha DynamicTexture (zero external assets).
 */

import {
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  Vector3,
} from '@babylonjs/core';
import type { GameRegistry } from '../core/registry';
import type { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import type { TransportSystems } from '../gameplay/transportSystems';
import type { WorldArchitecture } from '../world/worldArchitecture';

function createSoftParticleTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture('vfxRadialSmokeTex', { width: 128, height: 128 }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.42, 'rgba(235,240,245,0.52)');
  grad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  tex.update(true);
  tex.hasAlpha = true;
  return tex;
}

export class VfxParticlesSystem {
  private tireEmitterMesh!: Mesh;
  private engineEmitterMesh!: Mesh;
  private wakeEmitterMesh!: Mesh;
  private tirePs!: ParticleSystem;
  private enginePs!: ParticleSystem;
  private wakePs!: ParticleSystem;
  private explosionBurstTimer = 0;

  constructor(private readonly scene: Scene) {
    const tex = createSoftParticleTexture(scene);

    this.tireEmitterMesh = MeshBuilder.CreateBox('vfx_tire_emitter', { size: 0.1 }, scene);
    this.tireEmitterMesh.isVisible = false;
    this.tirePs = new ParticleSystem('vfx_tire_smoke', 90, scene);
    this.tirePs.particleTexture = tex;
    this.tirePs.emitter = this.tireEmitterMesh;
    this.tirePs.minEmitBox = new Vector3(-0.7, 0, -0.3);
    this.tirePs.maxEmitBox = new Vector3(0.7, 0.15, 0.3);
    this.tirePs.color1 = new Color4(0.82, 0.84, 0.88, 0.42);
    this.tirePs.color2 = new Color4(0.72, 0.74, 0.78, 0.35);
    this.tirePs.colorDead = new Color4(0.65, 0.65, 0.68, 0);
    this.tirePs.minSize = 0.45;
    this.tirePs.maxSize = 1.45;
    this.tirePs.minLifeTime = 0.45;
    this.tirePs.maxLifeTime = 1.1;
    this.tirePs.emitRate = 0;
    this.tirePs.direction1 = new Vector3(-0.6, 0.7, -0.6);
    this.tirePs.direction2 = new Vector3(0.6, 1.4, 0.6);
    this.tirePs.minEmitPower = 0.5;
    this.tirePs.maxEmitPower = 1.5;
    this.tirePs.start();

    this.engineEmitterMesh = MeshBuilder.CreateBox('vfx_engine_emitter', { size: 0.1 }, scene);
    this.engineEmitterMesh.isVisible = false;
    this.enginePs = new ParticleSystem('vfx_engine_fire', 80, scene);
    this.enginePs.particleTexture = tex;
    this.enginePs.emitter = this.engineEmitterMesh;
    this.enginePs.minEmitBox = new Vector3(-0.35, 0, -0.35);
    this.enginePs.maxEmitBox = new Vector3(0.35, 0.25, 0.35);
    this.enginePs.color1 = new Color4(0.24, 0.24, 0.26, 0.65);
    this.enginePs.color2 = new Color4(0.14, 0.14, 0.16, 0.5);
    this.enginePs.colorDead = new Color4(0.08, 0.08, 0.08, 0);
    this.enginePs.minSize = 0.5;
    this.enginePs.maxSize = 1.8;
    this.enginePs.minLifeTime = 0.6;
    this.enginePs.maxLifeTime = 1.6;
    this.enginePs.emitRate = 0;
    this.enginePs.direction1 = new Vector3(-0.3, 1.8, -0.3);
    this.enginePs.direction2 = new Vector3(0.3, 3.2, 0.3);
    this.enginePs.minEmitPower = 1.0;
    this.enginePs.maxEmitPower = 2.2;
    this.enginePs.start();

    this.wakeEmitterMesh = MeshBuilder.CreateBox('vfx_wake_emitter', { size: 0.1 }, scene);
    this.wakeEmitterMesh.isVisible = false;
    this.wakePs = new ParticleSystem('vfx_boat_wake', 80, scene);
    this.wakePs.particleTexture = tex;
    this.wakePs.emitter = this.wakeEmitterMesh;
    this.wakePs.minEmitBox = new Vector3(-0.6, 0, -0.4);
    this.wakePs.maxEmitBox = new Vector3(0.6, 0.1, 0.4);
    this.wakePs.color1 = new Color4(0.88, 0.98, 1.0, 0.55);
    this.wakePs.color2 = new Color4(0.45, 0.88, 0.94, 0.4);
    this.wakePs.colorDead = new Color4(0.85, 0.98, 1.0, 0);
    this.wakePs.minSize = 0.5;
    this.wakePs.maxSize = 1.6;
    this.wakePs.minLifeTime = 0.4;
    this.wakePs.maxLifeTime = 1.0;
    this.wakePs.emitRate = 0;
    this.wakePs.direction1 = new Vector3(-0.9, 0.3, -0.9);
    this.wakePs.direction2 = new Vector3(0.9, 0.9, 0.9);
    this.wakePs.minEmitPower = 0.6;
    this.wakePs.maxEmitPower = 1.6;
    this.wakePs.start();
  }

  public triggerExplosionBurst(x: number, y: number, z: number): void {
    this.engineEmitterMesh.position.set(x, y + 0.8, z);
    this.enginePs.color1 = new Color4(1.0, 0.52, 0.12, 0.92);
    this.enginePs.color2 = new Color4(0.85, 0.22, 0.08, 0.78);
    this.enginePs.emitRate = 75;
    this.explosionBurstTimer = 2.4;
  }

  public update(
    dt: number,
    registry: GameRegistry,
    vehicles: VehiclePhysicsSystem,
    transport: TransportSystems,
    world: WorldArchitecture
  ): void {
    const activeVeh = vehicles.getActiveVehicleRuntime();
    if (activeVeh) {
      const p = activeVeh.data.position;
      const sinY = Math.sin(activeVeh.data.yaw);
      const cosY = Math.cos(activeVeh.data.yaw);
      const speed = activeVeh.velocity.length();

      // Rear tire smoke / sand / mud plume when drifting, hydroplaning, or offroad fast
      const surf = world.getSurfaceMaterial(p.x, p.z);
      const kickingDust = (surf === 'sand' || surf === 'mud' || surf === 'gravel') && speed > 7.5;
      const drifting = activeVeh.lateralSlipMps > 2.3 || activeVeh.isHydroplaning;

      this.tireEmitterMesh.position.set(
        p.x - sinY * activeVeh.profile.length * 0.34,
        p.y + 0.16,
        p.z - cosY * activeVeh.profile.length * 0.34
      );
      if (surf === 'sand') {
        this.tirePs.color1 = new Color4(0.88, 0.78, 0.56, 0.45);
        this.tirePs.color2 = new Color4(0.8, 0.7, 0.5, 0.32);
      } else if (surf === 'mud') {
        this.tirePs.color1 = new Color4(0.38, 0.3, 0.2, 0.5);
        this.tirePs.color2 = new Color4(0.28, 0.22, 0.15, 0.36);
      } else {
        this.tirePs.color1 = new Color4(0.86, 0.88, 0.92, 0.42);
        this.tirePs.color2 = new Color4(0.7, 0.72, 0.76, 0.3);
      }
      this.tirePs.emitRate = drifting ? 58 : kickingDust ? 32 : 0;

      // Engine damage smoke/fire over hood
      if (this.explosionBurstTimer <= 0) {
        if (activeVeh.data.damage.engine > 0.55) {
          this.engineEmitterMesh.position.set(
            p.x + sinY * activeVeh.profile.length * 0.32,
            p.y + 0.95,
            p.z + cosY * activeVeh.profile.length * 0.32
          );
          const onFire = activeVeh.data.damage.engine > 0.85;
          this.enginePs.color1 = onFire ? new Color4(1.0, 0.45, 0.1, 0.85) : new Color4(0.25, 0.25, 0.28, 0.65);
          this.enginePs.color2 = onFire ? new Color4(0.22, 0.2, 0.2, 0.65) : new Color4(0.14, 0.14, 0.16, 0.45);
          this.enginePs.emitRate = onFire ? 54 : 26;
        } else {
          this.enginePs.emitRate = 0;
        }
      }
    } else {
      this.tirePs.emitRate = 0;
      if (this.explosionBurstTimer <= 0) this.enginePs.emitRate = 0;
    }

    if (this.explosionBurstTimer > 0) {
      this.explosionBurstTimer = Math.max(0, this.explosionBurstTimer - dt);
      if (this.explosionBurstTimer <= 0) this.enginePs.emitRate = 0;
    }

    // Active Marine Vessel Wake Spray
    const boat = transport.marine.find((m) => m.id === transport.activeCraftId || Math.abs(m.speedMps) > 2.5);
    if (boat && Math.abs(boat.speedMps) > 1.2) {
      this.wakeEmitterMesh.position.set(
        boat.position.x - Math.sin(boat.yaw) * 2.2,
        Math.max(0.05, boat.position.y),
        boat.position.z - Math.cos(boat.yaw) * 2.2
      );
      this.wakePs.emitRate = Math.min(60, Math.abs(boat.speedMps) * 4.5);
    } else {
      this.wakePs.emitRate = 0;
    }
    void registry;
  }

  public dispose(): void {
    this.tirePs.dispose();
    this.enginePs.dispose();
    this.wakePs.dispose();
    this.tireEmitterMesh.dispose();
    this.engineEmitterMesh.dispose();
    this.wakeEmitterMesh.dispose();
  }
}
