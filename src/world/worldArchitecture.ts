/**
 * MODULE 5 – welt_architektur.js
 * Chunked Leonida / Vice City World Builder, 3D Heightfield Terrain, SpatialGrid Integration,
 * Hardware Instancing (Palms, Streetlights), Synchronized Traffic Lights,
 * Drivable State Highway Geometry, Starfish Island, Vice Beach, Downtown, VCIA, and State Landmarks.
 */

import {
  Color3,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { SurfaceMaterial, Vec3 } from '../core/types';
import type { AssetLoader } from '../assets/assetLoader';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { WeatherClimateSystem } from './weatherSystem';
import { RoadNetwork } from './roadNetwork';
import { SpatialGrid } from './spatialGrid';
import {
  buildLeonidaTerrainMesh,
  sampleLeonidaHeight,
  sampleLeonidaSurface,
} from './terrainHeightfield';
import {
  buildDowntownAndPortChunk,
  buildStarfishIslandChunk,
  buildStateRegionsChunks,
  buildViceBeachChunk,
  type DistrictMatMap,
} from './districtBuilders';
import { FoliageAndTrafficLights } from './foliageAndProps';
import { buildRoadSignageAndCrosswalks } from './roadMarkings';

export interface WorldChunk {
  id: string;
  district: string;
  center: Vec3;
  radius: number;
  root: TransformNode;
  loaded: boolean;
}

export class WorldArchitecture implements GameModule {
  public readonly moduleId = 'welt_architektur';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private weather!: WeatherClimateSystem;
  private loader!: AssetLoader;
  private scene!: Scene;

  public readonly roadNetwork = new RoadNetwork();
  public readonly spatialGrid = new SpatialGrid(60);
  public readonly chunks = new Map<string, WorldChunk>();
  public readonly foliageAndLights = new FoliageAndTrafficLights();

  private mats: DistrictMatMap = {};
  private worldRoot!: TransformNode;
  private streamTimer = 0;

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
    this.worldRoot = new TransformNode('leonidaWorldRoot', this.scene);
    this.createSharedMaterials();
    this.registerDefaultProperties();
    buildLeonidaTerrainMesh(this.scene, this.worldRoot);
    this.buildRoadGeometry();

    const starRoot = buildStarfishIslandChunk(this.scene, this.gfx, this.mats, this.worldRoot);
    this.registerChunk('star_island', 'Starfish Island', { x: 0, y: 1, z: 0 }, 160, starRoot);

    const vbRoot = buildViceBeachChunk(this.scene, this.gfx, this.mats, this.spatialGrid, this.worldRoot);
    this.registerChunk('vice_beach', 'Vice Beach', { x: 185, y: 1, z: 20 }, 280, vbRoot);

    const dtRoot = buildDowntownAndPortChunk(this.scene, this.gfx, this.mats, this.spatialGrid, this.worldRoot);
    this.registerChunk('downtown_vice', 'Downtown Vice City', { x: -190, y: 1, z: 0 }, 360, dtRoot);

    const [vciaRoot, stateRoot] = buildStateRegionsChunks(this.scene, this.gfx, this.mats, this.worldRoot);
    this.registerChunk('vcia_airport', 'VCI Airport', { x: -270, y: 1, z: -340 }, 360, vciaRoot);
    this.registerChunk('greater_leonida', 'Greater Leonida', { x: -650, y: 1, z: 200 }, 1650, stateRoot);

    this.foliageAndLights.build(this.scene, this.weather, this.worldRoot);
    this.readiness = 'initialized';
  }

  private registerChunk(id: string, district: string, center: Vec3, radius: number, root: TransformNode): void {
    this.chunks.set(id, { id, district, center, radius, root, loaded: true });
    this.registry.events.emit('world:chunkLoaded', { chunkId: id, district });
  }

  private createSharedMaterials(): void {
    const bank = this.loader.getTextureBank();
    const makePBR = (key: string, texKey: string, fallback: Color3, rough: number, metal = 0, wettable = false): PBRMaterial => {
      const mat = new PBRMaterial(`mat_${key}`, this.scene);
      const set = bank.getSet(texKey);
      if (set) {
        mat.albedoTexture = set.albedo;
        mat.bumpTexture = set.normal;
        mat.metallicTexture = set.metallicRoughness;
        mat.useRoughnessFromMetallicTextureAlpha = false;
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.useMetallnessFromMetallicTextureBlue = true;
        mat.useAmbientOcclusionFromMetallicTextureRed = true;
      } else {
        mat.albedoColor = fallback;
      }
      mat.roughness = rough;
      mat.metallic = metal;
      if (wettable) this.weather.registerWettableMaterial(mat);
      this.mats[key] = mat;
      return mat;
    };

    makePBR('asphalt', 'asphalt_road', new Color3(0.18, 0.19, 0.2), 0.72, 0, true);
    makePBR('travertine', 'travertine', new Color3(0.88, 0.84, 0.78), 0.44, 0, true);
    makePBR('stucco', 'stucco', new Color3(0.94, 0.89, 0.85), 0.78, 0);
    makePBR('sand', 'sand', new Color3(0.86, 0.78, 0.61), 0.88, 0, true);
    makePBR('swamp', 'swamp_mud', new Color3(0.28, 0.26, 0.19), 0.65, 0, true);
    makePBR('concrete', 'concrete_hd', new Color3(0.62, 0.64, 0.66), 0.74, 0.05, true);

    const neon = new PBRMaterial('mat_neon_coral', this.scene);
    neon.albedoColor = new Color3(1.0, 0.35, 0.55);
    neon.emissiveColor = new Color3(1.0, 0.28, 0.55);
    neon.roughness = 0.2;
    this.weather.registerNightEmissiveMaterial(neon);
    this.mats.neon_coral = neon;

    const neonCyan = new PBRMaterial('mat_neon_cyan', this.scene);
    neonCyan.albedoColor = new Color3(0.1, 0.9, 1.0);
    neonCyan.emissiveColor = new Color3(0.08, 0.85, 1.0);
    neonCyan.roughness = 0.2;
    this.weather.registerNightEmissiveMaterial(neonCyan);
    this.mats.neon_cyan = neonCyan;
  }

  private registerDefaultProperties(): void {
    const props = this.registry.state.properties;
    props.set('prop_star_villa', {
      id: 'prop_star_villa',
      nameKey: 'Starfish Island Mansion',
      kind: 'villa',
      district: 'Starfish Island',
      position: { x: 0, y: 1, z: 16 },
      priceCents: 0,
      ownedBy: 'lucia',
      garageCapacity: 6,
      interiorId: 'int_star_villa',
    });
    props.set('prop_ocean_penthouse', {
      id: 'prop_ocean_penthouse',
      nameKey: 'Ocean Beach Penthouse',
      kind: 'safehouse',
      district: 'Vice Beach',
      position: { x: 185, y: 1, z: -20 },
      priceCents: 45000000,
      ownedBy: null,
      garageCapacity: 4,
      interiorId: null,
    });
    props.set('prop_downtown_garage', {
      id: 'prop_downtown_garage',
      nameKey: 'Vice Customs & Garage',
      kind: 'workshop',
      district: 'Downtown Vice City',
      position: { x: -158, y: 1, z: -22 },
      priceCents: 18500000,
      ownedBy: null,
      garageCapacity: 8,
      interiorId: null,
    });
    props.set('prop_malibu_club', {
      id: 'prop_malibu_club',
      nameKey: 'Club Malibu Vice',
      kind: 'club',
      district: 'Vice Beach',
      position: { x: 190, y: 1, z: 95 },
      priceCents: 75000000,
      ownedBy: null,
      garageCapacity: 2,
      interiorId: 'int_malibu_club',
    });
  }

  private buildRoadGeometry(): void {
    const roadRoot = new TransformNode('roadGeometryRoot', this.scene);
    roadRoot.parent = this.worldRoot;

    const seen = new Set<string>();
    for (const edge of this.roadNetwork.edges) {
      const canonical = edge.id.replace('_rev', '');
      if (seen.has(canonical)) continue;
      seen.add(canonical);

      const a = this.roadNetwork.nodes.get(edge.from);
      const b = this.roadNetwork.nodes.get(edge.to);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const width = edge.roadType === 'rail' ? 4.5 : edge.roadType === 'highway' ? 14 : 10;
      const ha = Math.max(0.45, this.getTerrainHeight(a.x, a.z));
      const hb = Math.max(0.45, this.getTerrainHeight(b.x, b.z));
      const yPos = edge.roadType === 'rail' ? 7.6 : (ha + hb) * 0.5 + 0.12;

      const seg = MeshBuilder.CreateBox(`road_${canonical}`, { width, height: 0.35, depth: len + 2 }, this.scene);
      seg.position.set((a.x + b.x) / 2, yPos, (a.z + b.z) / 2);
      seg.rotation.y = Math.atan2(dx, dz);
      seg.material = edge.roadType === 'rail' ? this.mats.concrete : this.mats.asphalt;
      seg.receiveShadows = true;
      seg.parent = roadRoot;
    }
    buildRoadSignageAndCrosswalks(this.scene, roadRoot);
  }

  getTerrainHeight(x: number, z: number): number {
    return sampleLeonidaHeight(x, z);
  }

  getSurfaceMaterial(x: number, z: number): SurfaceMaterial {
    return sampleLeonidaSurface(x, z, this.weather.currentWetness);
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    this.foliageAndLights.update(simDt, Math.hypot(this.registry.state.windVector.x, this.registry.state.windVector.z), this.registry.clock.gameTime);

    this.streamTimer += simDt;
    if (this.streamTimer < 0.75) return;
    this.streamTimer = 0;

    const p = this.registry.getActiveCharacter().position;
    for (const chunk of this.chunks.values()) {
      const dist = Math.hypot(p.x - chunk.center.x, p.z - chunk.center.z);
      const shouldShow = dist < chunk.radius + 750;
      if (chunk.root.isEnabled() !== shouldShow) {
        chunk.root.setEnabled(shouldShow);
      }
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    for (const m of Object.values(this.mats)) m.dispose();
    this.foliageAndLights.dispose();
    this.worldRoot?.dispose();
    this.spatialGrid.clear();
    this.chunks.clear();
    this.readiness = 'disposed';
  }
}
