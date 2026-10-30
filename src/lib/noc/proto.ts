/**
 * Chapter 2: what a coherence protocol puts on the network.
 * The protocol decides the messages; the network only carries what it is told.
 */

export type Protocol = 'msi' | 'mesi' | 'moesi';
export type Op = 'read' | 'write' | 'upgrade' | 'writeback';

export type MsgKind = 'req' | 'fwd' | 'inv' | 'ack' | 'data';

export type Message = {
  kind: MsgKind;
  from: string;
  to: string;
  flits: number;
};

const HEADER = 1;
const DATA = 4; // 64 B line over a 16 B flit

const data = (from: string, to: string): Message => ({ kind: 'data', from, to, flits: HEADER + DATA });
const header = (kind: MsgKind, from: string, to: string): Message => ({ kind, from, to, flits: HEADER });

/**
 * Messages for one transaction under one protocol, given how many other caches
 * hold the line and whether one of them holds it dirty.
 */
export const transaction = (
  protocol: Protocol,
  op: Op,
  sharers: number,
  dirtyOwner: boolean
): Message[] => {
  const req = header('req', 'L1', 'Home');

  if (op === 'read') {
    if (sharers === 0) return [req, data('Home', 'L1')];
    if (dirtyOwner && protocol === 'moesi') {
      // the owner supplies the line: memory is never touched and nothing is written back
      return [req, header('fwd', 'Home', 'Owner'), data('Owner', 'L1')];
    }
    if (dirtyOwner) {
      // without an Owned state the dirty copy has to go home before anyone else can read it
      return [req, header('fwd', 'Home', 'Owner'), data('Owner', 'Home'), data('Home', 'L1')];
    }
    return [req, data('Home', 'L1')];
  }

  if (op === 'write') {
    const msgs: Message[] = [req];
    for (let i = 0; i < sharers; i++) {
      msgs.push(header('inv', 'Home', `L1-${i}`));
      msgs.push(header('ack', `L1-${i}`, 'Home'));
    }
    msgs.push(data('Home', 'L1'));
    return msgs;
  }

  if (op === 'upgrade') {
    // MESI and MOESI both own the line exclusively already; MSI has to reclaim it
    const msgs: Message[] = [req];
    for (let i = 0; i < sharers; i++) {
      msgs.push(header('inv', 'Home', `L1-${i}`));
      msgs.push(header('ack', `L1-${i}`, 'Home'));
    }
    if (protocol === 'msi') msgs.push(data('Home', 'L1'));
    return msgs;
  }

  // dirty replacement: the line has to go home
  return [data('L1', 'Home')];
};

export type Mix = { read: number; write: number; upgrade: number; writeback: number; sharers: number; dirtyOwner: boolean };

export const DEFAULT_MIX: Mix = { read: 0.6, write: 0.15, upgrade: 0.15, writeback: 0.1, sharers: 2, dirtyOwner: true };

export type Cost = {
  protocol: Protocol;
  messages: number;
  flits: number;
  byKind: Record<MsgKind, number>;
  examples: { op: Op; messages: number; flits: number }[];
};

/** Normalised cost of 1000 transactions of the given mix. */
export const workloadCost = (protocol: Protocol, mix: Mix = DEFAULT_MIX): Cost => {
  const byKind: Record<MsgKind, number> = { req: 0, fwd: 0, inv: 0, ack: 0, data: 0 };
  let messages = 0;
  let flits = 0;

  const ops: { op: Op; weight: number }[] = [
    { op: 'read', weight: mix.read },
    { op: 'write', weight: mix.write },
    { op: 'upgrade', weight: mix.upgrade },
    { op: 'writeback', weight: mix.writeback }
  ];

  const examples = ops.map(({ op }) => {
    const msgs = transaction(protocol, op, mix.sharers, mix.dirtyOwner);
    return { op, messages: msgs.length, flits: msgs.reduce((n, m) => n + m.flits, 0) };
  });

  for (const { op, weight } of ops) {
    const count = Math.round(weight * 1000);
    for (const m of transaction(protocol, op, mix.sharers, mix.dirtyOwner)) {
      byKind[m.kind] += count;
      messages += count;
      flits += count * m.flits;
    }
  }

  return { protocol, messages, flits, byKind, examples };
};

export const PROTOCOLS: { id: Protocol; label: string; labelEn: string }[] = [
  { id: 'msi', label: 'MSI', labelEn: 'MSI' },
  { id: 'mesi', label: 'MESI', labelEn: 'MESI' },
  { id: 'moesi', label: 'MOESI', labelEn: 'MOESI' }
];

/**
 * Protocol-level deadlock: the network's message classes plus the protocol's own
 * wait-for relations. A reply needs a free input buffer; that buffer may be held
 * by a request that is itself waiting for its reply. If the two classes share a
 * virtual network, both directions exist and the protocol closes a cycle.
 */
export type HierarchyConfig = {
  /** L1 misses per 1000 L1 accesses */
  misses: number;
  /** hit rate of the private L2 */
  privateHit: number;
  /** hit rate of the shared L2 (bigger, so higher) */
  sharedHit: number;
};

export type HierarchyRow = {
  id: 'private' | 'shared';
  /** network traversals per 1000 L1 accesses */
  traversals: number;
  /** flits moved by the network per 1000 L1 accesses */
  flits: number;
  /** memory accesses that leave the chip */
  offChip: number;
  /** how many clients share one router injection/ejection port */
  portClients: number;
};

/**
 * Cache hierarchy as a traffic filter. A private L2 absorbs hits locally, so only
 * its own misses enter the network; a shared L2 is bigger (fewer off-chip trips)
 * but every L1 miss has to cross the network to reach its bank.
 */
export const hierarchyCost = (cfg: HierarchyConfig): HierarchyRow[] => {
  const miss = cfg.misses;
  const REQ = 1;
  const DATA = 4;

  const privateTraversals = miss * (1 - cfg.privateHit) * 2; // request out + data back
  const sharedTraversals = miss * 2; // every L1 miss crosses the network

  const perTransaction = REQ + DATA;
  return [
    {
      id: 'private',
      traversals: privateTraversals,
      flits: privateTraversals * perTransaction,
      offChip: miss * (1 - cfg.privateHit),
      portClients: 1
    },
    {
      id: 'shared',
      traversals: sharedTraversals,
      flits: sharedTraversals * perTransaction,
      offChip: miss * (1 - cfg.sharedHit),
      portClients: 2
    }
  ];
};

export type MsgClass = 'req' | 'fwd' | 'inv' | 'ack' | 'data';

export type ClassEdge = {
  from: MsgClass;
  to: MsgClass;
  kind: 'protocol' | 'buffer';
  note: string;
  noteEn: string;
};

export const CLASSES: MsgClass[] = ['req', 'fwd', 'inv', 'ack', 'data'];

const PROTOCOL_EDGES: ClassEdge[] = [
  { from: 'req', to: 'data', kind: 'protocol', note: '读请求要等数据回来', noteEn: 'a read request waits for its data' },
  { from: 'req', to: 'ack', kind: 'protocol', note: '写请求要等失效确认', noteEn: 'a write request waits for acks' },
  { from: 'fwd', to: 'data', kind: 'protocol', note: '转发要等持有者回数据', noteEn: 'a forward waits for the owner’s data' },
  { from: 'inv', to: 'ack', kind: 'protocol', note: '失效要等确认', noteEn: 'an invalidation waits for its ack' }
];

export type ClassGraph = {
  edges: ClassEdge[];
  cycle: MsgClass[] | null;
};

export const classCycle = (vnOf: Record<MsgClass, number>): ClassGraph => {
  const edges: ClassEdge[] = [...PROTOCOL_EDGES];
  const replies: MsgClass[] = ['data', 'ack'];
  const requests: MsgClass[] = ['req', 'fwd', 'inv'];

  for (const reply of replies) {
    for (const request of requests) {
      if (vnOf[reply] !== vnOf[request]) continue;
      edges.push({
        from: reply,
        to: request,
        kind: 'buffer',
        note: `${reply} 和 ${request} 共用 VN${vnOf[reply]}：回复要进缓冲，而缓冲可能被请求占着`,
        noteEn: `${reply} and ${request} share VN${vnOf[reply]}: the reply needs a buffer the request may hold`
      });
    }
  }

  const next = new Map<MsgClass, MsgClass[]>(CLASSES.map((c) => [c, []]));
  for (const e of edges) next.get(e.from)?.push(e.to);

  const state = new Map<MsgClass, number>(CLASSES.map((c) => [c, 0]));
  const stack: MsgClass[] = [];

  const visit = (u: MsgClass): MsgClass[] | null => {
    state.set(u, 1);
    stack.push(u);
    for (const v of next.get(u) ?? []) {
      if (state.get(v) === 1) return stack.slice(stack.indexOf(v));
      if (state.get(v) === 0) {
        const found = visit(v);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(u, 2);
    return null;
  };

  for (const c of CLASSES) {
    if (state.get(c) !== 0) continue;
    const found = visit(c);
    if (found) return { edges, cycle: found };
  }
  return { edges, cycle: null };
};
