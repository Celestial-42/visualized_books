import { buildTopology, type Graph } from '../noc/topology';
import {
  ALL_TURNS,
  buildCDG,
  findCycle,
  routingVerdictSplit,
  type Turn
} from '../noc/routing';

/**
 * Chapter 3 of the engineering-approach book: a turn set is only half the story.
 * The channel dependency graph decides deadlock at the channel level; the
 * extended graph (channels × VC classes) decides what virtual channels buy.
 */
export type TurnAnalysis = {
  channelCycle: string[] | null;
  extendedCycle: string[] | null;
  safeChannel: boolean;
  safeExtended: boolean;
};

export const turnAnalysis = (g: Graph, turns: Turn[], vcPlans: Turn[][]): TurnAnalysis => {
  const channelCycle = findCycle(buildCDG(g, turns));
  const extended = routingVerdictSplit(g, vcPlans);
  return {
    channelCycle,
    extendedCycle: extended.cycle,
    safeChannel: channelCycle === null,
    safeExtended: extended.cycle === null
  };
};

/** Two acyclic turn sets that are each safe on their own, stacked with escalation only upward. */
export const NEGATIVE_FIRST: Turn[] = ['EN', 'ES', 'NW', 'SW'];
export const XY_TURNS: Turn[] = ['EN', 'ES', 'WN', 'WS'];

export const TURN_BY_ID: Record<string, { zh: string; en: string }> = {
  EN: { zh: '东→北', en: 'E→N' },
  ES: { zh: '东→南', en: 'E→S' },
  WN: { zh: '西→北', en: 'W→N' },
  WS: { zh: '西→南', en: 'W→S' },
  NE: { zh: '北→东', en: 'N→E' },
  NW: { zh: '北→西', en: 'N→W' },
  SE: { zh: '南→东', en: 'S→E' },
  SW: { zh: '南→西', en: 'S→W' }
};

export type AwardPolicy = 'rr' | 'matrix' | 'priority';

export type Fairness = {
  policy: AwardPolicy;
  counts: number[];
  starved: number[];
};

/** One output port, three requesters: who gets served, and does anyone never get served? */
export const arbitrationFairness = (
  policy: AwardPolicy,
  ticks: number,
  requesters = 3,
  demand: boolean[] = Array.from({ length: 3 }, () => true)
): Fairness => {
  const counts = new Array(requesters).fill(0);
  let pointer = 0;
  let priority = Array.from({ length: requesters }, (_, i) => i);

  for (let t = 0; t < ticks; t++) {
    const active = demand.map((d, i) => d).map((d) => d);
    const candidates = active.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
    if (candidates.length === 0) continue;

    let winner = -1;
    if (policy === 'rr') {
      const after = candidates.filter((i) => i >= pointer);
      winner = after.length ? after[0] : candidates[0];
      pointer = (winner + 1) % requesters;
    } else if (policy === 'matrix') {
      winner = priority.find((i) => active[i]) ?? candidates[0];
      priority = [...priority.filter((i) => i !== winner), winner];
    } else {
      winner = candidates[0];
    }
    counts[winner]++;
  }

  const starved = counts.map((c, i) => (!demand[i] || c > 0 ? -1 : i)).filter((i) => i >= 0);
  return { policy, counts, starved };
};

export type Livelock = {
  limit: number | null;
  trials: number;
  completed: number;
  avgHops: number;
  maxHops: number;
  beyond100: number;
};

/**
 * A non-minimal packet that keeps choosing a random admissible neighbour will
 * eventually arrive — but there is no bound on how long it takes. With a hop
 * counter that forces minimal routing past the limit, the same walk is bounded.
 */
export const livelockTrials = (limit: number | null, trials = 300, mesh = 4): Livelock => {
  const g = buildTopology('mesh', mesh, mesh);
  const s = 0;
  const t = g.n - 1;
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  let completed = 0;
  let sum = 0;
  let max = 0;
  let beyond = 0;
  const cutoff = 4000;

  for (let trial = 0; trial < trials; trial++) {
    let cur = s;
    let steps = 0;
    let prev = -1;
    while (cur !== t && steps < cutoff) {
      const manhattan = (n: number) =>
        Math.abs((n % mesh) - (t % mesh)) + Math.abs(Math.floor(n / mesh) - Math.floor(t / mesh));
      const neighbours = g.adj[cur].filter((n) => n !== prev);
      const mustBeMinimal = limit !== null && steps >= limit;
      let options = neighbours;
      if (mustBeMinimal) {
        const closer = neighbours.filter((n) => manhattan(n) < manhattan(cur));
        options = closer.length ? closer : neighbours;
      }
      if (options.length === 0) break;
      const pick = options[Math.floor(rand() * options.length)];
      prev = cur;
      cur = pick;
      steps++;
    }
    if (cur === t) completed++;
    sum += steps;
    max = Math.max(max, steps);
    if (steps >= 100) beyond++;
  }

  return {
    limit,
    trials,
    completed,
    avgHops: sum / trials,
    maxHops: max,
    beyond100: beyond
  };
};
