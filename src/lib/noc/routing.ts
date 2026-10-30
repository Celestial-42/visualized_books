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

/** Valiant: detour through the intermediate node that costs the most hops. */
export const valiantRoute = (g: Graph, s: number, t: number): { path: number[]; mid: number } => {
  const direct = xyPath(g, s, t).length - 1;
  let best = -1;
  let bestCost = -1;
  for (let mid = 0; mid < g.n; mid++) {
    if (mid === s || mid === t) continue;
    const cost = xyPath(g, s, mid).length + xyPath(g, mid, t).length - 2;
    // small deterministic bias so the reported detour is reproducible
    const bias = ((s * 31 + t * 17 + mid * 7) % 5) / 100;
    if (cost + bias > bestCost) {
      bestCost = cost + bias;
      best = mid;
    }
  }
  if (best < 0 || bestCost <= direct) return { path: xyPath(g, s, t), mid: -1 };
  return { path: [...xyPath(g, s, best), ...xyPath(g, best, t).slice(1)], mid: best };
};

export const valiantPath = (g: Graph, s: number, t: number): number[] => valiantRoute(g, s, t).path;

export type RoutingId = 'xy' | 'west' | 'valiant' | 'yx';

/** Wrap-aware minimal routing on a 2-D torus: each dimension takes its shorter way round. */
const torusPath = (g: Graph, s: number, t: number): number[] => {
  const out = [s];
  let x = s % g.w;
  let y = Math.floor(s / g.w);
  const tx = t % g.w;
  const ty = Math.floor(t / g.w);

  const step = (delta: number, size: number) => {
    const half = size / 2;
    if (delta === 0) return 0;
    if (delta > 0) return delta <= half ? 1 : -1;
    return -delta < half ? -1 : 1;
  };

  while (x !== tx) {
    x = (x + step(tx - x, g.w) + g.w) % g.w;
    out.push(idAt(g, x, y));
  }
  while (y !== ty) {
    y = (y + step(ty - y, g.h) + g.h) % g.h;
    out.push(idAt(g, x, y));
  }
  return out;
};

export const routeBy = (g: Graph, s: number, t: number, algo: RoutingId): number[] => {
  // a crossbar is one switch: every path is terminal → center → terminal
  if (g.kind === 'crossbar') return [s, g.n - 1, t];
  if ((g.kind === 'torus' || g.kind === 'ring') && (algo === 'xy' || algo === 'yx')) return torusPath(g, s, t);

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

export const yxPath = (g: Graph, s: number, t: number): number[] => {
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
export const adaptivePath = (
  g: Graph,
  s: number,
  t: number,
  load: Map<string, number>
): { path: number[]; picked: 'xy' | 'yx'; xyScore: number; yxScore: number } => {
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
  const xyScore = score(xy);
  const yxScore = score(yx);
  return yxScore < xyScore
    ? { path: yx, picked: 'yx', xyScore, yxScore }
    : { path: xy, picked: 'xy', xyScore, yxScore };
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

export type EscapeResult = {
  escapeAcyclic: boolean;
  escapeCycle: string[] | null;
  escapeConnected: boolean;
  reachable: number;
  total: number;
  unreachableSample: string[];
  safe: boolean;
};

/**
 * Duato's escape-VC condition, checked on the graph: one virtual network is
 * routed by a provably acyclic function (usually dimension order) and every
 * channel of the adaptive network must be able to reach a channel of it. A
 * packet that lands on the escape lane always drains, so the cyclic adaptive
 * network cannot close a permanent hold-and-wait.
 */
export const escapeAnalysis = (
  g: Graph,
  adaptiveTurns: Turn[],
  escapeTurns: Turn[],
  escapeFilter: (d: Dir) => boolean = () => true
): EscapeResult => {
  const base = buildCDG(g, ALL_TURNS);
  type Node = { u: number; v: number; dir: Dir; vc: number };
  const nodes: Node[] = [];
  const index = new Map<string, number>();

  base.channels.forEach((c, ci) => {
    index.set(`${ci}@0`, nodes.length);
    nodes.push({ u: c.u, v: c.v, dir: c.dir, vc: 0 });
    if (escapeFilter(c.dir)) {
      index.set(`${ci}@1`, nodes.length);
      nodes.push({ u: c.u, v: c.v, dir: c.dir, vc: 1 });
    }
  });

  const deps: number[][] = nodes.map(() => []);
  base.channels.forEach((a, ci) => {
    const from0 = index.get(`${ci}@0`);
    const from1 = index.get(`${ci}@1`);
    for (const w of g.adj[a.v]) {
      const dir = dirOf(g, a.v, w);
      if (!dir) continue;
      const straight = dir === a.dir;
      const turn = `${a.dir}${dir}` as Turn;
      const nextCi = base.channels.findIndex((c) => c.u === a.v && c.v === w);
      if (nextCi < 0) continue;
      const to0 = index.get(`${nextCi}@0`);
      const to1 = index.get(`${nextCi}@1`);

      if (from0 !== undefined && to0 !== undefined && (straight || adaptiveTurns.includes(turn))) {
        deps[from0].push(to0);
      }
      if (from0 !== undefined && to1 !== undefined && (straight || escapeTurns.includes(turn))) {
        deps[from0].push(to1);
      }
      if (from1 !== undefined && to1 !== undefined && (straight || escapeTurns.includes(turn))) {
        deps[from1].push(to1);
      }
    }
  });

  // the escape lane itself must be acyclic
  const escapeNodes = nodes.map((n, i) => (n.vc === 1 ? i : -1)).filter((i) => i >= 0);
  const escapeSet = new Set(escapeNodes);
  const state = new Array<number>(nodes.length).fill(0);
  const stack: number[] = [];
  const label = (i: number) => `${nodes[i].u}→${nodes[i].v}@escape`;
  let escapeCycle: string[] | null = null;

  const visit = (u: number): string[] | null => {
    state[u] = 1;
    stack.push(u);
    for (const v of deps[u]) {
      if (!escapeSet.has(v)) continue;
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

  for (const i of escapeNodes) {
    if (state[i] !== 0) continue;
    const found = visit(i);
    if (found) {
      escapeCycle = found;
      break;
    }
  }

  // every adaptive channel has to be able to reach the escape lane
  const total = nodes.filter((n) => n.vc === 0).length;
  let reachable = 0;
  const unreachableSample: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].vc !== 0) continue;
    const seen = new Array<boolean>(nodes.length).fill(false);
    const queue = [i];
    seen[i] = true;
    let ok = false;
    for (let head = 0; head < queue.length && !ok; head++) {
      const u = queue[head];
      if (nodes[u].vc === 1) {
        ok = true;
        break;
      }
      for (const v of deps[u]) {
        if (seen[v]) continue;
        seen[v] = true;
        queue.push(v);
      }
    }
    if (ok) reachable++;
    else if (unreachableSample.length < 4) unreachableSample.push(`${nodes[i].u}→${nodes[i].v}`);
  }

  const escapeConnected = escapeConnects(g, escapeTurns, escapeFilter);

  return {
    escapeAcyclic: escapeCycle === null,
    escapeCycle,
    escapeConnected,
    reachable,
    total,
    unreachableSample,
    safe: escapeCycle === null && escapeConnected && reachable === total
  };
};

/**
 * “Connected escape subnetwork” means: using only escape-capable channels and
 * escape-legal turns, every terminal can still be routed to. An acyclic escape
 * function can never be strongly connected, so reachability of terminals (not of
 * channels) is the right test.
 */
const escapeConnects = (g: Graph, escapeTurns: Turn[], escapeFilter: (d: Dir) => boolean): boolean => {
  const dirs: Dir[] = ['E', 'W', 'N', 'S'];
  const target = new Set(g.terminals);

  for (const start of g.terminals) {
    const seen = new Set<string>([`${start}:*`]);
    const queue: [number, Dir | null][] = [[start, null]];
    const reached = new Set<number>([start]);

    for (let h = 0; h < queue.length; h++) {
      const [u, last] = queue[h];
      for (const v of g.adj[u]) {
        const d = dirOf(g, u, v);
        if (!d || !escapeFilter(d)) continue;
        if (last && d !== last && !escapeTurns.includes(`${last}${d}` as Turn)) continue;
        const key = `${v}:${d}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push([v, d]);
        if (target.has(v)) reached.add(v);
      }
    }
    if (reached.size !== target.size) return false;
  }
  if (dirs.length === 0) return false;
  return true;
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
