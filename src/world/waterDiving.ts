/**
 * MODULE 6 – physik_wasser_tauchen.js
 * Multi-layered Water (Ocean, Coast, Swamps, Infinity Pool, Rivers)
 * Separates CPU Gerstner wave height/normal/current queries from visual water mesh,
 * computes buoyancy forces (rho * displacedVolume * g), swimming/diving/oxygen states,
 * underwater caustic shimmer, depth fog/bubbles, and sculpted diving salvage wrecks.
 */

import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PBRMaterial,
  Scene,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { Vec3, WaterMoveState } from '../core/types';
import { clamp } from '../core/types';
import type { AssetLoader } from '../assets/assetLoader';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WeatherClimateSystem } from './weatherSystem';

export interface SalvageSite {
  id: string;
  name: string;
  kind: 'wreck' | 'aircraft_wreck' | 'briefcase';
  position: Vec3;
  depthMeters: number;
  rewardCents: number;
  mesh?: TransformNode;
}

interface GerstnerComponent {
  dirX: number;
  dirZ: number;
  amplitude: number;
  wavelength: number;
  speed: number;
}

const OCEAN_WAVES: GerstnerComponent[] = [
  { dirX: 0.85, dirZ: 0.52, amplitude: 0.34, wavelength: 28, speed: 1.4 },
  { dirX: 0.35, dirZ: -0.94, amplitude: 0.21, wavelength: 16, speed: 1.9 },
  { dirX: -0.65, dirZ: 0.76, amplitude: 0.12, wavelength: 9, speed: 2.4 },
];

function createCausticTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture('waterCausticsTex', { width: 256, height: 256 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#063344';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(130,245,255,0.42)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 28; i++) {
    const cx = (i * 53) % 256;
    const cy = (i * 89) % 256;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 + (i % 4) * 5, 10 + (i % 3) * 4, (i * 0.4) % Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
  tex.update(true);
  tex.uScale = 24;
  tex.vScale = 24;
  return tex;
}

function buildSalvageWreckMesh(scene: Scene, site: SalvageSite): TransformNode {
  const root = new TransformNode(`salvage_${site.id}`, scene);
  root.position.set(site.position.x, site.position.y, site.position.z);

  const hullMat = new PBRMaterial(`salvageMat_${site.id}`, scene);
  hullMat.albedoColor = site.kind === 'briefcase' ? new Color3(0.75, 0.6, 0.18) : new Color3(0.24, 0.31, 0.3);
  hullMat.metallic = 0.62;
  hullMat.roughness = 0.45;

  const beaconMat = new PBRMaterial(`salvageBeacon_${site.id}`, scene);
  beaconMat.albedoColor = new Color3(0.18, 0.95, 0.85);
  beaconMat.emissiveColor = new Color3(0.15, 0.88, 0.78);

  if (site.kind === 'briefcase') {
    const caseBody = MeshBuilder.CreateCylinder(`${site.id}_case`, { diameter: 0.95, height: 0.34, tessellation: 12 }, scene);
    caseBody.scaling.set(1.3, 1.0, 0.8);
    caseBody.rotation.z = 0.28;
    caseBody.material = hullMat;
    caseBody.parent = root;
    const beacon = MeshBuilder.CreateSphere(`${site.id}_beacon`, { diameter: 0.24, segments: 12 }, scene);
    beacon.position.set(0.32, 0.25, 0);
    beacon.material = beaconMat;
    beacon.parent = root;
  } else if (site.kind === 'aircraft_wreck') {
    const fuse = MeshBuilder.CreateCylinder(`${site.id}_fuse`, { diameterTop: 0.75, diameterBottom: 1.35, height: 6.2, tessellation: 18 }, scene);
    fuse.rotation.x = Math.PI * 0.5;
    fuse.rotation.z = 0.32;
    fuse.material = hullMat;
    fuse.parent = root;
    const wing = MeshBuilder.CreateBox(`${site.id}_wing`, { width: 7.4, height: 0.16, depth: 1.45 }, scene);
    wing.rotation.z = 0.32;
    wing.position.y = 0.25;
    wing.material = hullMat;
    wing.parent = root;
  } else {
    const hull = MeshBuilder.CreateRibbon(
      `${site.id}_hull`,
      {
        pathArray: [
          [new Vector3(-1.35, 0.45, -2.5), new Vector3(0, -0.5, -2.6), new Vector3(1.35, 0.45, -2.5)],
          [new Vector3(-1.55, 0.55, 0.4), new Vector3(0, -0.65, 0.4), new Vector3(1.55, 0.55, 0.4)],
          [new Vector3(-0.2, 0.52, 3.1), new Vector3(0, 0.1, 3.2), new Vector3(0.2, 0.52, 3.1)],
        ],
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene
    );
    hull.rotation.z = -0.35;
    hull.material = hullMat;
    hull.parent = root;
    const mast = MeshBuilder.CreateCylinder(`${site.id}_mast`, { diameter: 0.18, height: 2.2, tessellation: 10 }, scene);
    mast.position.set(0, 1.1, -0.2);
    mast.material = beaconMat;
    mast.parent = root;
  }
  return root;
}

export class WaterDivingSystem implements GameModule {
  public readonly moduleId = 'physik_wasser_tauchen';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private weather!: WeatherClimateSystem;
  private loader!: AssetLoader;
  private scene!: Scene;

  private oceanMesh!: Mesh;
  private oceanMat!: PBRMaterial;
  private causticTex!: DynamicTexture;
  private poolMesh!: Mesh;
  private shoreFoamMeshes: Array<{ mesh: Mesh; baseX: number }> = [];
  private shoreFoamMat!: PBRMaterial;
  private bubbleParticles: ParticleSystem | null = null;
  public salvageSites: SalvageSite[] = [];
  public isCameraUnderwater = false;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.weather = registry.getModule<WeatherClimateSystem>('welt_und_wetter');
    this.loader = registry.getService<AssetLoader>('assetLoader');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;

    const oceanNorm = this.loader.getTextureBank().createWaveNormalMap('ocean_normal', 256);
    this.causticTex = createCausticTexture(this.scene);

    // Ocean & coastal water plane (high tessellation + animated caustics shimmer)
    this.oceanMesh = MeshBuilder.CreateGround('leonidaOcean', { width: 1600, height: 1600, subdivisions: 84 }, this.scene);
    this.oceanMesh.position.y = 0;
    this.oceanMesh.receiveShadows = true;

    this.oceanMat = new PBRMaterial('leonidaOceanMat', this.scene);
    this.oceanMat.albedoColor = new Color3(0.04, 0.36, 0.44);
    this.oceanMat.emissiveTexture = this.causticTex;
    this.oceanMat.emissiveColor = new Color3(0.08, 0.25, 0.32);
    this.oceanMat.metallic = 0.14;
    this.oceanMat.roughness = 0.06;
    this.oceanMat.alpha = 0.88;
    this.oceanMat.bumpTexture = oceanNorm;
    this.oceanMat.bumpTexture.level = 0.72;
    oceanNorm.uScale = 32;
    oceanNorm.vScale = 32;
    this.oceanMesh.material = this.oceanMat;

    // Animated shoreline breaking whitewash strips along Vice Beach & Starfish Island (IMG_8168)
    this.shoreFoamMat = new PBRMaterial('shoreFoamMat', this.scene);
    this.shoreFoamMat.albedoColor = new Color3(0.94, 0.98, 1.0);
    this.shoreFoamMat.emissiveColor = new Color3(0.18, 0.25, 0.28);
    this.shoreFoamMat.roughness = 0.52;
    this.shoreFoamMat.alpha = 0.55;
    for (let z = -150; z <= 180; z += 42) {
      const foam = MeshBuilder.CreateGround(`viceFoam_${z}`, { width: 4.5, height: 40, subdivisions: 2 }, this.scene);
      foam.position.set(255, 0.14, z);
      foam.material = this.shoreFoamMat;
      this.shoreFoamMeshes.push({ mesh: foam, baseX: 255 });
    }

    // Star Island Villa Infinity Pool (elevated deck pool at x=22, y=1.35, z=12)
    this.poolMesh = MeshBuilder.CreateGround('villaInfinityPool', { width: 16, height: 9, subdivisions: 4 }, this.scene);
    this.poolMesh.position.set(22, 1.35, 12);
    const poolMat = new PBRMaterial('villaPoolMat', this.scene);
    poolMat.albedoColor = new Color3(0.08, 0.56, 0.72);
    poolMat.emissiveTexture = this.causticTex;
    poolMat.emissiveColor = new Color3(0.05, 0.22, 0.3);
    poolMat.roughness = 0.04;
    poolMat.metallic = 0.05;
    poolMat.alpha = 0.82;
    poolMat.bumpTexture = oceanNorm;
    this.poolMesh.material = poolMat;

    this.createUnderwaterBubbles();
    this.initSalvageSites();
    this.readiness = 'initialized';
  }

  private createUnderwaterBubbles(): void {
    const ps = new ParticleSystem('underwaterBubbles', 180, this.scene);
    ps.particleTexture = new Texture(
      'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="rgba(220,248,255,0.65)"/></svg>'
        ),
      this.scene
    );
    ps.minSize = 0.06;
    ps.maxSize = 0.18;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 1.6;
    ps.emitRate = 0;
    ps.direction1 = new Vector3(-0.2, 1.6, -0.2);
    ps.direction2 = new Vector3(0.2, 2.4, 0.2);
    ps.color1 = new Color4(0.8, 0.96, 1, 0.65);
    ps.start();
    this.bubbleParticles = ps;
  }

  private initSalvageSites(): void {
    this.salvageSites = [
      {
        id: 'salvage_star_wreck',
        name: 'Sunken Smuggler Yacht',
        kind: 'wreck',
        position: { x: 82, y: -5.5, z: 45 },
        depthMeters: 5.5,
        rewardCents: 350000,
      },
      {
        id: 'salvage_vcia_plane',
        name: 'Crashed Cargo Twin-Prop',
        kind: 'aircraft_wreck',
        position: { x: 245, y: -7.5, z: -120 },
        depthMeters: 7.5,
        rewardCents: 620000,
      },
      {
        id: 'salvage_swamp_case',
        name: 'Cartel Waterproof Briefcase',
        kind: 'briefcase',
        position: { x: -185, y: -2.4, z: 245 },
        depthMeters: 2.4,
        rewardCents: 180000,
      },
    ];

    for (const site of this.salvageSites) {
      if (this.registry.state.collectedSalvageIds.has(site.id)) continue;
      site.mesh = buildSalvageWreckMesh(this.scene, site);
    }
  }

  sampleWaterSurface(x: number, z: number): { height: number; normal: Vec3; current: Vec3; zone: 'ocean' | 'pool' | 'swamp' } {
    if (x >= 14 && x <= 30 && z >= 7.5 && z <= 16.5) {
      return { height: 1.35, normal: { x: 0, y: 1, z: 0 }, current: { x: 0, y: 0, z: 0 }, zone: 'pool' };
    }

    const inSwamp = x < -120 && z > 120;
    const ampScale = inSwamp ? 0.15 : this.weather.currentParams.waveAmplitudeScale;
    const t = this.registry.clock.simulationTime;

    let h = 0;
    let dHx = 0;
    let dHz = 0;
    for (const w of OCEAN_WAVES) {
      const k = (Math.PI * 2) / w.wavelength;
      const phase = k * (w.dirX * x + w.dirZ * z) - w.speed * t;
      const amp = w.amplitude * ampScale;
      h += Math.sin(phase) * amp;
      const d = Math.cos(phase) * amp * k;
      dHx += d * w.dirX;
      dHz += d * w.dirZ;
    }

    const invLen = 1 / Math.hypot(-dHx, 1, -dHz);
    const wind = this.registry.state.windVector;
    return {
      height: h,
      normal: { x: -dHx * invLen, y: invLen, z: -dHz * invLen },
      current: {
        x: (inSwamp ? 0.15 : 0.45) + wind.x * 0.04,
        y: 0,
        z: (inSwamp ? 0.35 : -0.25) + wind.z * 0.04,
      },
      zone: inSwamp ? 'swamp' : 'ocean',
    };
  }

  computeBuoyancyForce(massKg: number, displacedVolumeM3: number, submergedFraction: number): number {
    const waterDensity = 1025;
    const g = 9.81;
    const clampedSub = clamp(submergedFraction, 0, 1);
    return waterDensity * displacedVolumeM3 * clampedSub * g - massKg * g;
  }

  collectSalvage(siteId: string): { ok: boolean; rewardCents: number; name: string } {
    if (this.registry.state.collectedSalvageIds.has(siteId)) {
      return { ok: false, rewardCents: 0, name: '' };
    }
    const site = this.salvageSites.find((s) => s.id === siteId);
    if (!site) return { ok: false, rewardCents: 0, name: '' };

    this.registry.state.collectedSalvageIds.add(siteId);
    if (site.mesh) {
      site.mesh.dispose();
      site.mesh = undefined;
    }

    const char = this.registry.getActiveCharacter();
    char.cashCents += site.rewardCents;
    char.attributes.lungCapacity = clamp(char.attributes.lungCapacity + 1.5, 0, 100);

    this.registry.events.emit('economy:transactionCompleted', {
      record: {
        id: `tx_salvage_${Date.now()}`,
        timestampGameSec: this.registry.clock.gameTime,
        characterId: char.id,
        account: 'cash',
        amountCents: site.rewardCents,
        balanceAfterCents: char.cashCents,
        trigger: 'diving_salvage',
        description: `Salvaged ${site.name}`,
      },
    });
    return { ok: true, rewardCents: site.rewardCents, name: site.name };
  }

  evaluateCharacterWaterState(
    pos: Vec3,
    groundY: number,
    diveHeld: boolean,
    simDt: number
  ): { state: WaterMoveState; waterHeight: number; submergedDepth: number; current: Vec3 } {
    const sample = this.sampleWaterSurface(pos.x, pos.z);
    const waterHeight = sample.height;
    const depthBelowSurface = waterHeight - pos.y;
    const char = this.registry.getActiveCharacter();

    if (waterHeight <= groundY + 0.12) {
      char.oxygenCurrent = clamp(char.oxygenCurrent + simDt * 24, 0, char.maxOxygen);
      return { state: 'land', waterHeight, submergedDepth: 0, current: { x: 0, y: 0, z: 0 } };
    }

    if (depthBelowSurface < 0.35) {
      char.oxygenCurrent = clamp(char.oxygenCurrent + simDt * 20, 0, char.maxOxygen);
      return { state: 'shore', waterHeight, submergedDepth: Math.max(0, depthBelowSurface), current: sample.current };
    }

    const lungMult = 1 + char.attributes.lungCapacity * 0.01;
    if (diveHeld || depthBelowSurface > 1.35) {
      char.oxygenCurrent = clamp(char.oxygenCurrent - (simDt * 6.5) / lungMult, 0, char.maxOxygen);
      if (char.oxygenCurrent <= 0) {
        char.health = clamp(char.health - simDt * 8, 0, char.maxHealth);
      }
      const nextState: WaterMoveState = char.oxygenCurrent < 25 ? 'low_oxygen' : 'underwater';
      return { state: nextState, waterHeight, submergedDepth: depthBelowSurface, current: sample.current };
    }

    char.oxygenCurrent = clamp(char.oxygenCurrent + simDt * 18, 0, char.maxOxygen);
    return { state: 'swimming', waterHeight, submergedDepth: depthBelowSurface, current: sample.current };
  }

  start(): void {
    this.readiness = 'running';
  }

  update(): void {
    const t = this.registry.clock.simulationTime;
    const tex = this.oceanMat.bumpTexture as Texture | null;
    if (tex) {
      tex.uOffset = (t * 0.018) % 1;
      tex.vOffset = (t * 0.012) % 1;
    }
    this.causticTex.uOffset = (-t * 0.011) % 1;
    this.causticTex.vOffset = (t * 0.014) % 1;

    const wash = Math.sin(t * 1.45) * 1.8;
    this.shoreFoamMat.alpha = 0.35 + Math.abs(Math.sin(t * 1.45)) * 0.38;
    for (let i = 0; i < this.shoreFoamMeshes.length; i++) {
      const f = this.shoreFoamMeshes[i];
      f.mesh.position.x = f.baseX + wash + Math.sin(t + i) * 0.45;
      f.mesh.position.y = 0.14 + Math.sin(t * 1.45 + i * 0.4) * 0.08;
    }

    const camPos = this.scene.activeCamera?.position;
    if (camPos) {
      const surf = this.sampleWaterSurface(camPos.x, camPos.z);
      this.isCameraUnderwater = camPos.y < surf.height - 0.08;
      if (this.isCameraUnderwater) {
        this.scene.fogColor = new Color3(0.04, 0.22, 0.32);
        this.scene.fogDensity = 0.032;
        if (this.bubbleParticles) {
          this.bubbleParticles.emitter = camPos.add(new Vector3(0, -0.5, 1.5));
          this.bubbleParticles.emitRate = 24;
        }
      } else if (this.bubbleParticles) {
        this.bubbleParticles.emitRate = 0;
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.bubbleParticles?.dispose();
    this.causticTex?.dispose();
    this.oceanMesh?.dispose();
    this.poolMesh?.dispose();
    for (const f of this.shoreFoamMeshes) f.mesh.dispose();
    this.shoreFoamMat?.dispose();
    this.oceanMat?.dispose();
    for (const s of this.salvageSites) s.mesh?.dispose();
    this.readiness = 'disposed';
  }
}
