/**
 * Aerodynamic Curved Spline & Lofted Vehicle Bodywork Builder
 * Builds curved car silhouettes via multi-station CreateRibbon paths,
 * curved wrap-around windshields, contoured hoods, 48-segment spoked alloy wheels,
 * and open-top convertible interiors matching IMG_8171 & IMG_8170.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { VehicleClass } from '../core/types';
import type { VehicleHandlingProfile } from './vehicleModels';

interface BodyStation {
  zFrac: number;
  wFrac: number;
  yBottom: number;
  yBelt: number;
  yCrown: number;
}

function getStationsForClass(vc: VehicleClass, isConvertible: boolean): BodyStation[] {
  if (vc === 'bus' || vc === 'truck' || vc === 'trailer') {
    return [
      { zFrac: 0.5, wFrac: 0.92, yBottom: 0.34, yBelt: 1.05, yCrown: 1.55 },
      { zFrac: 0.44, wFrac: 0.99, yBottom: 0.32, yBelt: 1.28, yCrown: 1.82 },
      { zFrac: 0.2, wFrac: 1.0, yBottom: 0.3, yBelt: 1.4, yCrown: 2.05 },
      { zFrac: -0.25, wFrac: 1.0, yBottom: 0.3, yBelt: 1.4, yCrown: 2.08 },
      { zFrac: -0.5, wFrac: 0.96, yBottom: 0.34, yBelt: 1.35, yCrown: 1.98 },
    ];
  }
  if (vc === 'motorcycle') {
    return [
      { zFrac: 0.46, wFrac: 0.5, yBottom: 0.42, yBelt: 0.72, yCrown: 0.88 },
      { zFrac: 0.15, wFrac: 0.95, yBottom: 0.34, yBelt: 0.74, yCrown: 0.92 },
      { zFrac: -0.15, wFrac: 0.82, yBottom: 0.38, yBelt: 0.68, yCrown: 0.78 },
      { zFrac: -0.46, wFrac: 0.45, yBottom: 0.46, yBelt: 0.74, yCrown: 0.84 },
    ];
  }
  if (vc === 'supercar' || vc === 'sports') {
    return [
      { zFrac: 0.5, wFrac: 0.82, yBottom: 0.18, yBelt: 0.42, yCrown: 0.48 },
      { zFrac: 0.4, wFrac: 0.98, yBottom: 0.19, yBelt: 0.62, yCrown: 0.72 },
      { zFrac: 0.2, wFrac: 1.0, yBottom: 0.2, yBelt: 0.78, yCrown: 0.88 },
      { zFrac: 0.0, wFrac: 0.96, yBottom: 0.2, yBelt: 0.84, yCrown: 0.92 },
      { zFrac: -0.26, wFrac: 1.02, yBottom: 0.21, yBelt: 0.9, yCrown: 0.96 },
      { zFrac: -0.44, wFrac: 0.97, yBottom: 0.24, yBelt: 0.88, yCrown: 0.92 },
      { zFrac: -0.5, wFrac: 0.86, yBottom: 0.28, yBelt: 0.82, yCrown: 0.85 },
    ];
  }
  return [
    { zFrac: 0.5, wFrac: 0.86, yBottom: 0.22, yBelt: 0.52, yCrown: 0.6 },
    { zFrac: 0.38, wFrac: 0.99, yBottom: 0.22, yBelt: 0.76, yCrown: 0.84 },
    { zFrac: 0.18, wFrac: 1.0, yBottom: 0.22, yBelt: 0.88, yCrown: 0.94 },
    { zFrac: -0.15, wFrac: 1.0, yBottom: 0.22, yBelt: 0.9, yCrown: isConvertible ? 0.91 : 0.95 },
    { zFrac: -0.4, wFrac: 0.98, yBottom: 0.25, yBelt: 0.92, yCrown: 0.95 },
    { zFrac: -0.5, wFrac: 0.88, yBottom: 0.28, yBelt: 0.84, yCrown: 0.88 },
  ];
}

export function buildLoftedCarBody(
  scene: Scene,
  id: string,
  vc: VehicleClass,
  profile: VehicleHandlingProfile,
  isConvertible: boolean,
  bodyMat: PBRMaterial,
  root: TransformNode
): Mesh {
  const stations = getStationsForClass(vc, isConvertible);
  const halfW = profile.width * 0.5;
  const len = profile.length;
  const pathArray: Vector3[][] = stations.map((st) => {
    const z = st.zFrac * len;
    const w = halfW * st.wFrac;
    const pinch = w * 0.88;
    const crownIn = w * 0.55;
    return [
      new Vector3(0, st.yBottom, z),
      new Vector3(-pinch, st.yBottom + 0.03, z),
      new Vector3(-w, (st.yBottom + st.yBelt) * 0.52, z),
      new Vector3(-w * 0.97, st.yBelt, z),
      new Vector3(-crownIn, st.yCrown, z),
      new Vector3(0, st.yCrown + 0.025, z),
      new Vector3(crownIn, st.yCrown, z),
      new Vector3(w * 0.97, st.yBelt, z),
      new Vector3(w, (st.yBottom + st.yBelt) * 0.52, z),
      new Vector3(pinch, st.yBottom + 0.03, z),
      new Vector3(0, st.yBottom, z),
    ];
  });

  const chassis = MeshBuilder.CreateRibbon(
    `vehBody_${id}`,
    {
      pathArray,
      closePath: false,
      closeArray: false,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene
  );
  chassis.material = bodyMat;
  chassis.parent = root;
  chassis.receiveShadows = true;
  return chassis;
}

export function buildAerodynamicHood(
  scene: Scene,
  id: string,
  vc: VehicleClass,
  profile: VehicleHandlingProfile,
  bodyMat: PBRMaterial,
  root: TransformNode
): Mesh {
  const isHeavy = vc === 'bus' || vc === 'truck' || vc === 'trailer';
  const w = profile.width * 0.41;
  const zFront = profile.length * 0.47;
  const zBack = profile.length * 0.15;
  const yFront = isHeavy ? 1.46 : vc === 'supercar' ? 0.56 : 0.72;
  const yBack = isHeavy ? 1.56 : vc === 'supercar' ? 0.86 : 0.92;

  const pathArray: Vector3[][] = [0, 0.35, 0.7, 1].map((t) => {
    const z = zFront + (zBack - zFront) * t;
    const y = yFront + (yBack - yFront) * t;
    const wt = w * (0.86 + t * 0.14);
    return [
      new Vector3(-wt, y - 0.03, z),
      new Vector3(-wt * 0.45, y + 0.025, z),
      new Vector3(0, y + 0.04, z),
      new Vector3(wt * 0.45, y + 0.025, z),
      new Vector3(wt, y - 0.03, z),
    ];
  });

  const hood = MeshBuilder.CreateRibbon(
    `vehHood_${id}`,
    { pathArray, sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
  hood.material = bodyMat;
  hood.parent = root;
  return hood;
}

export function buildCurvedCabinAndGlass(
  scene: Scene,
  id: string,
  vc: VehicleClass,
  profile: VehicleHandlingProfile,
  isConvertible: boolean,
  bodyMat: PBRMaterial,
  glassMat: PBRMaterial,
  trimMat: PBRMaterial,
  root: TransformNode
): void {
  const isHeavy = vc === 'bus' || vc === 'truck' || vc === 'trailer';
  const wBase = profile.width * 0.43;
  const wTop = profile.width * 0.35;
  const yBase = isHeavy ? 1.56 : 0.9;
  const yPeak = isHeavy ? 2.28 : vc === 'supercar' ? 1.24 : 1.36;

  // Curved wrap-around panoramic windshield
  const wsPath: Vector3[][] = [
    [
      new Vector3(-wBase, yBase, profile.length * 0.16),
      new Vector3(0, yBase, profile.length * 0.21),
      new Vector3(wBase, yBase, profile.length * 0.16),
    ],
    [
      new Vector3(-wTop, yPeak, profile.length * (isHeavy ? 0.11 : 0.02)),
      new Vector3(0, yPeak + 0.02, profile.length * (isHeavy ? 0.15 : 0.06)),
      new Vector3(wTop, yPeak, profile.length * (isHeavy ? 0.11 : 0.02)),
    ],
  ];
  const windshield = MeshBuilder.CreateRibbon(
    `vehWindshield_${id}`,
    { pathArray: wsPath, sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
  windshield.material = glassMat;
  windshield.parent = root;

  if (isConvertible) {
    // Open-top seats, headrest bolsters & roll hoops (IMG_8170)
    for (const sx of [-0.36, 0.36]) {
      const seatBack = MeshBuilder.CreateCylinder(
        `vehSeat_${id}_${sx}`,
        { diameterTop: 0.36, diameterBottom: 0.44, height: 0.56, tessellation: 18 },
        scene
      );
      seatBack.scaling.set(1.0, 1.0, 0.42);
      seatBack.position.set(sx, 0.92, -0.28);
      seatBack.rotation.x = -0.18;
      seatBack.material = trimMat;
      seatBack.parent = root;
    }
    return;
  }

  // Swept fastback / sedan / SUV curved roofline
  const zStart = profile.length * (isHeavy ? 0.13 : 0.04);
  const zMid = profile.length * -0.16;
  const zRear = profile.length * (vc === 'suv' || isHeavy ? -0.44 : -0.38);
  const roofPath: Vector3[][] = [
    [new Vector3(-wTop, yPeak, zStart), new Vector3(0, yPeak + 0.03, zStart), new Vector3(wTop, yPeak, zStart)],
    [new Vector3(-wTop * 0.96, yPeak + 0.02, zMid), new Vector3(0, yPeak + 0.05, zMid), new Vector3(wTop * 0.96, yPeak + 0.02, zMid)],
    [
      new Vector3(-wBase * 0.92, vc === 'suv' || isHeavy ? yPeak - 0.04 : yBase + 0.04, zRear),
      new Vector3(0, vc === 'suv' || isHeavy ? yPeak : yBase + 0.08, zRear),
      new Vector3(wBase * 0.92, vc === 'suv' || isHeavy ? yPeak - 0.04 : yBase + 0.04, zRear),
    ],
  ];
  const roof = MeshBuilder.CreateRibbon(`vehRoof_${id}`, { pathArray: roofPath, sideOrientation: Mesh.DOUBLESIDE }, scene);
  roof.material = bodyMat;
  roof.parent = root;

  // Side greenhouse glass windows
  for (const s of [-1, 1]) {
    const winPath: Vector3[][] = [
      [new Vector3(s * wBase, yBase, zStart), new Vector3(s * wBase * 0.98, yBase, zRear)],
      [new Vector3(s * wTop, yPeak - 0.02, zStart - 0.06), new Vector3(s * wTop * 0.94, yPeak - 0.04, zMid)],
    ];
    const sideGlass = MeshBuilder.CreateRibbon(`vehSideGlass_${id}_${s}`, { pathArray: winPath, sideOrientation: Mesh.DOUBLESIDE }, scene);
    sideGlass.material = glassMat;
    sideGlass.parent = root;
  }
}

export function buildSculptedSpoiler(
  scene: Scene,
  id: string,
  profile: VehicleHandlingProfile,
  isHeavy: boolean,
  trimMat: PBRMaterial,
  root: TransformNode
): Mesh {
  const y = isHeavy ? 2.02 : 1.08;
  const z = -profile.length * 0.45;
  const w = profile.width * 0.46;
  const wingPath: Vector3[][] = [
    [new Vector3(-w, y - 0.02, z + 0.14), new Vector3(0, y, z + 0.12), new Vector3(w, y - 0.02, z + 0.14)],
    [new Vector3(-w * 1.03, y + 0.04, z - 0.14), new Vector3(0, y + 0.03, z - 0.12), new Vector3(w * 1.03, y + 0.04, z - 0.14)],
  ];
  const spoiler = MeshBuilder.CreateRibbon(`vehSpoiler_${id}`, { pathArray: wingPath, sideOrientation: Mesh.DOUBLESIDE }, scene);
  spoiler.material = trimMat;
  spoiler.parent = root;
  return spoiler;
}

export function buildSpokedAlloyWheel(
  scene: Scene,
  id: string,
  idx: number,
  wx: number,
  wz: number,
  wheelDiam: number,
  isMoto: boolean,
  tireMat: PBRMaterial,
  rimMat: PBRMaterial,
  caliperMat: PBRMaterial,
  root: TransformNode
): TransformNode {
  const wNode = new TransformNode(`vehWNode_${id}_${idx}`, scene);
  wNode.position.set(wx, wheelDiam * 0.5, wz);
  wNode.parent = root;

  const width = isMoto ? 0.18 : 0.27;
  const tire = MeshBuilder.CreateCylinder(
    `vehW_${id}_${idx}`,
    { diameter: wheelDiam, height: width, tessellation: 48 },
    scene
  );
  tire.rotation.z = Math.PI / 2;
  tire.material = tireMat;
  tire.parent = wNode;

  // Outer alloy barrel lip
  const rimBarrel = MeshBuilder.CreateTorus(
    `vehRim_${id}_${idx}`,
    { diameter: wheelDiam * 0.62, thickness: 0.055, tessellation: 48 },
    scene
  );
  rimBarrel.rotation.z = Math.PI / 2;
  rimBarrel.position.x = wx < 0 ? -width * 0.34 : width * 0.34;
  rimBarrel.material = rimMat;
  rimBarrel.parent = wNode;

  // Center hub + 6 metallic alloy spokes
  const hub = MeshBuilder.CreateCylinder(`vehHub_${id}_${idx}`, { diameter: wheelDiam * 0.18, height: width * 0.85, tessellation: 24 }, scene);
  hub.rotation.z = Math.PI / 2;
  hub.material = rimMat;
  hub.parent = wNode;

  const faceX = wx < 0 ? -width * 0.32 : width * 0.32;
  for (let s = 0; s < 6; s++) {
    const a = (s * Math.PI) / 3;
    const spoke = MeshBuilder.CreateCylinder(
      `vehSpk_${id}_${idx}_${s}`,
      { diameterTop: 0.022, diameterBottom: 0.032, height: wheelDiam * 0.58, tessellation: 10 },
      scene
    );
    spoke.position.set(faceX, 0, 0);
    spoke.rotation.x = a;
    spoke.material = rimMat;
    spoke.parent = wNode;
  }

  // Drilled brake rotor + painted caliper
  const caliper = MeshBuilder.CreateCylinder(
    `vehCal_${id}_${idx}`,
    { diameter: 0.14, height: 0.1, tessellation: 16 },
    scene
  );
  caliper.scaling.set(0.7, 1.35, 1.15);
  caliper.position.set(wx < 0 ? 0.03 : -0.03, 0.08, 0.11);
  caliper.material = caliperMat;
  caliper.parent = wNode;

  return wNode;
}
