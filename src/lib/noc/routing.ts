import { bfs, type Graph } from './topology';

export type Dir = 'E' | 'W' | 'N' | 'S';

export const DELTA: Record<Dir, { dx: number; dy: number }> = {
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 }
};

export type Turn = `${Dir}${Dir}`;

export const ALL_TURNS: Turn[] = [
  'EN', 'ES', 'WN', 'WS',
  'NE', 'NW', 'SE', 'SW'
];

/** Turn sets of the classic deterministic and partially adaptive families. */
export const TURN_SETS: { id: string; label: string; labelEn: string; turns: Turn[]; note: string; noteEn: string }[] = [
  {
    id: 'xy',
    label: '维序（XY）',
    labelEn: 'Dimension order (XY)',
    turns: ['EN', 'ES', 'WN', 'WS'],
    note: '先走完 X 再走 Y：只允许从水平转向垂直，永远不反向。',
    noteEn: 'All X hops first, then Y: horizontal-to-vertical turns only, never the reverse.'
  },
  {
    id: 'west',
    label: 'West-first',
    labelEn: 'West-first',
    turns: ['EN', 'ES', 'NW', 'SW'],
    note: '要往西就先往西，之后只能走北/南/东；四条转向，两条经典无环集之一。',
    noteEn: 'Route west first, then adapt among north/south/east: four permitted turns, the other classic acyclic set.'
  },
  {
    id: 'broken',
    label: 'XY + 允许 S→W 与 N→E',
    labelEn: 'XY + allow S→W and N→E',
    turns: ['EN', 'ES', 'WN', 'WS', 'SW', 'NE'],
    note: '两条额外转向把 mesh 上的一个方格四边接通，环立刻出现。',
    noteEn: 'Two extra turns close all four edges of one square on the mesh, and the cycle appears.'
  }
];

const dirOf = (g: Graph, u: number, v: number): Dir | null => {
  const du = g.pos[u];
  const dv = g.pos[v];
  const dx = Math.round(dv.x - du.x);
  const dy = Math.round(dv.y - du.y);
  if (dx > 0) return 'E';
  if (dx < 0) return 'W';
  if (dy > 0) return 'S';
  if (dy < 0) return 'N';
  return null;
};

const idAt = (g: Graph, x: number, y: number) => {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return -1;
  return y * g.w + x;
};

/** XY: consume all x displacement first, then all y. */
export const xyPath = (g: Graph, s: number, t: number): number[] => {
  const out = [s];
  let x = s % g.w;
  let y = Math.floor(s / g.w);
  const tx = t % g.w;
  const ty = Math.floor(t / g.w);
  while (x !== tx) {
    x += x < tx ? 1 : -1;
    out.push(idAt(g, x, y));
  }
  while (y !== ty) {
    y += y < ty ? 1 : -1;
    out.push(idAt(g, x, y));
  }
  return out;
};

/** West-first: take the westward leg up front, then XY for the rest. */
export const westFirstPath = (g: Graph, s: number, t: number): number[] => {
  const out = [s];
  let x = s % g.w;
  let y = Math.floor(s / g.w);
  const tx = t % g.w;
  const ty = Math.floor(t / g.w);
  while (x > tx) {
    x -= 1;
    out.push(idAt(g, x, y));
  }
  while (y !== ty) {
    y += y < ty ? 1 : -1;
    out.push(idAt(g, x, y));
  }
  while (x < tx) {
    x += 1;
    out.push(idAt(g, x, y));
  }
  return out;
};

/** Valiant: detour through an intermediate node that is off the shortest path. */
export const valiantPath = (g: Graph, s: number, t: number): number[] => {
  const direct = xyPath(g, s, t).length - 1;
  const start = Math.abs((s * 73856093) ^ (t * 19349663)) % g.n;
  let mid = -1;
  for (let i = 0; i < g.n; i++) {
    const c = (start + i) % g.n;
    if (c === s || c === t) continue;
    const cost = xyPath(g, s, c).length + xyPath(g, c, t).length - 2;
    if (cost > direct) {
      mid = c;
      break;
    }
  }
  if (mid < 0) return xyPath(g, s, t);
  return [...xyPath(g, s, mid), ...xyPath(g, mid, t).slice(1)];
};

export type RoutingId = 'xy' | 'west' | 'valiant' | 'yx';

export const routeBy = (g: Graph, s: number, t: number, algo: RoutingId): number[] => {
  switch (algo) {
    case 'xy':
      return xyPath(g, s, t);
    case 'west':
      return westFirstPath(g, s, t);
    case 'valiant':
      return valiantPath(g, s, t);
    case 'yx':
      return yxPath(g, s, t);
  }
};

const yxPath = (g: Graph, s: number, t: number): number[] => {
  const out = [s];
  let x = s % g.w;
  let y = Math.floor(s / g.w);
  const tx = t % g.w;
  const ty = Math.floor(t / g.w);
  while (y !== ty) {
    y += y < ty ? 1 : -1;
    out.push(idAt(g, x, y));
  }
  while (x !== tx) {
    x += x < tx ? 1 : -1;
    out.push(idAt(g, x, y));
  }
  return out;
};

/**
 * Channel dependency graph for a turn set on a mesh.
 * Nodes are directed channels; an edge a → b exists when a packet holding a
 * may request b. A cycle here is a deadlock waiting to happen.
 */
export type CDG = {
  channels: { id: string; u: number; v: number; dir: Dir }[];
  deps: number[][];
};

export const buildCDG = (g: Graph, allowed: Turn[]): CDG => {
  const channels: CDG['channels'] = [];
  const index = new Map<string, number>();
  for (const [u, v] of g.links) {
    for (const [a, b] of [[u, v], [v, u]] as [number, number][]) {
      const dir = dirOf(g, a, b);
      if (!dir) continue;
      index.set(`${a}>${b}`, channels.length);
      channels.push({ id: `${a}>${b}`, u: a, v: b, dir });
    }
  }
  const deps: number[][] = channels.map(() => []);
  const allow = new Set(allowed);
  for (let i = 0; i < channels.length; i++) {
    const a = channels[i];
    for (const w of g.adj[a.v]) {
      const dir = dirOf(g, a.v, w);
      if (!dir) continue;
      const straight = dir === a.dir;
      const turn = `${a.dir}${dir}` as Turn;
      if (!straight && !allow.has(turn)) continue;
      const j = index.get(`${a.v}>${w}`);
      if (j !== undefined) deps[i].push(j);
    }
  }
  return { channels, deps };
};

const channelLabel = (c: { u: number; v: number }) => `${c.u}→${c.v}`;

/** Returns one dependency cycle as readable channel hops, or null when the graph is acyclic. */
export const findCycle = (cdg: CDG): string[] | null => {
  const state = new Array<number>(cdg.channels.length).fill(0); // 0 white, 1 grey, 2 black
  const stack: number[] = [];

  const visit = (u: number): string[] | null => {
    state[u] = 1;
    stack.push(u);
    for (const v of cdg.deps[u]) {
      if (state[v] === 1) {
        const at = stack.indexOf(v);
        return stack.slice(at).map((i) => channelLabel(cdg.channels[i]));
      }
      if (state[v] === 0) {
        const found = visit(v);
        if (found) return found;
      }
    }
    stack.pop();
    state[u] = 2;
    return null;
  };

  for (let i = 0; i < cdg.channels.length; i++) {
    if (state[i] !== 0) continue;
    const found = visit(i);
    if (found) return found;
  }
  return null;
};

/** A routing function is deadlock-free on this mesh iff its channel graph has no cycle. */
export const routingVerdict = (g: Graph, turns: Turn[]) => {
  const cdg = buildCDG(g, turns);
  const cycle = findCycle(cdg);
  return { cdg, cycle, safe: cycle === null };
};

/**
 * The same turn set spread over several virtual networks. A packet may move up a
 * VN at a turn but never back down, so each VN's turns and the escalation order
 * together decide whether a cycle survives.
 */
export const buildCDGVC = (g: Graph, plans: Turn[][]): { channels: { id: string; u: number; v: number; dir: Dir; vc: number }[]; deps: number[][] } => {
  const base = buildCDG(g, ALL_TURNS);
  const channels = base.channels.flatMap((c, ci) =>
    plans.map((_, vc) => ({ id: `${ci}@${vc}`, u: c.u, v: c.v, dir: c.dir, vc }))
  );
  const index = new Map(channels.map((c, i) => [c.id, i]));
  const deps: number[][] = channels.map(() => []);
  const allow = plans.map((p) => new Set(p));

  for (let ci = 0; ci < base.channels.length; ci++) {
    const a = base.channels[ci];
    for (const w of g.adj[a.v]) {
      const dir = dirOf(g, a.v, w);
      if (!dir) continue;
      const straight = dir === a.dir;
      const turn = `${a.dir}${dir}` as Turn;
      const nextCi = base.channels.findIndex((c) => c.u === a.v && c.v === w);
      if (nextCi < 0) continue;
      for (let vc = 0; vc < plans.length; vc++) {
        for (let nvc = vc; nvc < plans.length; nvc++) {
          if (!straight && !allow[nvc].has(turn)) continue;
          if (nvc !== vc && !allow[nvc].has(turn)) continue;
          const from = index.get(`${ci}@${vc}`);
          const to = index.get(`${nextCi}@${nvc}`);
          if (from !== undefined && to !== undefined) deps[from].push(to);
        }
      }
    }
  }
  return { channels, deps };
};

export const findCycleVC = (cdg: { channels: { u: number; v: number; vc: number }[]; deps: number[][] }): string[] | null => {
  const state = new Array<number>(cdg.channels.length).fill(0);
  const stack: number[] = [];
  const label = (i: number) => `${cdg.channels[i].u}→${cdg.channels[i].v}@VN${cdg.channels[i].vc}`;

  const visit = (u: number): string[] | null => {
    state[u] = 1;
    stack.push(u);
    for (const v of cdg.deps[u]) {
      if (state[v] === 1) return stack.slice(stack.indexOf(v)).map(label);
      if (state[v] === 0) {
        const found = visit(v);
        if (found) return found;
      }
    }
    stack.pop();
    state[u] = 2;
    return null;
  };

  for (let i = 0; i < cdg.channels.length; i++) {
    if (state[i] !== 0) continue;
    const found = visit(i);
    if (found) return found;
  }
  return null;
};

/** Can the four extra turns be bought back by splitting them across two VNs? */
export const routingVerdictSplit = (g: Graph, plans: Turn[][]) => {
  const cdg = buildCDGVC(g, plans);
  const cycle = findCycleVC(cdg);
  return { cdg, cycle, safe: cycle === null };
};

/** Minimal adaptive: XY and YX are both shortest on a mesh, pick the less loaded one. */
export const adaptivePath = (g: Graph, s: number, t: number, load: Map<string, number>): { path: number[]; picked: 'xy' | 'yx' } => {
  const score = (p: number[]) => {
    let sum = 0;
    for (let i = 0; i + 1 < p.length; i++) {
      const [a, b] = p[i] < p[i + 1] ? [p[i], p[i + 1]] : [p[i + 1], p[i]];
      sum += load.get(`${a}-${b}`) ?? 0;
    }
    return sum;
  };
  const xy = xyPath(g, s, t);
  const yx = yxPath(g, s, t);
  return score(yx) < score(xy) ? { path: yx, picked: 'yx' } : { path: xy, picked: 'xy' };
};

/** The direction list a source-routed header would carry: one entry per hop. */
export const sourceRoute = (g: Graph, path: number[]): Dir[] => {
  const dirs: Dir[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const d = dirOf(g, path[i], path[i + 1]);
    if (d) dirs.push(d);
  }
  return dirs;
};

/** Path-based multicast: the union of the individual XY routes. */
export const multicastTree = (g: Graph, src: number, dests: number[]) => {
  const edges = new Set<string>();
  let unicastHops = 0;
  const paths = dests.map((d) => {
    const p = xyPath(g, src, d);
    unicastHops += p.length - 1;
    for (let i = 0; i + 1 < p.length; i++) {
      const [a, b] = p[i] < p[i + 1] ? [p[i], p[i + 1]] : [p[i + 1], p[i]];
      edges.add(`${a}-${b}`);
    }
    return p;
  });
  return { edges: [...edges], paths, treeHops: edges.size, unicastHops };
};

/** Nodes reachable from src within n hops — used to size a broadcast tree. */
export const hamiltonianOrder = (g: Graph, src: number): number[] => {
  // row-major sweep from the source's row: one packet walks the whole mesh
  const order: number[] = [src];
  const startRow = Math.floor(src / g.w);
  for (let r = startRow; r < g.h; r++) {
    for (let x = 0; x < g.w; x++) {
      const id = r * g.w + x;
      if (id !== src) order.push(id);
    }
  }
  for (let r = startRow - 1; r >= 0; r--) {
    for (let x = g.w - 1; x >= 0; x--) order.push(r * g.w + x);
  }
  return order;
};

export const distances = (g: Graph, s: number) => bfs(g, s).dist;
