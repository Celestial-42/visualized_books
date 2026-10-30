export type SState = 'I' | 'S' | 'E' | 'M';

export type SCache = { state: SState; data: number | null };

export type SEvent =
  | { type: 'hit'; c: number; state: SState }
  | { type: 'bus'; name: 'BusRd' | 'BusRdX' | 'BusUpgr' | 'PutM'; c: number }
  | { type: 'data'; from: 'mem' | number; to: number; value: number }
  | { type: 'wb'; c: number; value: number }
  | { type: 'inval'; c: number }
  | { type: 'silent'; c: number; what: 'upgrade' | 'evict' }
  | { type: 'write'; c: number; value: number };

export type SGroup = { op: SOp; events: SEvent[] };

export type SSystem = {
  caches: SCache[];
  mem: number;
  seq: number;
  groups: SGroup[];
  reqs: number;
  transfers: number;
  silent: number;
};

export type SOp = { kind: 'load' | 'store' | 'evict'; c: number };

export type SScenario = {
  id: 'share' | 'silent' | 'upgrade' | 'migrate' | 'evict';
  ops: SOp[];
};

export const S_SCENARIOS: SScenario[] = [
  { id: 'share', ops: [{ kind: 'load', c: 0 }, { kind: 'load', c: 1 }] },
  { id: 'silent', ops: [{ kind: 'load', c: 0 }, { kind: 'store', c: 0 }] },
  { id: 'upgrade', ops: [{ kind: 'load', c: 0 }, { kind: 'load', c: 1 }, { kind: 'store', c: 0 }] },
  {
    id: 'migrate',
    ops: [
      { kind: 'load', c: 0 },
      { kind: 'store', c: 0 },
      { kind: 'load', c: 1 },
      { kind: 'store', c: 1 }
    ]
  },
  { id: 'evict', ops: [{ kind: 'load', c: 0 }, { kind: 'store', c: 0 }, { kind: 'evict', c: 0 }] }
];

export const initialS = (): SSystem => ({
  caches: [
    { state: 'I', data: null },
    { state: 'I', data: null }
  ],
  mem: 0,
  seq: 0,
  groups: [],
  reqs: 0,
  transfers: 0,
  silent: 0
});

const clone = (s: SSystem): SSystem => ({
  ...s,
  caches: s.caches.map((c) => ({ ...c })),
  groups: [...s.groups]
});

export function applyS(sys: SSystem, op: SOp): { next: SSystem; events: SEvent[] } | null {
  const c = op.c;
  const o = 1 - c;
  const next = clone(sys);
  const events: SEvent[] = [];
  const cache = next.caches[c];
  const other = next.caches[o];

  if (op.kind === 'evict') {
    if (cache.state === 'I') return null;
    if (cache.state === 'M') {
      events.push({ type: 'bus', name: 'PutM', c });
      next.reqs += 1;
      const v = cache.data ?? next.mem;
      next.mem = v;
      events.push({ type: 'wb', c, value: v });
    } else {
      next.silent += 1;
      events.push({ type: 'silent', c, what: 'evict' });
    }
    cache.state = 'I';
    cache.data = null;
    return finish(next, op, events);
  }

  if (op.kind === 'load') {
    if (cache.state !== 'I') {
      next.silent += 1;
      events.push({ type: 'hit', c, state: cache.state });
      return finish(next, op, events);
    }

    next.reqs += 1;
    events.push({ type: 'bus', name: 'BusRd', c });

    if (other.state === 'M') {
      const v = other.data ?? next.mem;
      next.mem = v;
      next.transfers += 1;
      events.push({ type: 'data', from: o, to: c, value: v });
      events.push({ type: 'wb', c: o, value: v });
      other.state = 'S';
      other.data = v;
      cache.state = 'S';
      cache.data = v;
    } else if (other.state === 'E') {
      other.state = 'S';
      next.transfers += 1;
      events.push({ type: 'data', from: 'mem', to: c, value: next.mem });
      cache.state = 'S';
      cache.data = next.mem;
    } else if (other.state === 'S') {
      next.transfers += 1;
      events.push({ type: 'data', from: 'mem', to: c, value: next.mem });
      cache.state = 'S';
      cache.data = next.mem;
    } else {
      next.transfers += 1;
      events.push({ type: 'data', from: 'mem', to: c, value: next.mem });
      cache.state = 'E';
      cache.data = next.mem;
    }
    return finish(next, op, events);
  }

  // store
  const value = next.seq + 1;
  next.seq = value;

  if (cache.state === 'M') {
    next.silent += 1;
    cache.data = value;
    events.push({ type: 'write', c, value });
    return finish(next, op, events);
  }
  if (cache.state === 'E') {
    next.silent += 1;
    cache.state = 'M';
    cache.data = value;
    events.push({ type: 'silent', c, what: 'upgrade' });
    events.push({ type: 'write', c, value });
    return finish(next, op, events);
  }
  if (cache.state === 'S') {
    next.reqs += 1;
    events.push({ type: 'bus', name: 'BusUpgr', c });
    if (other.state !== 'I') {
      other.state = 'I';
      other.data = null;
      events.push({ type: 'inval', c: o });
    }
    cache.state = 'M';
    cache.data = value;
    events.push({ type: 'write', c, value });
    return finish(next, op, events);
  }

  next.reqs += 1;
  events.push({ type: 'bus', name: 'BusRdX', c });
  if (other.state === 'M') {
    const v = other.data ?? next.mem;
    next.mem = v;
    next.transfers += 1;
    events.push({ type: 'data', from: o, to: c, value: v });
    events.push({ type: 'wb', c: o, value: v });
  } else if (other.state === 'E' || other.state === 'S') {
    next.transfers += 1;
    events.push({ type: 'data', from: 'mem', to: c, value: next.mem });
  }
  if (other.state !== 'I') {
    other.state = 'I';
    other.data = null;
    events.push({ type: 'inval', c: o });
  }
  cache.state = 'M';
  cache.data = value;
  events.push({ type: 'write', c, value });
  return finish(next, op, events);
}

function finish(next: SSystem, op: SOp, events: SEvent[]) {
  return { next: { ...next, groups: [...next.groups, { op, events }] }, events };
}

export function validS(sys: SSystem): boolean {
  const m = sys.caches.filter((c) => c.state === 'M');
  const e = sys.caches.filter((c) => c.state === 'E');
  if (m.length > 1 || e.length > 1) return false;
  if (m.length === 1 && sys.caches.some((c) => c.state !== 'I' && c.state !== 'M')) return false;
  if (e.length === 1 && sys.caches.some((c) => c.state !== 'I' && c.state !== 'E')) return false;
  return true;
}

export function stateLabel(s: SState): { zh: string; en: string } {
  switch (s) {
    case 'M':
      return { zh: '已修改，独占，owner', en: 'modified, exclusive, owner' };
    case 'E':
      return { zh: '干净，独占', en: 'clean, exclusive' };
    case 'S':
      return { zh: '干净，共享', en: 'clean, shared' };
    default:
      return { zh: '无效', en: 'invalid' };
  }
}
