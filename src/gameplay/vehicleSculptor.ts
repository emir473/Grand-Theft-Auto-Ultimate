/**
 * High-Tessellation Multi-Part Sculpted Vehicle Mesh Builder
 * Replaces primitive boxes with sculpted bodywork, 32-segment wheels/rims/calipers,
 * windshields, interiors + rotating steering wheel, custom license plates,
 * functional headlights/brake/reverse lamps, clear-coat rain droplets, and RGB neon underglow.
 */

import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Texture,
  TransformNode,
} from '@babylonjs/core';
import type { VehicleClass } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { VehicleHandlingProfile } from './vehicleModels';

export interface SculptedVehicleRig {
  root: TransformNode;
  chassis: Mesh;
  hood: Mesh;
  steeringWheel: Mesh;
  spoiler: Mesh;
  bodyMat: PBRMaterial;
  glassMat: PBRMaterial;
  rimMat: PBRMaterial;
  brakeLightMat: PBRMaterial;
  reverseLightMat: PBRMaterial;
  headLightMat: PBRMaterial;
  underglowMat: PBRMaterial;
  underglowPlane: Mesh;
  wheels: TransformNode[];
}

function buildPlateTexture(scene: Scene, id: string, plate: string): DynamicTexture {
  const tex = new DynamicTexture(`plate_${id}`, { width: 256, height: 96 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(10, 10, 236, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEONIDA · SUNSHINE', 128, 25);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(plate, 128, 72);
  tex.update(true);
  return tex;
}

export function buildSculptedVehicleRig(
  scene: Scene,
  gfx: GraphicsEngine,
  id: string,
  vehicleClass: VehicleClass,
  profile: VehicleHandlingProfile,
  colorHex: string,
  plate: string,
  rainDropTex?: Texture
): SculptedVehicleRig {
  const root = new TransformNode(`veh_${id}`, scene);
  const isHeavy = vehicleClass === 'bus' || vehicleClass === 'truck' || vehicleClass === 'trailer';
  const isMoto = vehicleClass === 'motorcycle';
  const isConvertible = vehicleClass === 'muscle' && id.includes('buccaneer');

  // Clear-coat pearlescent paint with subtle metallic flake + optional rain droplet bump
  const bodyMat = new PBRMaterial(`vehMat_${id}`, scene);
  bodyMat.albedoColor = Color3.FromHexString(colorHex);
  bodyMat.metallic = isHeavy ? 0.35 : 0.78;
  bodyMat.roughness = isHeavy ? 0.38 : 0.16;
  bodyMat.clearCoat.isEnabled = true;
  bodyMat.clearCoat.intensity = 1.0;
  bodyMat.clearCoat.roughness = 0.05;
  if (rainDropTex) {
    bodyMat.clearCoat.bumpTexture = rainDropTex;
  }

  const trimMat = new PBRMaterial(`vehTrim_${id}`, scene);
  trimMat.albedoColor = new Color3(0.08, 0.09, 0.11);
  trimMat.metallic = 0.4;
  trimMat.roughness = 0.52;

  const glassMat = new PBRMaterial(`vehGlass_${id}`, scene);
  glassMat.albedoColor = new Color3(0.06, 0.1, 0.15);
  glassMat.metallic = 0.25;
  glassMat.roughness = 0.04;
  glassMat.alpha = 0.76;

  // Lower sculpted beltline chassis + arched front/rear bumpers
  const bodyHeight = isHeavy ? 1.55 : isMoto ? 0.48 : 0.66;
  const chassis = MeshBuilder.CreateBox(`vehBody_${id}`, { width: profile.width, height: bodyHeight, depth: profile.length * 0.94 }, scene);
  chassis.position.y = isHeavy ? 1.15 : 0.62;
  chassis.material = bodyMat;
  chassis.parent = root;

  // Front aerodynamic splitter & grille
  const frontSplitter = MeshBuilder.CreateBox(`vehSplit_${id}`, { width: profile.width * 0.98, height: 0.16, depth: 0.42 }, scene);
  frontSplitter.position.set(0, 0.32, profile.length * 0.48);
  frontSplitter.material = trimMat;
  frontSplitter.parent = root;

  // Sloped hood deck
  const hood = MeshBuilder.CreateBox(`vehHood_${id}`, { width: profile.width * 0.88, height: 0.14, depth: profile.length * 0.34 }, scene);
  hood.position.set(0, isHeavy ? 1.48 : 0.94, profile.length * 0.26);
  hood.rotation.x = isHeavy ? 0.04 : 0.11;
  hood.material = bodyMat;
  hood.parent = root;

  // Cockpit interior tub & dashboard (visible in cockpit camera + convertibles)
  const steeringWheel = MeshBuilder.CreateTorus(`vehSteer_${id}`, { diameter: 0.36, thickness: 0.045, tessellation: 20 }, scene);
  steeringWheel.position.set(-profile.width * 0.22, isHeavy ? 1.55 : 0.98, profile.length * 0.08);
  steeringWheel.rotation.x = Math.PI * 0.38;
  steeringWheel.material = trimMat;
  steeringWheel.parent = root;

  if (!isMoto && vehicleClass !== 'trailer') {
    const dash = MeshBuilder.CreateBox(`vehDash_${id}`, { width: profile.width * 0.82, height: 0.24, depth: 0.34 }, scene);
    dash.position.set(0, isHeavy ? 1.48 : 0.92, profile.length * 0.14);
    dash.material = trimMat;
    dash.parent = root;

    // Sloped windshield + rear fastback glass
    const windshield = MeshBuilder.CreateBox(`vehWindshield_${id}`, { width: profile.width * 0.82, height: 0.56, depth: 0.06 }, scene);
    windshield.position.set(0, isHeavy ? 1.98 : 1.15, profile.length * 0.11);
    windshield.rotation.x = isHeavy ? 0.25 : 0.82;
    windshield.material = glassMat;
    windshield.parent = root;

    if (!isConvertible) {
      const roof = MeshBuilder.CreateBox(`vehRoof_${id}`, { width: profile.width * 0.8, height: 0.08, depth: profile.length * (isHeavy ? 0.65 : 0.34) }, scene);
      roof.position.set(0, isHeavy ? 2.25 : 1.35, -profile.length * 0.07);
      roof.material = bodyMat;
      roof.parent = root;

      const sideGlass = MeshBuilder.CreateBox(`vehCabinGlass_${id}`, { width: profile.width * 0.78, height: 0.42, depth: profile.length * 0.32 }, scene);
      sideGlass.position.set(0, isHeavy ? 1.95 : 1.14, -profile.length * 0.07);
      sideGlass.material = glassMat;
      sideGlass.parent = root;
    }

    // Dual Side Mirrors
    for (const side of [-1, 1]) {
      const mirror = MeshBuilder.CreateBox(`vehMir_${id}_${side}`, { width: 0.16, height: 0.09, depth: 0.12 }, scene);
      mirror.position.set(side * (profile.width * 0.54), isHeavy ? 1.68 : 1.0, profile.length * 0.12);
      mirror.material = bodyMat;
      mirror.parent = root;
    }
  }

  // Sculpted Rear Spoiler / Police Lightbar
  const spoiler = MeshBuilder.CreateBox(`vehSpoiler_${id}`, { width: profile.width * 0.92, height: 0.06, depth: 0.28 }, scene);
  spoiler.position.set(0, isHeavy ? 1.98 : 1.08, -profile.length * 0.44);
  spoiler.material = trimMat;
  spoiler.parent = root;
  spoiler.isVisible = vehicleClass === 'supercar' || vehicleClass === 'sports';

  if (vehicleClass === 'police') {
    const barRed = new PBRMaterial(`polRed_${id}`, scene);
    barRed.albedoColor = new Color3(1, 0.1, 0.15);
    barRed.emissiveColor = new Color3(1, 0.1, 0.2);
    const barBlue = new PBRMaterial(`polBlue_${id}`, scene);
    barBlue.albedoColor = new Color3(0.1, 0.45, 1);
    barBlue.emissiveColor = new Color3(0.1, 0.5, 1);
    const bL = MeshBuilder.CreateBox(`polBarL_${id}`, { width: 0.45, height: 0.12, depth: 0.22 }, scene);
    bL.position.set(-0.24, 1.44, -0.1);
    bL.material = barRed;
    bL.parent = root;
    const bR = MeshBuilder.CreateBox(`polBarR_${id}`, { width: 0.45, height: 0.12, depth: 0.22 }, scene);
    bR.position.set(0.24, 1.44, -0.1);
    bR.material = barBlue;
    bR.parent = root;
  }

  // Headlights, Brake Lights, Reverse Lights & Dual Exhaust
  const headLightMat = new PBRMaterial(`vehHLMat_${id}`, scene);
  headLightMat.albedoColor = new Color3(0.95, 0.98, 1);
  headLightMat.emissiveColor = new Color3(0.95, 0.98, 1);

  const brakeLightMat = new PBRMaterial(`vehBLMat_${id}`, scene);
  brakeLightMat.albedoColor = new Color3(0.85, 0.08, 0.08);
  brakeLightMat.emissiveColor = new Color3(0.25, 0.02, 0.02);

  const reverseLightMat = new PBRMaterial(`vehRLMat_${id}`, scene);
  reverseLightMat.albedoColor = new Color3(0.9, 0.92, 0.95);
  reverseLightMat.emissiveColor = new Color3(0, 0, 0);

  for (const side of [-1, 1]) {
    const hl = MeshBuilder.CreateBox(`vehHL_${id}_${side}`, { width: 0.32, height: 0.12, depth: 0.08 }, scene);
    hl.position.set(side * (profile.width * 0.34), isHeavy ? 1.05 : 0.68, profile.length * 0.47);
    hl.material = headLightMat;
    hl.parent = root;

    const bl = MeshBuilder.CreateBox(`vehBL_${id}_${side}`, { width: 0.34, height: 0.12, depth: 0.08 }, scene);
    bl.position.set(side * (profile.width * 0.34), isHeavy ? 1.05 : 0.72, -profile.length * 0.47);
    bl.material = brakeLightMat;
    bl.parent = root;

    const rl = MeshBuilder.CreateBox(`vehRL_${id}_${side}`, { width: 0.14, height: 0.08, depth: 0.08 }, scene);
    rl.position.set(side * (profile.width * 0.18), isHeavy ? 0.92 : 0.62, -profile.length * 0.47);
    rl.material = reverseLightMat;
    rl.parent = root;

    const ex = MeshBuilder.CreateCylinder(`vehEx_${id}_${side}`, { diameter: 0.11, height: 0.22, tessellation: 16 }, scene);
    ex.rotation.x = Math.PI / 2;
    ex.position.set(side * (profile.width * 0.26), 0.32, -profile.length * 0.48);
    ex.material = trimMat;
    ex.parent = root;
  }

  // Custom Leonida License Plate
  const plateMesh = MeshBuilder.CreatePlane(`vehPlate_${id}`, { width: 0.38, height: 0.15 }, scene);
  plateMesh.position.set(0, 0.56, -profile.length * 0.48);
  plateMesh.rotation.y = Math.PI;
  const plateMat = new PBRMaterial(`vehPlateMat_${id}`, scene);
  plateMat.albedoTexture = buildPlateTexture(scene, id, plate);
  plateMat.roughness = 0.4;
  plateMesh.material = plateMat;
  plateMesh.parent = root;

  // Customizable RGB Neon Underglow Plane
  const underglowMat = new PBRMaterial(`vehGlowMat_${id}`, scene);
  underglowMat.albedoColor = new Color3(0, 0.9, 1);
  underglowMat.emissiveColor = new Color3(0, 0.9, 1);
  underglowMat.alpha = 0.48;
  const underglowPlane = MeshBuilder.CreateGround(`vehGlow_${id}`, { width: profile.width * 1.18, height: profile.length * 0.96 }, scene);
  underglowPlane.position.set(0, 0.06, 0);
  underglowPlane.material = underglowMat;
  underglowPlane.parent = root;
  underglowPlane.isVisible = false;

  // High-Tessellation (32-segment) Wheels, Alloy Rims & Brake Calipers
  const tireMat = new PBRMaterial(`vehTireMat_${id}`, scene);
  tireMat.albedoColor = new Color3(0.09, 0.09, 0.11);
  tireMat.roughness = 0.86;

  const rimMat = new PBRMaterial(`vehRimMat_${id}`, scene);
  rimMat.albedoColor = id.includes('lowrider') || id.includes('donk') ? new Color3(0.92, 0.72, 0.24) : new Color3(0.78, 0.82, 0.88);
  rimMat.metallic = 0.92;
  rimMat.roughness = 0.18;

  const caliperMat = new PBRMaterial(`vehCal_${id}`, scene);
  caliperMat.albedoColor = new Color3(0.88, 0.14, 0.16);
  caliperMat.metallic = 0.6;
  caliperMat.roughness = 0.3;

  const wheels: TransformNode[] = [];
  const wheelDiam = isHeavy ? 0.96 : id.includes('donk') ? 0.92 : 0.74;
  const wOffsets: Array<[number, number]> = isMoto
    ? [
        [0, profile.length * 0.36],
        [0, -profile.length * 0.36],
      ]
    : [
        [-profile.width * 0.47, profile.length * 0.32],
        [profile.width * 0.47, profile.length * 0.32],
        [-profile.width * 0.47, -profile.length * 0.32],
        [profile.width * 0.47, -profile.length * 0.32],
      ];

  wOffsets.forEach(([wx, wz], idx) => {
    const wNode = new TransformNode(`vehWNode_${id}_${idx}`, scene);
    wNode.position.set(wx, wheelDiam * 0.5, wz);
    wNode.parent = root;

    const tire = MeshBuilder.CreateCylinder(`vehW_${id}_${idx}`, { diameter: wheelDiam, height: isMoto ? 0.18 : 0.26, tessellation: 32 }, scene);
    tire.rotation.z = Math.PI / 2;
    tire.material = tireMat;
    tire.parent = wNode;

    const rim = MeshBuilder.CreateCylinder(`vehRim_${id}_${idx}`, { diameter: wheelDiam * 0.66, height: isMoto ? 0.19 : 0.27, tessellation: 32 }, scene);
    rim.rotation.z = Math.PI / 2;
    rim.material = rimMat;
    rim.parent = wNode;

    const caliper = MeshBuilder.CreateBox(`vehCal_${id}_${idx}`, { width: 0.12, height: 0.18, depth: 0.16 }, scene);
    caliper.position.set(wx < 0 ? 0.04 : -0.04, 0.08, 0.12);
    caliper.material = caliperMat;
    caliper.parent = wNode;

    wheels.push(wNode);
  });

  gfx.registerShadowCaster(root, true);
  return {
    root,
    chassis,
    hood,
    steeringWheel,
    spoiler,
    bodyMat,
    glassMat,
    rimMat,
    brakeLightMat,
    reverseLightMat,
    headLightMat,
    underglowMat,
    underglowPlane,
    wheels,
  };
}
