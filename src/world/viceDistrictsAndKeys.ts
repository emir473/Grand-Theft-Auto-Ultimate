/**
 * Overseas Keys Highway Bridges (SR-1A to Key Lento & Mile Zero),
 * Vice City Neighborhood Infill (Little Cuba, Bayside, Stockyard, Leaf Links),
 * and IMG_8168 Iconic Curved Finned Art Deco Lifeguard Canopy.
 */

import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { createParallaxFacadeMaterial } from '../rendering/shaders';
import { posterUVToWorld } from './leonidaGeoData';
import type { SpatialGrid } from './spatialGrid';

export function buildArtDecoLifeguardFin(
  scene: Scene,
  gfx: GraphicsEngine,
  x: number,
  z: number,
  parent: TransformNode
): void {
  const root = new TransformNode('vb_lifeguard_artdeco_fin', scene);
  root.position.set(x, 0, z);
  root.parent = parent;

  const yellowMat = new PBRMaterial('lgYellowFinMat', scene);
  yellowMat.albedoColor = new Color3(0.95, 0.84, 0.16);
  yellowMat.roughness = 0.35;

  const greenMat = new PBRMaterial('lgGreenFinMat', scene);
  greenMat.albedoColor = new Color3(0.24, 0.72, 0.32);
  greenMat.roughness = 0.38;

  // Curved arched dome canopy + twin diagonal dorsal fins matching IMG_8168
  const dome = MeshBuilder.CreateSphere('lgDomeCap', { diameterX: 4.1, diameterY: 2.0, diameterZ: 4.1, segments: 18, slice: 0.5 }, scene);
  dome.position.set(0, 5.0, 0);
  dome.material = yellowMat;
  dome.parent = root;
  gfx.registerShadowCaster(dome, false);

  const fin = MeshBuilder.CreateRibbon(
    'lgDorsalFin',
    {
      pathArray: [
        [new Vector3(-0.18, 5.4, -1.6), new Vector3(0.18, 5.4, -1.6)],
        [new Vector3(-0.14, 7.3, 0.2), new Vector3(0.14, 7.3, 0.2)],
        [new Vector3(-0.08, 5.6, 1.8), new Vector3(0.08, 5.6, 1.8)],
      ],
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene
  );
  fin.material = greenMat;
  fin.parent = root;
  gfx.registerShadowCaster(fin, false);
}

export function buildViceDistrictInfill(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  stuccoMat: PBRMaterial,
  neonCoral: PBRMaterial,
  neonCyan: PBRMaterial,
  spatialGrid: SpatialGrid,
  parent: TransformNode
): void {
  const root = new TransformNode('vice_district_infill', scene);
  root.parent = parent;

  // 1. Little Cuba storefronts with striped awnings (poster u=0.688, v=0.515)
  const lcCenter = posterUVToWorld(0.688, 0.515);
  const lcColors = [
    new Color3(0.92, 0.62, 0.52),
    new Color3(0.94, 0.85, 0.55),
    new Color3(0.45, 0.78, 0.75),
    new Color3(0.88, 0.45, 0.55),
  ];
  for (let i = 0; i < 6; i++) {
    const bx = lcCenter.x + (i % 3) * 24 - 24;
    const bz = lcCenter.z + Math.floor(i / 3) * 28 - 14;
    const h = 7.5 + (i % 3) * 2.4;
    const wallMat = new PBRMaterial(`lcWallMat_${i}`, scene);
    wallMat.albedoColor = lcColors[i % lcColors.length];
    wallMat.roughness = 0.76;

    const shop = MeshBuilder.CreateBox(`lcShop_${i}`, { width: 15, height: h, depth: 14 }, scene);
    shop.position.set(bx, h / 2 + 0.4, bz);
    shop.material = wallMat;
    shop.receiveShadows = true;
    shop.parent = root;
    gfx.registerShadowCaster(shop, false);

    const awning = MeshBuilder.CreateBox(`lcAwning_${i}`, { width: 14.5, height: 0.35, depth: 2.4 }, scene);
    awning.position.set(bx, 3.6, bz + 8.1);
    awning.rotation.x = 0.32;
    awning.material = i % 2 === 0 ? neonCoral : neonCyan;
    awning.parent = root;

    spatialGrid.insert(`lc_shop_${i}`, 'building', { x: bx, y: 0, z: bz }, { name: 'Little Cuba Storefront' });
  }

  // 2. Bayside Waterfront Mid-Rises (poster u=0.735, v=0.435)
  const bayCenter = posterUVToWorld(0.735, 0.435);
  for (let i = 0; i < 4; i++) {
    const bx = bayCenter.x + (i - 1.5) * 28;
    const bz = bayCenter.z + (i % 2) * 18;
    const h = 20 + (i % 3) * 8;
    const fMat = createParallaxFacadeMaterial(`bayside_fac_${i}`, scene, 6, Math.round(h / 3.2), 40 + i * 1.9);
    const tower = MeshBuilder.CreateBox(`bayside_mid_${i}`, { width: 18, height: h, depth: 18 }, scene);
    tower.position.set(bx, h / 2 + 0.4, bz);
    tower.material = fMat;
    tower.receiveShadows = true;
    tower.parent = root;
    gfx.registerShadowCaster(tower, false);

    const cornice = MeshBuilder.CreateBox(`bayside_corn_${i}`, { width: 19, height: 0.7, depth: 19 }, scene);
    cornice.position.set(bx, h + 0.6, bz);
    cornice.material = stuccoMat;
    cornice.parent = root;
  }

  // 3. Stockyard Industrial Service Bays (poster u=0.735, v=0.395)
  const syCenter = posterUVToWorld(0.735, 0.395);
  for (let i = 0; i < 3; i++) {
    const bx = syCenter.x + (i - 1) * 32;
    const warehouse = MeshBuilder.CreateBox(`stockyard_bay_${i}`, { width: 22, height: 9, depth: 18 }, scene);
    warehouse.position.set(bx, 4.9, syCenter.z);
    warehouse.material = concreteMat;
    warehouse.receiveShadows = true;
    warehouse.parent = root;
    gfx.registerShadowCaster(warehouse, false);
  }

  // 4. Leaf Links Golf Course Fairways, Greens & Sand Bunkers (u=0.786, v=0.413)
  const llCenter = posterUVToWorld(0.786, 0.413);
  const turfMat = new PBRMaterial('leafLinksTurfMat', scene);
  turfMat.albedoColor = new Color3(0.18, 0.56, 0.24);
  turfMat.roughness = 0.88;
  const bunkerMat = new PBRMaterial('leafLinksBunkerMat', scene);
  bunkerMat.albedoColor = new Color3(0.89, 0.83, 0.66);
  bunkerMat.roughness = 0.92;

  for (let i = 0; i < 3; i++) {
    const gx = llCenter.x + (i - 1) * 38;
    const gz = llCenter.z + (i % 2 === 0 ? -16 : 18);
    const green = MeshBuilder.CreateDisc(`ll_green_${i}`, { radius: 13, tessellation: 24 }, scene);
    green.rotation.x = Math.PI / 2;
    green.position.set(gx, 1.32, gz);
    green.material = turfMat;
    green.receiveShadows = true;
    green.parent = root;

    const bunker = MeshBuilder.CreateDisc(`ll_bunker_${i}`, { radius: 4.2, tessellation: 18 }, scene);
    bunker.rotation.x = Math.PI / 2;
    bunker.scaling.set(1.4, 0.75, 1);
    bunker.position.set(gx + 11, 1.33, gz + 5);
    bunker.material = bunkerMat;
    bunker.parent = root;

    const flagPole = MeshBuilder.CreateCylinder(`ll_flag_${i}`, { diameter: 0.08, height: 2.8, tessellation: 8 }, scene);
    flagPole.position.set(gx, 2.7, gz);
    flagPole.material = stuccoMat;
    flagPole.parent = root;
  }
}

export function buildOverseasKeysAndBridges(
  scene: Scene,
  gfx: GraphicsEngine,
  concreteMat: PBRMaterial,
  asphaltMat: PBRMaterial,
  neonCyan: PBRMaterial,
  parent: TransformNode
): void {
  const root = new TransformNode('overseas_keys_bridges', scene);
  root.parent = parent;

  // SR-1A Overseas Causeway segments linking Mainland South -> Corsair Key -> Shoeless Keys -> Key Lento -> Mile Zero
  const waypoints = [
    posterUVToWorld(0.685, 0.680),
    posterUVToWorld(0.663, 0.728), // Corsair Key
    posterUVToWorld(0.616, 0.770), // Shoeless Keys
    posterUVToWorld(0.548, 0.832), // Key Lento
    posterUVToWorld(0.290, 0.855), // Mile Zero
  ];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.z + b.z) * 0.5;

    const deck = MeshBuilder.CreateBox(`keys_bridge_${i}`, { width: 11.5, height: 0.9, depth: len }, scene);
    deck.position.set(midX, 2.4, midZ);
    deck.rotation.y = yaw;
    deck.material = asphaltMat;
    deck.receiveShadows = true;
    deck.parent = root;

    const railStep = Math.max(3, Math.floor(len / 48));
    for (let s = 1; s < railStep; s++) {
      const f = s / railStep;
      const px = a.x + dx * f;
      const pz = a.z + dz * f;
      for (const side of [-4.4, 4.4]) {
        const ox = Math.cos(yaw) * side;
        const oz = -Math.sin(yaw) * side;
        const pier = MeshBuilder.CreateCylinder(`keys_pier_${i}_${s}_${side}`, { diameter: 1.5, height: 6.2, tessellation: 12 }, scene);
        pier.position.set(px + ox, -0.6, pz + oz);
        pier.material = concreteMat;
        pier.parent = root;
      }
    }
  }

  // Key Lento Marina Pier & Coastal Lighthouse Beacon (IMG_8682)
  const keyLento = waypoints[3];
  const pierDeck = MeshBuilder.CreateBox('key_lento_pier', { width: 22, height: 0.7, depth: 8 }, scene);
  pierDeck.position.set(keyLento.x + 18, 1.4, keyLento.z + 12);
  pierDeck.material = concreteMat;
  pierDeck.parent = root;

  const lighthouse = MeshBuilder.CreateCylinder('key_lento_lighthouse', { diameterTop: 2.2, diameterBottom: 4.2, height: 22, tessellation: 20 }, scene);
  lighthouse.position.set(keyLento.x - 16, 12.2, keyLento.z - 14);
  lighthouse.material = concreteMat;
  lighthouse.parent = root;
  gfx.registerShadowCaster(lighthouse, false);

  const beacon = MeshBuilder.CreateSphere('key_lento_beacon', { diameter: 2.1, segments: 14 }, scene);
  beacon.position.set(keyLento.x - 16, 23.6, keyLento.z - 14);
  beacon.material = neonCyan;
  beacon.parent = root;
}
