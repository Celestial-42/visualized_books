/**
 * An operational TSO machine.
 *
 * Each core retires its instructions in program order. Stores do not update
 * memory when they retire: they enter a per-core FIFO store buffer and become
 * visible only when the buffer head is drained. Loads check the core's own
 * buffer first (store-to-load forwarding), then memory. A fence retires only
 * once the buffer is empty, which is exactly what MFENCE buys on x86.
 *
 * Enumerating every interleaving of retire/drain actions therefore decides,
 * exactly, which register outcomes TSO permits.
 */

import type { Op, Program } from './litmus';
import { formatOutcome, outcomeKey } from './litmus';

export type BufEntry = { id: string; addr: string; value: number };

export type TsoState = {
  pc: number[];
  regs: Record<string, number>;
  mem: Record<string, number>;
  buf: BufEntry[][];
};

export type TsoStep = {
  i: number;
  core: number;
  kind: 'retire' | 'drain';
  opId: string;
  text: string;
  /** destination register when the retired instruction is a load */
  reg?: string;
  /** value returned by a load */
  observed?: number;
  /** load was served from the core's own store buffer */
  forwarded?: boolean;
  /** buffer head that became visible */
  drained?: BufEntry;
  regsAfter: Record<string, number>;
  memAfter: Record<string, number>;
};

export type TsoOutcome = {
  key: string;
  regs: Record<string, number>;
  count: number;
  trace: TsoStep[];
};

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function initialState(p: Program): TsoState {
  const regs: Record<string, number> = {};
  for (const r of p.regs) regs[r] = 0;
  return {
    pc: p.cores.map(() => 0),
    regs,
    mem: { ...p.init },
    buf: p.cores.map(() => [])
  };
}

export function coreDone(p: Program, s: TsoState, c: number): boolean {
  return s.pc[c] >= p.cores[c].ops.length;
}

export function allDone(p: Program, s: TsoState): boolean {
  return p.cores.every((_, c) => coreDone(p, s, c) && s.buf[c].length === 0);
}

/** No instructions left to retire and nothing left in this core's buffer. */
export function coreHalted(p: Program, s: TsoState, c: number): boolean {
  return coreDone(p, s, c) && s.buf[c].length === 0;
}

export function canRetire(p: Program, s: TsoState, c: number): boolean {
  if (coreDone(p, s, c)) return false;
  const op = p.cores[c].ops[s.pc[c]];
  if (op.kind === 'fence') return s.buf[c].length === 0;
  return true;
}

export function retire(
  p: Program,
  s: TsoState,
  c: number,
  i = 0
): { state: TsoState; step: TsoStep } | null {
  if (!canRetire(p, s, c)) return null;
  const ops = p.cores[c].ops;
  const index = s.pc[c];
  const op = ops[index];
  const next = clone(s);
  let observed: number | undefined;
  let forwarded = false;

  switch (op.kind) {
    case 'load': {
      const hit = [...next.buf[c]].reverse().find((e) => e.addr === op.addr);
      observed = hit ? hit.value : (next.mem[op.addr!] ?? 0);
      forwarded = Boolean(hit);
      next.regs[op.reg!] = observed;
      next.pc[c] = index + 1;
      break;
    }
    case 'store': {
      const value = op.valueFrom ? (next.regs[op.valueFrom] ?? 0) : op.value!;
      next.buf[c].push({ id: op.id, addr: op.addr!, value });
      next.pc[c] = index + 1;
      break;
    }
    case 'branch': {
      const v = next.regs[op.reg!] ?? 0;
      next.pc[c] = op.cond!(v) ? op.target! : index + 1;
      break;
    }
    case 'fence': {
      next.pc[c] = index + 1;
      break;
    }
  }

  return {
    state: next,
    step: {
      i,
      core: c,
      kind: 'retire',
      opId: op.id,
      text: op.text,
      reg: op.reg,
      observed,
      forwarded,
      regsAfter: { ...next.regs },
      memAfter: { ...next.mem }
    }
  };
}

export function canDrain(p: Program, s: TsoState, c: number): boolean {
  return s.buf[c].length > 0;
}

export function drain(
  p: Program,
  s: TsoState,
  c: number,
  i = 0
): { state: TsoState; step: TsoStep } | null {
  if (!canDrain(p, s, c)) return null;
  const next = clone(s);
  const head = next.buf[c].shift()!;
  next.mem[head.addr] = head.value;
  return {
    state: next,
    step: {
      i,
      core: c,
      kind: 'drain',
      opId: head.id,
      text: `${head.addr} = ${head.value} 写入内存`,
      drained: head,
      regsAfter: { ...next.regs },
      memAfter: { ...next.mem }
    }
  };
}

export type TsoAction = { kind: 'retire' | 'drain'; core: number };

export function legalActions(p: Program, s: TsoState): TsoAction[] {
  const acts: TsoAction[] = [];
  for (let c = 0; c < p.cores.length; c++) {
    if (canRetire(p, s, c)) acts.push({ kind: 'retire', core: c });
    if (canDrain(p, s, c)) acts.push({ kind: 'drain', core: c });
  }
  return acts;
}

export function apply(p: Program, s: TsoState, a: TsoAction, i = 0) {
  return a.kind === 'retire' ? retire(p, s, a.core, i) : drain(p, s, a.core, i);
}

export function format(p: Program, regs: Record<string, number>): string {
  return formatOutcome(p, regs);
}

export { outcomeKey };

export function enumerate(p: Program, limit = 300000): TsoOutcome[] {
  const out = new Map<string, TsoOutcome>();
  let visited = 0;

  const walk = (state: TsoState, trace: TsoStep[]) => {
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

    for (const a of legalActions(p, state)) {
      const r = apply(p, state, a, trace.length + 1);
      if (!r) continue;
      walk(r.state, [...trace, r.step]);
    }
  };

  walk(initialState(p), []);
  return [...out.values()].sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/* TSO litmus tests                                                    */
/* ------------------------------------------------------------------ */

/** Store buffering: the canonical test that TSO allows. */
export const TSO_SB: Program = {
  id: 'tso-sb',
  title: 'Store Buffering',
  en: 'SB on TSO',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2'],
  maxSteps: 12,
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

/** The same test with MFENCE between each store and its following load. */
export const TSO_SB_FENCE: Program = {
  id: 'tso-sb-fence',
  title: 'SB + MFENCE',
  en: 'SB with fences',
  init: { x: 0, y: 0 },
  regs: ['r1', 'r2'],
  maxSteps: 16,
  cores: [
    {
      id: 'C1',
      name: '核 C1',
      nameEn: 'core',
      ops: [
        { id: 'S1', kind: 'store', addr: 'x', value: 1, text: 'x = NEW' },
        { id: 'F1', kind: 'fence', text: 'MFENCE', note: '等 store buffer drain', noteEn: 'wait for drain' },
        { id: 'L1', kind: 'load', addr: 'y', reg: 'r1', text: 'r1 = y' }
      ]
    },
    {
      id: 'C2',
      name: '核 C2',
      nameEn: 'core',
      ops: [
        { id: 'S2', kind: 'store', addr: 'y', value: 1, text: 'y = NEW' },
        { id: 'F2', kind: 'fence', text: 'MFENCE', note: '等 store buffer drain', noteEn: 'wait for drain' },
        { id: 'L2', kind: 'load', addr: 'x', reg: 'r2', text: 'r2 = x' }
      ]
    }
  ]
};

/** Message passing: the test TSO does NOT break, because stores stay ordered. */
export const TSO_MP: Program = {
  id: 'tso-mp',
  title: 'Message Passing',
  en: 'MP on TSO',
  init: { data: 0, flag: 0 },
  regs: ['r1', 'r2'],
  maxSteps: 18,
  cores: [
    {
      id: 'C1',
      name: '核 C1（生产者）',
      nameEn: 'producer',
      ops: [
        { id: 'S1', kind: 'store', addr: 'data', value: 1, text: 'data = NEW' },
        { id: 'S2', kind: 'store', addr: 'flag', value: 1, text: 'flag = SET' }
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
          condLabel: 'r1 ≠ SET',
          note: 'spin'
        },
        { id: 'L2', kind: 'load', addr: 'data', reg: 'r2', text: 'r2 = data' }
      ]
    }
  ]
};

export const TSO_PROGRAMS: Record<string, Program> = {
  sb: TSO_SB,
  fence: TSO_SB_FENCE,
  mp: TSO_MP
};

export type TsoOp = Op;
