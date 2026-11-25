/**
 * High-Tessellation Multi-Part Sculpted Vehicle Mesh Builder
 * Uses curved lofted aerodynamic body ribbons, 48-segment spoked alloy wheels,
 * curved windshields, convertible seating + rotating steering wheel, custom license plates,
 * LED projector headlights/brake/reverse lamps, clear-coat rain droplets, and RGB neon underglow.
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
  Vector3,
} from '@babylonjs/core';
import type { VehicleClass } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import type { VehicleHandlingProfile } from './vehicleModels';
import {
  buildAerodynamicHood,
  buildCurvedCabinAndGlass,
  buildLoftedCarBody,
  buildSculptedSpoiler,
  buildSpokedAlloyWheel,
} from './vehicleBodyLoft';
import { buildCockpitInstrumentCluster } from './vehicleCockpit';
import { buildUtilityVehicleSuperstructure, buildWheelWellArches } from './vehicleUtilitySculptor';

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
  const isConvertible = vehicleClass === 'muscle' && (id.includes('buccaneer') || id.includes('convertible'));

  const bodyMat = new PBRMaterial(`vehMat_${id}`, scene);
  bodyMat.albedoColor = Color3.FromHexString(colorHex);
  bodyMat.metallic = isHeavy ? 0.35 : 0.82;
  bodyMat.roughness = isHeavy ? 0.36 : 0.14;
  bodyMat.clearCoat.isEnabled = true;
  bodyMat.clearCoat.intensity = 1.0;
  bodyMat.clearCoat.roughness = 0.04;
  if (rainDropTex) {
    bodyMat.clearCoat.bumpTexture = rainDropTex;
  }

  const trimMat = new PBRMaterial(`vehTrim_${id}`, scene);
  trimMat.albedoColor = new Color3(0.08, 0.09, 0.11);
  trimMat.metallic = 0.45;
  trimMat.roughness = 0.48;

  const glassMat = new PBRMaterial(`vehGlass_${id}`, scene);
  glassMat.albedoColor = new Color3(0.06, 0.11, 0.16);
  glassMat.metallic = 0.28;
  glassMat.roughness = 0.03;
  glassMat.alpha = 0.72;

  // Curved Lofted Bodywork & Contoured Hood (zero boxy slabs)
  const chassis = buildLoftedCarBody(scene, id, vehicleClass, profile, isConvertible, bodyMat, root);
  const hood = buildAerodynamicHood(scene, id, vehicleClass, profile, bodyMat, root);

  // Sculpted Front Splitter Lip & Side Skirts
  const sw = profile.width * 0.46;
  const zf = profile.length * 0.49;
  const splitter = MeshBuilder.CreateRibbon(
    `vehSplit_${id}`,
    {
      pathArray: [
        [new Vector3(-sw, 0.19, zf - 0.18), new Vector3(0, 0.19, zf - 0.14), new Vector3(sw, 0.19, zf - 0.18)],
        [new Vector3(-sw * 0.9, 0.21, zf + 0.1), new Vector3(0, 0.21, zf + 0.16), new Vector3(sw * 0.9, 0.21, zf + 0.1)],
      ],
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene
  );
  splitter.material = trimMat;
  splitter.parent = root;

  // Cockpit Steering Wheel & Dashboard
  const steeringWheel = MeshBuilder.CreateTorus(`vehSteer_${id}`, { diameter: 0.36, thickness: 0.044, tessellation: 28 }, scene);
  steeringWheel.position.set(-profile.width * 0.21, isHeavy ? 1.56 : 0.96, profile.length * 0.08);
  steeringWheel.rotation.x = Math.PI * 0.38;
  steeringWheel.material = trimMat;
  steeringWheel.parent = root;

  if (!isMoto && vehicleClass !== 'trailer') {
    const dash = MeshBuilder.CreateCylinder(`vehDash_${id}`, { diameter: 0.3, height: profile.width * 0.8, tessellation: 20 }, scene);
    dash.rotation.z = Math.PI / 2;
    dash.scaling.set(0.7, 1.0, 1.2);
    dash.position.set(0, isHeavy ? 1.48 : 0.89, profile.length * 0.14);
    dash.material = trimMat;
    dash.parent = root;

    buildCurvedCabinAndGlass(scene, id, vehicleClass, profile, isConvertible, bodyMat, glassMat, trimMat, root);
    buildCockpitInstrumentCluster(scene, id, profile, isHeavy, root);
    buildUtilityVehicleSuperstructure(scene, id, vehicleClass, profile, trimMat, root);

    for (const side of [-1, 1]) {
      const mirror = MeshBuilder.CreateSphere(`vehMir_${id}_${side}`, { diameterX: 0.16, diameterY: 0.09, diameterZ: 0.12, segments: 14 }, scene);
      mirror.position.set(side * (profile.width * 0.54), isHeavy ? 1.66 : 0.97, profile.length * 0.12);
      mirror.material = bodyMat;
      mirror.parent = root;
    }
  }

  const spoiler = buildSculptedSpoiler(scene, id, profile, isHeavy, trimMat, root);
  spoiler.isVisible = vehicleClass === 'supercar' || vehicleClass === 'sports';

  if (vehicleClass === 'police') {
    const barRed = new PBRMaterial(`polRed_${id}`, scene);
    barRed.albedoColor = new Color3(1, 0.1, 0.15);
    barRed.emissiveColor = new Color3(1, 0.1, 0.2);
    const barBlue = new PBRMaterial(`polBlue_${id}`, scene);
    barBlue.albedoColor = new Color3(0.1, 0.45, 1);
    barBlue.emissiveColor = new Color3(0.1, 0.5, 1);
    const bL = MeshBuilder.CreateCapsule(`polBarL_${id}`, { radius: 0.07, height: 0.46, tessellation: 14 }, scene);
    bL.rotation.z = Math.PI / 2;
    bL.position.set(-0.24, 1.42, -0.08);
    bL.material = barRed;
    bL.parent = root;
    const bR = MeshBuilder.CreateCapsule(`polBarR_${id}`, { radius: 0.07, height: 0.46, tessellation: 14 }, scene);
    bR.rotation.z = Math.PI / 2;
    bR.position.set(0.24, 1.42, -0.08);
    bR.material = barBlue;
    bR.parent = root;
  }

  // LED Projector Headlights, Sculpted Light-Bar Taillights, Reverse Lamps & Dual Chrome Exhausts
  const headLightMat = new PBRMaterial(`vehHLMat_${id}`, scene);
  headLightMat.albedoColor = new Color3(0.95, 0.98, 1);
  headLightMat.emissiveColor = new Color3(0.95, 0.98, 1);

  const brakeLightMat = new PBRMaterial(`vehBLMat_${id}`, scene);
  brakeLightMat.albedoColor = new Color3(0.85, 0.08, 0.08);
  brakeLightMat.emissiveColor = new Color3(0.28, 0.02, 0.02);

  const reverseLightMat = new PBRMaterial(`vehRLMat_${id}`, scene);
  reverseLightMat.albedoColor = new Color3(0.9, 0.92, 0.95);
  reverseLightMat.emissiveColor = new Color3(0, 0, 0);

  for (const side of [-1, 1]) {
    const hl = MeshBuilder.CreateCylinder(`vehHL_${id}_${side}`, { diameterTop: 0.16, diameterBottom: 0.12, height: 0.14, tessellation: 20 }, scene);
    hl.rotation.x = Math.PI / 2;
    hl.scaling.set(1.6, 1.0, 0.65);
    hl.position.set(side * (profile.width * 0.34), isHeavy ? 1.02 : 0.62, profile.length * 0.48);
    hl.material = headLightMat;
    hl.parent = root;

    const bl = MeshBuilder.CreateCapsule(`vehBL_${id}_${side}`, { radius: 0.055, height: 0.36, tessellation: 14 }, scene);
    bl.rotation.z = Math.PI / 2;
    bl.position.set(side * (profile.width * 0.33), isHeavy ? 1.05 : 0.74, -profile.length * 0.485);
    bl.material = brakeLightMat;
    bl.parent = root;

    const rl = MeshBuilder.CreateCapsule(`vehRL_${id}_${side}`, { radius: 0.036, height: 0.14, tessellation: 12 }, scene);
    rl.rotation.z = Math.PI / 2;
    rl.position.set(side * (profile.width * 0.17), isHeavy ? 0.92 : 0.64, -profile.length * 0.485);
    rl.material = reverseLightMat;
    rl.parent = root;

    const ex = MeshBuilder.CreateCylinder(`vehEx_${id}_${side}`, { diameter: 0.12, height: 0.24, tessellation: 20 }, scene);
    ex.rotation.x = Math.PI / 2;
    ex.position.set(side * (profile.width * 0.26), 0.28, -profile.length * 0.49);
    ex.material = trimMat;
    ex.parent = root;
  }

  // Custom Leonida License Plate (matching IMG_8170 rear plate clarity)
  const plateMesh = MeshBuilder.CreatePlane(`vehPlate_${id}`, { width: 0.38, height: 0.15 }, scene);
  plateMesh.position.set(0, 0.56, -profile.length * 0.495);
  plateMesh.rotation.y = Math.PI;
  const plateMat = new PBRMaterial(`vehPlateMat_${id}`, scene);
  plateMat.albedoTexture = buildPlateTexture(scene, id, plate);
  plateMat.roughness = 0.35;
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

  const tireMat = new PBRMaterial(`vehTireMat_${id}`, scene);
  tireMat.albedoColor = new Color3(0.08, 0.08, 0.1);
  tireMat.roughness = 0.86;

  const rimMat = new PBRMaterial(`vehRimMat_${id}`, scene);
  rimMat.albedoColor = id.includes('lowrider') || id.includes('donk') ? new Color3(0.92, 0.72, 0.24) : new Color3(0.82, 0.85, 0.9);
  rimMat.metallic = 0.94;
  rimMat.roughness = 0.16;

  const caliperMat = new PBRMaterial(`vehCal_${id}`, scene);
  caliperMat.albedoColor = new Color3(0.88, 0.14, 0.16);
  caliperMat.metallic = 0.65;
  caliperMat.roughness = 0.28;

  const wheelDiam = isHeavy ? 0.96 : id.includes('donk') ? 0.92 : 0.74;
  const wOffsets: Array<[number, number]> = isMoto
    ? [[0, profile.length * 0.36], [0, -profile.length * 0.36]]
    : [
        [-profile.width * 0.47, profile.length * 0.32],
        [profile.width * 0.47, profile.length * 0.32],
        [-profile.width * 0.47, -profile.length * 0.32],
        [profile.width * 0.47, -profile.length * 0.32],
      ];

  const wheels = wOffsets.map(([wx, wz], idx) =>
    buildSpokedAlloyWheel(scene, id, idx, wx, wz, wheelDiam, isMoto, tireMat, rimMat, caliperMat, root)
  );
  buildWheelWellArches(scene, id, profile, wheelDiam, isMoto, trimMat, root);

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
