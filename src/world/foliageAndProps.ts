import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
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

function buildSculptedPalmTrunk(scene: Scene, mat: PBRMaterial, parent: TransformNode): Mesh {
  const rings: Vector3[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const y = t * 7.6;
    const r = 0.28 - t * 0.13 + (i % 2 === 0 ? 0.015 : 0);
    rings.push(new Vector3(r, y, 0));
  }
  const trunk = MeshBuilder.CreateLathe('palmTrunkMaster', { shape: rings, tessellation: 18 }, scene);
  trunk.material = mat;
  trunk.parent = parent;
  return trunk;
}

function buildSculptedPalmCrown(scene: Scene, mat: PBRMaterial, parent: TransformNode): Mesh {
  const frondMeshes: Mesh[] = [];
  const tiers = [
    { count: 7, pitch: 0.22, droop: 1.25, len: 3.1, yOff: 0.15 },
    { count: 6, pitch: -0.1, droop: 0.9, len: 2.6, yOff: 0.35 },
  ];
  tiers.forEach((tier, tIdx) => {
    for (let i = 0; i < tier.count; i++) {
      const ang = (i / tier.count) * Math.PI * 2 + tIdx * 0.42;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const pathArray: Vector3[][] = [];
      for (let s = 0; s <= 5; s++) {
        const u = s / 5;
        const r = 0.18 + u * tier.len;
        const y = tier.yOff + Math.sin(u * Math.PI * 0.62) * 0.95 - u * u * tier.droop + u * tier.pitch;
        const w = Math.sin(u * Math.PI) * 0.42 + 0.04;
        const cx = cos * r;
        const cz = sin * r;
        const px = -sin * w;
        const pz = cos * w;
        pathArray.push([
          new Vector3(cx - px, y - 0.08, cz - pz),
          new Vector3(cx, y + 0.06, cz),
          new Vector3(cx + px, y - 0.08, cz + pz),
        ]);
      }
      const frond = MeshBuilder.CreateRibbon(
        `frondTmp_${tIdx}_${i}`,
        { pathArray, sideOrientation: Mesh.DOUBLESIDE },
        scene
      );
      frondMeshes.push(frond);
    }
  });
  const merged = Mesh.MergeMeshes(frondMeshes, true, true, undefined, false, false)!;
  merged.name = 'palmCrownMaster';
  merged.material = mat;
  merged.parent = parent;
  return merged;
}

export class FoliageAndTrafficLights {
  private signals: TrafficSignalNode[] = [];
  private phaseTimer = 0;
  private cyclePhase: 0 | 1 | 2 | 3 = 0;
  private palmCrownMaster?: Mesh;

  build(scene: Scene, weather: WeatherClimateSystem, parent: TransformNode): void {
    const trunkMat = new PBRMaterial('palmTrunkMat', scene);
    trunkMat.albedoColor = new Color3(0.42, 0.31, 0.22);
    trunkMat.roughness = 0.88;

    const frondMat = new PBRMaterial('palmFrondMat', scene);
    frondMat.albedoColor = new Color3(0.14, 0.44, 0.17);
    frondMat.roughness = 0.58;

    const baseTrunk = buildSculptedPalmTrunk(scene, trunkMat, parent);
    const baseCrown = buildSculptedPalmCrown(scene, frondMat, parent);
    this.palmCrownMaster = baseCrown;

    const palmCoords: Array<[number, number]> = [
      [-18, -14], [18, -14], [-22, 4], [24, -18], [-32, -20], [38, -20],
      [152, -120], [152, -60], [152, 0], [152, 60], [152, 120], [152, 180],
      [182, -85], [182, -25], [182, 35], [182, 95],
      [-126, -120], [-126, -60], [-126, 0], [-126, 60], [-126, 120],
    ];

    const extraUV: Array<[number, number]> = [
      [0.785, 0.415], [0.790, 0.425], [0.685, 0.578], [0.555, 0.832], [0.548, 0.338], [0.305, 0.355],
    ];
    for (const [u, v] of extraUV) {
      const xz = posterUVToWorld(u, v);
      palmCoords.push([xz.x, xz.z], [xz.x + 12, xz.z - 8]);
    }

    const trunkMatrices: Matrix[] = [];
    const crownMatrices: Matrix[] = [];
    palmCoords.forEach(([px, pz], idx) => {
      const h = Math.max(0.2, sampleLeonidaHeight(px, pz));
      const scale = 0.9 + (idx % 4) * 0.1;
      const yaw = (idx * 1.17) % (Math.PI * 2);
      const lean = (idx % 2 === 0 ? 1 : -1) * 0.04;
      trunkMatrices.push(Matrix.Scaling(scale, scale, scale).multiply(Matrix.RotationZ(lean)).multiply(Matrix.Translation(px, h, pz)));
      crownMatrices.push(Matrix.Scaling(scale, scale, scale).multiply(Matrix.RotationY(yaw)).multiply(Matrix.Translation(px - Math.sin(lean) * 7.6 * scale, h + 7.55 * scale, pz)));
    });
    baseTrunk.thinInstanceAdd(trunkMatrices);
    baseCrown.thinInstanceAdd(crownMatrices);

    // Streetlight poles along Ocean Drive & Downtown
    const poleMat = new PBRMaterial('streetLightMat', scene);
    poleMat.albedoColor = new Color3(0.2, 0.22, 0.25);
    poleMat.emissiveColor = new Color3(0.95, 0.85, 0.65);
    weather.registerNightEmissiveMaterial(poleMat);

    const poleMaster = MeshBuilder.CreateCylinder('streetPoleMaster', { diameter: 0.22, height: 6.2, tessellation: 12 }, scene);
    poleMaster.material = poleMat;
    poleMaster.parent = parent;
    const poleMatrices: Matrix[] = [];
    for (let z = -140; z <= 180; z += 40) {
      poleMatrices.push(Matrix.Translation(158, 3.5, z));
      poleMatrices.push(Matrix.Translation(-132, 3.5, z));
    }
    poleMaster.thinInstanceAdd(poleMatrices);

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

      const pole = MeshBuilder.CreateCylinder(`${id}_pole`, { diameter: 0.24, height: 5.5, tessellation: 12 }, scene);
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
    if (this.palmCrownMaster) {
      this.palmCrownMaster.rotation.z = Math.sin(elapsedSec * 1.8) * Math.min(0.08, windSpeedMps * 0.004);
    }

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
