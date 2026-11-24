import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
} from '@babylonjs/core';
import type { WeatherClimateSystem } from './weatherSystem';
import { sampleLeonidaHeight } from './terrainHeightfield';
import { posterUVToWorld } from './leonidaGeoData';

export interface TrafficSignalNode {
  id: string;
  x: number;
  z: number;
  nsGreen: boolean;
  nsLampMat: PBRMaterial;
  ewLampMat: PBRMaterial;
}

export class FoliageAndTrafficLights {
  private signals: TrafficSignalNode[] = [];
  private phaseTimer = 0;
  private cyclePhase: 0 | 1 | 2 | 3 = 0; // 0: NS green, 1: NS yellow, 2: EW green, 3: EW yellow
  private palmCrownMaster?: Mesh;

  build(scene: Scene, weather: WeatherClimateSystem, parent: TransformNode): void {
    const trunkMat = new PBRMaterial('palmTrunkMat', scene);
    trunkMat.albedoColor = new Color3(0.42, 0.31, 0.22);
    trunkMat.roughness = 0.88;

    const frondMat = new PBRMaterial('palmFrondMat', scene);
    frondMat.albedoColor = new Color3(0.16, 0.46, 0.18);
    frondMat.roughness = 0.68;

    const baseTrunk = MeshBuilder.CreateCylinder(
      'palmTrunkMaster',
      { diameterTop: 0.32, diameterBottom: 0.55, height: 7.5, tessellation: 8 },
      scene
    );
    baseTrunk.material = trunkMat;
    baseTrunk.parent = parent;

    const baseCrown = MeshBuilder.CreateSphere(
      'palmCrownMaster',
      { diameterX: 4.8, diameterY: 1.4, diameterZ: 4.8, segments: 6 },
      scene
    );
    baseCrown.material = frondMat;
    baseCrown.parent = parent;
    this.palmCrownMaster = baseCrown;

    const palmCoords: Array<[number, number]> = [
      [-18, -14], [18, -14], [-22, 4], [24, -18], [-32, -20], [38, -20],
      [152, -120], [152, -60], [152, 0], [152, 60], [152, 120], [152, 180],
      [-126, -120], [-126, -60], [-126, 0], [-126, 60], [-126, 120],
    ];

    // Add palms around Leaf Links, Tequesta, Ambrosia, Key Lento
    const extraUV: Array<[number, number]> = [
      [0.785, 0.415], [0.790, 0.425], [0.685, 0.578], [0.555, 0.832], [0.548, 0.338], [0.305, 0.355],
    ];
    for (const [u, v] of extraUV) {
      const xz = posterUVToWorld(u, v);
      palmCoords.push([xz.x, xz.z], [xz.x + 12, xz.z - 8]);
    }

    const trunkMatrices: Matrix[] = [];
    const crownMatrices: Matrix[] = [];
    for (const [px, pz] of palmCoords) {
      const h = Math.max(0.2, sampleLeonidaHeight(px, pz));
      trunkMatrices.push(Matrix.Translation(px, h + 3.75, pz));
      crownMatrices.push(Matrix.Translation(px, h + 7.6, pz));
    }
    baseTrunk.thinInstanceAdd(trunkMatrices);
    baseCrown.thinInstanceAdd(crownMatrices);

    // Streetlight poles along Ocean Drive, Downtown & I-404
    const poleMat = new PBRMaterial('streetLightMat', scene);
    poleMat.albedoColor = new Color3(0.2, 0.22, 0.25);
    poleMat.emissiveColor = new Color3(0.95, 0.85, 0.65);
    weather.registerNightEmissiveMaterial(poleMat);

    const poleMaster = MeshBuilder.CreateCylinder('streetPoleMaster', { diameter: 0.22, height: 6.2, tessellation: 6 }, scene);
    poleMaster.material = poleMat;
    poleMaster.parent = parent;
    const poleMatrices: Matrix[] = [];
    for (let z = -140; z <= 180; z += 40) {
      poleMatrices.push(Matrix.Translation(158, 3.5, z));
      poleMatrices.push(Matrix.Translation(-132, 3.5, z));
    }
    poleMaster.thinInstanceAdd(poleMatrices);

    // Synchronized 3D Traffic Light Assemblies at Major Vice City Intersections
    const intersections: Array<[string, number, number]> = [
      ['sig_dt_east', -140, -28],
      ['sig_dt_ammu', -240, -28],
      ['sig_ocean_mid', 165, -28],
      ['sig_dt_bank', -140, 95],
    ];
    for (const [id, ix, iz] of intersections) {
      const h = sampleLeonidaHeight(ix, iz);
      const nsMat = new PBRMaterial(`${id}_ns`, scene);
      nsMat.albedoColor = new Color3(0.1, 0.8, 0.2);
      nsMat.emissiveColor = new Color3(0.1, 0.95, 0.25);

      const ewMat = new PBRMaterial(`${id}_ew`, scene);
      ewMat.albedoColor = new Color3(0.9, 0.15, 0.15);
      ewMat.emissiveColor = new Color3(0.95, 0.12, 0.12);

      const pole = MeshBuilder.CreateCylinder(`${id}_pole`, { diameter: 0.24, height: 5.5, tessellation: 6 }, scene);
      pole.position.set(ix + 6, h + 2.75, iz + 6);
      pole.material = poleMat;
      pole.parent = parent;

      const nsLamp = MeshBuilder.CreateBox(`${id}_nsLamp`, { width: 0.6, height: 0.9, depth: 0.35 }, scene);
      nsLamp.position.set(ix + 6, h + 5.2, iz + 5.6);
      nsLamp.material = nsMat;
      nsLamp.parent = parent;

      const ewLamp = MeshBuilder.CreateBox(`${id}_ewLamp`, { width: 0.35, height: 0.9, depth: 0.6 }, scene);
      ewLamp.position.set(ix + 5.6, h + 5.2, iz + 6);
      ewLamp.material = ewMat;
      ewLamp.parent = parent;

      this.signals.push({ id, x: ix, z: iz, nsGreen: true, nsLampMat: nsMat, ewLampMat: ewMat });
    }
  }

  update(simDt: number, windSpeedMps: number, elapsedSec: number): void {
    // Wind-swaying palm crowns subtle rotation
    if (this.palmCrownMaster) {
      this.palmCrownMaster.rotation.z = Math.sin(elapsedSec * 1.8) * Math.min(0.08, windSpeedMps * 0.004);
    }

    // Traffic light state machine (8s green, 2s yellow)
    this.phaseTimer += simDt;
    const dur = this.cyclePhase === 0 || this.cyclePhase === 2 ? 8 : 2;
    if (this.phaseTimer >= dur) {
      this.phaseTimer = 0;
      this.cyclePhase = ((this.cyclePhase + 1) % 4) as 0 | 1 | 2 | 3;
      const green = new Color3(0.1, 0.95, 0.25);
      const yellow = new Color3(0.98, 0.78, 0.08);
      const red = new Color3(0.95, 0.12, 0.12);

      for (const s of this.signals) {
        s.nsGreen = this.cyclePhase === 0;
        const nsCol = this.cyclePhase === 0 ? green : this.cyclePhase === 1 ? yellow : red;
        const ewCol = this.cyclePhase === 2 ? green : this.cyclePhase === 3 ? yellow : red;
        s.nsLampMat.emissiveColor = nsCol;
        s.ewLampMat.emissiveColor = ewCol;
      }
    }
  }

  isGreenForAxis(x: number, z: number, axis: 'ns' | 'ew'): boolean {
    for (const s of this.signals) {
      if (Math.hypot(x - s.x, z - s.z) < 18) {
        return axis === 'ns' ? this.cyclePhase === 0 : this.cyclePhase === 2;
      }
    }
    return true;
  }

  dispose(): void {
    for (const s of this.signals) {
      s.nsLampMat.dispose();
      s.ewLampMat.dispose();
    }
    this.signals = [];
  }
}
