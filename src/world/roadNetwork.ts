/**
 * Procedural Leonida / Vice City Road, Rail, Waterway & Sidewalk Network + A* Pathfinder
 * Every node and edge matches actual rendered world geometry.
 */

import type { RoadEdge, RoadNode, RoadType, Vec3 } from '../core/types';
import { LEONIDA_ROAD_CORRIDORS, posterUVToWorld } from './leonidaGeoData';

export interface RouteResult {
  found: boolean;
  nodes: RoadNode[];
  edges: RoadEdge[];
  totalMeters: number;
  instructions: Array<{ textKey: string; distMeters: number; nodeId: string }>;
}

export class RoadNetwork {
  public readonly nodes = new Map<string, RoadNode>();
  public readonly edges: RoadEdge[] = [];
  private adj = new Map<string, RoadEdge[]>();

  constructor() {
    this.buildLeonidaNetwork();
  }

  private addNode(node: RoadNode): void {
    this.nodes.set(node.id, node);
    if (!this.adj.has(node.id)) this.adj.set(node.id, []);
  }

  private addEdge(
    id: string,
    from: string,
    to: string,
    roadType: RoadType,
    speedLimitMps: number,
    lanes = 2,
    oneWay = false
  ): void {
    const a = this.nodes.get(from);
    const b = this.nodes.get(to);
    if (!a || !b) return;
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

    const edge: RoadEdge = {
      id,
      from,
      to,
      lengthMeters: len,
      speedLimitMps,
      roadType,
      lanes,
      oneWay,
      closed: false,
      weightMultiplier: 1.0,
    };
    this.edges.push(edge);
    this.adj.get(from)!.push(edge);

    if (!oneWay) {
      const rev: RoadEdge = { ...edge, id: `${id}_rev`, from: to, to: from };
      this.edges.push(rev);
      this.adj.get(to)!.push(rev);
    }
  }

  private buildLeonidaNetwork(): void {
    // Starfish Island & Admiral Causeway (starting hub around (0, 0))
    this.addNode({ id: 'star_villa_gate', x: 0, y: 0.5, z: -28, kind: 'intersection', name: 'Starfish Island Gate' });
    this.addNode({ id: 'star_east_loop', x: 55, y: 0.5, z: -28, kind: 'waypoint' });
    this.addNode({ id: 'star_bridge_east', x: 110, y: 1.5, z: -28, kind: 'intersection', name: 'Admiral Causeway East' });
    this.addNode({ id: 'star_bridge_west', x: -95, y: 1.5, z: -28, kind: 'intersection', name: 'Admiral Causeway West' });

    // Vice Beach / Ocean Beach / Washington Beach (East Side, x ~ 165)
    this.addNode({ id: 'ocean_south', x: 165, y: 0.5, z: -160, kind: 'stop', name: 'Ocean Beach South' });
    this.addNode({ id: 'ocean_mid', x: 165, y: 0.5, z: -28, kind: 'intersection', name: 'Ocean Beach & Causeway' });
    this.addNode({ id: 'ocean_club', x: 165, y: 0.5, z: 95, kind: 'stop', name: 'Washington Beach Blvd' });
    this.addNode({ id: 'ocean_north', x: 165, y: 0.5, z: 220, kind: 'intersection', name: 'Leaf Links Causeway' });

    // Downtown Vice City (West Side, x ~ -140 to -240)
    this.addNode({ id: 'dt_east', x: -140, y: 0.5, z: -28, kind: 'intersection', name: 'Downtown Waterfront' });
    this.addNode({ id: 'dt_bank', x: -140, y: 0.5, z: 95, kind: 'stop', name: 'Bayside Plaza' });
    this.addNode({ id: 'dt_hospital', x: -140, y: 0.5, z: -155, kind: 'stop', name: 'Vice City General Hospital' });
    this.addNode({ id: 'dt_ammu', x: -240, y: 0.5, z: -28, kind: 'intersection', name: 'Little Cuba & Crosstown' });
    this.addNode({ id: 'dt_north', x: -140, y: 0.5, z: 220, kind: 'intersection', name: 'I-97 North Interchange' });

    // Expressways & VCIA Airport
    this.addNode({ id: 'vcia_entry', x: -240, y: 0.5, z: -155, kind: 'intersection', name: 'VCI Airport Entry' });
    this.addNode({ id: 'vcia_terminal', x: -240, y: 0.5, z: -290, kind: 'stop', name: 'VCI Airport Terminal' });
    this.addNode({ id: 'swamp_east', x: -140, y: 0.5, z: 320, kind: 'intersection', name: 'Stockyard North' });
    this.addNode({ id: 'prison_gate', x: -280, y: 0.5, z: 220, kind: 'stop', name: 'Rockridge Westbound' });
    this.addNode({ id: 'zancudo_gate', x: -340, y: 0.5, z: 95, kind: 'gate', name: 'Balsero Highway Junction' });
    this.addNode({ id: 'gellhorn_port', x: -340, y: 0.5, z: -155, kind: 'harbor', name: 'Salton Express Ramp' });

    // Drivable starter city road edges
    this.addEdge('r_star_1', 'star_villa_gate', 'star_east_loop', 'street', 16);
    this.addEdge('r_star_2', 'star_east_loop', 'star_bridge_east', 'avenue', 22);
    this.addEdge('r_star_3', 'star_bridge_east', 'ocean_mid', 'avenue', 24);
    this.addEdge('r_star_4', 'star_villa_gate', 'star_bridge_west', 'avenue', 22);
    this.addEdge('r_star_5', 'star_bridge_west', 'dt_east', 'avenue', 24);

    this.addEdge('r_ocean_1', 'ocean_south', 'ocean_mid', 'avenue', 20);
    this.addEdge('r_ocean_2', 'ocean_mid', 'ocean_club', 'avenue', 20);
    this.addEdge('r_ocean_3', 'ocean_club', 'ocean_north', 'avenue', 22);
    this.addEdge('r_north_hwy', 'ocean_north', 'dt_north', 'highway', 33);
    this.addEdge('r_south_hwy', 'ocean_south', 'dt_hospital', 'highway', 33);

    this.addEdge('r_dt_1', 'dt_hospital', 'dt_east', 'avenue', 22);
    this.addEdge('r_dt_2', 'dt_east', 'dt_bank', 'avenue', 22);
    this.addEdge('r_dt_3', 'dt_bank', 'dt_north', 'avenue', 24);
    this.addEdge('r_dt_4', 'dt_east', 'dt_ammu', 'street', 18);
    this.addEdge('r_dt_5', 'dt_ammu', 'vcia_entry', 'avenue', 24);
    this.addEdge('r_dt_6', 'dt_hospital', 'vcia_entry', 'highway', 30);
    this.addEdge('r_vcia_1', 'vcia_entry', 'vcia_terminal', 'avenue', 22);

    this.addEdge('r_swamp_1', 'dt_north', 'swamp_east', 'highway', 30);
    this.addEdge('r_prison_1', 'dt_north', 'prison_gate', 'highway', 28);
    this.addEdge('r_zancudo_1', 'dt_ammu', 'zancudo_gate', 'street', 20);
    this.addEdge('r_zancudo_2', 'zancudo_gate', 'prison_gate', 'street', 20);
    this.addEdge('r_port_1', 'vcia_entry', 'gellhorn_port', 'highway', 28);
    this.addEdge('r_port_2', 'gellhorn_port', 'zancudo_gate', 'highway', 28);

    // Canonical State-Wide Highways from Official Leonida Map (IMG_8682 & IMG_8384)
    for (const corridor of LEONIDA_ROAD_CORRIDORS) {
      let prevId: string | null = null;
      corridor.points.forEach((pt, idx) => {
        const xz = posterUVToWorld(pt.u, pt.v);
        const nodeId = `geo_${corridor.id}_${idx}`;
        this.addNode({
          id: nodeId,
          x: xz.x,
          y: 0.7,
          z: xz.z,
          kind: idx === 0 || idx === corridor.points.length - 1 ? 'intersection' : 'waypoint',
          name: `${corridor.label} (${idx + 1})`,
        });
        if (prevId) {
          this.addEdge(
            `edge_${corridor.id}_${idx}`,
            prevId,
            nodeId,
            corridor.routeClass === 'rail' ? 'rail' : 'highway',
            corridor.speedLimitMps,
            corridor.lanes
          );
        }
        prevId = nodeId;
      });
    }

    // Link canonical state corridors into Downtown & Southside nodes so A* routes state-wide seamlessly
    this.addEdge('link_i97_dt', 'dt_north', 'geo_i_97_3', 'highway', 32);
    this.addEdge('link_i404_dt', 'dt_east', 'geo_i_404_6', 'highway', 32);
    this.addEdge('link_i397_dt', 'dt_hospital', 'geo_i_397_0', 'highway', 30);
    this.addEdge('link_us35_vcia', 'gellhorn_port', 'geo_us_35_3', 'highway', 28);
    this.addEdge('link_sr1a_i97', 'geo_i_97_6', 'geo_sr_1a_0', 'highway', 30);
    this.addEdge('link_us82_us35', 'geo_us_82_3', 'geo_us_35_5', 'highway', 28);
    this.addEdge('link_us183_i404', 'geo_i_404_2', 'geo_us_183_2', 'highway', 28);
    this.addEdge('link_i297_us35', 'geo_i_297_2', 'geo_us_35_0', 'highway', 32);
    this.addEdge('link_i297_i97', 'geo_i_297_4', 'geo_i_97_0', 'highway', 32);

    // Vice Metro elevated subway rail loop
    this.addNode({ id: 'metro_ocean', x: 180, y: 8, z: -28, kind: 'station', name: 'Ocean Beach Station' });
    this.addNode({ id: 'metro_downtown', x: -125, y: 8, z: 95, kind: 'station', name: 'Downtown Plaza Station' });
    this.addNode({ id: 'metro_hospital', x: -125, y: 8, z: -155, kind: 'station', name: 'Hospital Station' });
    this.addNode({ id: 'metro_vcia', x: -255, y: 8, z: -280, kind: 'station', name: 'VCIA Airport Station' });

    this.addEdge('rail_1', 'metro_ocean', 'metro_downtown', 'rail', 28, 1, true);
    this.addEdge('rail_2', 'metro_downtown', 'metro_hospital', 'rail', 28, 1, true);
    this.addEdge('rail_3', 'metro_hospital', 'metro_vcia', 'rail', 28, 1, true);
    this.addEdge('rail_4', 'metro_vcia', 'metro_ocean', 'rail', 30, 1, true);
  }

  setEdgeClosed(edgeId: string, closed: boolean): void {
    for (const e of this.edges) {
      if (e.id === edgeId || e.id === `${edgeId}_rev`) {
        e.closed = closed;
      }
    }
  }

  findNearestNode(pos: Vec3, allowedTypes?: RoadType[]): RoadNode | null {
    let best: RoadNode | null = null;
    let bestDist = Infinity;
    for (const node of this.nodes.values()) {
      if (allowedTypes) {
        const edges = this.adj.get(node.id) ?? [];
        if (!edges.some((e) => allowedTypes.includes(e.roadType))) continue;
      }
      const d = Math.hypot(node.x - pos.x, node.z - pos.z);
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  }

  /**
   * A* Pathfinder on G=(V,E) respecting road closures, road types, and travel-time weights.
   */
  findRoute(fromPos: Vec3, toPos: Vec3, allowedTypes: RoadType[] = ['highway', 'avenue', 'street', 'alley']): RouteResult {
    const startNode = this.findNearestNode(fromPos, allowedTypes);
    const goalNode = this.findNearestNode(toPos, allowedTypes);
    if (!startNode || !goalNode) {
      return { found: false, nodes: [], edges: [], totalMeters: 0, instructions: [] };
    }
    if (startNode.id === goalNode.id) {
      return {
        found: true,
        nodes: [startNode],
        edges: [],
        totalMeters: 0,
        instructions: [{ textKey: 'hud.gps.arrived', distMeters: 0, nodeId: startNode.id }],
      };
    }

    const open = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, { prevId: string; edge: RoadEdge }>();
    const gScore = new Map<string, number>([[startNode.id, 0]]);
    const fScore = new Map<string, number>([
      [startNode.id, Math.hypot(goalNode.x - startNode.x, goalNode.z - startNode.z) / 30],
    ]);

    while (open.size > 0) {
      let currentId = '';
      let lowestF = Infinity;
      for (const id of open) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
        }
      }

      if (currentId === goalNode.id) {
        return this.reconstructRoute(cameFrom, currentId);
      }

      open.delete(currentId);
      const neighbors = this.adj.get(currentId) ?? [];
      for (const edge of neighbors) {
        if (edge.closed || !allowedTypes.includes(edge.roadType)) continue;
        const cost = (edge.lengthMeters / Math.max(5, edge.speedLimitMps)) * edge.weightMultiplier;
        const tentativeG = (gScore.get(currentId) ?? Infinity) + cost;

        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, { prevId: currentId, edge });
          gScore.set(edge.to, tentativeG);
          const n = this.nodes.get(edge.to)!;
          const h = Math.hypot(goalNode.x - n.x, goalNode.z - n.z) / 30;
          fScore.set(edge.to, tentativeG + h);
          open.add(edge.to);
        }
      }
    }

    return { found: false, nodes: [], edges: [], totalMeters: 0, instructions: [] };
  }

  private reconstructRoute(
    cameFrom: Map<string, { prevId: string; edge: RoadEdge }>,
    goalId: string
  ): RouteResult {
    const nodes: RoadNode[] = [];
    const edges: RoadEdge[] = [];
    let curr = goalId;
    while (cameFrom.has(curr)) {
      nodes.unshift(this.nodes.get(curr)!);
      const step = cameFrom.get(curr)!;
      edges.unshift(step.edge);
      curr = step.prevId;
    }
    nodes.unshift(this.nodes.get(curr)!);

    let totalMeters = 0;
    const instructions: RouteResult['instructions'] = [];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      totalMeters += e.lengthMeters;
      let textKey = 'hud.gps.straight';
      if (i > 0) {
        const prevN = nodes[i - 1];
        const curN = nodes[i];
        const nextN = nodes[i + 1];
        const v1x = curN.x - prevN.x;
        const v1z = curN.z - prevN.z;
        const v2x = nextN.x - curN.x;
        const v2z = nextN.z - curN.z;
        const cross = v1x * v2z - v1z * v2x;
        if (cross > 200) textKey = 'hud.gps.turnLeft';
        else if (cross < -200) textKey = 'hud.gps.turnRight';
      }
      instructions.push({
        textKey,
        distMeters: Math.round(e.lengthMeters),
        nodeId: e.to,
      });
    }
    instructions.push({ textKey: 'hud.gps.arrived', distMeters: 0, nodeId: goalId });

    return { found: true, nodes, edges, totalMeters, instructions };
  }

  getRailStations(): RoadNode[] {
    return ['metro_ocean', 'metro_downtown', 'metro_hospital', 'metro_vcia']
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }
}
