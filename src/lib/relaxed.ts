/**
 * A model-checking engine for relaxed memory orders.
 *
 * An execution is a total order <m> of the enabled operations. Which pairs of
 * operations must stay in program order is decided per model:
 *
 *   SC   every pair in program order
 *   TSO  every pair except store -> load
 *   XC   only FENCE pairs, and same-address load/load, load/store, store/store
 *
 * Loads read the last store before them in <m>, except that a load bypasses to
 * its own core's earlier store to the same address. A spin is a load that only
 * completes once some store has already published the awaited value, so it can
 * be placed anywhere after that store. Fences have no data effect: as soon as
 * one is ready it enters <m> automatically, which is what an implementation
 * does once the operations before it are ordered.
 *
 * Enumerating every legal <m> decides exactly which register outcomes a model
 * permits.
 */

export type Model = 'sc' | 'tso' | 'xc';

export type ROpKind = 'load' | 'store' | 'fence' | 'spin';

export type ROp = {
  id: string;
  kind: ROpKind;
  text: string;
  addr?: string;
  reg?: string;
  value?: number;
  /** a spin completes once a load sees this value */
  spinUntil?: number;
  note?: string;
  noteEn?: string;
};

export type RCore = { id: string; name: string; nameEn?: string; ops: ROp[] };

export type RProgram = {
  id: string;
  title: string;
  en: string;
  init: Record<string, number>;
  regs: string[];
  cores: RCore[];
};

export type FenceState = Record<string, boolean>;

export type RPlacement = {
  core: number;
  index: number;
  op: ROp;
  /** value produced by a load or spin */
  value?: number;
  fence?: boolean;
};

export type RState = {
  placed: boolean[][];
  seq: RPlacement[];
  regs: Record<string, number>;
  mem: Record<string, number>;
};

export type ROutcome = {
  key: string;
  regs: Record<string, number>;
  count: number;
  trace: RPlacement[];
};

export const MODELS: { id: Model; label: string; hint: string; hintEn: string }[] = [
  { id: 'sc', label: 'SC', hint: '每核的全部 program order 都保序', hintEn: 'all program order on every core is preserved' },
  { id: 'tso', label: 'TSO', hint: '只松开 store → load 一条边', hintEn: 'only store → load is relaxed' },
  { id: 'xc', label: 'XC', hint: '只保同地址与 FENCE', hintEn: 'only same-address pairs and FENCE are preserved' }
];

export function enabled(op: ROp, fences: FenceState): boolean {
  return op.kind !== 'fence' || fences[op.id] !== false;
}

/** Does program order force `a` before `b` under this model? */
export function ordered(m: Model, a: ROp, b: ROp): boolean {
  if (a.kind === 'fence' || b.kind === 'fence') return true;
  if (m === 'sc') return true;
  const aStore = a.kind === 'store';
  const bLoad = b.kind === 'load' || b.kind === 'spin';
  if (m === 'tso') return !(aStore && bLoad);
  if (a.addr !== b.addr) return false;
  return !(aStore && bLoad);
}

export function initialState(p: RProgram): RState {
  const regs: Record<string, number> = {};
  for (const r of p.regs) regs[r] = 0;
  return {
    placed: p.cores.map((c) => c.ops.map(() => false)),
    seq: [],
    regs,
    mem: { ...p.init }
  };
}

function cloneState(s: RState): RState {
  return {
    placed: s.placed.map((row) => [...row]),
    seq: [...s.seq],
    regs: { ...s.regs },
    mem: { ...s.mem }
  };
}

export function predecessors(
  p: RProgram,
  m: Model,
  fences: FenceState,
  c: number,
  i: number
): { c: number; i: number; id: string }[] {
  const op = p.cores[c].ops[i];
  const out: { c: number; i: number; id: string }[] = [];
  for (let j = 0; j < i; j++) {
    const prev = p.cores[c].ops[j];
    if (!enabled(prev, fences)) continue;
    if (ordered(m, prev, op)) out.push({ c, i: j, id: prev.id });
  }
  return out;
}

export function readyOp(
  p: RProgram,
  m: Model,
  fences: FenceState,
  s: RState,
  c: number,
  i: number
): boolean {
  const op = p.cores[c].ops[i];
  if (!enabled(op, fences) || s.placed[c][i]) return false;
  for (const pred of predecessors(p, m, fences, c, i)) {
    if (!s.placed[pred.c][pred.i]) return false;
  }
  if (op.kind === 'spin') {
    const want = op.spinUntil ?? 1;
    return s.seq.some(
      (pl) => pl.op.kind === 'store' && pl.op.addr === op.addr && (pl.op.value ?? 0) === want
    );
  }
  return true;
}

/** Every ready operation, fences included. */
export function readyOps(p: RProgram, m: Model, fences: FenceState, s: RState) {
  const out: { c: number; i: number }[] = [];
  for (let c = 0; c < p.cores.length; c++) {
    for (let i = 0; i < p.cores[c].ops.length; i++) {
      if (readyOp(p, m, fences, s, c, i)) out.push({ c, i });
    }
  }
  return out;
}

/** Ready operations a user can weave; fences settle on their own. */
export function readyChoices(p: RProgram, m: Model, fences: FenceState, s: RState) {
  return readyOps(p, m, fences, s).filter(({ c, i }) => p.cores[c].ops[i].kind !== 'fence');
}

function readValue(p: RProgram, s: RState, c: number, i: number, op: ROp): number {
  const addr = op.addr!;
  for (let j = i - 1; j >= 0; j--) {
    const prev = p.cores[c].ops[j];
    if (prev.kind === 'store' && prev.addr === addr) return prev.value ?? 0;
  }
  let v = p.init[addr] ?? 0;
  for (const pl of s.seq) {
    if (pl.op.kind === 'store' && pl.op.addr === addr) v = pl.op.value ?? 0;
  }
  return v;
}

export function applyPlacement(
  p: RProgram,
  m: Model,
  fences: FenceState,
  s: RState,
  c: number,
  i: number
): RState | null {
  if (!readyOp(p, m, fences, s, c, i)) return null;
  const op = p.cores[c].ops[i];
  const next = cloneState(s);
  let value: number | undefined;
  if (op.kind === 'load') {
    value = readValue(p, next, c, i, op);
    next.regs[op.reg!] = value;
  } else if (op.kind === 'spin') {
    value = op.spinUntil ?? 1;
    next.regs[op.reg!] = value;
  } else if (op.kind === 'store') {
    next.mem[op.addr!] = op.value ?? 0;
  }
  next.placed[c][i] = true;
  next.seq.push({ core: c, index: i, op, value, fence: op.kind === 'fence' });
  return next;
}

function firstReadyFence(p: RProgram, m: Model, fences: FenceState, s: RState) {
  for (const { c, i } of readyOps(p, m, fences, s)) {
    if (p.cores[c].ops[i].kind === 'fence') return { c, i };
  }
  return null;
}

export function settle(p: RProgram, m: Model, fences: FenceState, s: RState): RState {
  let next = s;
  for (let guard = 0; guard < 16; guard++) {
    const f = firstReadyFence(p, m, fences, next);
    if (!f) break;
    const nx = applyPlacement(p, m, fences, next, f.c, f.i);
    if (!nx) break;
    next = nx;
  }
  return next;
}

/** Place one operation, then let any unlocked fence settle. */
export function play(
  p: RProgram,
  m: Model,
  fences: FenceState,
  s: RState,
  c: number,
  i: number
): RState | null {
  const placed = applyPlacement(p, m, fences, s, c, i);
  if (!placed) return null;
  return settle(p, m, fences, placed);
}

export function allDone(p: RProgram, m: Model, fences: FenceState, s: RState): boolean {
  return p.cores.every((core, c) =>
    core.ops.every((op, i) => !enabled(op, fences) || s.placed[c][i])
  );
}

export function outcomeKey(p: RProgram, regs: Record<string, number>): string {
  return p.regs.map((r) => regs[r] ?? 0).join(',');
}

export function formatOutcome(p: RProgram, regs: Record<string, number>): string {
  return `(${p.regs.map((r) => `${r}=${regs[r] ?? 0}`).join(', ')})`;
}

export function enumerate(p: RProgram, m: Model, fences: FenceState, limit = 40000): ROutcome[] {
  const out = new Map<string, ROutcome>();
  let visited = 0;

  const walk = (s: RState) => {
    if (++visited > limit) return;
    if (allDone(p, m, fences, s)) {
      const key = outcomeKey(p, s.regs);
      const hit = out.get(key);
      if (hit) hit.count += 1;
      else out.set(key, { key, regs: { ...s.regs }, count: 1, trace: s.seq });
      return;
    }
    for (const { c, i } of readyChoices(p, m, fences, s)) {
      const nx = play(p, m, fences, s, c, i);
      if (nx) walk(nx);
    }
  };

  walk(settle(p, m, fences, initialState(p)));
  return [...out.values()].sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/* Programs for chapter 5                                              */
/* ------------------------------------------------------------------ */

/** Store buffering: TSO and XC both permit (0, 0); SC does not. */
export const R_SB: RProgram = {
  id: 'sb',
  title: 'Store Buffering',
  en: 'SB',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2'],
  cores: [
    {
      id: 'C1',
      name: '核 C1',
      nameEn: 'core',
      ops: [
        { id: 'S1', kind: 'store', addr: 'x', value: 1, text: 'x = NEW' },
        { id: 'L1', kind: 'load', addr: 'y', reg: 'r1', text: 'r1 = y' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2',
      nameEn: 'core',
      ops: [
        { id: 'S2', kind: 'store', addr: 'y', value: 1, text: 'y = NEW' },
        { id: 'L2', kind: 'load', addr: 'x', reg: 'r2', text: 'r2 = x' }
      ]
    }
  ]
};

/** Load buffering: only a model that relaxes load order lets both loads see 1. */
export const R_LB: RProgram = {
  id: 'lb',
  title: 'Load Buffering',
  en: 'LB',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2'],
  cores: [
    {
      id: 'C1',
      name: '核 C1',
      nameEn: 'core',
      ops: [
        { id: 'L1', kind: 'load', addr: 'x', reg: 'r1', text: 'r1 = x' },
        { id: 'S1', kind: 'store', addr: 'y', value: 1, text: 'y = NEW' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2',
      nameEn: 'core',
      ops: [
        { id: 'L2', kind: 'load', addr: 'y', reg: 'r2', text: 'r2 = y' },
        { id: 'S2', kind: 'store', addr: 'x', value: 1, text: 'x = NEW' }
      ]
    }
  ]
};

/** Message passing with a spin. F1 publishes data; F2 keeps the loads ordered. */
export const R_MP: RProgram = {
  id: 'mp',
  title: 'Message Passing',
  en: 'MP',
  init: { data: 0, flag: 0 },
  regs: ['r1', 'r2'],
  cores: [
    {
      id: 'C1',
      name: '核 C1（生产者）',
      nameEn: 'producer',
      ops: [
        { id: 'S1', kind: 'store', addr: 'data', value: 1, text: 'data = NEW' },
        { id: 'F1', kind: 'fence', text: 'FENCE', note: '发布 data', noteEn: 'publish data' },
        { id: 'S2', kind: 'store', addr: 'flag', value: 1, text: 'flag = SET' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2（消费者）',
      nameEn: 'consumer',
      ops: [
        {
          id: 'L1',
          kind: 'spin',
          addr: 'flag',
          reg: 'r1',
          spinUntil: 1,
          text: 'r1 = flag',
          note: 'spin 到 SET',
          noteEn: 'spin until SET'
        },
        { id: 'F2', kind: 'fence', text: 'FENCE', note: '锁住两条 load', noteEn: 'lock the two loads' },
        { id: 'L2', kind: 'load', addr: 'data', reg: 'r2', text: 'r2 = data' }
      ]
    }
  ]
};

export const R_PROGRAMS: Record<'sb' | 'lb' | 'mp', RProgram> = {
  sb: R_SB,
  lb: R_LB,
  mp: R_MP
};

export type RPid = keyof typeof R_PROGRAMS;
