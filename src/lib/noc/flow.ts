/**
 * Flow control, two ways:
 *  - closed-form transfer latency for store-and-forward / virtual cut-through / wormhole
 *  - a flit-level ring simulator that really deadlocks, and really recovers
 */

export type FlowMode = 'sf' | 'vct' | 'wh';

/** Cycles from first flit injected to last flit delivered across `hops` links. */
export const transferLatency = (mode: FlowMode, hops: number, flits: number, linkDelay = 1): number => {
  if (hops <= 0) return flits * linkDelay;
  switch (mode) {
    case 'sf':
      // each router waits for the whole packet before forwarding it
      return hops * (flits + linkDelay - 1);
    case 'vct':
    case 'wh':
      // once the head is out, the body pipelines behind it
      return hops * linkDelay + flits - 1;
  }
};

/** Flits a router must hold for one packet. */
export const bufferPerRouter = (mode: FlowMode, flits: number) => (mode === 'wh' ? 1 : flits);

type Flit = { pkt: number; idx: number };
type VC = { buf: Flit[] };
type Channel = { from: number; to: number; vcs: VC[] };

export type RingState = {
  routers: number;
  depth: number;
  packetFlits: number;
  vcs: number;
  mode: 'plain' | 'dateline';
  dateline: number;
  channels: Channel[];
  pending: Map<number, number[]>;
  dest: Map<number, number>;
  src: Map<number, number>;
  done: Set<number>;
  crossed: Set<number>;
  reach: number;
  respawn: boolean;
  nextPkt: number;
  inFlight: number;
  delivered: number;
  ticks: number;
  stuckTicks: number;
};

export type RingOptions = {
  routers?: number;
  depth?: number;
  packetFlits?: number;
  vcs?: number;
  mode?: 'plain' | 'dateline';
  /** hops clockwise each router's packet must travel */
  reach?: number;
  /** keep injecting once a packet retires — traffic that persists, not a one-shot burst */
  respawn?: boolean;
};

export const makeRing = (opts: RingOptions = {}): RingState => {
  const routers = opts.routers ?? 4;
  const depth = opts.depth ?? 2;
  const packetFlits = opts.packetFlits ?? 2;
  const mode = opts.mode ?? 'plain';
  // a dateline needs somewhere to escape to
  const vcs = opts.vcs ?? (mode === 'dateline' ? 2 : 1);
  const reach = opts.reach ?? 3;
  const respawn = opts.respawn ?? true;

  const channels: Channel[] = Array.from({ length: routers }, (_, i) => ({
    from: i,
    to: (i + 1) % routers,
    vcs: Array.from({ length: vcs }, () => ({ buf: [] as Flit[] }))
  }));

  const pending = new Map<number, number[]>();
  const dest = new Map<number, number>();
  const src = new Map<number, number>();
  for (let i = 0; i < routers; i++) {
    pending.set(i, Array.from({ length: packetFlits }, (_, f) => f));
    dest.set(i, (i + reach) % routers);
    src.set(i, i);
  }

  return {
    routers,
    depth,
    packetFlits,
    vcs,
    mode,
    dateline: routers - 1,
    channels,
    pending,
    dest,
    src,
    done: new Set(),
    crossed: new Set(),
    reach,
    respawn,
    nextPkt: routers,
    inFlight: routers * packetFlits,
    delivered: 0,
    ticks: 0,
    stuckTicks: 0
  };
};

const vcFor = (state: RingState, pkt: number) => {
  if (state.mode !== 'dateline' || state.vcs < 2) return 0;
  // once a packet has passed the break it lives on the escape VC, forever
  return state.crossed.has(pkt) ? 1 : 0;
};

/** One cycle: drain, then inject. A flit never advances twice in the same cycle. */
export const tickRing = (state: RingState): number => {
  const bufs = state.channels.map((c) => c.vcs.map((v) => v.buf.slice()));
  let moved = 0;

  for (let step = 0; step < state.routers; step++) {
    const i = (state.routers - 1 - step + state.routers) % state.routers;
    for (let vc = 0; vc < state.vcs; vc++) {
      const buf = bufs[i][vc];
      if (buf.length === 0) continue;
      const head = buf[0];

      if (state.channels[i].to === state.dest.get(head.pkt)) {
        buf.shift();
        state.inFlight--;
        state.delivered++;
        moved++;
        if (head.idx === state.packetFlits - 1) {
          const source = state.src.get(head.pkt) ?? 0;
          state.done.add(head.pkt);
          if (state.respawn) {
            const id = state.nextPkt++;
            state.src.set(id, source);
            state.dest.set(id, (source + state.reach) % state.routers);
            state.pending.set(source, Array.from({ length: state.packetFlits }, (_, f) => f));
            state.inFlight += state.packetFlits;
          }
        }
        continue;
      }

      const next = (i + 1) % state.routers;
      const nvc = vcFor(state, head.pkt);
      if (bufs[next][nvc].length < state.depth) {
        buf.shift();
        bufs[next][nvc].push(head);
        moved++;
        // crossing the break moves the packet onto its escape VC for good
        if (i === state.dateline) state.crossed.add(head.pkt);
      }
    }
  }

  for (let i = 0; i < state.routers; i++) {
    const queue = state.pending.get(i);
    if (!queue || queue.length === 0) continue;
    const vc = vcFor(state, i);
    if (bufs[i][vc].length >= state.depth) continue;
    const idx = queue.shift() as number;
    bufs[i][vc].push({ pkt: i, idx });
    moved++;
    if (idx === 0 && i === 0 && state.mode === 'dateline') state.crossed.add(i);
    if (queue.length === 0) state.pending.delete(i);
  }

  for (let i = 0; i < state.routers; i++) {
    for (let vc = 0; vc < state.vcs; vc++) state.channels[i].vcs[vc].buf = bufs[i][vc];
  }

  state.ticks++;
  state.stuckTicks = moved === 0 && state.inFlight > 0 ? state.stuckTicks + 1 : 0;
  return moved;
};

export type RingRun = { ticks: number; flits: number; packets: number; deadlocked: boolean; stuckAt: number | null };

export const runRing = (state: RingState, maxTicks = 200): RingRun => {
  let stuckAt: number | null = null;
  while (state.ticks < maxTicks) {
    const moved = tickRing(state);
    if (moved === 0) stuckAt = stuckAt ?? state.ticks;
    if (state.stuckTicks >= 6) break;
    if (!state.respawn && state.inFlight === 0) break;
  }
  return {
    ticks: state.ticks,
    flits: state.delivered,
    packets: state.done.size,
    deadlocked: state.stuckTicks >= 6,
    stuckAt
  };
};

export const totalBuffered = (state: RingState) =>
  state.channels.reduce((n, c) => n + c.vcs.reduce((m, v) => m + v.buf.length, 0), 0);

/**
 * Packet-granular ring with virtual cut-through, used for bubble flow control.
 * The book's rule is injection-side only: a packet may enter a buffer only when
 * that buffer can still hold two more, so one packet-sized bubble survives and
 * the cycle of full buffers can never close.
 */
export type PacketRing = {
  routers: number;
  slots: number;
  mode: 'plain' | 'bubble';
  reach: number;
  respawn: boolean;
  channels: { from: number; to: number; buf: number[] }[];
  pending: Map<number, number[]>;
  dest: Map<number, number>;
  src: Map<number, number>;
  nextPkt: number;
  delivered: number;
  ticks: number;
  stuckTicks: number;
  blocked: number;
};

export const makePacketRing = (opts: {
  routers?: number;
  slots?: number;
  mode?: 'plain' | 'bubble';
  reach?: number;
  respawn?: boolean;
  /** packets each source keeps trying to inject — this is what fills the ring */
  backlog?: number;
} = {}): PacketRing => {
  const routers = opts.routers ?? 4;
  const slots = opts.slots ?? 2;
  const mode = opts.mode ?? 'plain';
  const reach = opts.reach ?? 3;
  const respawn = opts.respawn ?? true;
  const backlog = opts.backlog ?? 2;

  const pending = new Map<number, number[]>();
  const dest = new Map<number, number>();
  const src = new Map<number, number>();
  let nextPkt = 0;
  for (let i = 0; i < routers; i++) {
    const ids: number[] = [];
    for (let b = 0; b < backlog; b++) {
      const id = nextPkt++;
      ids.push(id);
      dest.set(id, (i + reach) % routers);
      src.set(id, i);
    }
    pending.set(i, ids);
  }

  return {
    routers,
    slots,
    mode,
    reach,
    respawn,
    channels: Array.from({ length: routers }, (_, i) => ({ from: i, to: (i + 1) % routers, buf: [] })),
    pending,
    dest,
    src,
    nextPkt,
    delivered: 0,
    ticks: 0,
    stuckTicks: 0,
    blocked: 0
  };
};

export const tickPacketRing = (state: PacketRing): number => {
  const bufs = state.channels.map((c) => c.buf.slice());
  let moved = 0;

  for (let step = 0; step < state.routers; step++) {
    const i = (state.routers - 1 - step + state.routers) % state.routers;
    const buf = bufs[i];
    if (buf.length === 0) continue;
    const pkt = buf[0];
    if (state.channels[i].to === state.dest.get(pkt)) {
      buf.shift();
      state.delivered++;
      moved++;
      const from = state.src.get(pkt) ?? 0;
      if (state.respawn) {
        const id = state.nextPkt++;
        state.src.set(id, from);
        state.dest.set(id, (from + state.reach) % state.routers);
        const queue = state.pending.get(from) ?? [];
        queue.push(id);
        state.pending.set(from, queue);
      }
      continue;
    }
    const next = (i + 1) % state.routers;
    if (bufs[next].length < state.slots) {
      buf.shift();
      bufs[next].push(pkt);
      moved++;
    }
  }

  for (let i = 0; i < state.routers; i++) {
    const queue = state.pending.get(i);
    if (!queue || queue.length === 0) continue;
    const next = (i + 1) % state.routers;
    const room = state.slots - bufs[next].length;
    // the book's bubble rule: only inject when two packet slots are still free
    const need = state.mode === 'bubble' ? 2 : 1;
    if (room >= need) {
      bufs[next].push(queue.shift() as number);
      moved++;
    } else {
      state.blocked++;
    }
  }

  for (let i = 0; i < state.routers; i++) state.channels[i].buf = bufs[i];

  state.ticks++;
  state.stuckTicks = moved === 0 ? state.stuckTicks + 1 : 0;
  return moved;
};

export const packetRingOccupancy = (state: PacketRing) =>
  state.channels.reduce((n, c) => n + c.buf.length, 0);

export const runPacketRing = (state: PacketRing, maxTicks = 120) => {
  while (state.ticks < maxTicks && state.stuckTicks < 6) tickPacketRing(state);
  return {
    ticks: state.ticks,
    delivered: state.delivered,
    deadlocked: state.stuckTicks >= 6,
    blocked: state.blocked,
    occupancy: packetRingOccupancy(state),
    capacity: state.routers * state.slots
  };
};

/** Circuit switching: reserve the path hop by hop, stream, then tear down. */
export const circuitCost = (hops: number, flits: number, setupPerHop = 1, teardownPerHop = 1) =>
  hops * setupPerHop + flits + hops * teardownPerHop;

/** Buffers a router needs per input port, in flits, for each scheme. */
export const bufferFootprint = (mode: 'circuit' | 'wh' | 'vct', flits: number, vcs = 1) => {
  if (mode === 'circuit') return 0;
  return (mode === 'vct' ? flits : 1) * vcs;
};
