/**
 * Region-Specific Wildlife AI
 * Populates Grassrivers / Buckskin Swamp with amphibious alligators,
 * Vice Beach & Lagoon skies with circling pelicans/gulls,
 * and shallow coral reefs with gliding marine fish schools.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { sampleLeonidaHeight } from '../world/terrainHeightfield';

interface WildlifeAgent {
  id: string;
  kind: 'gator' | 'bird' | 'fish';
  root: TransformNode;
  tailMesh?: Mesh;
  wingL?: Mesh;
  wingR?: Mesh;
  homeX: number;
  homeZ: number;
  altitude: number;
  orbitRadius: number;
  phase: number;
  speed: number;
}

export class WildlifeAISystem implements GameModule {
  public readonly moduleId = 'tierwelt_ki';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private scene!: Scene;
  private root!: TransformNode;
  public creatures: WildlifeAgent[] = [];

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.root = new TransformNode('wildlifeRoot', this.scene);

    const gatorMat = new PBRMaterial('gatorMat', this.scene);
    gatorMat.albedoColor = new Color3(0.18, 0.27, 0.14);
    gatorMat.roughness = 0.62;

    const birdMat = new PBRMaterial('birdMat', this.scene);
    birdMat.albedoColor = new Color3(0.92, 0.92, 0.9);
    birdMat.roughness = 0.72;

    const fishMat = new PBRMaterial('fishMat', this.scene);
    fishMat.albedoColor = new Color3(0.2, 0.74, 0.85);
    fishMat.metallic = 0.4;
    fishMat.roughness = 0.25;

    // Wetland Alligators in Grassrivers & Buckskin Swamp
    const gatorCoords: Array<[number, number]> = [
      [-520, 345],
      [-555, 370],
      [-480, 295],
      [-610, 420],
    ];
    gatorCoords.forEach(([gx, gz], idx) => {
      const node = new TransformNode(`gator_${idx}`, this.scene);
      node.parent = this.root;
      const body = MeshBuilder.CreateCapsule(`gatorBody_${idx}`, { radius: 0.22, height: 1.8 }, this.scene);
      body.rotation.x = Math.PI / 2;
      body.material = gatorMat;
      body.parent = node;

      const tail = MeshBuilder.CreateCylinder(`gatorTail_${idx}`, { diameterTop: 0.04, diameterBottom: 0.26, height: 1.2, tessellation: 8 }, this.scene);
      tail.rotation.x = -Math.PI / 2;
      tail.position.z = -1.2;
      tail.material = gatorMat;
      tail.parent = node;

      this.creatures.push({
        id: `gator_${idx}`,
        kind: 'gator',
        root: node,
        tailMesh: tail,
        homeX: gx,
        homeZ: gz,
        altitude: 0.15,
        orbitRadius: 9,
        phase: idx * 1.4,
        speed: 0.22,
      });
    });

    // Coastal Shorebirds circling Vice Beach & Starfish Island
    const birdCoords: Array<[number, number, number]> = [
      [185, 25, 22],
      [210, -45, 28],
      [15, 10, 26],
      [-490, 320, 20],
    ];
    birdCoords.forEach(([bx, bz, alt], idx) => {
      const node = new TransformNode(`bird_${idx}`, this.scene);
      node.parent = this.root;
      const torso = MeshBuilder.CreateBox(`birdBody_${idx}`, { width: 0.22, height: 0.16, depth: 0.55 }, this.scene);
      torso.material = birdMat;
      torso.parent = node;

      const wL = MeshBuilder.CreateBox(`birdWL_${idx}`, { width: 0.65, height: 0.04, depth: 0.22 }, this.scene);
      wL.position.set(-0.38, 0.04, 0);
      wL.material = birdMat;
      wL.parent = node;

      const wR = MeshBuilder.CreateBox(`birdWR_${idx}`, { width: 0.65, height: 0.04, depth: 0.22 }, this.scene);
      wR.position.set(0.38, 0.04, 0);
      wR.material = birdMat;
      wR.parent = node;

      this.creatures.push({
        id: `bird_${idx}`,
        kind: 'bird',
        root: node,
        wingL: wL,
        wingR: wR,
        homeX: bx,
        homeZ: bz,
        altitude: alt,
        orbitRadius: 24 + idx * 5,
        phase: idx * 1.8,
        speed: 0.38,
      });
    });

    // Reef Fish circling Starfish Lagoon & Vice Beach shallows
    const fishCoords: Array<[number, number]> = [
      [65, 28],
      [74, 34],
      [115, -18],
      [235, 15],
    ];
    fishCoords.forEach(([fx, fz], idx) => {
      const node = new TransformNode(`fish_${idx}`, this.scene);
      node.parent = this.root;
      const body = MeshBuilder.CreateSphere(`fishBody_${idx}`, { diameterX: 0.18, diameterY: 0.24, diameterZ: 0.55, segments: 8 }, this.scene);
      body.material = fishMat;
      body.parent = node;

      this.creatures.push({
        id: `fish_${idx}`,
        kind: 'fish',
        root: node,
        homeX: fx,
        homeZ: fz,
        altitude: -1.4,
        orbitRadius: 5,
        phase: idx * 1.1,
        speed: 0.65,
      });
    });

    this.readiness = 'initialized';
  }

  update(simDt: number): void {
    const t = this.registry.clock.simulationTime;
    const playerPos = this.registry.getActiveCharacter().position;

    for (const c of this.creatures) {
      c.phase += simDt * c.speed;
      const x = c.homeX + Math.cos(c.phase) * c.orbitRadius;
      const z = c.homeZ + Math.sin(c.phase) * c.orbitRadius;
      const yaw = -c.phase + Math.PI / 2;

      const near = Math.hypot(x - playerPos.x, z - playerPos.z) < 420;
      if (c.root.isEnabled() !== near) c.root.setEnabled(near);
      if (!near) continue;

      if (c.kind === 'gator') {
        const y = Math.max(-0.2, sampleLeonidaHeight(x, z)) + 0.12;
        c.root.position.set(x, y, z);
        c.root.rotation.y = yaw;
        if (c.tailMesh) c.tailMesh.rotation.y = Math.sin(t * 4.2 + c.phase) * 0.24;
      } else if (c.kind === 'bird') {
        const flap = Math.sin(t * 8.5 + c.phase) * 0.42;
        c.root.position.set(x, c.altitude + Math.sin(t * 1.4 + c.phase) * 1.2, z);
        c.root.rotation.y = yaw;
        c.root.rotation.z = 0.18;
        if (c.wingL) c.wingL.rotation.z = flap;
        if (c.wingR) c.wingR.rotation.z = -flap;
      } else {
        c.root.position.set(x, c.altitude, z);
        c.root.rotation.y = yaw;
      }
    }
  }

  start(): void {
    this.readiness = 'running';
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.root?.dispose();
    this.creatures = [];
    this.readiness = 'disposed';
  }
}
