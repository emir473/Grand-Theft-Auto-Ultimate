/**
 * Articulated High-Detail NPC Mesh Builder (Pedestrians, Employees & Beachgoers)
 * Replaces single capsules with anatomical head, hair, torso, shorts/pants, and swinging limbs.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';

export interface NpcVisualRig {
  root: TransformNode;
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
  phaseOffset: number;
}

const SKIN_PALETTE = [
  new Color3(0.42, 0.25, 0.16),
  new Color3(0.64, 0.43, 0.31),
  new Color3(0.78, 0.58, 0.45),
  new Color3(0.52, 0.34, 0.22),
  new Color3(0.86, 0.68, 0.54),
];

const SHIRT_PALETTE = [
  new Color3(0.92, 0.34, 0.48),
  new Color3(0.12, 0.72, 0.78),
  new Color3(0.95, 0.76, 0.2),
  new Color3(0.24, 0.48, 0.76),
  new Color3(0.94, 0.94, 0.96),
  new Color3(0.45, 0.78, 0.32),
];

export function buildArticulatedNpcRig(
  scene: Scene,
  id: string,
  index: number,
  isBeach: boolean
): NpcVisualRig {
  const root = new TransformNode(`npcRoot_${id}`, scene);

  const skinMat = new PBRMaterial(`npcSkin_${id}`, scene);
  skinMat.albedoColor = SKIN_PALETTE[index % SKIN_PALETTE.length];
  skinMat.roughness = 0.58;

  const topMat = new PBRMaterial(`npcTop_${id}`, scene);
  topMat.albedoColor = SHIRT_PALETTE[index % SHIRT_PALETTE.length];
  topMat.roughness = 0.72;

  const botMat = new PBRMaterial(`npcBot_${id}`, scene);
  botMat.albedoColor = isBeach
    ? SHIRT_PALETTE[(index + 2) % SHIRT_PALETTE.length]
    : new Color3(0.16, 0.18, 0.22);
  botMat.roughness = 0.78;

  const hairMat = new PBRMaterial(`npcHair_${id}`, scene);
  hairMat.albedoColor = index % 4 === 0 ? new Color3(0.32, 0.2, 0.1) : new Color3(0.08, 0.06, 0.05);
  hairMat.roughness = 0.65;

  const torso = MeshBuilder.CreateCylinder(
    `npcTorso_${id}`,
    { diameterTop: 0.38, diameterBottom: 0.32, height: 0.5, tessellation: 18 },
    scene
  );
  torso.scaling.set(1.05, 1.0, 0.62);
  torso.position.y = 1.22;
  torso.material = topMat;
  torso.parent = root;

  const head = MeshBuilder.CreateSphere(`npcHead_${id}`, { diameter: 0.22, segments: 18 }, scene);
  head.position.y = 1.62;
  head.material = skinMat;
  head.parent = root;

  const hair = MeshBuilder.CreateSphere(`npcHair_${id}`, { diameter: 0.23, segments: 16 }, scene);
  hair.position.set(0, 1.65, -0.015);
  hair.material = hairMat;
  hair.parent = root;

  const leftArm = MeshBuilder.CreateCapsule(`npcLA_${id}`, { radius: 0.045, height: 0.46, tessellation: 12 }, scene);
  leftArm.position.set(-0.24, 1.18, 0);
  leftArm.material = skinMat;
  leftArm.parent = root;

  const rightArm = MeshBuilder.CreateCapsule(`npcRA_${id}`, { radius: 0.045, height: 0.46, tessellation: 12 }, scene);
  rightArm.position.set(0.24, 1.18, 0);
  rightArm.material = skinMat;
  rightArm.parent = root;

  const leftLeg = MeshBuilder.CreateCapsule(`npcLL_${id}`, { radius: 0.068, height: 0.76, tessellation: 14 }, scene);
  leftLeg.position.set(-0.1, 0.44, 0);
  leftLeg.material = isBeach ? skinMat : botMat;
  leftLeg.parent = root;

  const rightLeg = MeshBuilder.CreateCapsule(`npcRL_${id}`, { radius: 0.068, height: 0.76, tessellation: 14 }, scene);
  rightLeg.position.set(0.1, 0.44, 0);
  rightLeg.material = isBeach ? skinMat : botMat;
  rightLeg.parent = root;

  return {
    root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    phaseOffset: index * 0.87,
  };
}
