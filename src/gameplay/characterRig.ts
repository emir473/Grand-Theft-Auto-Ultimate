/**
 * Character Rig Mesh Builder for Lucia & Jason
 * Assembles high-tessellation anatomical body parts, clothing, accessories, and first-person view arms.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { CharacterId } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import {
  buildFirstPersonArms,
  buildSculptedArm,
  buildSculptedHead,
  buildSculptedLeg,
  createCharacterMaterials,
  type LegRigNodes,
  type LimbRigNodes,
} from './characterParts';

export interface CharacterRig {
  root: TransformNode;
  torso: Mesh;
  head: Mesh;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  leftArmNodes: LimbRigNodes;
  rightArmNodes: LimbRigNodes;
  leftLegNodes: LegRigNodes;
  rightLegNodes: LegRigNodes;
  fpArms: TransformNode;
  jacketMat: PBRMaterial;
}

export function buildCharacterRig(
  scene: Scene,
  gfx: GraphicsEngine,
  id: CharacterId,
  outfitColor: Color3,
  skinColor: Color3
): CharacterRig {
  const root = new TransformNode(`charRoot_${id}`, scene);
  const { skinMat, jacketMat, pantsMat, hairMat, shoeMat, eyeMat, metalMat } = createCharacterMaterials(
    scene,
    id,
    outfitColor,
    skinColor
  );

  // Sculpted torso (tapered athletic chest + waist + collar + neck)
  const torso = MeshBuilder.CreateCylinder(
    `${id}_torso`,
    {
      diameterTop: id === 'lucia' ? 0.39 : 0.44,
      diameterBottom: id === 'lucia' ? 0.32 : 0.37,
      height: 0.52,
      tessellation: 28,
    },
    scene
  );
  torso.scaling.set(1.08, 1.0, 0.62);
  torso.position.y = 1.24;
  torso.material = jacketMat;
  torso.parent = root;

  const pelvis = MeshBuilder.CreateCapsule(`${id}_pelvis`, { radius: 0.145, height: 0.34, tessellation: 22 }, scene);
  pelvis.rotation.z = Math.PI * 0.5;
  pelvis.scaling.set(1.0, 1.05, 0.72);
  pelvis.position.y = 0.94;
  pelvis.material = pantsMat;
  pelvis.parent = root;

  const belt = MeshBuilder.CreateCylinder(`${id}_belt`, { diameter: 0.34, height: 0.055, tessellation: 24 }, scene);
  belt.scaling.set(1.05, 1.0, 0.66);
  belt.position.y = 0.99;
  belt.material = shoeMat;
  belt.parent = root;

  const buckle = MeshBuilder.CreateBox(`${id}_buckle`, { width: 0.055, height: 0.042, depth: 0.02 }, scene);
  buckle.position.set(0, 0.99, 0.115);
  buckle.material = metalMat;
  buckle.parent = root;

  const neck = MeshBuilder.CreateCylinder(`${id}_neck`, { diameterTop: 0.105, diameterBottom: 0.12, height: 0.12, tessellation: 20 }, scene);
  neck.position.y = 1.52;
  neck.material = skinMat;
  neck.parent = root;

  const head = buildSculptedHead(scene, id, root, skinMat, hairMat, eyeMat);
  const leftArmNodes = buildSculptedArm(scene, id, 'left', root, jacketMat, skinMat);
  const rightArmNodes = buildSculptedArm(scene, id, 'right', root, jacketMat, skinMat);
  const leftLegNodes = buildSculptedLeg(scene, id, 'left', root, pantsMat, shoeMat);
  const rightLegNodes = buildSculptedLeg(scene, id, 'right', root, pantsMat, shoeMat);
  const fpArms = buildFirstPersonArms(scene, id, skinMat, jacketMat);

  gfx.registerShadowCaster(root, true);

  return {
    root,
    torso,
    head,
    leftArm: leftArmNodes.shoulderPivot,
    rightArm: rightArmNodes.shoulderPivot,
    leftLeg: leftLegNodes.hipPivot,
    rightLeg: rightLegNodes.hipPivot,
    leftArmNodes,
    rightArmNodes,
    leftLegNodes,
    rightLegNodes,
    fpArms,
    jacketMat,
  };
}
