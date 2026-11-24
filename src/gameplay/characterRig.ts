/**
 * Character Rig Mesh Builder for Lucia & Jason
 * Builds articulated PBR body parts and attaches shadow casting.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode } from '@babylonjs/core';
import type { CharacterId } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';

export interface CharacterRig {
  root: TransformNode;
  torso: Mesh;
  head: Mesh;
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
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

  const skinMat = new PBRMaterial(`skinMat_${id}`, scene);
  skinMat.albedoColor = skinColor;
  skinMat.roughness = 0.58;

  const jacketMat = new PBRMaterial(`outfitMat_${id}`, scene);
  jacketMat.albedoColor = outfitColor;
  jacketMat.roughness = 0.72;

  const pantsMat = new PBRMaterial(`pantsMat_${id}`, scene);
  pantsMat.albedoColor = id === 'lucia' ? new Color3(0.16, 0.19, 0.26) : new Color3(0.24, 0.23, 0.21);
  pantsMat.roughness = 0.78;

  const torso = MeshBuilder.CreateBox(`${id}_torso`, { width: 0.48, height: 0.64, depth: 0.26 }, scene);
  torso.position.y = 1.15;
  torso.material = jacketMat;
  torso.parent = root;

  const head = MeshBuilder.CreateSphere(`${id}_head`, { diameter: 0.28, segments: 12 }, scene);
  head.position.y = 1.66;
  head.material = skinMat;
  head.parent = root;

  const leftArm = MeshBuilder.CreateBox(`${id}_leftArm`, { width: 0.14, height: 0.56, depth: 0.14 }, scene);
  leftArm.position.set(-0.33, 1.12, 0);
  leftArm.material = skinMat;
  leftArm.parent = root;

  const rightArm = MeshBuilder.CreateBox(`${id}_rightArm`, { width: 0.14, height: 0.56, depth: 0.14 }, scene);
  rightArm.position.set(0.33, 1.12, 0);
  rightArm.material = skinMat;
  rightArm.parent = root;

  const leftLeg = MeshBuilder.CreateBox(`${id}_leftLeg`, { width: 0.18, height: 0.76, depth: 0.18 }, scene);
  leftLeg.position.set(-0.14, 0.42, 0);
  leftLeg.material = pantsMat;
  leftLeg.parent = root;

  const rightLeg = MeshBuilder.CreateBox(`${id}_rightLeg`, { width: 0.18, height: 0.76, depth: 0.18 }, scene);
  rightLeg.position.set(0.14, 0.42, 0);
  rightLeg.material = pantsMat;
  rightLeg.parent = root;

  gfx.registerShadowCaster(root, true);
  return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg, jacketMat };
}
