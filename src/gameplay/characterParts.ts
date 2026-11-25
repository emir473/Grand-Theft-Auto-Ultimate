/**
 * High-Tessellation Anatomical Character Parts Builder (48-Segment Lathe)
 * Sculpted Lathe torso & tapered limbs, 5-finger hands, multi-part sneakers,
 * anatomical head/jaw/nose/lips/eyes/brows, and layered volumetric hair for Lucia & Jason.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { CharacterId } from '../core/types';

export interface LimbRigNodes {
  shoulderPivot: TransformNode;
  upperMesh: Mesh;
  elbowPivot: TransformNode;
  lowerMesh: Mesh;
  handMesh: Mesh;
}

export interface LegRigNodes {
  hipPivot: TransformNode;
  thighMesh: Mesh;
  kneePivot: TransformNode;
  shinMesh: Mesh;
  shoeMesh: Mesh;
}

export function createCharacterMaterials(
  scene: Scene,
  id: CharacterId,
  outfitColor: Color3,
  skinColor: Color3
): {
  skinMat: PBRMaterial;
  lipMat: PBRMaterial;
  jacketMat: PBRMaterial;
  pantsMat: PBRMaterial;
  hairMat: PBRMaterial;
  shoeMat: PBRMaterial;
  soleMat: PBRMaterial;
  eyeMat: PBRMaterial;
  scleraMat: PBRMaterial;
  metalMat: PBRMaterial;
} {
  const skinMat = new PBRMaterial(`skinMat_${id}`, scene);
  skinMat.albedoColor = skinColor;
  skinMat.roughness = 0.52;
  skinMat.subSurface.isTranslucencyEnabled = true;
  skinMat.subSurface.translucencyIntensity = 0.16;

  const lipMat = new PBRMaterial(`lipMat_${id}`, scene);
  lipMat.albedoColor = skinColor.scale(0.84).add(new Color3(0.14, 0.04, 0.05));
  lipMat.roughness = 0.36;

  const jacketMat = new PBRMaterial(`outfitMat_${id}`, scene);
  jacketMat.albedoColor = outfitColor;
  jacketMat.roughness = 0.66;

  const pantsMat = new PBRMaterial(`pantsMat_${id}`, scene);
  pantsMat.albedoColor = id === 'lucia' ? new Color3(0.14, 0.2, 0.34) : new Color3(0.22, 0.23, 0.21);
  pantsMat.roughness = 0.74;

  const hairMat = new PBRMaterial(`hairMat_${id}`, scene);
  hairMat.albedoColor = id === 'lucia' ? new Color3(0.08, 0.05, 0.04) : new Color3(0.17, 0.12, 0.08);
  hairMat.roughness = 0.58;

  const shoeMat = new PBRMaterial(`shoeMat_${id}`, scene);
  shoeMat.albedoColor = id === 'lucia' ? new Color3(0.92, 0.9, 0.88) : new Color3(0.28, 0.18, 0.11);
  shoeMat.roughness = 0.54;

  const soleMat = new PBRMaterial(`soleMat_${id}`, scene);
  soleMat.albedoColor = new Color3(0.94, 0.94, 0.92);
  soleMat.roughness = 0.72;

  const eyeMat = new PBRMaterial(`eyeMat_${id}`, scene);
  eyeMat.albedoColor = new Color3(0.11, 0.08, 0.06);
  eyeMat.roughness = 0.14;

  const scleraMat = new PBRMaterial(`scleraMat_${id}`, scene);
  scleraMat.albedoColor = new Color3(0.95, 0.94, 0.92);
  scleraMat.roughness = 0.2;

  const metalMat = new PBRMaterial(`accentMat_${id}`, scene);
  metalMat.albedoColor = new Color3(0.86, 0.74, 0.36);
  metalMat.metallic = 0.92;
  metalMat.roughness = 0.2;

  return { skinMat, lipMat, jacketMat, pantsMat, hairMat, shoeMat, soleMat, eyeMat, scleraMat, metalMat };
}

export function buildSculptedTorso(
  scene: Scene,
  id: CharacterId,
  parent: TransformNode,
  jacketMat: PBRMaterial
): Mesh {
  const isLucia = id === 'lucia';
  const shape = isLucia
    ? [
        new Vector3(0.0, -0.26, 0),
        new Vector3(0.155, -0.24, 0),
        new Vector3(0.135, -0.1, 0),
        new Vector3(0.168, 0.06, 0),
        new Vector3(0.185, 0.18, 0),
        new Vector3(0.11, 0.25, 0),
        new Vector3(0.065, 0.265, 0),
      ]
    : [
        new Vector3(0.0, -0.27, 0),
        new Vector3(0.175, -0.24, 0),
        new Vector3(0.17, -0.06, 0),
        new Vector3(0.205, 0.09, 0),
        new Vector3(0.22, 0.21, 0),
        new Vector3(0.12, 0.26, 0),
        new Vector3(0.07, 0.275, 0),
      ];

  const torso = MeshBuilder.CreateLathe(`${id}_torso`, { shape, tessellation: 48, sideOrientation: Mesh.DOUBLESIDE }, scene);
  torso.scaling.set(1.06, 1.0, 0.64);
  torso.position.y = 1.24;
  torso.material = jacketMat;
  torso.parent = parent;

  // Sculpted shirt collar / hem ridge
  const collar = MeshBuilder.CreateTorus(`${id}_collar`, { diameter: 0.175, thickness: 0.024, tessellation: 32 }, scene);
  collar.scaling.set(1.0, 1.0, 0.85);
  collar.position.set(0, 0.255, 0.01);
  collar.material = jacketMat;
  collar.parent = torso;

  return torso;
}

export function buildSculptedHead(
  scene: Scene,
  id: CharacterId,
  parent: TransformNode,
  skinMat: PBRMaterial,
  lipMat: PBRMaterial,
  hairMat: PBRMaterial,
  eyeMat: PBRMaterial,
  scleraMat: PBRMaterial
): Mesh {
  // Lathe cranium & tapered jaw/cheek silhouette
  const craniumShape = [
    new Vector3(0.0, -0.125, 0),
    new Vector3(0.056, -0.105, 0),
    new Vector3(0.088, -0.045, 0),
    new Vector3(0.1, 0.02, 0),
    new Vector3(0.098, 0.08, 0),
    new Vector3(0.068, 0.122, 0),
    new Vector3(0.0, 0.135, 0),
  ];
  const head = MeshBuilder.CreateLathe(`${id}_head`, { shape: craniumShape, tessellation: 40 }, scene);
  head.scaling.set(0.95, 1.0, 1.08);
  head.position.y = 1.66;
  head.material = skinMat;
  head.parent = parent;

  // Sculpted tapered nose bridge (Lathe tip + bridge, no boxes)
  const nose = MeshBuilder.CreateLathe(
    `${id}_nose`,
    { shape: [new Vector3(0, -0.024, 0), new Vector3(0.015, -0.014, 0), new Vector3(0.008, 0.024, 0), new Vector3(0, 0.028, 0)], tessellation: 16 },
    scene
  );
  nose.position.set(0, -0.008, 0.098);
  nose.rotation.x = -0.22;
  nose.material = skinMat;
  nose.parent = head;

  // Sculpted upper & lower lips
  const lips = MeshBuilder.CreateCapsule(`${id}_lips`, { radius: 0.009, height: 0.044, tessellation: 14 }, scene);
  lips.rotation.z = Math.PI / 2;
  lips.scaling.set(0.9, 1.0, 0.75);
  lips.position.set(0, -0.056, 0.094);
  lips.material = lipMat;
  lips.parent = head;

  // Recessed sclera + iris eyes + arched sculpted eyebrows
  for (const side of [-1, 1]) {
    const sclera = MeshBuilder.CreateSphere(`${id}_sclera_${side}`, { diameter: 0.025, segments: 16 }, scene);
    sclera.position.set(side * 0.038, 0.016, 0.088);
    sclera.material = scleraMat;
    sclera.parent = head;

    const iris = MeshBuilder.CreateSphere(`${id}_eye_${side}`, { diameter: 0.014, segments: 14 }, scene);
    iris.position.set(side * 0.038, 0.016, 0.096);
    iris.material = eyeMat;
    iris.parent = head;

    const brow = MeshBuilder.CreateCapsule(`${id}_brow_${side}`, { radius: 0.005, height: 0.038, tessellation: 12 }, scene);
    brow.rotation.z = Math.PI * 0.5 + side * -0.09;
    brow.position.set(side * 0.039, 0.039, 0.095);
    brow.material = hairMat;
    brow.parent = head;
  }

  // Volumetric layered hair cap + strands / ponytail
  const crown = MeshBuilder.CreateSphere(`${id}_hairCrown`, { diameterX: 0.214, diameterY: 0.21, diameterZ: 0.235, segments: 32 }, scene);
  crown.position.set(0, 0.032, -0.012);
  crown.material = hairMat;
  crown.parent = head;

  if (id === 'lucia') {
    const ponyShape = [
      new Vector3(0.018, 0.14, 0),
      new Vector3(0.042, 0.08, 0),
      new Vector3(0.05, -0.02, 0),
      new Vector3(0.032, -0.14, 0),
      new Vector3(0.005, -0.2, 0),
    ];
    const pony = MeshBuilder.CreateLathe(`${id}_ponytail`, { shape: ponyShape, tessellation: 24 }, scene);
    pony.position.set(0, -0.04, -0.125);
    pony.rotation.x = 0.44;
    pony.material = hairMat;
    pony.parent = head;
  } else {
    const fade = MeshBuilder.CreateLathe(
      `${id}_hairFade`,
      { shape: [new Vector3(0.095, -0.03, 0), new Vector3(0.106, 0.02, 0), new Vector3(0.088, 0.07, 0), new Vector3(0, 0.085, 0)], tessellation: 28 },
      scene
    );
    fade.position.set(0, 0.045, -0.008);
    fade.material = hairMat;
    fade.parent = head;
  }

  return head;
}

export function buildSculptedHand(
  scene: Scene,
  prefix: string,
  sideSign: number,
  parent: TransformNode,
  skinMat: PBRMaterial,
  pos: Vector3
): Mesh {
  const palm = MeshBuilder.CreateSphere(`${prefix}_palm`, { diameterX: 0.068, diameterY: 0.084, diameterZ: 0.03, segments: 16 }, scene);
  palm.position.copyFrom(pos);
  palm.material = skinMat;
  palm.parent = parent;

  // Thumb + 4 sculpted fingers
  const thumb = MeshBuilder.CreateCapsule(`${prefix}_thumb`, { radius: 0.009, height: 0.042, tessellation: 10 }, scene);
  thumb.position.set(sideSign * -0.034, -0.008, 0.014);
  thumb.rotation.z = sideSign * 0.52;
  thumb.material = skinMat;
  thumb.parent = palm;

  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * 0.015;
    const fLen = f === 1 || f === 2 ? 0.056 : 0.048;
    const finger = MeshBuilder.CreateCapsule(`${prefix}_f${f}`, { radius: 0.007, height: fLen, tessellation: 10 }, scene);
    finger.position.set(fx, -0.052, 0.004);
    finger.material = skinMat;
    finger.parent = palm;
  }
  return palm;
}

export function buildSculptedArm(
  scene: Scene,
  id: CharacterId,
  side: 'left' | 'right',
  parent: TransformNode,
  sleeveMat: PBRMaterial,
  skinMat: PBRMaterial
): LimbRigNodes {
  const s = side === 'left' ? -1 : 1;
  const shoulderPivot = new TransformNode(`${id}_shldr_${side}`, scene);
  shoulderPivot.position.set(s * 0.245, 1.44, 0);
  shoulderPivot.parent = parent;

  const deltoid = MeshBuilder.CreateSphere(`${id}_delt_${side}`, { diameter: 0.122, segments: 20 }, scene);
  deltoid.material = sleeveMat;
  deltoid.parent = shoulderPivot;

  const upperShape = [new Vector3(0.043, -0.25, 0), new Vector3(0.054, -0.14, 0), new Vector3(0.056, -0.02, 0), new Vector3(0.048, 0.02, 0)];
  const upperMesh = MeshBuilder.CreateLathe(`${id}_uArm_${side}`, { shape: upperShape, tessellation: 24 }, scene);
  upperMesh.material = id === 'lucia' ? skinMat : sleeveMat;
  upperMesh.parent = shoulderPivot;

  const elbowPivot = new TransformNode(`${id}_elbow_${side}`, scene);
  elbowPivot.position.set(0, -0.255, 0);
  elbowPivot.parent = shoulderPivot;

  const lowerShape = [new Vector3(0.03, -0.245, 0), new Vector3(0.04, -0.12, 0), new Vector3(0.046, -0.02, 0), new Vector3(0.041, 0.015, 0)];
  const lowerMesh = MeshBuilder.CreateLathe(`${id}_lArm_${side}`, { shape: lowerShape, tessellation: 24 }, scene);
  lowerMesh.material = skinMat;
  lowerMesh.parent = elbowPivot;

  const handMesh = buildSculptedHand(scene, `${id}_h_${side}`, s, elbowPivot, skinMat, new Vector3(0, -0.265, 0.01));
  return { shoulderPivot, upperMesh, elbowPivot, lowerMesh, handMesh };
}

export function buildSculptedLeg(
  scene: Scene,
  id: CharacterId,
  side: 'left' | 'right',
  parent: TransformNode,
  pantsMat: PBRMaterial,
  shoeMat: PBRMaterial,
  soleMat: PBRMaterial
): LegRigNodes {
  const s = side === 'left' ? -1 : 1;
  const hipPivot = new TransformNode(`${id}_hip_${side}`, scene);
  hipPivot.position.set(s * 0.112, 0.88, 0);
  hipPivot.parent = parent;

  const thighShape = [new Vector3(0.062, -0.42, 0), new Vector3(0.078, -0.22, 0), new Vector3(0.09, -0.05, 0), new Vector3(0.082, 0.03, 0)];
  const thighMesh = MeshBuilder.CreateLathe(`${id}_thigh_${side}`, { shape: thighShape, tessellation: 28 }, scene);
  thighMesh.material = pantsMat;
  thighMesh.parent = hipPivot;

  const kneePivot = new TransformNode(`${id}_knee_${side}`, scene);
  kneePivot.position.set(0, -0.43, 0);
  kneePivot.parent = hipPivot;

  const shinShape = [new Vector3(0.044, -0.39, 0), new Vector3(0.064, -0.18, 0), new Vector3(0.068, -0.06, 0), new Vector3(0.058, 0.02, 0)];
  const shinMesh = MeshBuilder.CreateLathe(`${id}_shin_${side}`, { shape: shinShape, tessellation: 28 }, scene);
  shinMesh.material = pantsMat;
  shinMesh.parent = kneePivot;

  // Multi-part sculpted sneaker (upper + rubber sole)
  const shoeMesh = MeshBuilder.CreateCapsule(`${id}_shoe_${side}`, { radius: 0.056, height: 0.23, tessellation: 22 }, scene);
  shoeMesh.rotation.x = Math.PI * 0.5;
  shoeMesh.scaling.set(1.06, 0.68, 1.0);
  shoeMesh.position.set(0, -0.395, 0.052);
  shoeMesh.material = shoeMat;
  shoeMesh.parent = kneePivot;

  const sole = MeshBuilder.CreateCapsule(`${id}_sole_${side}`, { radius: 0.059, height: 0.24, tessellation: 20 }, scene);
  sole.rotation.x = Math.PI * 0.5;
  sole.scaling.set(1.08, 0.28, 1.0);
  sole.position.set(0, -0.422, 0.052);
  sole.material = soleMat;
  sole.parent = kneePivot;

  return { hipPivot, thighMesh, kneePivot, shinMesh, shoeMesh };
}
