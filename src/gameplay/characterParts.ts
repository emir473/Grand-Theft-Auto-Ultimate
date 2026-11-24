/**
 * High-Tessellation Anatomical Character Parts Builder
 * Sculpted multi-segment limbs, joints, head/face features, hair, layered clothing,
 * sneakers, and first-person foreground arms for Lucia & Jason.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
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
  jacketMat: PBRMaterial;
  pantsMat: PBRMaterial;
  hairMat: PBRMaterial;
  shoeMat: PBRMaterial;
  eyeMat: PBRMaterial;
  metalMat: PBRMaterial;
} {
  const skinMat = new PBRMaterial(`skinMat_${id}`, scene);
  skinMat.albedoColor = skinColor;
  skinMat.roughness = 0.54;
  skinMat.subSurface.isTranslucencyEnabled = true;
  skinMat.subSurface.translucencyIntensity = 0.14;

  const jacketMat = new PBRMaterial(`outfitMat_${id}`, scene);
  jacketMat.albedoColor = outfitColor;
  jacketMat.roughness = 0.68;

  const pantsMat = new PBRMaterial(`pantsMat_${id}`, scene);
  pantsMat.albedoColor = id === 'lucia' ? new Color3(0.14, 0.2, 0.34) : new Color3(0.22, 0.23, 0.21);
  pantsMat.roughness = 0.74;

  const hairMat = new PBRMaterial(`hairMat_${id}`, scene);
  hairMat.albedoColor = id === 'lucia' ? new Color3(0.08, 0.05, 0.04) : new Color3(0.17, 0.12, 0.08);
  hairMat.roughness = 0.62;

  const shoeMat = new PBRMaterial(`shoeMat_${id}`, scene);
  shoeMat.albedoColor = id === 'lucia' ? new Color3(0.92, 0.9, 0.88) : new Color3(0.28, 0.18, 0.11);
  shoeMat.roughness = 0.58;

  const eyeMat = new PBRMaterial(`eyeMat_${id}`, scene);
  eyeMat.albedoColor = new Color3(0.12, 0.09, 0.07);
  eyeMat.roughness = 0.18;

  const metalMat = new PBRMaterial(`accentMat_${id}`, scene);
  metalMat.albedoColor = new Color3(0.84, 0.72, 0.35);
  metalMat.metallic = 0.9;
  metalMat.roughness = 0.22;

  return { skinMat, jacketMat, pantsMat, hairMat, shoeMat, eyeMat, metalMat };
}

export function buildSculptedHead(
  scene: Scene,
  id: CharacterId,
  parent: TransformNode,
  skinMat: PBRMaterial,
  hairMat: PBRMaterial,
  eyeMat: PBRMaterial
): Mesh {
  const head = MeshBuilder.CreateSphere(`${id}_head`, { diameterX: 0.21, diameterY: 0.25, diameterZ: 0.23, segments: 32 }, scene);
  head.position.y = 1.66;
  head.material = skinMat;
  head.parent = parent;

  // Jaw & chin taper
  const jaw = MeshBuilder.CreateCapsule(`${id}_jaw`, { radius: 0.072, height: 0.14, tessellation: 20 }, scene);
  jaw.scaling.set(0.95, 0.8, 0.88);
  jaw.position.set(0, -0.055, 0.025);
  jaw.material = skinMat;
  jaw.parent = head;

  // Nose bridge
  const nose = MeshBuilder.CreateBox(`${id}_nose`, { width: 0.024, height: 0.048, depth: 0.032 }, scene);
  nose.position.set(0, -0.01, 0.11);
  nose.rotation.x = -0.18;
  nose.material = skinMat;
  nose.parent = head;

  // Eyes + eyebrows
  for (const side of [-1, 1]) {
    const eye = MeshBuilder.CreateSphere(`${id}_eye_${side}`, { diameter: 0.024, segments: 12 }, scene);
    eye.position.set(side * 0.042, 0.015, 0.098);
    eye.material = eyeMat;
    eye.parent = head;

    const brow = MeshBuilder.CreateBox(`${id}_brow_${side}`, { width: 0.04, height: 0.011, depth: 0.015 }, scene);
    brow.position.set(side * 0.042, 0.042, 0.105);
    brow.rotation.z = side * -0.08;
    brow.material = hairMat;
    brow.parent = head;
  }

  // Sculpted Hair
  const crown = MeshBuilder.CreateSphere(`${id}_hairCrown`, { diameterX: 0.228, diameterY: 0.22, diameterZ: 0.245, segments: 28 }, scene);
  crown.position.set(0, 0.032, -0.015);
  crown.material = hairMat;
  crown.parent = head;

  if (id === 'lucia') {
    const pony = MeshBuilder.CreateCapsule(`${id}_ponytail`, { radius: 0.048, height: 0.24, tessellation: 18 }, scene);
    pony.position.set(0, -0.04, -0.13);
    pony.rotation.x = 0.42;
    pony.material = hairMat;
    pony.parent = head;
  } else {
    const capFade = MeshBuilder.CreateCylinder(`${id}_hairFade`, { diameterTop: 0.215, diameterBottom: 0.205, height: 0.08, tessellation: 24 }, scene);
    capFade.position.set(0, 0.04, -0.01);
    capFade.material = hairMat;
    capFade.parent = head;
  }

  return head;
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
  shoulderPivot.position.set(s * 0.255, 1.44, 0);
  shoulderPivot.parent = parent;

  const deltoid = MeshBuilder.CreateSphere(`${id}_delt_${side}`, { diameter: 0.125, segments: 16 }, scene);
  deltoid.material = sleeveMat;
  deltoid.parent = shoulderPivot;

  const upperMesh = MeshBuilder.CreateCapsule(`${id}_uArm_${side}`, { radius: 0.056, height: 0.29, tessellation: 20 }, scene);
  upperMesh.position.set(0, -0.13, 0);
  upperMesh.material = id === 'lucia' ? skinMat : sleeveMat;
  upperMesh.parent = shoulderPivot;

  const elbowPivot = new TransformNode(`${id}_elbow_${side}`, scene);
  elbowPivot.position.set(0, -0.26, 0);
  elbowPivot.parent = shoulderPivot;

  const lowerMesh = MeshBuilder.CreateCapsule(`${id}_lArm_${side}`, { radius: 0.046, height: 0.27, tessellation: 20 }, scene);
  lowerMesh.position.set(0, -0.125, 0);
  lowerMesh.material = skinMat;
  lowerMesh.parent = elbowPivot;

  const handMesh = MeshBuilder.CreateSphere(`${id}_hand_${side}`, { diameterX: 0.075, diameterY: 0.105, diameterZ: 0.045, segments: 14 }, scene);
  handMesh.position.set(0, -0.27, 0.01);
  handMesh.material = skinMat;
  handMesh.parent = elbowPivot;

  return { shoulderPivot, upperMesh, elbowPivot, lowerMesh, handMesh };
}

export function buildSculptedLeg(
  scene: Scene,
  id: CharacterId,
  side: 'left' | 'right',
  parent: TransformNode,
  pantsMat: PBRMaterial,
  shoeMat: PBRMaterial
): LegRigNodes {
  const s = side === 'left' ? -1 : 1;
  const hipPivot = new TransformNode(`${id}_hip_${side}`, scene);
  hipPivot.position.set(s * 0.115, 0.88, 0);
  hipPivot.parent = parent;

  const thighMesh = MeshBuilder.CreateCapsule(`${id}_thigh_${side}`, { radius: 0.086, height: 0.44, tessellation: 20 }, scene);
  thighMesh.position.set(0, -0.21, 0);
  thighMesh.material = pantsMat;
  thighMesh.parent = hipPivot;

  const kneePivot = new TransformNode(`${id}_knee_${side}`, scene);
  kneePivot.position.set(0, -0.43, 0);
  kneePivot.parent = hipPivot;

  const shinMesh = MeshBuilder.CreateCapsule(`${id}_shin_${side}`, { radius: 0.068, height: 0.41, tessellation: 20 }, scene);
  shinMesh.position.set(0, -0.19, 0);
  shinMesh.material = pantsMat;
  shinMesh.parent = kneePivot;

  const shoeMesh = MeshBuilder.CreateCapsule(`${id}_shoe_${side}`, { radius: 0.064, height: 0.24, tessellation: 18 }, scene);
  shoeMesh.rotation.x = Math.PI * 0.5;
  shoeMesh.scaling.set(1.05, 0.72, 1.0);
  shoeMesh.position.set(0, -0.4, 0.055);
  shoeMesh.material = shoeMat;
  shoeMesh.parent = kneePivot;

  return { hipPivot, thighMesh, kneePivot, shinMesh, shoeMesh };
}

export function buildFirstPersonArms(
  scene: Scene,
  id: CharacterId,
  skinMat: PBRMaterial,
  sleeveMat: PBRMaterial
): TransformNode {
  const fpRoot = new TransformNode(`${id}_fpArms`, scene);
  for (const s of [-1, 1]) {
    const forearm = MeshBuilder.CreateCapsule(`${id}_fpArm_${s}`, { radius: 0.044, height: 0.36, tessellation: 18 }, scene);
    forearm.position.set(s * 0.22, -0.2, 0.34);
    forearm.rotation.set(Math.PI * 0.36, s * -0.18, 0);
    forearm.material = skinMat;
    forearm.parent = fpRoot;

    const cuff = MeshBuilder.CreateCylinder(`${id}_fpCuff_${s}`, { diameter: 0.1, height: 0.08, tessellation: 16 }, scene);
    cuff.position.set(s * 0.24, -0.28, 0.18);
    cuff.rotation.set(Math.PI * 0.36, s * -0.18, 0);
    cuff.material = sleeveMat;
    cuff.parent = fpRoot;

    const hand = MeshBuilder.CreateSphere(`${id}_fpHand_${s}`, { diameterX: 0.075, diameterY: 0.06, diameterZ: 0.095, segments: 14 }, scene);
    hand.position.set(s * 0.18, -0.13, 0.49);
    hand.material = skinMat;
    hand.parent = fpRoot;
  }
  fpRoot.setEnabled(false);
  return fpRoot;
}
