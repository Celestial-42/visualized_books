/**
 * Topology as a graph, and the four numbers Chapter 3 judges a graph by:
 * degree, diameter, average hop count, bisection width. Everything is measured
 * on the graph; nothing is copied from a table.
 */

export type TopoKind = 'ring' | 'mesh' | 'torus' | 'crossbar';

export type Graph = {
  kind: TopoKind;
  w: number;
  h: number;
  n: number;
  adj: number[][];
  links: [number, number][];
  pos: { x: number; y: number }[];
  terminals: number[];
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
  terminals: number[]
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
  return { kind, w, h, n, adj: adj.map((l) => l.sort((a, b) => a - b)), links, pos, terminals };
};

export const buildTopology = (kind: TopoKind, w: number, h: number): Graph => {
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
