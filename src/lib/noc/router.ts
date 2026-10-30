/**
 * Router microarchitecture: what one cycle of arbitration and allocation
 * actually decides, and where a packet's cycles go in the pipeline.
 */

export type ArbiterId = 'rr' | 'matrix';

/** One round of arbitration over a request vector. */
export const arbitrate = (kind: ArbiterId, requests: boolean[], pointer: number): number => {
  const active = requests.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
  if (active.length === 0) return -1;
  if (kind === 'rr') {
    const after = active.filter((i) => i >= pointer);
    return after.length ? after[0] : active[0];
  }
  return active[0];
};

export type ArbiterRound = { tick: number; requests: boolean[]; winner: number };

/** Round-robin pointer or matrix state carried across ticks — this is what fairness looks like. */
export const arbiterTrace = (kind: ArbiterId, requests: boolean[][], start = 0) => {
  let pointer = start;
  const rounds: ArbiterRound[] = [];
  if (kind === 'rr') {
    for (let t = 0; t < requests.length; t++) {
      const winner = arbitrate('rr', requests[t], pointer);
      rounds.push({ tick: t, requests: requests[t], winner });
      if (winner >= 0) pointer = (winner + 1) % requests[t].length;
    }
    return rounds;
  }

  // matrix arbiter: winner beats everyone it is asked about, then moves to the back
  const n = requests[0]?.length ?? 0;
  let priority = Array.from({ length: n }, (_, i) => i); // lowest index wins first
  for (let t = 0; t < requests.length; t++) {
    const req = requests[t];
    const winner = priority.find((i) => req[i]) ?? -1;
    rounds.push({ tick: t, requests: req, winner });
    if (winner >= 0) priority = [...priority.filter((i) => i !== winner), winner];
  }
  return rounds;
};

export type Matching = { pairs: [number, number][]; unmatchedIn: number[]; unmatchedOut: number[] };

/**
 * Wavefront allocator: requests whose (input + output) mod N is the same cannot
 * conflict, so one wavefront settles in a single cycle. Rotating the starting
 * wavefront over a few passes finds matchings the two-pass greedy misses.
 */
export const allocateWavefront = (req: boolean[][], passes = 3) => {
  const n = req.length;
  const run = (offset: number): Matching => {
    const inUse = new Array<boolean>(n).fill(false);
    const outUse = new Array<boolean>(n).fill(false);
    const pairs: [number, number][] = [];
    for (let step = 0; step < n; step++) {
      const wave = (step + offset) % n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < (req[i]?.length ?? 0); j++) {
          if ((i + j) % n !== wave) continue;
          if (!req[i][j] || inUse[i] || outUse[j]) continue;
          inUse[i] = true;
          outUse[j] = true;
          pairs.push([i, j]);
        }
      }
    }
    return {
      pairs: pairs.sort((a, b) => a[0] - b[0]),
      unmatchedIn: inUse.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0),
      unmatchedOut: outUse.map((t, j) => (t ? -1 : j)).filter((j) => j >= 0)
    };
  };

  const candidates = Array.from({ length: passes }, (_, p) => run(p));
  const best = candidates.reduce((a, b) => (b.pairs.length > a.pairs.length ? b : a));
  return { best, counts: candidates.map((c) => c.pairs.length) };
};

/** Maximum bipartite matching (augmenting paths) — the ceiling any allocator can reach. */
export const maxMatching = (req: boolean[][]): number => {
  const ins = req.length;
  const outs = req[0]?.length ?? 0;
  const owner = new Array<number>(outs).fill(-1);

  const augment = (input: number, seen: boolean[]): boolean => {
    for (let j = 0; j < outs; j++) {
      if (!req[input][j] || seen[j]) continue;
      seen[j] = true;
      if (owner[j] === -1 || augment(owner[j], seen)) {
        owner[j] = input;
        return true;
      }
    }
    return false;
  };

  let count = 0;
  for (let i = 0; i < ins; i++) {
    if (augment(i, new Array<boolean>(outs).fill(false))) count++;
  }
  return count;
};

/** Separable allocator: match inputs to outputs given a request matrix. */
export const allocate = (req: boolean[][], order: 'input' | 'output'): Matching => {
  const ins = req.length;
  const outs = req[0]?.length ?? 0;
  const takenOut = new Array<boolean>(outs).fill(false);
  const takenIn = new Array<boolean>(ins).fill(false);
  const pairs: [number, number][] = [];

  if (order === 'input') {
    for (let i = 0; i < ins; i++) {
      const j = req[i].findIndex((r, k) => r && !takenOut[k]);
      if (j >= 0) {
        pairs.push([i, j]);
        takenIn[i] = true;
        takenOut[j] = true;
      }
    }
  } else {
    for (let j = 0; j < outs; j++) {
      const i = req.findIndex((row, k) => row[j] && !takenIn[k]);
      if (i >= 0) {
        pairs.push([i, j]);
        takenIn[i] = true;
        takenOut[j] = true;
      }
    }
  }

  return {
    pairs: pairs.sort((a, b) => a[0] - b[0]),
    unmatchedIn: takenIn.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0),
    unmatchedOut: takenOut.map((t, j) => (t ? -1 : j)).filter((j) => j >= 0)
  };
};

/**
 * How the allocator has to be organised, which depends on how many candidates the
 * routing function hands it: one output, one chosen on the fly, or all of them.
 */
export type OrgMode = 'single' | 'retry' | 'multi';

export type OrgRow = {
  mode: OrgMode;
  stage1Count: number;
  stage1FanIn: number;
  stage2Count: number;
  stage2FanIn: number;
  worstAttempts: number;
};

export const allocatorOrganization = (ports: number, vcs: number, candidates: number): OrgRow[] => {
  const single: OrgRow = {
    mode: 'single',
    stage1Count: ports,
    stage1FanIn: vcs,
    stage2Count: ports,
    stage2FanIn: ports,
    worstAttempts: 1
  };
  return [
    single,
    {
      // routing returns one candidate; a lost arbitration means routing again
      ...single,
      mode: 'retry',
      worstAttempts: Math.max(1, candidates)
    },
    {
      // every candidate is offered: the first stage fan-in grows with the candidates
      mode: 'multi',
      stage1Count: ports,
      stage1FanIn: vcs * Math.max(1, candidates),
      stage2Count: ports,
      stage2FanIn: ports,
      worstAttempts: 1
    }
  ];
};

export type PipelineSpec = {
  vcs: number;
  /** arbitration and VC allocation in the same cycle */
  speculate: boolean;
  /** lookahead bypass: ST overlaps with SA */
  lookahead: boolean;
};

export type PipelineStage = { key: string; label: string; labelEn: string; cycles: number };

/**
 * Canonical virtual-channel router: buffer write, route compute, VC allocation,
 * switch allocation, switch traversal. Speculation and lookahead remove stages
 * but shorten the clock; the model keeps the clock fixed and reports cycles.
 */
export const pipeline = (spec: PipelineSpec): { stages: PipelineStage[]; perHop: number } => {
  const vaCycles = spec.vcs > 4 ? 2 : 1;
  const stages: PipelineStage[] = [
    { key: 'bw', label: '缓冲写入', labelEn: 'Buffer write', cycles: 1 },
    { key: 'rc', label: '路由计算', labelEn: 'Route compute', cycles: 1 }
  ];

  if (spec.speculate) {
    stages.push({
      key: 'va+sa',
      label: 'VC 分配 + 交换分配（并行）',
      labelEn: 'VC + switch allocation (parallel)',
      cycles: 1
    });
  } else {
    stages.push({ key: 'va', label: 'VC 分配', labelEn: 'VC allocation', cycles: vaCycles });
    stages.push({
      key: 'sa',
      label: spec.lookahead ? '交换分配（与 ST 重叠）' : '交换分配',
      labelEn: spec.lookahead ? 'Switch allocation (overlaps ST)' : 'Switch allocation',
      cycles: spec.lookahead ? 0 : 1
    });
  }

  stages.push({ key: 'st', label: '交叉开关', labelEn: 'Switch traversal', cycles: 1 });
  stages.push({ key: 'lt', label: '链路传输', labelEn: 'Link traversal', cycles: 1 });

  return { stages, perHop: stages.reduce((n, s) => n + s.cycles, 0) };
};

/** Zero-load latency: every hop pays the router pipeline, and the packet pays serialisation once. */
export const zeroLoadLatency = (hops: number, perHop: number, flits: number, linkDelay = 1) =>
  hops * (perHop + linkDelay - 1) + flits;
