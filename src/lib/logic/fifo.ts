/**
 * Synchronous FIFO engine.
 *
 * Everything the chapter claims is computed here: ring occupancy, flag
 * schemes, readout timing and depth sizing. The functions are pure so the
 * page, the quiz and any future test can reuse them.
 */

export type FifoOp = 'idle' | 'write' | 'read' | 'both';

export type FifoPolicy = {
  /** A write while full overwrites the oldest unread word instead of being rejected. */
  allowOverwrite?: boolean;
  /** A read while empty returns nothing instead of being rejected. */
  allowUnderflow?: boolean;
  /** A read in the same cycle frees a slot, so a write may proceed when full. */
  lookaheadFull?: boolean;
};

export type FifoState = {
  depth: number;
  mem: (number | null)[];
  wptr: number;
  rptr: number;
  count: number;
  nextData: number;
  wraps: number;
  written: number;
  read: number;
  rejectedWrites: number;
  rejectedReads: number;
  lost: number;
};

export type FifoResult = {
  state: FifoState;
  fullBefore: boolean;
  emptyBefore: boolean;
  acceptedWrite: boolean;
  acceptedRead: boolean;
  readData: number | null;
  overwritten: number | null;
  underflow: boolean;
};

export const createFifo = (depth = 8): FifoState => ({
  depth,
  mem: Array.from({ length: depth }, () => null),
  wptr: 0,
  rptr: 0,
  count: 0,
  nextData: 1,
  wraps: 0,
  written: 0,
  read: 0,
  rejectedWrites: 0,
  rejectedReads: 0,
  lost: 0
});

const advance = (ptr: number, depth: number) => {
  const next = (ptr + 1) % depth;
  return { next, wrapped: next === 0 };
};

/**
 * Advance one cycle.
 *
 * With lookaheadFull (the default), a read is applied before the write, so a
 * full FIFO can accept a write in the same cycle that it serves a read. Turn
 * it off to model the conservative "full blocks the write" policy.
 */
export const fifoStep = (state: FifoState, op: FifoOp, policy: FifoPolicy = {}): FifoResult => {
  const next: FifoState = { ...state, mem: state.mem.slice() };
  const fullBefore = state.count === state.depth;
  const emptyBefore = state.count === 0;
  const wr = op === 'write' || op === 'both';
  const rd = op === 'read' || op === 'both';
  const lookahead = policy.lookaheadFull !== false;

  let acceptedWrite = false;
  let acceptedRead = false;
  let readData: number | null = null;
  let overwritten: number | null = null;
  let underflow = false;

  const doRead = () => {
    if (!rd) return;
    if (next.count === 0) {
      if (policy.allowUnderflow) {
        underflow = true;
        next.rejectedReads += 1;
      } else {
        next.rejectedReads += 1;
      }
      return;
    }
    readData = next.mem[next.rptr];
    const step = advance(next.rptr, next.depth);
    next.rptr = step.next;
    next.count -= 1;
    next.read += 1;
    acceptedRead = true;
  };

  const doWrite = () => {
    if (!wr) return;
    const data = next.nextData;
    if (next.count === next.depth) {
      if (policy.allowOverwrite) {
        overwritten = next.mem[next.wptr];
        next.mem[next.wptr] = data;
        const w = advance(next.wptr, next.depth);
        const r = advance(next.rptr, next.depth);
        next.wptr = w.next;
        next.rptr = r.next;
        next.wraps += w.wrapped ? 1 : 0;
        next.lost += 1;
        next.written += 1;
        next.nextData += 1;
        acceptedWrite = true;
      } else {
        next.rejectedWrites += 1;
      }
      return;
    }
    next.mem[next.wptr] = data;
    const w = advance(next.wptr, next.depth);
    next.wptr = w.next;
    next.count += 1;
    next.wraps += w.wrapped ? 1 : 0;
    next.written += 1;
    next.nextData += 1;
    acceptedWrite = true;
  };

  if (lookahead) {
    doRead();
    doWrite();
  } else {
    // the write sees the old full flag; a read cannot make room for it
    if (wr && fullBefore && !policy.allowOverwrite) {
      next.rejectedWrites += 1;
    } else {
      doWrite();
    }
    doRead();
  }

  return { state: next, fullBefore, emptyBefore, acceptedWrite, acceptedRead, readData, overwritten, underflow };
};

export type RingSlot = {
  index: number;
  value: number | null;
  valid: boolean;
  head: boolean;
  nextFree: boolean;
};

export const ringSlots = (state: FifoState): RingSlot[] =>
  Array.from({ length: state.depth }, (_, i) => ({
    index: i,
    value: state.mem[i],
    valid: state.count > 0 && (i - state.rptr + state.depth) % state.depth < state.count,
    head: state.count > 0 && i === state.rptr,
    nextFree: i === state.wptr
  }));

export const pointerBits = (depth: number) => Math.ceil(Math.log2(depth)) + 1;

export const binary = (value: number, width: number) => value.toString(2).padStart(width, '0');

export const almostFull = (state: FifoState) => state.count >= state.depth - 1;
export const almostEmpty = (state: FifoState) => state.count <= 1;

/* ------------------------------------------------------------------ */
/* Full / empty detection schemes                                      */
/* ------------------------------------------------------------------ */

export type Flags = { full: boolean; empty: boolean };

/** count-based: exact, easy almost flags, but needs an up/down counter. */
export const counterFlags = (depth: number, count: number): Flags => ({
  full: count >= depth,
  empty: count <= 0
});

/**
 * extra-bit pointers: N+1 bits per pointer.
 * empty: w == r. full: same low N bits, different MSB.
 * Starting from r = 0, a count of c is represented by w = c.
 */
export const extraBitFlags = (depth: number, count: number): Flags => {
  const modulus = depth * 2;
  const w = count % modulus;
  const r = 0;
  return { full: w === depth, empty: w === r };
};

export const extraBitPointers = (depth: number, count: number) => {
  const width = pointerBits(depth);
  const w = count % (depth * 2);
  return { w, r: 0, width, wBits: binary(w, width), rBits: binary(0, width) };
};

/** What the count becomes after this cycle, assuming legal operations. */
export const nextCount = (depth: number, count: number, op: FifoOp, lookahead = false) => {
  const wr = op === 'write' || op === 'both';
  const rd = op === 'read' || op === 'both';
  const acceptedRead = rd && count > 0;
  const acceptedWrite = wr && (count < depth || (lookahead && count === depth && acceptedRead));
  return Math.max(0, Math.min(depth, count + (acceptedWrite ? 1 : 0) - (acceptedRead ? 1 : 0)));
};

/** Correct registered flags: compute the next state, register that. */
export const nextFlags = (depth: number, count: number, op: FifoOp, lookahead = false): Flags =>
  counterFlags(depth, nextCount(depth, count, op, lookahead));

/** A register simply delaying today's comparator: stale by one state change. */
export const delayedFlags = (depth: number, count: number): Flags => counterFlags(depth, count);

/* ------------------------------------------------------------------ */
/* Readout timing: standard vs first-word fall-through                 */
/* ------------------------------------------------------------------ */

export type ReadMode = 'standard' | 'fwft';
export type ReadyPattern = 'always' | 'alt' | 'late';

export type TimeSample = {
  t: number;
  wr_en: boolean;
  full: boolean;
  rd_en: boolean;
  empty: boolean;
  dout: number | null;
  valid: boolean;
  xfer: boolean;
};

export type TimeStats = {
  first: number | null;
  last: number | null;
  transfers: number;
  bubbles: number;
};

export type TimeResult = { samples: TimeSample[]; stats: TimeStats };

const readyAt = (pattern: ReadyPattern, t: number) => {
  if (pattern === 'always') return true;
  if (pattern === 'alt') return t % 2 === 0;
  return t >= 3;
};

export const simulateReadout = (
  mode: ReadMode,
  pattern: ReadyPattern,
  words = 4,
  cycles = 10
): TimeResult => {
  const capacity = 8;
  const queue: number[] = [];
  let outData: number | null = null;
  let outValid = false;
  const samples: TimeSample[] = [];

  for (let t = 0; t < cycles; t += 1) {
    const ready = readyAt(pattern, t);
    const wr_en = t < words;
    const full = queue.length >= capacity;
    const empty = queue.length === 0;
    let rd_en = false;
    let dout: number | null = null;
    let valid = false;
    let xfer = false;

    if (mode === 'fwft') {
      valid = queue.length > 0;
      dout = valid ? queue[0] : null;
      rd_en = ready && valid;
      xfer = rd_en;
    } else {
      valid = outValid;
      dout = outValid ? outData : null;
      xfer = outValid && ready;
      rd_en = ready && queue.length > 0 && (!outValid || xfer);
    }

    samples.push({ t, wr_en, full, rd_en, empty, dout, valid, xfer });

    if (mode === 'fwft') {
      if (rd_en) queue.shift();
    } else {
      if (xfer) {
        outValid = false;
        outData = null;
      }
      if (rd_en) {
        outData = queue.shift() ?? null;
        outValid = outData !== null;
      }
    }
    if (wr_en && !full) queue.push(t + 1);
  }

  const transferred = samples.filter((s) => s.xfer);
  const first = transferred.length ? transferred[0].t : null;
  const last = transferred.length ? transferred[transferred.length - 1].t : null;
  const bubbles =
    first === null || last === null
      ? 0
      : samples.filter((s) => s.t > first && s.t < last && !s.xfer).length;

  return { samples, stats: { first, last, transfers: transferred.length, bubbles } };
};

/* ------------------------------------------------------------------ */
/* Depth sizing                                                        */
/* ------------------------------------------------------------------ */

export type DepthInput = { burst: number; readRate: number; reaction: number };

export type DepthSample = { cycle: number; occupancy: number; write: boolean; read: boolean };

export type DepthAnalysis = {
  peak: number;
  required: number;
  formula: number;
  gap: number;
  period: number;
  samples: DepthSample[];
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const analyzeDepth = (input: DepthInput): DepthAnalysis => {
  const burst = Math.max(1, Math.round(input.burst));
  const r = clamp(input.readRate, 0.05, 1);
  const reaction = Math.max(0, Math.round(input.reaction));
  // keep the average producer rate at or below the consumer rate
  const gap = r >= 1 ? 0 : Math.max(0, Math.ceil(burst / r) - burst);
  const period = burst + gap;
  const bursts = 5;
  const total = period * bursts + burst + 8;
  let occupancy = 0;
  let credit = 0;
  let peak = 0;
  const samples: DepthSample[] = [];

  for (let cycle = 0; cycle < total; cycle += 1) {
    const write = cycle % period < burst;
    if (write) occupancy += 1;

    let read = false;
    if (occupancy > 0) {
      credit = Math.min(1, credit + r);
      if (credit >= 1) {
        occupancy -= 1;
        credit -= 1;
        read = true;
      }
    } else {
      credit = 0;
    }

    peak = Math.max(peak, occupancy);
    samples.push({ cycle, occupancy, write, read });
  }

  return {
    peak,
    required: peak + reaction,
    formula: Math.max(1, Math.ceil(burst * (1 - r))) + reaction,
    gap,
    period,
    samples
  };
};

export type BoundedDepth = { samples: DepthSample[]; dropped: number };

/** Same workload through a FIFO of the given depth; writes that find it full are lost. */
export const simulateBoundedDepth = (input: DepthInput, depth: number): BoundedDepth => {
  const burst = Math.max(1, Math.round(input.burst));
  const r = clamp(input.readRate, 0.05, 1);
  const gap = r >= 1 ? 0 : Math.max(0, Math.ceil(burst / r) - burst);
  const period = burst + gap;
  const bursts = 5;
  const total = period * bursts + burst + 8;
  const cap = Math.max(1, Math.round(depth));
  let occupancy = 0;
  let credit = 0;
  let dropped = 0;
  const samples: DepthSample[] = [];

  for (let cycle = 0; cycle < total; cycle += 1) {
    const write = cycle % period < burst;
    let accepted = false;
    if (write) {
      if (occupancy < cap) {
        occupancy += 1;
        accepted = true;
      } else {
        dropped += 1;
      }
    }

    let read = false;
    if (occupancy > 0) {
      credit = Math.min(1, credit + r);
      if (credit >= 1) {
        occupancy -= 1;
        credit -= 1;
        read = true;
      }
    } else {
      credit = 0;
    }

    samples.push({ cycle, occupancy, write: accepted, read });
  }

  return { samples, dropped };
};

/** A worked example used in the prose: 16-word burst, half-rate consumer, 2-cycle reaction. */
export const depthExample = analyzeDepth({ burst: 16, readRate: 0.5, reaction: 2 });
