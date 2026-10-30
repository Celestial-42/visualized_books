import { buildTopology, linkLoads, metrics, type Graph, type TopoKind } from './topology';
import { routeBy, type RoutingId } from './routing';

export type TrafficId = 'uniform' | 'bitrev' | 'transpose' | 'neighbor' | 'hotspot';

export const TRAFFICS: { id: TrafficId; label: string; labelEn: string; note: string; noteEn: string }[] = [
  {
    id: 'uniform',
    label: '均匀（全对全）',
    labelEn: 'Uniform (all-to-all)',
    note: '每个节点向其他所有节点各发一个包。最公平，也最会用对剖。',
    noteEn: 'Every node sends one packet to every other node. The fairest pattern, and the one that loads the bisection hardest.'
  },
  {
    id: 'bitrev',
    label: '位反转',
    labelEn: 'Bit-reversal',
    note: '目标号按二进制位反转。某些链路被打爆，另一些空着。',
    noteEn: 'Destinations are bit-reversed indices: a few links saturate while others idle.'
  },
  {
    id: 'transpose',
    label: '转置',
    labelEn: 'Transpose',
    note: '把 (x, y) 送到 (y, x)。2D 布局下形成两条交叉的热带。',
    noteEn: 'Send (x, y) to (y, x). On a 2-D layout this forms two crossing hot bands.'
  },
  {
    id: 'neighbor',
    label: '邻居',
    labelEn: 'Nearest neighbour',
    note: '只发给相邻节点。每跳都短，但对剖几乎用不上。',
    noteEn: 'Send only to the next node: every hop is short, and the bisection is barely used.'
  },
  {
    id: 'hotspot',
    label: '热点',
    labelEn: 'Hotspot',
    note: '所有节点都发给节点 0。瓶颈不在最中间，而在目的地那一跳。',
    noteEn: 'Everyone sends to node 0. The bottleneck is not the middle of the mesh, it is the last hop.'
  }
];

const reverseBits = (value: number, bits: number) => {
  let out = 0;
  for (let i = 0; i < bits; i++) out = (out << 1) | ((value >> i) & 1);
  return out;
};

export const trafficDest = (pattern: TrafficId, node: number, w: number, h: number): number | null => {
  const n = w * h;
  switch (pattern) {
    case 'bitrev': {
      const bits = Math.round(Math.log2(n));
      return reverseBits(node, bits);
    }
    case 'transpose': {
      const x = node % w;
      const y = Math.floor(node / w);
      return (x % h) * w + (y % w);
    }
    case 'neighbor':
      return (node + 1) % n;
    case 'hotspot':
      return node === 0 ? null : 0;
    case 'uniform':
      return null; // all-to-all is handled explicitly
  }
};

export type LinkLoad = { from: number; to: number; load: number };

export type Profile = {
  graph: Graph;
  metrics: ReturnType<typeof metrics>;
  links: LinkLoad[];
  maxLoad: number;
  avgLoad: number;
  /** packets per node per cycle at which the busiest link is exactly saturated */
  saturation: number;
  baseLatency: number;
};

/**
 * Load every link by actually routing the traffic, then read the saturation
 * point off the busiest link. Nothing here is a lookup table.
 */
export const profile = (kind: TopoKind, w: number, h: number, pattern: TrafficId, routing: RoutingId): Profile => {
  const g = buildTopology(kind, w, h);
  const m = metrics(g);
  const route = (s: number, t: number) => routeBy(g, s, t, routing);

  const load = new Map<string, number>();
  const bump = (key: string, amount: number) => load.set(key, (load.get(key) ?? 0) + amount);

  let flows = 0;
  for (const s of g.terminals) {
    if (pattern === 'uniform') {
      for (const t of g.terminals) {
        if (s === t) continue;
        const p = route(s, t);
        for (let i = 0; i + 1 < p.length; i++) {
          const [a, b] = p[i] < p[i + 1] ? [p[i], p[i + 1]] : [p[i + 1], p[i]];
          bump(`${a}-${b}`, 1);
        }
        flows++;
      }
    } else {
      const t = trafficDest(pattern, s, w, h);
      if (t === null || t === s) continue;
      const p = route(s, t);
      for (let i = 0; i + 1 < p.length; i++) {
        const [a, b] = p[i] < p[i + 1] ? [p[i], p[i + 1]] : [p[i + 1], p[i]];
        bump(`${a}-${b}`, 1);
      }
      flows++;
    }
  }

  // per-node normalisation: uniform spreads every node's traffic over the other n-1
  const perSource = pattern === 'uniform' ? g.terminals.length - 1 : 1;
  const links: LinkLoad[] = g.links.map(([a, b]) => ({
    from: a,
    to: b,
    load: (load.get(`${a}-${b}`) ?? 0) / perSource
  }));

  const maxLoad = Math.max(...links.map((l) => l.load), 0.0001);
  const avgLoad = links.reduce((n, l) => n + l.load, 0) / links.length;
  const baseLatency = m.avgHops * 5 + 4;

  return {
    graph: g,
    metrics: m,
    links,
    maxLoad,
    avgLoad,
    saturation: 1 / maxLoad,
    baseLatency
  };
};

export type Point = { load: number; latency: number };

/**
 * Delay under load, as a fraction of saturation: an M/D/1-like queue on top of
 * the zero-load latency. At ρ → 1 the wait blows up, which is the knee.
 */
export const delayCurve = (base: number, points = 16): Point[] =>
  Array.from({ length: points }, (_, i) => {
    const rho = (i / (points - 1)) * 0.95;
    return { load: rho, latency: base * (1 + rho / (2 * (1 - rho))) };
  });

/** Injection rate that a topology can sustain, in packets per node per cycle. */
export const saturatedInjection = (p: Profile) => p.saturation;

/**
 * Mean shortest path over distinct pairs of a k×k mesh: 2k/3.
 * (The textbook (k²−1)/3k per dimension counts same-node pairs as distance 0;
 * multiplying by k²/(k²−1) turns it into this.)
 */
export const meshHopFormula = (k: number) => (2 * k) / 3;

/** Pure-queue ideal: the zero-load latency stretched by 1/(1−ρ), with no topology in it. */
export const idealLatency = (zeroLoad: number, rho: number) => zeroLoad / (1 - rho);

/**
 * Credit-based backpressure: to keep a link busy, the buffer behind it must cover
 * the round trip of a credit. Below that depth the link idles every round trip.
 */
export const creditThroughput = (depth: number, roundTrip: number) =>
  roundTrip <= 0 ? 1 : Math.min(1, depth / roundTrip);

export const bufferDepthForFullRate = (roundTrip: number) => Math.ceil(roundTrip);
