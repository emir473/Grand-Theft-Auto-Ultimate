/**
 * Character Rig Mesh Builder for Lucia & Jason
 * Assembles 48-segment Lathe anatomical body parts, clothing, accessories, and first-person viewmodel rig.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { CharacterId } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import {
  buildSculptedArm,
  buildSculptedHead,
  buildSculptedLeg,
  buildSculptedTorso,
  createCharacterMaterials,
  type LegRigNodes,
  type LimbRigNodes,
} from './characterParts';
import { buildFirstPersonViewmodel, type FirstPersonViewmodel } from './fpViewmodel';

export interface CharacterRig {
  root: TransformNode;
  torso: Mesh;
  neck: Mesh;
  head: Mesh;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  leftArmNodes: LimbRigNodes;
  rightArmNodes: LimbRigNodes;
  leftLegNodes: LegRigNodes;
  rightLegNodes: LegRigNodes;
  fpViewmodel: FirstPersonViewmodel;
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
  const { skinMat, lipMat, jacketMat, pantsMat, hairMat, shoeMat, soleMat, eyeMat, scleraMat, metalMat } =
    createCharacterMaterials(scene, id, outfitColor, skinColor);

  const torso = buildSculptedTorso(scene, id, root, jacketMat);

  const pelvis = MeshBuilder.CreateCapsule(`${id}_pelvis`, { radius: 0.142, height: 0.33, tessellation: 28 }, scene);
  pelvis.rotation.z = Math.PI * 0.5;
  pelvis.scaling.set(1.0, 1.04, 0.7);
  pelvis.position.y = 0.94;
  pelvis.material = pantsMat;
  pelvis.parent = root;

  const belt = MeshBuilder.CreateTorus(`${id}_belt`, { diameter: 0.315, thickness: 0.032, tessellation: 32 }, scene);
  belt.scaling.set(1.06, 1.0, 0.68);
  belt.position.y = 0.99;
  belt.material = shoeMat;
  belt.parent = root;

  const buckle = MeshBuilder.CreateCylinder(`${id}_buckle`, { diameter: 0.048, height: 0.022, tessellation: 16 }, scene);
  buckle.rotation.x = Math.PI / 2;
  buckle.position.set(0, 0.99, 0.118);
  buckle.material = metalMat;
  buckle.parent = root;

  const neck = MeshBuilder.CreateCylinder(`${id}_neck`, { diameterTop: 0.102, diameterBottom: 0.118, height: 0.125, tessellation: 24 }, scene);
  neck.position.y = 1.52;
  neck.material = skinMat;
  neck.parent = root;

  const head = buildSculptedHead(scene, id, root, skinMat, lipMat, hairMat, eyeMat, scleraMat);
  const leftArmNodes = buildSculptedArm(scene, id, 'left', root, jacketMat, skinMat);
  const rightArmNodes = buildSculptedArm(scene, id, 'right', root, jacketMat, skinMat);
  const leftLegNodes = buildSculptedLeg(scene, id, 'left', root, pantsMat, shoeMat, soleMat);
  const rightLegNodes = buildSculptedLeg(scene, id, 'right', root, pantsMat, shoeMat, soleMat);
  const fpViewmodel = buildFirstPersonViewmodel(scene, id, skinMat, jacketMat);

  gfx.registerShadowCaster(root, true);

  return {
    root,
    torso,
    neck,
    head,
    leftArm: leftArmNodes.shoulderPivot,
    rightArm: rightArmNodes.shoulderPivot,
    leftLeg: leftLegNodes.hipPivot,
    rightLeg: rightLegNodes.hipPivot,
    leftArmNodes,
    rightArmNodes,
    leftLegNodes,
    rightLegNodes,
    fpViewmodel,
    fpArms: fpViewmodel.root,
    jacketMat,
  };
}
