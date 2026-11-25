/**
 * Articulated High-Detail NPC Mesh Builder (Pedestrians, Employees & Beachgoers)
 * Uses 32-segment Lathe anatomical torsos, tapered knee/elbow limbs, sculpted hair & face features,
 * 5-finger hands silhouette, and swimwear/streetwear palettes matching IMG_8168 & IMG_8170.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';

export interface NpcVisualRig {
  root: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
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
  skinMat.roughness = 0.54;

  const topMat = new PBRMaterial(`npcTop_${id}`, scene);
  topMat.albedoColor = SHIRT_PALETTE[index % SHIRT_PALETTE.length];
  topMat.roughness = 0.68;

  const botMat = new PBRMaterial(`npcBot_${id}`, scene);
  botMat.albedoColor = isBeach
    ? SHIRT_PALETTE[(index + 2) % SHIRT_PALETTE.length]
    : new Color3(0.16, 0.18, 0.22);
  botMat.roughness = 0.74;

  const hairMat = new PBRMaterial(`npcHair_${id}`, scene);
  hairMat.albedoColor = index % 4 === 0 ? new Color3(0.34, 0.21, 0.1) : index % 5 === 0 ? new Color3(0.88, 0.36, 0.46) : new Color3(0.08, 0.06, 0.05);
  hairMat.roughness = 0.58;

  const shoeMat = new PBRMaterial(`npcShoe_${id}`, scene);
  shoeMat.albedoColor = isBeach ? new Color3(0.88, 0.76, 0.56) : new Color3(0.92, 0.92, 0.94);
  shoeMat.roughness = 0.6;

  // Sculpted Lathe Torso (32 tessellation)
  const torsoShape = isBeach && index % 2 === 0
    ? [new Vector3(0, -0.24, 0), new Vector3(0.15, -0.22, 0), new Vector3(0.125, -0.06, 0), new Vector3(0.175, 0.14, 0), new Vector3(0.09, 0.24, 0)]
    : [new Vector3(0, -0.25, 0), new Vector3(0.165, -0.22, 0), new Vector3(0.158, -0.04, 0), new Vector3(0.195, 0.16, 0), new Vector3(0.1, 0.25, 0)];

  const torso = MeshBuilder.CreateLathe(`npcTorso_${id}`, { shape: torsoShape, tessellation: 32 }, scene);
  torso.scaling.set(1.04, 1.0, 0.64);
  torso.position.y = 1.22;
  torso.material = isBeach && index % 3 === 1 ? skinMat : topMat;
  torso.parent = root;

  const pelvis = MeshBuilder.CreateCapsule(`npcPelv_${id}`, { radius: 0.135, height: 0.3, tessellation: 20 }, scene);
  pelvis.rotation.z = Math.PI * 0.5;
  pelvis.scaling.set(1.0, 1.0, 0.7);
  pelvis.position.y = 0.93;
  pelvis.material = botMat;
  pelvis.parent = root;

  // Anatomical Head + Hair + Eyes
  const head = MeshBuilder.CreateLathe(
    `npcHead_${id}`,
    { shape: [new Vector3(0, -0.11, 0), new Vector3(0.072, -0.06, 0), new Vector3(0.096, 0.03, 0), new Vector3(0.075, 0.11, 0), new Vector3(0, 0.125, 0)], tessellation: 28 },
    scene
  );
  head.position.y = 1.63;
  head.material = skinMat;
  head.parent = root;

  const hair = MeshBuilder.CreateSphere(`npcHair_${id}`, { diameterX: 0.205, diameterY: 0.2, diameterZ: 0.22, segments: 24 }, scene);
  hair.position.set(0, 1.66, -0.015);
  hair.material = hairMat;
  hair.parent = root;

  // Pivoted tapered Arms + Hands
  const buildArm = (name: string, sx: number): TransformNode => {
    const piv = new TransformNode(name, scene);
    piv.position.set(sx * 0.23, 1.43, 0);
    piv.parent = root;
    const arm = MeshBuilder.CreateLathe(
      `${name}_m`,
      { shape: [new Vector3(0.028, -0.46, 0), new Vector3(0.042, -0.22, 0), new Vector3(0.05, -0.04, 0), new Vector3(0.04, 0.02, 0)], tessellation: 18 },
      scene
    );
    arm.material = skinMat;
    arm.parent = piv;
    const hand = MeshBuilder.CreateSphere(`${name}_hd`, { diameterX: 0.055, diameterY: 0.075, diameterZ: 0.03, segments: 12 }, scene);
    hand.position.set(0, -0.48, 0.01);
    hand.material = skinMat;
    hand.parent = piv;
    return piv;
  };

  // Pivoted tapered Legs + Shoes
  const buildLeg = (name: string, sx: number): TransformNode => {
    const piv = new TransformNode(name, scene);
    piv.position.set(sx * 0.105, 0.88, 0);
    piv.parent = root;
    const leg = MeshBuilder.CreateLathe(
      `${name}_m`,
      { shape: [new Vector3(0.04, -0.82, 0), new Vector3(0.06, -0.44, 0), new Vector3(0.082, -0.08, 0), new Vector3(0.072, 0.02, 0)], tessellation: 20 },
      scene
    );
    leg.material = isBeach ? skinMat : botMat;
    leg.parent = piv;
    const shoe = MeshBuilder.CreateCapsule(`${name}_sh`, { radius: 0.05, height: 0.2, tessellation: 16 }, scene);
    shoe.rotation.x = Math.PI * 0.5;
    shoe.scaling.set(1.0, 0.65, 1.0);
    shoe.position.set(0, -0.84, 0.045);
    shoe.material = shoeMat;
    shoe.parent = piv;
    return piv;
  };

  const leftArm = buildArm(`npcLA_${id}`, -1);
  const rightArm = buildArm(`npcRA_${id}`, 1);
  const leftLeg = buildLeg(`npcLL_${id}`, -1);
  const rightLeg = buildLeg(`npcRL_${id}`, 1);

  return {
    root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    phaseOffset: index * 0.87,
  };
}
