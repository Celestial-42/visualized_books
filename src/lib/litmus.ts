/**
 * A tiny, exact SC litmus engine.
 *
 * A program is a set of per-core in-order instruction lists. An execution is a
 * total order of instructions that projects onto each core's program order.
 * Loads return the value of the most recent store to the same address, or the
 * initial value. Enumerating executions is therefore enough to decide, exactly,
 * which register outcomes SC permits — no heuristics involved.
 */

export type OpKind = 'load' | 'store' | 'branch' | 'fence';

export type Op = {
  id: string;
  kind: OpKind;
  /** source text shown in the program listing */
  text: string;
  addr?: string;
  reg?: string;
  value?: number;
  /** store writes the current value of this register (a data dependency) */
  valueFrom?: string;
  /** branch target as an index into the core's op list */
  target?: number;
  /** branch taken when this returns true */
  cond?: (v: number) => boolean;
  condLabel?: string;
  /** short remark shown next to the instruction */
  note?: string;
  noteEn?: string;
};

export type Core = {
  id: string;
  name: string;
  nameEn?: string;
  ops: Op[];
};

export type Program = {
  id: string;
  title: string;
  en: string;
  /** initial memory contents; anything absent is 0 */
  init: Record<string, number>;
  /** registers surfaced in the outcome readout */
  regs: string[];
  cores: Core[];
  /** enumeration bound — executions that do not finish within it are dropped */
  maxSteps: number;
  legend?: { value: number; label: string }[];
};

export type Mem = Record<string, number>;
export type Regs = Record<string, number>;

export type State = {
  pc: number[];
  regs: Regs;
  mem: Mem;
};

export type Step = {
  i: number;
  core: number;
  op: Op;
  opIndex: number;
  regsAfter: Regs;
  memAfter: Mem;
  /** value a load returned */
  observed?: number;
};

export type Outcome = {
  key: string;
  regs: Regs;
  count: number;
  trace: Step[];
};

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function initialState(p: Program): State {
  const regs: Regs = {};
  for (const r of p.regs) regs[r] = 0;
  return { pc: p.cores.map(() => 0), regs, mem: { ...p.init } };
}

export function isDone(p: Program, s: State, core: number): boolean {
  return s.pc[core] >= p.cores[core].ops.length;
}

export function allDone(p: Program, s: State): boolean {
  return p.cores.every((_, c) => isDone(p, s, c));
}

/** Execute the next instruction of `core`. Returns null when that core is done. */
export function step(p: Program, s: State, core: number, i = 0): { state: State; step: Step } | null {
  const ops = p.cores[core].ops;
  const index = s.pc[core];
  if (index >= ops.length) return null;

  const op = ops[index];
  const next = clone(s);
  let observed: number | undefined;

  switch (op.kind) {
    case 'load': {
      observed = next.mem[op.addr!] ?? 0;
      next.regs[op.reg!] = observed;
      next.pc[core] = index + 1;
      break;
    }
    case 'store': {
      next.mem[op.addr!] = op.valueFrom ? (next.regs[op.valueFrom] ?? 0) : op.value!;
      next.pc[core] = index + 1;
      break;
    }
    case 'branch': {
      const v = next.regs[op.reg!] ?? 0;
      next.pc[core] = op.cond!(v) ? op.target! : index + 1;
      break;
    }
    case 'fence': {
      next.pc[core] = index + 1;
      break;
    }
  }

  return {
    state: next,
    step: {
      i,
      core,
      op,
      opIndex: index,
      regsAfter: { ...next.regs },
      memAfter: { ...next.mem },
      observed
    }
  };
}

export function outcomeKey(p: Program, regs: Regs): string {
  return p.regs.map((r) => regs[r] ?? 0).join(',');
}

export function formatOutcome(p: Program, regs: Regs): string {
  return `(${p.regs.map((r) => `${r}=${regs[r] ?? 0}`).join(', ')})`;
}

/**
 * Exhaustively enumerate SC-legal executions up to `p.maxSteps`.
 * Returns one entry per distinct register outcome, with the number of
 * executions that produce it and a representative trace.
 */
export function enumerate(p: Program, limit = 200000): Outcome[] {
  const out = new Map<string, Outcome>();
  let visited = 0;

  const walk = (state: State, trace: Step[]) => {
    if (++visited > limit) return;
    if (allDone(p, state)) {
      const key = outcomeKey(p, state.regs);
      const hit = out.get(key);
      if (hit) hit.count += 1;
      else
        out.set(key, {
          key,
          regs: { ...state.regs },
          count: 1,
          trace
        });
      return;
    }
    if (trace.length >= p.maxSteps) return;

    for (let c = 0; c < p.cores.length; c++) {
      if (isDone(p, state, c)) continue;
      const r = step(p, state, c, trace.length + 1);
      if (!r) continue;
      walk(r.state, [...trace, r.step]);
    }
  };

  walk(initialState(p), []);
  return [...out.values()].sort((a, b) => b.count - a.count);
}

/** A single deterministic play-through for a given outcome, used for replays. */
export function traceFor(p: Program, key: string): Step[] | null {
  const found = enumerate(p).find((o) => o.key === key);
  return found ? found.trace : null;
}

export function coresHalted(p: Program, s: State): boolean[] {
  return p.cores.map((_, c) => isDone(p, s, c));
}

/* ------------------------------------------------------------------ */
/* The litmus tests used in chapters 1–3                               */
/* ------------------------------------------------------------------ */

/** Table 3.1 — message passing with a spin loop. */
export const MP: Program = {
  id: 'mp',
  title: 'Message Passing · 带 spin 等待',
  en: 'Message Passing (Table 3.1)',
  init: { data: 0, flag: 0 },
  regs: ['r1', 'r2'],
  maxSteps: 11,
  legend: [
    { value: 0, label: '未设置' },
    { value: 1, label: 'NEW / SET' }
  ],
  cores: [
    {
      id: 'C1',
      name: '核 C1（生产者）',
      nameEn: 'producer',
      ops: [
        { id: 'S1', kind: 'store', addr: 'data', value: 1, text: 'data = NEW', note: '发布数据', noteEn: 'publish data' },
        { id: 'S2', kind: 'store', addr: 'flag', value: 1, text: 'flag = SET', note: '举起旗标', noteEn: 'raise flag' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2（消费者）',
      nameEn: 'consumer',
      ops: [
        { id: 'L1', kind: 'load', addr: 'flag', reg: 'r1', text: 'r1 = flag' },
        {
          id: 'B1',
          kind: 'branch',
          reg: 'r1',
          cond: (v) => v !== 1,
          target: 0,
          text: 'if (r1 ≠ SET) goto L1',
          note: 'spin',
          condLabel: 'r1 ≠ SET'
        },
        { id: 'L2', kind: 'load', addr: 'data', reg: 'r2', text: 'r2 = data' }
      ]
    }
  ]
};

/** Table 3.3 — store buffering. The canonical "can both be 0?" test. */
export const SB: Program = {
  id: 'sb',
  title: 'Store Buffering · 两个 0',
  en: 'Store Buffering (Table 3.3)',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2'],
  maxSteps: 4,
  legend: [
    { value: 0, label: '0' },
    { value: 1, label: 'NEW' }
  ],
  cores: [
    {
      id: 'C1',
      name: '核 C1',
      ops: [
        { id: 'S1', kind: 'store', addr: 'x', value: 1, text: 'x = NEW' },
        { id: 'L1', kind: 'load', addr: 'y', reg: 'r1', text: 'r1 = y' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2',
      ops: [
        { id: 'S2', kind: 'store', addr: 'y', value: 1, text: 'y = NEW' },
        { id: 'L2', kind: 'load', addr: 'x', reg: 'r2', text: 'r2 = x' }
      ]
    }
  ]
};

/** Table 5.10 — independent reads of independent writes. */
export const IRIW: Program = {
  id: 'iriw',
  title: '独立读独立写',
  en: 'IRIW',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2', 'r3', 'r4'],
  maxSteps: 10,
  cores: [
    {
      id: 'C1',
      name: '核 C1（写 x）',
      ops: [{ id: 'S1', kind: 'store', addr: 'x', value: 1, text: 'x = NEW' }]
    },
    {
      id: 'C2',
      name: '核 C2（写 y）',
      ops: [{ id: 'S2', kind: 'store', addr: 'y', value: 1, text: 'y = NEW' }]
    },
    {
      id: 'C3',
      name: '核 C3（读 x 再读 y）',
      ops: [
        { id: 'L1', kind: 'load', addr: 'x', reg: 'r1', text: 'r1 = x' },
        { id: 'L2', kind: 'load', addr: 'y', reg: 'r2', text: 'r2 = y' }
      ]
    },
    {
      id: 'C4',
      name: '核 C4（读 y 再读 x）',
      ops: [
        { id: 'L3', kind: 'load', addr: 'y', reg: 'r3', text: 'r3 = y' },
        { id: 'L4', kind: 'load', addr: 'x', reg: 'r4', text: 'r4 = x' }
      ]
    }
  ]
};

export const PROGRAMS: Record<string, Program> = { mp: MP, sb: SB, iriw: IRIW };
