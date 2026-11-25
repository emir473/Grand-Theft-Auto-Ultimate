/**
 * True First-Person Foreground Viewmodel & Animation Driver
 * Renders detailed 1P forearms/5-finger hands holding the active weapon, iFruit smartphone,
 * or steering-wheel grip, with procedural walk/sprint bob, recoil kick, and reload dip.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { CharacterId } from '../core/types';
import { buildSculptedHand } from './characterParts';

export interface FirstPersonViewmodel {
  root: TransformNode;
  armsPivot: TransformNode;
  weaponPivot: TransformNode;
  phoneMesh: Mesh;
  pistolGroup: TransformNode;
  rifleGroup: TransformNode;
  batGroup: TransformNode;
  leftHand: Mesh;
  rightHand: Mesh;
}

export function buildFirstPersonViewmodel(
  scene: Scene,
  id: CharacterId,
  skinMat: PBRMaterial,
  sleeveMat: PBRMaterial
): FirstPersonViewmodel {
  const root = new TransformNode(`${id}_fpArms`, scene);
  const armsPivot = new TransformNode(`${id}_fpPivot`, scene);
  armsPivot.parent = root;

  const gunMat = new PBRMaterial(`${id}_fpGunMat`, scene);
  gunMat.albedoColor = new Color3(0.14, 0.15, 0.18);
  gunMat.metallic = 0.85;
  gunMat.roughness = 0.28;

  const woodMat = new PBRMaterial(`${id}_fpGripMat`, scene);
  woodMat.albedoColor = new Color3(0.24, 0.16, 0.11);
  woodMat.roughness = 0.65;

  const screenMat = new PBRMaterial(`${id}_fpPhoneScreen`, scene);
  screenMat.albedoColor = new Color3(0.12, 0.72, 0.96);
  screenMat.emissiveColor = new Color3(0.18, 0.75, 0.98);
  screenMat.roughness = 0.12;

  const armShape = [new Vector3(0.032, -0.17, 0), new Vector3(0.042, -0.02, 0), new Vector3(0.048, 0.14, 0), new Vector3(0.044, 0.18, 0)];
  let leftHand!: Mesh;
  let rightHand!: Mesh;

  for (const s of [-1, 1]) {
    const forearm = MeshBuilder.CreateLathe(`${id}_fpArm_${s}`, { shape: armShape, tessellation: 24 }, scene);
    forearm.position.set(s * 0.21, -0.2, 0.31);
    forearm.rotation.set(Math.PI * 0.37, s * -0.22, 0);
    forearm.material = skinMat;
    forearm.parent = armsPivot;

    const cuff = MeshBuilder.CreateCylinder(`${id}_fpCuff_${s}`, { diameter: 0.102, height: 0.09, tessellation: 20 }, scene);
    cuff.position.set(s * 0.24, -0.29, 0.16);
    cuff.rotation.set(Math.PI * 0.37, s * -0.22, 0);
    cuff.material = sleeveMat;
    cuff.parent = armsPivot;

    const hand = buildSculptedHand(scene, `${id}_fpH_${s}`, s, armsPivot, skinMat, new Vector3(s * 0.15, -0.135, 0.45));
    hand.rotation.set(Math.PI * 0.42, s * -0.15, 0);
    if (s < 0) leftHand = hand;
    else rightHand = hand;
  }

  // Active Weapon Pivot attached to right foreground hand
  const weaponPivot = new TransformNode(`${id}_fpWepPivot`, scene);
  weaponPivot.position.set(0.14, -0.11, 0.49);
  weaponPivot.parent = armsPivot;

  // Sculpted 9mm Pistol
  const pistolGroup = new TransformNode(`${id}_fpPistol`, scene);
  pistolGroup.parent = weaponPivot;
  const pSlide = MeshBuilder.CreateCapsule(`${id}_fpPSlide`, { radius: 0.024, height: 0.21, tessellation: 14 }, scene);
  pSlide.rotation.x = Math.PI / 2;
  pSlide.scaling.set(0.85, 1.0, 1.15);
  pSlide.position.set(0, 0.025, 0.07);
  pSlide.material = gunMat;
  pSlide.parent = pistolGroup;
  const pGrip = MeshBuilder.CreateCapsule(`${id}_fpPGrip`, { radius: 0.019, height: 0.11, tessellation: 12 }, scene);
  pGrip.rotation.x = 0.24;
  pGrip.position.set(0, -0.032, 0);
  pGrip.material = woodMat;
  pGrip.parent = pistolGroup;

  // Sculpted Carbine / SMG / Shotgun
  const rifleGroup = new TransformNode(`${id}_fpRifle`, scene);
  rifleGroup.parent = weaponPivot;
  const rReceiver = MeshBuilder.CreateCapsule(`${id}_fpRRec`, { radius: 0.032, height: 0.36, tessellation: 16 }, scene);
  rReceiver.rotation.x = Math.PI / 2;
  rReceiver.position.set(0, 0.02, 0.11);
  rReceiver.material = gunMat;
  rReceiver.parent = rifleGroup;
  const rBarrel = MeshBuilder.CreateCylinder(`${id}_fpRBar`, { diameter: 0.024, height: 0.32, tessellation: 16 }, scene);
  rBarrel.rotation.x = Math.PI / 2;
  rBarrel.position.set(0, 0.032, 0.35);
  rBarrel.material = gunMat;
  rBarrel.parent = rifleGroup;

  // Sculpted Baseball Bat
  const batGroup = new TransformNode(`${id}_fpBat`, scene);
  batGroup.parent = weaponPivot;
  const bat = MeshBuilder.CreateCylinder(`${id}_fpBatBody`, { diameterTop: 0.068, diameterBottom: 0.032, height: 0.65, tessellation: 20 }, scene);
  bat.position.set(0, 0.24, 0.06);
  bat.rotation.x = 0.35;
  bat.material = gunMat;
  bat.parent = batGroup;

  // iFruit Smartphone held in right palm when phone menu is open
  const phoneMesh = MeshBuilder.CreateCapsule(`${id}_fpPhone`, { radius: 0.038, height: 0.15, tessellation: 14 }, scene);
  phoneMesh.scaling.set(1.1, 1.0, 0.25);
  phoneMesh.position.set(0.08, -0.07, 0.38);
  phoneMesh.rotation.set(-0.22, -0.3, 0);
  phoneMesh.material = screenMat;
  phoneMesh.parent = armsPivot;
  phoneMesh.setEnabled(false);

  pistolGroup.setEnabled(false);
  rifleGroup.setEnabled(false);
  batGroup.setEnabled(false);
  root.setEnabled(false);

  return { root, armsPivot, weaponPivot, phoneMesh, pistolGroup, rifleGroup, batGroup, leftHand, rightHand };
}

export function updateFirstPersonViewmodel(
  vm: FirstPersonViewmodel,
  opts: {
    animTime: number;
    speedMps: number;
    sprinting: boolean;
    aiming: boolean;
    phoneOpen: boolean;
    inVehicle: boolean;
    steerAngle: number;
    weaponId: string;
    recoilKick: number;
    reloadAlpha: number;
  }
): void {
  const moving = opts.speedMps > 0.5 && !opts.inVehicle;
  const freq = opts.sprinting ? 11.5 : moving ? 8.2 : 1.9;
  const bobX = moving ? Math.cos(opts.animTime * freq * 0.5) * (opts.sprinting ? 0.018 : 0.01) : Math.sin(opts.animTime * 1.4) * 0.002;
  const bobY = moving ? Math.abs(Math.sin(opts.animTime * freq)) * (opts.sprinting ? 0.022 : 0.012) : Math.cos(opts.animTime * 1.8) * 0.003;

  const reloadDip = opts.reloadAlpha > 0 ? Math.sin(opts.reloadAlpha * Math.PI) * -0.14 : 0;
  const aimOffsetX = opts.aiming ? -0.135 : 0;
  const aimOffsetY = opts.aiming ? 0.032 : 0;

  vm.armsPivot.position.set(bobX + aimOffsetX, -bobY + aimOffsetY + reloadDip, -opts.recoilKick * 0.07);
  vm.armsPivot.rotation.x = opts.recoilKick * 0.18 + (opts.reloadAlpha > 0 ? Math.sin(opts.reloadAlpha * Math.PI) * 0.35 : 0);

  vm.phoneMesh.setEnabled(opts.phoneOpen);
  const w = opts.weaponId;
  const hasGun = !opts.phoneOpen && !opts.inVehicle && w !== 'unarmed';
  const isMelee = w === 'bat_aluminum';
  const isPistol = w === 'pistol_9mm';

  vm.pistolGroup.setEnabled(hasGun && isPistol);
  vm.rifleGroup.setEnabled(hasGun && !isPistol && !isMelee);
  vm.batGroup.setEnabled(hasGun && isMelee);

  if (opts.inVehicle) {
    // Grip virtual cockpit steering wheel smoothly with steering angle
    vm.leftHand.position.set(-0.16, -0.11 + opts.steerAngle * 0.08, 0.42);
    vm.rightHand.position.set(0.16, -0.11 - opts.steerAngle * 0.08, 0.42);
  } else {
    vm.leftHand.position.set(hasGun && !isPistol && !isMelee ? 0.04 : -0.15, -0.135, hasGun && !isPistol && !isMelee ? 0.56 : 0.45);
    vm.rightHand.position.set(0.15, -0.135, 0.45);
  }
}
