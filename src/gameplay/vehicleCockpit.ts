/**
 * First-Person Vehicle Cockpit Driver Seat Camera, 1P Steering Hands Sync,
 * and Illuminated Speedometer / Tachometer Instrument Cluster.
 */

import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { CharacterSaveState } from '../core/types';
import { clamp } from '../core/types';
import type { PlayerController } from './playerController';
import type { VehicleRuntime } from './vehicleDamage';
import type { VehicleHandlingProfile } from './vehicleModels';
import { updateFirstPersonViewmodel } from './fpViewmodel';

export function buildCockpitInstrumentCluster(
  scene: Scene,
  id: string,
  profile: VehicleHandlingProfile,
  isHeavy: boolean,
  root: TransformNode
): Mesh {
  const tex = new DynamicTexture(`cockpitGauge_${id}`, { width: 256, height: 96 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 52, 34, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.strokeStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(192, 52, 34, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MPH', 64, 62);
  ctx.fillText('RPM', 192, 62);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('D', 128, 48);
  tex.update(true);

  const mat = new PBRMaterial(`cockpitGaugeMat_${id}`, scene);
  mat.albedoTexture = tex;
  mat.emissiveTexture = tex;
  mat.emissiveColor = new Color3(0.45, 0.75, 0.95);
  mat.roughness = 0.2;

  const panel = MeshBuilder.CreatePlane(`vehGauge_${id}`, { width: 0.44, height: 0.16 }, scene);
  panel.position.set(-profile.width * 0.21, isHeavy ? 1.56 : 0.96, profile.length * 0.17);
  panel.rotation.x = 0.18;
  panel.material = mat;
  panel.parent = root;
  return panel;
}

export function syncVehicleCockpitCameraAndHands(
  rt: VehicleRuntime,
  char: CharacterSaveState,
  player: PlayerController,
  animTime: number,
  phoneOpen: boolean,
  renderDt: number
): void {
  const rig = player.rigs[char.id];
  const isHeavy = rt.data.vehicleClass === 'bus' || rt.data.vehicleClass === 'truck';
  const driverLocalX = rt.data.vehicleClass === 'motorcycle' ? 0 : -rt.profile.width * 0.21;
  const driverEyeY = isHeavy ? 1.88 : rt.data.vehicleClass === 'motorcycle' ? 1.32 : 1.19;
  const driverLocalZ = -0.05;

  const cosY = Math.cos(rt.data.yaw);
  const sinY = Math.sin(rt.data.yaw);
  const eyePos = new Vector3(
    rt.data.position.x + cosY * driverLocalX + sinY * driverLocalZ,
    rt.data.position.y + driverEyeY,
    rt.data.position.z - sinY * driverLocalX + cosY * driverLocalZ
  );

  const lookYaw = rt.data.yaw + rt.steerAngle * 0.28;
  const fwd = new Vector3(Math.sin(lookYaw), -0.04, Math.cos(lookYaw));

  player.camera.minZ = 0.05;
  player.camera.fov = clamp(0.95 + rt.velocity.length() * 0.004, 0.95, 1.12);
  player.camera.position = Vector3.Lerp(player.camera.position, eyePos, clamp(renderDt * 26, 0, 1));
  player.camera.setTarget(player.camera.position.add(fwd.scale(15)));

  if (rig) {
    rig.head.setEnabled(false);
    rig.neck.setEnabled(false);
    rig.fpArms.setEnabled(true);
    updateFirstPersonViewmodel(rig.fpViewmodel, {
      animTime,
      speedMps: rt.velocity.length(),
      sprinting: false,
      aiming: false,
      phoneOpen,
      inVehicle: true,
      steerAngle: rt.steerAngle,
      weaponId: 'unarmed',
      recoilKick: 0,
      reloadAlpha: 0,
    });
  }
}

export function restoreOutsideVehicleView(char: CharacterSaveState, player: PlayerController): void {
  player.camera.minZ = 0.2;
  const rig = player.rigs[char.id];
  if (rig) {
    rig.fpArms.setEnabled(false);
    rig.head.setEnabled(true);
    rig.neck.setEnabled(true);
  }
}
