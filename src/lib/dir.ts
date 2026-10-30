export type DCState = 'I' | 'S' | 'M';
export type DirState = 'U' | 'S' | 'M';

export type DCache = { state: DCState; data: number | null };

export type DEvent = {
  kind:
    | 'GetS'
    | 'GetM'
    | 'Data'
    | 'FwdGetS'
    | 'FwdGetM'
    | 'Inv'
    | 'InvAck'
    | 'PutM'
    | 'PutS'
    | 'PutAck'
    | 'hit'
    | 'write'
    | 'wb';
  from: string;
  to: string;
  extra?: string;
};

export type DOp = { kind: 'load' | 'store' | 'evict'; c: number };

export type DGroup = { op: DOp; events: DEvent[] };

export type DSystem = {
  caches: DCache[];
  dir: { state: DirState; owner: number | null; sharers: boolean[] };
  mem: number;
  seq: number;
  groups: DGroup[];
  reqs: number;
  fwds: number;
  dataMsgs: number;
};

export type DScenario = {
  id: 'first' | 'share' | 'invalidate' | 'migrate' | 'evict';
  ops: DOp[];
};

export const N = 3;

export const D_SCENARIOS: DScenario[] = [
  { id: 'first', ops: [{ kind: 'load', c: 0 }] },
  { id: 'share', ops: [{ kind: 'load', c: 0 }, { kind: 'load', c: 1 }] },
  { id: 'invalidate', ops: [{ kind: 'load', c: 0 }, { kind: 'load', c: 1 }, { kind: 'store', c: 0 }] },
  {
    id: 'migrate',
    ops: [{ kind: 'load', c: 0 }, { kind: 'store', c: 0 }, { kind: 'load', c: 1 }]
  },
  { id: 'evict', ops: [{ kind: 'load', c: 0 }, { kind: 'store', c: 0 }, { kind: 'evict', c: 0 }] }
];

export const initialD = (): DSystem => ({
  caches: Array.from({ length: N }, () => ({ state: 'I' as DCState, data: null as number | null })),
  dir: { state: 'U', owner: null, sharers: Array.from({ length: N }, () => false) },
  mem: 0,
  seq: 0,
  groups: [],
  reqs: 0,
  fwds: 0,
  dataMsgs: 0
});

const clone = (s: DSystem): DSystem => ({
  ...s,
  caches: s.caches.map((c) => ({ ...c })),
  dir: { ...s.dir, sharers: [...s.dir.sharers] },
  groups: [...s.groups]
});

const name = (c: number) => `C${c + 1}`;

export function applyD(sys: DSystem, op: DOp): { next: DSystem; events: DEvent[] } | null {
  const s = clone(sys);
  const c = op.c;
  const cache = s.caches[c];
  const ev: DEvent[] = [];

  if (op.kind === 'evict') {
    if (cache.state === 'I') return null;
    if (cache.state === 'M') {
      ev.push({ kind: 'PutM', from: name(c), to: 'Dir', extra: 'data' });
      s.mem = cache.data ?? s.mem;
      s.dir = { state: 'U', owner: null, sharers: s.dir.sharers.map(() => false) };
      cache.state = 'I';
      cache.data = null;
      ev.push({ kind: 'PutAck', from: 'Dir', to: name(c) });
      return finish(s, op, ev);
    }
    ev.push({ kind: 'PutS', from: name(c), to: 'Dir' });
    s.dir.sharers[c] = false;
    if (!s.dir.sharers.some(Boolean)) s.dir.state = 'U';
    cache.state = 'I';
    cache.data = null;
    ev.push({ kind: 'PutAck', from: 'Dir', to: name(c) });
    return finish(s, op, ev);
  }

  if (op.kind === 'load') {
    if (cache.state !== 'I') {
      ev.push({ kind: 'hit', from: name(c), to: name(c) });
      return finish(s, op, ev);
    }

    ev.push({ kind: 'GetS', from: name(c), to: 'Dir' });
    s.reqs += 1;

    if (s.dir.state === 'U') {
      s.dir.state = 'S';
      s.dir.sharers[c] = true;
      cache.state = 'S';
      cache.data = s.mem;
      ev.push({ kind: 'Data', from: 'Dir', to: name(c) });
      s.dataMsgs += 1;
    } else if (s.dir.state === 'S') {
      s.dir.sharers[c] = true;
      cache.state = 'S';
      cache.data = s.mem;
      ev.push({ kind: 'Data', from: 'Dir', to: name(c) });
      s.dataMsgs += 1;
    } else {
      const o = s.dir.owner!;
      ev.push({ kind: 'FwdGetS', from: 'Dir', to: name(o) });
      s.fwds += 1;
      const v = s.caches[o].data ?? s.mem;
      s.caches[o].state = 'S';
      s.caches[o].data = v;
      cache.state = 'S';
      cache.data = v;
      s.mem = v;
      s.dir.state = 'S';
      s.dir.owner = null;
      s.dir.sharers[o] = true;
      s.dir.sharers[c] = true;
      ev.push({ kind: 'Data', from: name(o), to: name(c) });
      ev.push({ kind: 'wb', from: name(o), to: 'Dir', extra: 'update memory' });
      s.dataMsgs += 1;
    }
    return finish(s, op, ev);
  }

  // store
  const value = s.seq + 1;
  s.seq = value;

  if (cache.state === 'M') {
    cache.data = value;
    ev.push({ kind: 'hit', from: name(c), to: name(c) });
    ev.push({ kind: 'write', from: name(c), to: name(c), extra: String(value) });
    return finish(s, op, ev);
  }

  if (cache.state === 'S') {
    ev.push({ kind: 'GetM', from: name(c), to: 'Dir' });
    s.reqs += 1;
    const others = s.dir.sharers.map((x, i) => (x && i !== c ? i : -1)).filter((i) => i >= 0);
    s.dir.state = 'M';
    s.dir.owner = c;
    s.dir.sharers = s.dir.sharers.map(() => false);
    ev.push({ kind: 'Data', from: 'Dir', to: name(c), extra: `ack=${others.length}` });
    s.dataMsgs += 1;
    for (const o of others) {
      ev.push({ kind: 'Inv', from: 'Dir', to: name(o) });
      s.fwds += 1;
      s.caches[o].state = 'I';
      s.caches[o].data = null;
      ev.push({ kind: 'InvAck', from: name(o), to: name(c) });
    }
    cache.state = 'M';
    cache.data = value;
    ev.push({ kind: 'write', from: name(c), to: name(c), extra: String(value) });
    return finish(s, op, ev);
  }

  // I -> M (GetM miss)
  ev.push({ kind: 'GetM', from: name(c), to: 'Dir' });
  s.reqs += 1;

  if (s.dir.state === 'U') {
    s.dir.state = 'M';
    s.dir.owner = c;
    cache.state = 'M';
    cache.data = value;
    ev.push({ kind: 'Data', from: 'Dir', to: name(c), extra: 'ack=0' });
    s.dataMsgs += 1;
    ev.push({ kind: 'write', from: name(c), to: name(c), extra: String(value) });
  } else if (s.dir.state === 'S') {
    const sharers = s.dir.sharers.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    s.dir.state = 'M';
    s.dir.owner = c;
    s.dir.sharers = s.dir.sharers.map(() => false);
    cache.state = 'M';
    cache.data = value;
    ev.push({ kind: 'Data', from: 'Dir', to: name(c), extra: `ack=${sharers.length}` });
    s.dataMsgs += 1;
    for (const o of sharers) {
      ev.push({ kind: 'Inv', from: 'Dir', to: name(o) });
      s.fwds += 1;
      s.caches[o].state = 'I';
      s.caches[o].data = null;
      ev.push({ kind: 'InvAck', from: name(o), to: name(c) });
    }
    ev.push({ kind: 'write', from: name(c), to: name(c), extra: String(value) });
  } else {
    const o = s.dir.owner!;
    ev.push({ kind: 'FwdGetM', from: 'Dir', to: name(o) });
    s.fwds += 1;
    const v = s.caches[o].data ?? s.mem;
    s.caches[o].state = 'I';
    s.caches[o].data = null;
    s.mem = v;
    s.dir.state = 'M';
    s.dir.owner = c;
    cache.state = 'M';
    cache.data = value;
    ev.push({ kind: 'Data', from: name(o), to: name(c) });
    ev.push({ kind: 'wb', from: name(o), to: 'Dir', extra: 'update memory' });
    s.dataMsgs += 1;
    ev.push({ kind: 'write', from: name(c), to: name(c), extra: String(value) });
  }
  return finish(s, op, ev);
}

function finish(s: DSystem, op: DOp, events: DEvent[]) {
  return { next: { ...s, groups: [...s.groups, { op, events }] }, events };
}

export function validD(sys: DSystem): boolean {
  const ms = sys.caches.map((c, i) => (c.state === 'M' ? i : -1)).filter((i) => i >= 0);
  if (sys.dir.state === 'M') {
    if (ms.length !== 1 || ms[0] !== sys.dir.owner) return false;
    if (sys.dir.sharers.some(Boolean)) return false;
    return true;
  }
  if (sys.dir.state === 'S') {
    if (ms.length) return false;
    return sys.caches.every((c, i) => (c.state === 'S') === sys.dir.sharers[i]);
  }
  return sys.caches.every((c) => c.state === 'I');
}
