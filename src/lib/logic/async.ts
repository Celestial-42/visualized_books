/**
 * Asynchronous FIFO engine.
 *
 * Two independent clocks, one dual-clock memory, and pointer values that
 * must survive a clock-domain crossing. Everything the chapter claims is
 * computed here: Gray transitions, per-bit skew at a capture edge, and the
 * conservative full/empty flags of the dual-clock simulation.
 */

/* ------------------------------------------------------------------ */
/* Gray code                                                           */
/* ------------------------------------------------------------------ */

export const binToGray = (value: number) => value ^ (value >>> 1);

export const grayToBin = (gray: number) => {
  let bin = 0;
  for (let g = gray; g > 0; g >>>= 1) bin ^= g;
  return bin;
};

export const bitsOf = (value: number, width: number) =>
  Array.from({ length: width }, (_, i) => (value >>> i) & 1);

export const fromBits = (bits: number[]) => bits.reduce((value, bit, i) => value | (bit << i), 0);

export const binary = (value: number, width: number) => value.toString(2).padStart(width, '0');

/** How many bits differ between two values. */
export const bitChanges = (a: number, b: number) => {
  let x = a ^ b;
  let count = 0;
  while (x) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
};

/** Count of bit changes along a Gray sequence. Always one for adjacent values. */
export const graySequence = (width: number) => {
  const size = 1 << width;
  return Array.from({ length: size }, (_, value) => {
    const gray = binToGray(value);
    const prev = value === 0 ? null : binToGray(value - 1);
    return {
      value,
      binary: binary(value, width),
      gray,
      grayBits: binary(gray, width),
      changes: prev === null ? 0 : bitChanges(binToGray(value), prev)
    };
  });
};

/* ------------------------------------------------------------------ */
/* Per-bit skew and a capture edge                                     */
/* ------------------------------------------------------------------ */

export type Encoding = 'gray' | 'binary';
export type CaptureState = 'before' | 'during' | 'after';

export type LaneCapture = {
  encoding: Encoding;
  oldValue: number;
  newValue: number;
  oldCode: number;
  newCode: number;
  oldBits: number[];
  newBits: number[];
  changing: number[];
  capturedBits: number[];
  capturedCode: number;
  decoded: number;
  legal: boolean;
  metaBits: number[];
  state: CaptureState;
  minDelay: number;
  maxDelay: number;
};

export type SkewInput = {
  width: number;
  oldValue: number;
  newValue: number;
  delays: number[];
  phase: number;
  aperture?: number;
};

const captureEncoding = (
  encoding: Encoding,
  { width, oldValue, newValue, delays, phase, aperture = 0.012 }: SkewInput
): LaneCapture => {
  const oldCode = encoding === 'gray' ? binToGray(oldValue) : oldValue;
  const newCode = encoding === 'gray' ? binToGray(newValue) : newValue;
  const oldBits = bitsOf(oldCode, width);
  const newBits = bitsOf(newCode, width);
  const changing = oldBits
    .map((bit, i) => (bit === newBits[i] ? -1 : i))
    .filter((i) => i >= 0);
  const capturedBits = oldBits.map((bit, i) => (phase >= delays[i] ? newBits[i] : bit));
  const capturedCode = fromBits(capturedBits);
  const decoded = encoding === 'gray' ? grayToBin(capturedCode) : capturedCode;
  const legal = decoded === oldValue || decoded === newValue;
  const metaBits = changing.filter((i) => Math.abs(phase - delays[i]) <= aperture);
  const minDelay = changing.length ? Math.min(...changing.map((i) => delays[i])) : 0;
  const maxDelay = changing.length ? Math.max(...changing.map((i) => delays[i])) : 0;
  const state: CaptureState = phase < minDelay ? 'before' : phase >= maxDelay ? 'after' : 'during';

  return {
    encoding,
    oldValue,
    newValue,
    oldCode,
    newCode,
    oldBits,
    newBits,
    changing,
    capturedBits,
    capturedCode,
    decoded,
    legal,
    metaBits,
    state,
    minDelay,
    maxDelay
  };
};

export const captureLane = (encoding: Encoding, input: SkewInput) => captureEncoding(encoding, input);

export type SweepPoint = { phase: number; gray: LaneCapture; binary: LaneCapture };

export type SweepSummary = {
  grayIllegal: number;
  binaryIllegal: number;
  grayValues: number[];
  binaryValues: number[];
  total: number;
};

export const defaultDelays = (spread = 1) => {
  const pattern = [0.04, 0.12, 0.26, 0.2];
  return pattern.map((d) => 0.03 + d * spread);
};

export const sweepCapture = (
  width: number,
  oldValue: number,
  newValue: number,
  delays: number[],
  aperture = 0.012,
  steps = 101
): SweepPoint[] =>
  Array.from({ length: steps }, (_, i) => {
    const phase = i / (steps - 1);
    const input = { width, oldValue, newValue, delays, phase, aperture };
    return {
      phase,
      gray: captureEncoding('gray', input),
      binary: captureEncoding('binary', input)
    };
  });

export const summarizeSweep = (points: SweepPoint[]): SweepSummary => {
  const grayIllegal = points.filter((p) => !p.gray.legal).length;
  const binaryIllegal = points.filter((p) => !p.binary.legal).length;
  const grayValues = [...new Set(points.map((p) => p.gray.decoded))].sort((a, b) => a - b);
  const binaryValues = [...new Set(points.map((p) => p.binary.decoded))].sort((a, b) => a - b);
  return { grayIllegal, binaryIllegal, grayValues, binaryValues, total: points.length };
};

/* ------------------------------------------------------------------ */
/* Dual-clock FIFO                                                     */
/* ------------------------------------------------------------------ */

export type AsyncMode = 'write-fast' | 'read-fast' | 'equal';

export const ASYNC_PERIODS: Record<AsyncMode, { write: number; read: number; zh: string; en: string }> = {
  'write-fast': { write: 2, read: 3, zh: '写快：wclk 2 / rclk 3', en: 'write fast: wclk 2 / rclk 3' },
  'read-fast': { write: 3, read: 2, zh: '读快：wclk 3 / rclk 2', en: 'read fast: wclk 3 / rclk 2' },
  equal: { write: 2, read: 2, zh: '同速：2 / 2', en: 'same rate: 2 / 2' }
};

export type AsyncSample = {
  t: number;
  wclk: boolean;
  rclk: boolean;
  wr_en: boolean;
  rd_en: boolean;
  full: boolean;
  empty: boolean;
  wbin: number;
  rbin: number;
  wgray: number;
  rgray: number;
  wq1r: number;
  wq2r: number;
  rq1w: number;
  rq2w: number;
  wgraySync: number;
  rgraySync: number;
  count: number;
  wrote: boolean;
  read: boolean;
  wdata: number | null;
  rdata: number | null;
  conservativeFull: boolean;
  conservativeEmpty: boolean;
};

export type AsyncResult = {
  samples: AsyncSample[];
  writes: number;
  reads: number;
  rejectedWrites: number;
  rejectedReads: number;
  maxCount: number;
  conservativeFull: number;
  conservativeEmpty: number;
};

export type AsyncOptions = {
  depth?: number;
  width?: number;
  ticks?: number;
  writeEnable?: boolean;
  readEnable?: boolean;
};

export const simulateAsyncFifo = (
  writePeriod: number,
  readPeriod: number,
  options: AsyncOptions = {}
): AsyncResult => {
  const depth = options.depth ?? 8;
  const width = options.width ?? Math.ceil(Math.log2(depth)) + 1;
  const modulus = depth * 2;
  const ticks = options.ticks ?? 24;
  const writeEnable = options.writeEnable !== false;
  const readEnable = options.readEnable !== false;

  let wbin = 0;
  let rbin = 0;
  let wgray = 0;
  let rgray = 0;
  let wq1r = 0;
  let wq2r = 0;
  let rq1w = 0;
  let rq2w = 0;
  let data = 1;
  const mem: (number | null)[] = Array.from({ length: depth }, () => null);
  const samples: AsyncSample[] = [];

  let writes = 0;
  let reads = 0;
  let rejectedWrites = 0;
  let rejectedReads = 0;
  let maxCount = 0;
  let conservativeFull = 0;
  let conservativeEmpty = 0;

  for (let t = 0; t < ticks; t += 1) {
    const wclk = t % writePeriod === 0;
    const rclk = t % readPeriod === 0;
    const wr_en = writeEnable && wclk;
    const rd_en = readEnable && rclk;

    const count = (wbin - rbin + modulus) % modulus;
    const rbinSync = grayToBin(wq2r);
    const wbinSync = grayToBin(rq2w);
    const full = wbin === (rbinSync + depth) % modulus;
    const empty = rbin === wbinSync;
    const wrote = wr_en && !full;
    const read = rd_en && !empty;
    const consFull = full && count < depth;
    const consEmpty = empty && count > 0;

    const wgrayOld = wgray;
    const rgrayOld = rgray;

    samples.push({
      t,
      wclk,
      rclk,
      wr_en,
      rd_en,
      full,
      empty,
      wbin,
      rbin,
      wgray,
      rgray,
      wq1r,
      wq2r,
      rq1w,
      rq2w,
      wgraySync: rq2w,
      rgraySync: wq2r,
      count,
      wrote,
      read,
      wdata: null,
      rdata: null,
      conservativeFull: consFull,
      conservativeEmpty: consEmpty
    });

    if (wrote) {
      mem[wbin % depth] = data;
      samples[samples.length - 1].wdata = data;
      data += 1;
      wbin = (wbin + 1) % modulus;
      wgray = binToGray(wbin);
      writes += 1;
    } else if (wr_en) {
      rejectedWrites += 1;
    }

    if (read) {
      const value = mem[rbin % depth];
      samples[samples.length - 1].rdata = value;
      rbin = (rbin + 1) % modulus;
      rgray = binToGray(rbin);
      reads += 1;
    } else if (rd_en) {
      rejectedReads += 1;
    }

    // two-flop synchronisers: capture the old source value at this edge
    if (wclk) {
      wq2r = wq1r;
      wq1r = rgrayOld;
    }
    if (rclk) {
      rq2w = rq1w;
      rq1w = wgrayOld;
    }

    maxCount = Math.max(maxCount, count);
    conservativeFull += consFull ? 1 : 0;
    conservativeEmpty += consEmpty ? 1 : 0;
  }

  return {
    samples,
    writes,
    reads,
    rejectedWrites,
    rejectedReads,
    maxCount,
    conservativeFull,
    conservativeEmpty
  };
};

/** A worked example used in the chapter prose: write faster than read. */
export const asyncExample = simulateAsyncFifo(2, 3);
