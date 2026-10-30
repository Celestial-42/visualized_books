/**
 * An operational model of the two-state VI protocol from Section 6.3.
 *
 * Two cache controllers share one atomic bus. Caches hold a block in I or
 * V; a miss puts the block in the transient state IVD until its DataResp
 * arrives. The LLC/memory is the owner while no cache holds V, and a cache
 * in V is the owner otherwise. Each step is exactly one row of Table 6.2 or
 * Table 6.3, so the reachable states and the message ordering are decided by
 * the protocol, not by the animation.
 */

export type ViState = 'I' | 'IVD' | 'V';
export type ViOp = 'load' | 'store';

export type ViCache = {
  state: ViState;
  data: number | null;
  /** core operation waiting for the DataResp that completes this miss */
  pending: ViOp | null;
};

export type ViBus =
  | { type: 'Get'; from: number }
  | { type: 'DataResp'; from: number | 'mem'; to: number; data: number }
  | { type: 'Put'; from: number; data: number };

export type ViSystem = {
  caches: ViCache[];
  llc: 'I' | 'V';
  mem: number;
  bus: ViBus | null;
};

export type ViAction =
  | { kind: 'core'; c: number; op: ViOp }
  | { kind: 'evict'; c: number }
  | { kind: 'respond'; c: number | 'mem' }
  | { kind: 'receive'; c: number }
  | { kind: 'handle-put' };

export type ViStep = {
  actor: number | 'mem';
  event: string;
  from: string;
  to: string;
  action: string;
  bus: ViBus | null;
  system: ViSystem;
};

const clone = (s: ViSystem): ViSystem => JSON.parse(JSON.stringify(s)) as ViSystem;

export function initialVi(): ViSystem {
  return {
    caches: [
      { state: 'I', data: null, pending: null },
      { state: 'I', data: null, pending: null }
    ],
    llc: 'I',
    mem: 0,
    bus: null
  };
}

export function legalActions(s: ViSystem): ViAction[] {
  const acts: ViAction[] = [];
  if (!s.bus) {
    s.caches.forEach((c, i) => {
      if (c.state === 'I' || c.state === 'V') {
        acts.push({ kind: 'core', c: i, op: 'load' }, { kind: 'core', c: i, op: 'store' });
      }
      if (c.state === 'V') acts.push({ kind: 'evict', c: i });
    });
    return acts;
  }
  if (s.bus.type === 'Get') {
    if (s.llc === 'I') acts.push({ kind: 'respond', c: 'mem' });
    s.caches.forEach((c, i) => {
      if (c.state === 'V' && i !== (s.bus as { from: number }).from) acts.push({ kind: 'respond', c: i });
    });
  } else if (s.bus.type === 'DataResp') {
    acts.push({ kind: 'receive', c: s.bus.to });
  } else {
    acts.push({ kind: 'handle-put' });
  }
  return acts;
}

export function isLegal(s: ViSystem, a: ViAction): boolean {
  return legalActions(s).some((x) => {
    if (x.kind !== a.kind) return false;
    if (x.kind === 'core' && a.kind === 'core') return x.c === a.c && x.op === a.op;
    if (x.kind === 'respond' && a.kind === 'respond') return x.c === a.c;
    if (x.kind === 'receive' && a.kind === 'receive') return x.c === a.c;
    if (x.kind === 'evict' && a.kind === 'evict') return x.c === a.c;
    return true;
  });
}

const step = (
  actor: number | 'mem',
  event: string,
  from: string,
  to: string,
  action: string,
  next: ViSystem
): { state: ViSystem; step: ViStep } => ({
  state: next,
  step: { actor, event, from, to, action, bus: next.bus, system: next }
});

export function apply(
  s: ViSystem,
  a: ViAction
): { state: ViSystem; step: ViStep } | null {
  if (!isLegal(s, a)) return null;

  if (a.kind === 'core') {
    if (s.bus) return null;
    const next = clone(s);
    const cache = next.caches[a.c];
    if (cache.state === 'V') {
      if (a.op === 'store') cache.data = 1;
      return step(
        a.c,
        a.op === 'load' ? 'Load' : 'Store',
        'V',
        'V',
        a.op === 'load' ? 'perform Load (hit)' : 'perform Store (hit)',
        next
      );
    }
    cache.state = 'IVD';
    cache.pending = a.op;
    next.bus = { type: 'Get', from: a.c };
    return step(a.c, a.op === 'load' ? 'Load' : 'Store', 'I', 'IVD', 'issue Get', next);
  }

  if (a.kind === 'evict') {
    if (s.bus) return null;
    const next = clone(s);
    const data = next.caches[a.c].data ?? 0;
    next.caches[a.c].state = 'I';
    next.caches[a.c].data = null;
    next.bus = { type: 'Put', from: a.c, data };
    return step(a.c, 'Evict Block', 'V', 'I', 'issue Put (with data)', next);
  }

  if (a.kind === 'respond' && a.c === 'mem') {
    if (!s.bus || s.bus.type !== 'Get' || s.llc !== 'I') return null;
    const next = clone(s);
    const req = next.bus as { type: 'Get'; from: number };
    next.llc = 'V';
    next.bus = { type: 'DataResp', from: 'mem', to: req.from, data: next.mem };
    return step('mem', 'Get', 'I', 'V', 'send DataResp', next);
  }

  if (a.kind === 'respond') {
    if (a.c === 'mem') return null;
    if (!s.bus || s.bus.type !== 'Get' || s.llc !== 'V') return null;
    const next = clone(s);
    const req = next.bus as { type: 'Get'; from: number };
    const data = next.caches[a.c].data ?? 0;
    next.caches[a.c].state = 'I';
    next.caches[a.c].data = null;
    next.llc = 'I';
    next.bus = { type: 'DataResp', from: a.c, to: req.from, data };
    return step(a.c, 'Other-Get', 'V', 'I', 'send DataResp', next);
  }

  if (a.kind === 'receive') {
    if (!s.bus || s.bus.type !== 'DataResp' || s.bus.to !== a.c) return null;
    const next = clone(s);
    const msg = next.bus as { type: 'DataResp'; from: number | 'mem'; to: number; data: number };
    const cache = next.caches[a.c];
    if (cache.state !== 'IVD') return null;
    cache.data = cache.pending === 'store' ? 1 : msg.data;
    cache.state = 'V';
    const did = cache.pending;
    cache.pending = null;
    next.llc = 'V';
    next.bus = null;
    return step(
      a.c,
      msg.from === 'mem' ? 'DataResp (own)' : 'DataResp (other)',
      'IVD',
      'V',
      did === 'store' ? 'copy data, perform Store' : 'copy data, perform Load',
      next
    );
  }

  if (a.kind === 'handle-put') {
    if (!s.bus || s.bus.type !== 'Put') return null;
    const next = clone(s);
    const msg = next.bus as { type: 'Put'; from: number; data: number };
    next.mem = msg.data;
    next.llc = 'I';
    next.bus = null;
    return step('mem', 'Put', 'V', 'I', 'update memory', next);
  }

  return null;
}

export function describeBus(bus: ViBus | null): string {
  if (!bus) return 'idle';
  if (bus.type === 'Get') return `Get · C${bus.from + 1}`;
  if (bus.type === 'Put') return `Put · C${bus.from + 1} → LLC`;
  const src = bus.from === 'mem' ? 'LLC' : `C${bus.from + 1}`;
  return `DataResp · ${src} → C${bus.to + 1}`;
}

export type ViScenario = {
  id: 'handoff' | 'writeback' | 'pingpong';
  actions: ViAction[];
};

export const VI_SCENARIOS: ViScenario[] = [
  {
    id: 'handoff',
    actions: [
      { kind: 'core', c: 0, op: 'load' },
      { kind: 'respond', c: 'mem' },
      { kind: 'receive', c: 0 },
      { kind: 'core', c: 0, op: 'store' },
      { kind: 'core', c: 1, op: 'load' },
      { kind: 'respond', c: 0 },
      { kind: 'receive', c: 1 }
    ]
  },
  {
    id: 'writeback',
    actions: [
      { kind: 'core', c: 0, op: 'load' },
      { kind: 'respond', c: 'mem' },
      { kind: 'receive', c: 0 },
      { kind: 'core', c: 0, op: 'store' },
      { kind: 'evict', c: 0 },
      { kind: 'handle-put' },
      { kind: 'core', c: 1, op: 'load' },
      { kind: 'respond', c: 'mem' },
      { kind: 'receive', c: 1 }
    ]
  },
  {
    id: 'pingpong',
    actions: [
      { kind: 'core', c: 0, op: 'load' },
      { kind: 'respond', c: 'mem' },
      { kind: 'receive', c: 0 },
      { kind: 'core', c: 0, op: 'store' },
      { kind: 'core', c: 1, op: 'load' },
      { kind: 'respond', c: 0 },
      { kind: 'receive', c: 1 },
      { kind: 'core', c: 0, op: 'load' },
      { kind: 'respond', c: 1 },
      { kind: 'receive', c: 0 }
    ]
  }
];
