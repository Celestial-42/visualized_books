import { buildTopology, metrics } from './topology';

/**
 * Chapter 1 is a scaling argument, not a slogan: a bus serialises every
 * transaction on one wire, a mesh spreads them over √N of them.
 */

export const busCompletion = (cores: number, flits: number) => cores * flits;

export const nearestMesh = (cores: number) => {
  const side = Math.max(2, Math.round(Math.sqrt(cores)));
  return { w: side, h: side, nodes: side * side };
};

/** Time for every node to send one packet, with the links able to work in parallel. */
export const meshCompletion = (cores: number, flits: number, perHop = 5) => {
  const mesh = nearestMesh(cores);
  const g = buildTopology('mesh', mesh.w, mesh.h);
  const m = metrics(g);
  return m.avgHops * perHop + flits;
};

export type ScalingRow = {
  cores: number;
  bus: number;
  mesh: number;
  ratio: number;
  meshNodes: number;
};

export const scalingTable = (flits: number, sizes = [4, 9, 16, 25, 36, 64]): ScalingRow[] =>
  sizes.map((cores) => {
    const mesh = nearestMesh(cores);
    // a mesh can only be built out of w×h routers; compare against the square that fits
    const bus = busCompletion(cores, flits);
    const m = meshCompletion(cores, flits);
    return { cores, bus, mesh: m, ratio: bus / m, meshNodes: mesh.nodes };
  });

/** Wire delay does not shrink with process: a bus spans the die, a mesh link spans one tile. */
export const wireDelay = (cores: number, mmPerCore: number, psPerMm: number) => {
  const side = Math.sqrt(cores);
  return {
    bus: side * mmPerCore * psPerMm,
    mesh: mmPerCore * psPerMm
  };
};
