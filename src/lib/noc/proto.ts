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
