/**
 * MODULE 5 – welt_architektur.js
 * Chunked Leonida / Vice City World Builder, SpatialGrid Integration,
 * Hardware Instancing (Palms, Streetlights), Drivable Road Geometry,
 * Star Island Villa, VCIA Airport, Hospital, Prison, Military Bases, and Enterable Interiors.
 */

import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { SurfaceMaterial, Vec3 } from '../core/types';
import type { AssetLoader } from '../assets/assetLoader';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { createParallaxFacadeMaterial } from '../rendering/shaders';
import type { WeatherClimateSystem } from './weatherSystem';
import { RoadNetwork } from './roadNetwork';
import { SpatialGrid } from './spatialGrid';
import { ENTERABLE_INTERIORS } from './interiors';

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

  private mats: Record<string, PBRMaterial> = {};
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
    this.buildRoadGeometry();
    this.buildChunkStarIsland();
    this.buildChunkViceBeach();
    this.buildChunkDowntown();
    this.buildChunkVCIA();
    this.buildChunkSwampAndMilitary();
    this.buildInstancedFoliageAndLights();
    this.readiness = 'initialized';
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
    this.mats['neon_coral'] = neon;

    const neonCyan = new PBRMaterial('mat_neon_cyan', this.scene);
    neonCyan.albedoColor = new Color3(0.1, 0.9, 1.0);
    neonCyan.emissiveColor = new Color3(0.08, 0.85, 1.0);
    neonCyan.roughness = 0.2;
    this.weather.registerNightEmissiveMaterial(neonCyan);
    this.mats['neon_cyan'] = neonCyan;
  }

  private registerDefaultProperties(): void {
    const props = this.registry.state.properties;
    props.set('prop_star_villa', {
      id: 'prop_star_villa',
      nameKey: 'Star Island Mansion',
      kind: 'villa',
      district: 'Star Island',
      position: { x: 0, y: 1, z: 16 },
      priceCents: 0,
      ownedBy: 'lucia',
      garageCapacity: 6,
      interiorId: 'int_star_villa',
    });
    props.set('prop_ocean_penthouse', {
      id: 'prop_ocean_penthouse',
      nameKey: 'Ocean Drive Penthouse',
      kind: 'safehouse',
      district: 'Vice Beach',
      position: { x: 185, y: 1, z: -20 },
      priceCents: 45000000, // $450,000
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
      priceCents: 18500000, // $185,000
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
      priceCents: 75000000, // $750,000
      ownedBy: null,
      garageCapacity: 2,
      interiorId: 'int_malibu_club',
    });
  }

  private createBox(
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: PBRMaterial | StandardMaterial | ReturnType<typeof createParallaxFacadeMaterial>,
    parent: TransformNode,
    castShadow = true
  ): Mesh {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    m.position.set(x, y, z);
    m.material = mat;
    m.parent = parent;
    m.receiveShadows = true;
    if (castShadow) this.gfx.registerShadowCaster(m, false);
    return m;
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
      const yPos = edge.roadType === 'rail' ? 7.6 : 0.45;

      const seg = MeshBuilder.CreateBox(`road_${canonical}`, { width, height: 0.35, depth: len + 2 }, this.scene);
      seg.position.set((a.x + b.x) / 2, yPos, (a.z + b.z) / 2);
      seg.rotation.y = Math.atan2(dx, dz);
      seg.material = edge.roadType === 'rail' ? this.mats.concrete : this.mats.asphalt;
      seg.receiveShadows = true;
      seg.parent = roadRoot;
    }
  }

  private buildChunkStarIsland(): void {
    const root = new TransformNode('chunk_star_island', this.scene);
    root.parent = this.worldRoot;

    // Island base & manicured lawn/travertine courtyard
    this.createBox('star_island_base', 140, 1.2, 110, 0, -0.1, 0, this.mats.sand, root, false);
    this.createBox('villa_courtyard', 52, 0.4, 48, 0, 0.7, -4, this.mats.travertine, root, false);

    // Villa Mansion Exterior & Enterable Room Walls (Open doorway at z=8.5)
    this.createBox('villa_back_wall', 20, 4.8, 0.6, 0, 3.3, 24, this.mats.stucco, root);
    this.createBox('villa_left_wall', 0.6, 4.8, 16, -9.7, 3.3, 16, this.mats.stucco, root);
    this.createBox('villa_right_wall', 0.6, 4.8, 16, 9.7, 3.3, 16, this.mats.stucco, root);
    this.createBox('villa_front_l', 7.5, 4.8, 0.6, -6, 3.3, 8.2, this.mats.stucco, root);
    this.createBox('villa_front_r', 7.5, 4.8, 0.6, 6, 3.3, 8.2, this.mats.stucco, root);
    this.createBox('villa_roof_1', 21, 0.5, 17, 0, 5.9, 16, this.mats.travertine, root);
    this.createBox('villa_upper_suite', 12, 3.6, 10, -2, 8.0, 17, this.mats.stucco, root);
    this.createBox('villa_upper_roof', 13, 0.4, 11, -2, 9.9, 17, this.mats.travertine, root);

    // Helipad on East Lawn
    const helipad = MeshBuilder.CreateCylinder('villa_helipad', { diameter: 14, height: 0.3, tessellation: 24 }, this.scene);
    helipad.position.set(34, 0.8, -4);
    helipad.material = this.mats.concrete;
    helipad.parent = root;
    helipad.receiveShadows = true;

    // Underground Garage Ramp & Bay on West Lawn
    this.createBox('villa_garage_bay', 14, 3.6, 16, -24, 2.3, 12, this.mats.concrete, root);
    this.createBox('villa_neon_accent', 18, 0.18, 0.18, 0, 5.7, 8.0, this.mats.neon_coral, root, false);

    this.chunks.set('star_island', {
      id: 'star_island',
      district: 'Star Island',
      center: { x: 0, y: 1, z: 0 },
      radius: 160,
      root,
      loaded: true,
    });
    this.registry.events.emit('world:chunkLoaded', { chunkId: 'star_island', district: 'Star Island' });
  }

  private buildChunkViceBeach(): void {
    const root = new TransformNode('chunk_vice_beach', this.scene);
    root.parent = this.worldRoot;

    // Beach & Ocean Drive strip (x=135..245)
    this.createBox('vice_beach_sand', 120, 1.0, 480, 195, -0.1, 20, this.mats.sand, root, false);
    this.createBox('ocean_drive_sidewalk', 24, 0.6, 440, 175, 0.35, 20, this.mats.travertine, root, false);

    // Art Deco Hotels with Parallax Interior Windows
    const hotelHeights = [22, 30, 18, 26, 34, 20];
    hotelHeights.forEach((h, i) => {
      const z = -140 + i * 65;
      const facadeMat = createParallaxFacadeMaterial(`hotel_facade_${i}`, this.scene, 6, Math.round(h / 3), i + 1.7);
      this.createBox(`hotel_tower_${i}`, 22, h, 26, 192, h / 2 + 0.5, z, facadeMat, root);
      this.createBox(`hotel_trim_${i}`, 22.4, 0.4, 26.4, 192, h + 0.5, z, i % 2 === 0 ? this.mats.neon_coral : this.mats.neon_cyan, root, false);
      this.spatialGrid.insert(`hotel_${i}`, 'building', { x: 192, y: 0, z }, { name: `Ocean Hotel ${i + 1}` });
    });

    // Club Malibu & Vice Threads Enterable Shells
    for (const interior of ENTERABLE_INTERIORS.filter((x) => x.kind === 'nightclub' || x.kind === 'clothing')) {
      this.createBox(`shell_${interior.id}`, interior.size.w, interior.size.h, interior.size.d, interior.interiorCenter.x, interior.size.h / 2 + 0.5, interior.interiorCenter.z, this.mats.stucco, root);
    }

    this.chunks.set('vice_beach', {
      id: 'vice_beach',
      district: 'Vice Beach',
      center: { x: 185, y: 1, z: 20 },
      radius: 260,
      root,
      loaded: true,
    });
    this.registry.events.emit('world:chunkLoaded', { chunkId: 'vice_beach', district: 'Vice Beach' });
  }

  private buildChunkDowntown(): void {
    const root = new TransformNode('chunk_downtown', this.scene);
    root.parent = this.worldRoot;

    // Downtown mainland ground
    this.createBox('downtown_ground', 240, 1.0, 480, -210, -0.1, 20, this.mats.concrete, root, false);

    // Skyscrapers with Parallax Interior Mapping
    const towers = [
      { x: -175, z: 25, w: 28, h: 68, d: 28 },
      { x: -215, z: 75, w: 32, h: 86, d: 30 },
      { x: -175, z: 145, w: 26, h: 54, d: 26 },
      { x: -215, z: -85, w: 30, h: 62, d: 28 },
    ];
    towers.forEach((t, idx) => {
      const fMat = createParallaxFacadeMaterial(`dt_facade_${idx}`, this.scene, 8, Math.round(t.h / 3.5), 10 + idx * 3.1);
      this.createBox(`dt_tower_${idx}`, t.w, t.h, t.d, t.x, t.h / 2 + 0.4, t.z, fMat, root);
      this.spatialGrid.insert(`dt_tower_${idx}`, 'building', { x: t.x, y: 0, z: t.z }, { name: `Vice Tower ${idx + 1}` });
    });

    // Vice City General Hospital (x=-140, z=-155)
    this.createBox('vc_hospital', 36, 16, 28, -168, 8.4, -155, this.mats.stucco, root);
    this.createBox('vc_hospital_cross', 6, 1.5, 0.5, -149.8, 12, -155, this.mats.neon_coral, root, false);

    // Banco de Leonida, Ammu-Nation, 24/7 Gas Shop, Vice Customs
    for (const int of ENTERABLE_INTERIORS.filter((x) => x.kind !== 'villa' && x.kind !== 'nightclub' && x.kind !== 'clothing')) {
      this.createBox(`shell_${int.id}`, int.size.w, int.size.h, int.size.d, int.interiorCenter.x, int.size.h / 2 + 0.4, int.interiorCenter.z, this.mats.concrete, root);
    }

    this.chunks.set('downtown_vice', {
      id: 'downtown_vice',
      district: 'Downtown Vice City',
      center: { x: -190, y: 1, z: 0 },
      radius: 280,
      root,
      loaded: true,
    });
    this.registry.events.emit('world:chunkLoaded', { chunkId: 'downtown_vice', district: 'Downtown Vice City' });
  }

  private buildChunkVCIA(): void {
    const root = new TransformNode('chunk_vcia', this.scene);
    root.parent = this.worldRoot;

    // Airport Tarmac & Runways (South-West x=-260..-420, z=-250..-420)
    this.createBox('vcia_apron', 240, 0.8, 220, -280, 0.0, -330, this.mats.concrete, root, false);
    this.createBox('vcia_runway_09L', 340, 0.3, 24, -260, 0.42, -375, this.mats.asphalt, root, false);
    this.createBox('vcia_terminal', 64, 14, 28, -240, 7.4, -312, this.mats.stucco, root);
    this.createBox('vcia_atc_tower', 9, 32, 9, -295, 16.4, -315, this.mats.concrete, root);

    this.chunks.set('vcia_airport', {
      id: 'vcia_airport',
      district: 'VCIA Airport',
      center: { x: -270, y: 1, z: -340 },
      radius: 260,
      root,
      loaded: true,
    });
    this.registry.events.emit('world:chunkLoaded', { chunkId: 'vcia_airport', district: 'VCIA Airport' });
  }

  private buildChunkSwampAndMilitary(): void {
    const root = new TransformNode('chunk_swamp_military', this.scene);
    root.parent = this.worldRoot;

    // Grassrivers Swamp (North-West)
    this.createBox('grassrivers_marsh', 260, 0.6, 220, -220, -0.15, 310, this.mats.swamp, root, false);

    // Leonida State Penitentiary (x=-280, z=220)
    this.createBox('leonida_prison_block', 48, 12, 42, -312, 6.4, 220, this.mats.concrete, root);

    // Fort Zancudo & Port Gellhorn Military Installations
    this.createBox('fort_zancudo_pad', 110, 0.8, 110, -395, 0.0, 95, this.mats.concrete, root, false);
    this.createBox('fort_zancudo_hangar', 34, 11, 28, -405, 5.9, 95, this.mats.concrete, root);
    this.createBox('port_gellhorn_pier', 90, 1.0, 65, -395, 0.1, -155, this.mats.concrete, root, false);

    this.chunks.set('swamp_military', {
      id: 'swamp_military',
      district: 'Grassrivers & Military',
      center: { x: -320, y: 1, z: 120 },
      radius: 320,
      root,
      loaded: true,
    });
    this.registry.events.emit('world:chunkLoaded', { chunkId: 'swamp_military', district: 'Grassrivers & Military' });
  }

  private buildInstancedFoliageAndLights(): void {
    // Hardware-instanced Tropical Palm Trees & Art Deco Streetlights
    const trunkMat = new PBRMaterial('palmTrunkMat', this.scene);
    trunkMat.albedoColor = new Color3(0.42, 0.31, 0.22);
    trunkMat.roughness = 0.88;

    const frondMat = new PBRMaterial('palmFrondMat', this.scene);
    frondMat.albedoColor = new Color3(0.16, 0.42, 0.18);
    frondMat.roughness = 0.72;

    const baseTrunk = MeshBuilder.CreateCylinder('palmTrunkMaster', { diameterTop: 0.32, diameterBottom: 0.55, height: 7.5, tessellation: 8 }, this.scene);
    baseTrunk.material = trunkMat;
    baseTrunk.isVisible = false;

    const baseCrown = MeshBuilder.CreateSphere('palmCrownMaster', { diameterX: 4.6, diameterY: 1.4, diameterZ: 4.6, segments: 6 }, this.scene);
    baseCrown.material = frondMat;
    baseCrown.isVisible = false;

    const palmCoords: Array<[number, number]> = [
      [-18, -14], [18, -14], [-22, 4], [24, -18], [-32, -20], [38, -20],
      [152, -120], [152, -60], [152, 0], [152, 60], [152, 120], [152, 180],
      [-126, -120], [-126, -60], [-126, 0], [-126, 60], [-126, 120],
    ];

    const trunkMatrices: Matrix[] = [];
    const crownMatrices: Matrix[] = [];
    for (const [px, pz] of palmCoords) {
      const h = this.getTerrainHeight(px, pz);
      trunkMatrices.push(Matrix.Translation(px, h + 3.75, pz));
      crownMatrices.push(Matrix.Translation(px, h + 7.6, pz));
    }
    baseTrunk.thinInstanceAdd(trunkMatrices);
    baseCrown.thinInstanceAdd(crownMatrices);
    baseTrunk.isVisible = true;
    baseCrown.isVisible = true;

    // Streetlight poles along main avenues
    const poleMat = new PBRMaterial('streetLightMat', this.scene);
    poleMat.albedoColor = new Color3(0.2, 0.22, 0.25);
    poleMat.emissiveColor = new Color3(0.95, 0.85, 0.65);
    this.weather.registerNightEmissiveMaterial(poleMat);

    const poleMaster = MeshBuilder.CreateCylinder('streetPoleMaster', { diameter: 0.22, height: 6.2, tessellation: 6 }, this.scene);
    poleMaster.material = poleMat;
    const poleMatrices: Matrix[] = [];
    for (let z = -140; z <= 180; z += 40) {
      poleMatrices.push(Matrix.Translation(158, 3.5, z));
      poleMatrices.push(Matrix.Translation(-132, 3.5, z));
    }
    poleMaster.thinInstanceAdd(poleMatrices);
  }

  getTerrainHeight(x: number, z: number): number {
    // Star Island plateau
    if (Math.abs(x) <= 72 && Math.abs(z) <= 58) return 0.9;
    // Ocean Drive & Vice Beach
    if (x >= 130 && x <= 255 && z >= -230 && z <= 265) return 0.55;
    // Downtown & VCIA & Military
    if (x <= -90 && x >= -455 && z >= -445 && z <= 270) return 0.55;
    // Grassrivers Swamp shallow water/mud
    if (x <= -90 && z > 270 && z <= 425) return 0.15;
    // Bridges connecting Star Island
    if (Math.abs(z + 28) <= 8 && x >= -145 && x <= 170) return 0.65;
    // Underwater ocean floor
    return -7.5;
  }

  getSurfaceMaterial(x: number, z: number): SurfaceMaterial {
    const wetness = this.weather.currentWetness;
    if (Math.abs(x) <= 28 && z >= -28 && z <= 20) return 'marble';
    if (Math.abs(z + 28) <= 8 && x >= -145 && x <= 170) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';
    if (x >= 188 && x <= 255) return 'sand';
    if (x <= -90 && z > 270) return 'mud';
    if (x >= 158 && x <= 172) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';
    if (x <= -132 && x >= -248) return wetness > 0.35 ? 'wet_asphalt' : 'asphalt';
    if (this.getTerrainHeight(x, z) < 0) return 'water';
    return 'gravel';
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    // Distance-based chunk visibility streaming without rebuilding geometry
    this.streamTimer += simDt;
    if (this.streamTimer < 0.75) return;
    this.streamTimer = 0;

    const p = this.registry.getActiveCharacter().position;
    for (const chunk of this.chunks.values()) {
      const dist = Math.hypot(p.x - chunk.center.x, p.z - chunk.center.z);
      const shouldShow = dist < chunk.radius + 520;
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
    this.worldRoot?.dispose();
    this.spatialGrid.clear();
    this.chunks.clear();
    this.readiness = 'disposed';
  }
}
