/**
 * Real-Time Wet Asphalt Mirror Puddle System
 * Adds Babylon MirrorTexture wet asphalt reflections across the Vice Marina 6-car plaza
 * and Ocean Drive (matching IMG_8171), dynamically scaled by weather wetness & quality profile.
 */

import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial,
  Plane,
  Scene,
  TransformNode,
} from '@babylonjs/core';
import type { QualityProfile } from '../core/types';
import { clamp } from '../core/types';

export class WetAsphaltReflections {
  private mirrorTex: MirrorTexture | null = null;
  private puddleMat: PBRMaterial | null = null;
  private puddleMesh: Mesh | null = null;
  private maskTex: DynamicTexture | null = null;

  build(scene: Scene, parent: TransformNode, profile: QualityProfile): void {
    const mask = new DynamicTexture('wetPuddleMaskTex', { width: 256, height: 256 }, scene, true);
    const ctx = mask.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    // Organic rain-puddle patches across plaza asphalt
    const puddles: Array<[number, number, number, number]> = [
      [58, 66, 48, 28],
      [148, 82, 56, 36],
      [105, 165, 64, 34],
      [196, 178, 44, 32],
      [52, 198, 42, 24],
    ];
    for (const [cx, cy, rx, ry] of puddles) {
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry));
      grad.addColorStop(0, 'rgba(255,255,255,0.92)');
      grad.addColorStop(0.65, 'rgba(200,200,200,0.45)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    mask.update(true);
    this.maskTex = mask;

    const texSize = profile === 'ultra' ? 512 : 256;
    const mirror = new MirrorTexture('wetPlazaMirror', texSize, scene, false);
    mirror.mirrorPlane = new Plane(0, -1, 0, 0.56);
    mirror.level = 0.72;
    this.mirrorTex = mirror;

    const mat = new PBRMaterial('wetPuddleMat', scene);
    mat.albedoColor = new Color3(0.05, 0.06, 0.08);
    mat.metallic = 0.85;
    mat.roughness = 0.04;
    mat.alpha = 0.34;
    mat.reflectionTexture = mirror;
    mat.opacityTexture = mask;
    this.puddleMat = mat;

    // Marina 6-car showcase plaza overlay (IMG_8171)
    const plaza = MeshBuilder.CreateGround('marina_wet_puddles', { width: 42, height: 48 }, scene);
    plaza.position.set(166, 0.57, -28);
    plaza.material = mat;
    plaza.parent = parent;
    this.puddleMesh = plaza;

    this.applyQuality(profile);
  }

  registerReflector(node: TransformNode): void {
    if (!this.mirrorTex) return;
    if (!this.mirrorTex.renderList) this.mirrorTex.renderList = [];
    for (const m of node.getChildMeshes(false)) {
      if (m.getTotalVertices() > 0) {
        this.mirrorTex.renderList.push(m);
      }
    }
  }

  applyQuality(profile: QualityProfile): void {
    if (!this.puddleMesh) return;
    const active = profile === 'high' || profile === 'ultra';
    this.puddleMesh.setEnabled(active);
  }

  update(wetness: number): void {
    if (!this.puddleMat || !this.mirrorTex) return;
    this.puddleMat.alpha = clamp(0.18 + wetness * 0.45, 0.16, 0.68);
    this.mirrorTex.level = clamp(0.42 + wetness * 0.48, 0.38, 0.9);
  }

  dispose(): void {
    this.mirrorTex?.dispose();
    this.maskTex?.dispose();
    this.puddleMat?.dispose();
    this.puddleMesh?.dispose();
  }
}
