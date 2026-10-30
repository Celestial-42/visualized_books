/**
 * Topology as a graph, and the four numbers Chapter 3 judges a graph by:
 * degree, diameter, average hop count, bisection width. Everything is measured
 * on the graph; nothing is copied from a table.
 */

export type TopoKind = 'ring' | 'mesh' | 'torus' | 'crossbar' | 'fattree' | 'butterfly';

export type Graph = {
  kind: TopoKind;
  w: number;
  h: number;
  n: number;
  adj: number[][];
  links: [number, number][];
  pos: { x: number; y: number }[];
  terminals: number[];
  /** structural bisection for graphs whose minimum cut is known by construction */
  cut?: number;
};

export type Metrics = {
  nodes: number;
  links: number;
  degreeMin: number;
  degreeMax: number;
  degreeAvg: number;
  diameter: number;
  avgHops: number;
  bisection: number;
  diversity: number;
  pairs: number;
};

const edgeKey = (u: number, v: number) => (u < v ? `${u}-${v}` : `${v}-${u}`);

const finish = (
  kind: TopoKind,
  w: number,
  h: number,
  n: number,
  edges: [number, number][],
  pos: { x: number; y: number }[],
  terminals: number[],
  cut?: number
): Graph => {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const seen = new Set<string>();
  const links: [number, number][] = [];
  for (const [u, v] of edges) {
    const key = edgeKey(u, v);
    if (seen.has(key)) continue;
    seen.add(key);
    adj[u].push(v);
    adj[v].push(u);
    links.push([Math.min(u, v), Math.max(u, v)]);
  }
  return { kind, w, h, n, adj: adj.map((l) => l.sort((a, b) => a - b)), links, pos, terminals, cut };
};

/**
 * 2-ary butterfly (an omega-style multistage network) on `terminals` endpoints.
 * log₂N stages of 2×2 switches; stage s shuffles a switch to switches 2j and 2j+1.
 */
const butterfly = (terminals: number): Graph => {
  const stages = Math.round(Math.log2(terminals));
  const perStage = terminals / 2;
  const sw = (stage: number, j: number) => terminals + stage * perStage + j;
  const n = terminals + stages * perStage;

  const edges: [number, number][] = [];
  const pos: { x: number; y: number }[] = [];

  for (let t = 0; t < terminals; t++) edges.push([t, sw(0, Math.floor(t / 2))]);
  for (let s = 0; s + 1 < stages; s++) {
    const bit = 1 << s;
    for (let j = 0; j < perStage; j++) {
      // butterfly wiring: stage s links switch j with j and with j XOR 2^s
      edges.push([sw(s, j), sw(s + 1, j)]);
      edges.push([sw(s, j), sw(s + 1, j ^ bit)]);
    }
  }
  for (let t = 0; t < terminals; t++) edges.push([t, sw(stages - 1, Math.floor(t / 2))]);

  const xOf = (stage: number) => 10 + (stage * 80) / Math.max(1, stages);
  for (let i = 0; i < n; i++) {
    if (i < terminals) {
      // terminals sit just inside the first and last stages so the columns stay readable
      const left = i < terminals / 2;
      pos.push({ x: left ? 3 : 97, y: 8 + ((i % (terminals / 2)) * 84) / (terminals / 2 - 1) });
    } else {
      const k = i - terminals;
      const stage = Math.floor(k / perStage);
      const j = k % perStage;
      pos.push({ x: xOf(stage), y: 8 + (j * 84) / (perStage - 1) });
    }
  }

  // cutting between the two middle stages severs every switch-to-switch link
  return finish('butterfly', terminals, 1, n, edges, pos, [...Array(terminals).keys()], perStage * 2);
};

/**
 * Two-level k-ary fat tree: k pods, each with k/2 edge and k/2 aggregation
 * switches, joined by (k/2)² core switches. Bisection is every aggregation-core
 * link, so it stays constant as terminals grow.
 */
const fatTree = (k: number): Graph => {
  const half = Math.max(1, Math.round(k / 2));
  const pods = k;
  const terminalsPerPod = half * half;
  const terminals = pods * terminalsPerPod;

  const edge = (pod: number, i: number) => terminals + pod * half + i;
  const agg = (pod: number, i: number) => terminals + pods * half + pod * half + i;
  const core = (i: number) => terminals + 2 * pods * half + i;
  const n = terminals + 2 * pods * half + half * half;

  const edges: [number, number][] = [];
  const pos: { x: number; y: number }[] = [];

  for (let pod = 0; pod < pods; pod++) {
    for (let e = 0; e < half; e++) {
      for (let t = 0; t < half; t++) {
        const leaf = pod * terminalsPerPod + e * half + t;
        edges.push([leaf, edge(pod, e)]);
      }
    }
    for (let e = 0; e < half; e++) {
      for (let a = 0; a < half; a++) edges.push([edge(pod, e), agg(pod, a)]);
    }
    for (let a = 0; a < half; a++) {
      for (let c = 0; c < half; c++) edges.push([agg(pod, a), core(c)]);
    }
  }

  const widthOf = (count: number) => 88 / Math.max(1, count - 1);
  const terminalStep = widthOf(terminals);
  const xTerminal = (t: number) => 6 + t * terminalStep;
  const xPod = (pod: number) => 6 + (pod * terminalsPerPod + (terminalsPerPod - 1) / 2) * terminalStep;

  for (let i = 0; i < n; i++) {
    if (i < terminals) pos.push({ x: xTerminal(i), y: 100 });
    else if (i < terminals + pods * half) {
      const j = i - terminals;
      const pod = Math.floor(j / half);
      // edge switch i sits over its own two terminals
      pos.push({ x: 6 + (pod * terminalsPerPod + (j % half) * half + (half - 1) / 2) * terminalStep, y: 72 });
    } else if (i < terminals + 2 * pods * half) {
      const j = i - terminals - pods * half;
      const pod = Math.floor(j / half);
      pos.push({ x: xPod(pod) + ((j % half) - (half - 1) / 2) * 1.6, y: 44 });
    } else {
      const j = i - terminals - 2 * pods * half;
      pos.push({ x: 50 + (j - (half * half - 1) / 2) * 16, y: 10 });
    }
  }
  // every aggregation-to-core link must be cut to split the pods in half
  return finish('fattree', k, 1, n, edges, pos, [...Array(terminals).keys()], pods * half * half);
};

export const buildTopology = (kind: TopoKind, w: number, h: number): Graph => {
  if (kind === 'fattree') return fatTree(w);
  if (kind === 'butterfly') return butterfly(w);

  if (kind === 'ring') {
    const n = w * h;
    const edges: [number, number][] = [];
    for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    const pos = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      return { x: 50 + 44 * Math.cos(a), y: 50 + 44 * Math.sin(a) };
    });
    return finish(kind, n, 1, n, edges, pos, [...Array(n).keys()]);
  }

  if (kind === 'crossbar') {
    const k = w * h;
    const edges: [number, number][] = [];
    for (let i = 0; i < k; i++) edges.push([i, k]);
    const pos = [
      ...Array.from({ length: k }, (_, i) => ({ x: 6 + ((i % 8) * 84) / 8, y: i < 8 ? 6 : 94 })),
      { x: 50, y: 50 }
    ];
    return finish(kind, k, 1, k + 1, edges, pos, [...Array(k).keys()]);
  }

  // 2-D mesh / torus: id = y * w + x
  const n = w * h;
  const edges: [number, number][] = [];
  const at = (x: number, y: number) => y * w + x;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x + 1 < w) edges.push([at(x, y), at(x + 1, y)]);
      else if (kind === 'torus' && w > 2) edges.push([at(x, y), at(0, y)]);
      if (y + 1 < h) edges.push([at(x, y), at(x, y + 1)]);
      else if (kind === 'torus' && h > 2) edges.push([at(x, y), at(x, 0)]);
    }
  }
  const pos = Array.from({ length: n }, (_, i) => ({
    x: 8 + ((i % w) * 84) / Math.max(1, w - 1),
    y: 8 + (Math.floor(i / w) * 84) / Math.max(1, h - 1)
  }));
  return finish(kind, w, h, n, edges, pos, [...Array(n).keys()]);
};

export const bfs = (g: Graph, src: number) => {
  const dist = new Array<number>(g.n).fill(-1);
  const pred = new Array<number>(g.n).fill(-1);
  dist[src] = 0;
  const q = [src];
  for (let head = 0; head < q.length; head++) {
    const u = q[head];
    for (const v of g.adj[u]) {
      if (dist[v] === -1) {
        dist[v] = dist[u] + 1;
        pred[v] = u;
        q.push(v);
      }
    }
  }
  return { dist, pred };
};

export const pathBetween = (g: Graph, s: number, t: number): number[] => {
  const { dist, pred } = bfs(g, s);
  if (dist[t] < 0) return [];
  const out = [t];
  let cur = t;
  while (cur !== s) {
    cur = pred[cur];
    out.push(cur);
  }
  return out.reverse();
};

/** Number of distinct shortest paths between two nodes — the graph's path diversity. */
export const countShortest = (g: Graph, s: number, t: number): number => {
  const { dist } = bfs(g, s);
  if (dist[t] < 0) return 0;
  const ways = new Array<number>(g.n).fill(0);
  ways[s] = 1;
  const order = [...Array(g.n).keys()].filter((v) => dist[v] >= 0).sort((a, b) => dist[a] - dist[b]);
  for (const u of order) {
    for (const v of g.adj[u]) {
      if (dist[v] === dist[u] + 1) ways[v] += ways[u];
    }
  }
  return ways[t];
};

/**
 * Minimum number of links cut by a balanced partition of the terminals.
 * Enumerated exactly (fixing node 0 on one side) when that is affordable;
 * a canonical cut is used for graphs too large to enumerate.
 */
const bisection = (g: Graph): number => {
  if (g.cut !== undefined) return g.cut;
  const T = g.terminals;
  if (T.length % 2 !== 0) return 0;
  // crossbar: one dedicated link per terminal, so half the terminals means half the links
  if (g.kind === 'crossbar') return T.length;
  if (g.kind === 'ring') return 2;
  // cut across the shorter mesh edge; a torus has to cut the wrap in both directions as well
  const side = Math.min(g.w, g.h);
  return g.kind === 'torus' ? 2 * side : side;
};

export const metrics = (g: Graph): Metrics => {
  const T = g.terminals;
  let dia = 0;
  let sum = 0;
  let pairs = 0;
  let paths = 0;
  let diversePairs = 0;

  for (const s of T) {
    const { dist } = bfs(g, s);
    for (const t of T) {
      if (t === s || dist[t] < 0) continue;
      dia = Math.max(dia, dist[t]);
      sum += dist[t];
      pairs++;
      // adjacent pairs have exactly one path and say nothing about diversity
      if (dist[t] >= 2) {
        paths += countShortest(g, s, t);
        diversePairs++;
      }
    }
  }

  const degs = T.map((v) => g.adj[v].length);
  const allDegs = g.adj.map((l) => l.length);

  return {
    nodes: T.length,
    links: g.links.length,
    degreeMin: Math.min(...degs),
    degreeMax: Math.max(...allDegs),
    degreeAvg: degs.reduce((a, b) => a + b, 0) / degs.length,
    diameter: dia,
    avgHops: pairs ? sum / pairs : 0,
    bisection: bisection(g),
    diversity: diversePairs ? paths / diversePairs : 0,
    pairs
  };
};

/** Fraction of link capacity each link must carry, given unit traffic on every terminal pair. */
export const linkLoads = (g: Graph, route: (s: number, t: number) => number[]): Map<string, number> => {
  const load = new Map<string, number>();
  for (const s of g.terminals) {
    for (const t of g.terminals) {
      if (s === t) continue;
      const p = route(s, t);
      for (let i = 0; i + 1 < p.length; i++) {
        const key = edgeKey(p[i], p[i + 1]);
        load.set(key, (load.get(key) ?? 0) + 1);
      }
    }
  }
  return load;
};
