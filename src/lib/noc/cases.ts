import { buildTopology, metrics, type TopoKind } from './topology';

/**
 * Chapter 8's cast. Dimensions come from the book; every number shown for a chip
 * is measured on a graph built from those dimensions.
 */
export type CaseStudy = {
  id: string;
  name: string;
  year: number;
  org: string;
  kind: TopoKind | 'other';
  w: number;
  h: number;
  what: string;
  whatEn: string;
  routing: string;
  flow: string;
};

export const CASES: CaseStudy[] = [
  {
    id: 'eyeriss',
    name: 'MIT Eyeriss',
    year: 2016,
    org: 'MIT',
    kind: 'mesh',
    w: 12,
    h: 14,
    what: 'CNN 加速器：168 个 PE 组成 12×14 网格，X 链路送数据、Y 链路送权重，多播按配置 ID 分发。',
    whatEn: 'A CNN accelerator: 168 PEs on a 12×14 grid, X links for data and Y links for weights, with multicast by configured ID.',
    routing: 'XY',
    flow: 'multicast'
  },
  {
    id: 'piton',
    name: 'Princeton Piton',
    year: 2015,
    org: 'Princeton',
    kind: 'mesh',
    w: 6,
    h: 6,
    what: '25 核 tile 化原型，三条独立 mesh（数据、内存、回写），wormhole 且没有 VC。',
    whatEn: 'A 25-core tiled prototype with three separate meshes (data, memory, writeback), wormhole and no VCs.',
    routing: 'dimension order',
    flow: 'wormhole, no VC'
  },
  {
    id: 'knl',
    name: 'Intel Xeon Phi (KNL)',
    year: 2015,
    org: 'Intel',
    kind: 'mesh',
    w: 6,
    h: 6,
    what: '36 个 tile 的 6×6 mesh，四条并行 mesh 分流；没有 VC，靠折叠半环与 rotary 优先级。',
    whatEn: 'Thirty-six tiles on a 6×6 mesh with four parallel meshes; no VCs, using folded half-rings and a rotary priority rule.',
    routing: 'Y then X+ then X-',
    flow: 'wormhole, no VC'
  },
  {
    id: 'anton2',
    name: 'Anton 2',
    year: 2014,
    org: 'D. E. Shaw',
    kind: 'mesh',
    w: 4,
    h: 4,
    what: '4×4 mesh 既是计算互连，也是 3D torus 的交换机；VCT 流控，跨 torus 维度或 dateline 时换 VC。',
    whatEn: 'A 4×4 mesh that is both compute interconnect and torus switch: VCT flow control, switching VC when crossing a torus dimension or the dateline.',
    routing: 'Y-, X+, X-, Y+',
    flow: 'VCT + dateline'
  },
  {
    id: 'broadcast',
    name: 'MIT Broadcast NoC',
    year: 2012,
    org: 'MIT',
    kind: 'mesh',
    w: 4,
    h: 4,
    what: '4×4 mesh，广播沿 XY 树走，单播走最短路径；用广播省掉重复的写分发。',
    whatEn: 'A 4×4 mesh where broadcasts follow XY trees and unicasts follow shortest paths — broadcast replaces repeated write distribution.',
    routing: 'XY tree / XY',
    flow: 'wormhole'
  },
  {
    id: 'maps',
    name: 'Georgia Tech 3D-MAPS',
    year: 2012,
    org: 'Georgia Tech',
    kind: 'mesh',
    w: 8,
    h: 8,
    what: '3D 堆叠：逻辑层上 8×8 mesh，核心之间用显式通信指令而不是 cache 一致性。',
    whatEn: 'A 3-D stack with an 8×8 mesh on the logic tier, using explicit communication instructions instead of coherence.',
    routing: 'XY',
    flow: 'wormhole'
  },
  {
    id: 'scc',
    name: 'Intel Single-chip Cloud',
    year: 2009,
    org: 'Intel',
    kind: 'mesh',
    w: 6,
    h: 4,
    what: '24 个 Atom 核的 6×4 mesh，对剖 256 GB/s，跑消息传递而不是共享内存。',
    whatEn: 'Twenty-four Atom cores on a 6×4 mesh, 256 GB/s of bisection, running message passing rather than shared memory.',
    routing: 'XY',
    flow: 'wormhole'
  },
  {
    id: 'asap',
    name: 'UC Davis AsAP',
    year: 2009,
    org: 'UC Davis',
    kind: 'mesh',
    w: 13,
    h: 13,
    what: '两块 13×13 mesh，电路交换：通信前先建路，路径穿过多少个中间交换节点取决于映射。',
    whatEn: 'Two 13×13 meshes with circuit switching: a path is built before communication, and its length depends on the mapping.',
    routing: 'circuit-switched',
    flow: 'circuit'
  },
  {
    id: 'tilepro',
    name: 'Tilera TILEPro64',
    year: 2008,
    org: 'Tilera',
    kind: 'mesh',
    w: 8,
    h: 8,
    what: '64 核，六条 8×8 iMesh（用户、I/O、内存…）；直行单级流水，转向才多一拍。',
    whatEn: 'Sixty-four cores across six 8×8 iMeshes (user, I/O, memory…): a single-stage pipeline going straight, one more cycle at a turn.',
    routing: 'dimension order',
    flow: 'wormhole'
  },
  {
    id: 'teraflops',
    name: 'Intel TeraFLOPS',
    year: 2007,
    org: 'Intel',
    kind: 'mesh',
    w: 8,
    h: 10,
    what: '80 个 tile 的 8×10 mesh，每条通道是两条 38-bit 单向线；把 80 核塞进一张规则网格的最早公开样机之一。',
    whatEn: 'Eighty tiles on an 8×10 mesh, each channel a pair of 38-bit unidirectional wires — one of the first public 80-core regular grids.',
    routing: 'dimension order',
    flow: 'wormhole'
  },
  {
    id: 'cell',
    name: 'IBM Cell',
    year: 2005,
    org: 'IBM · Sony · Toshiba',
    kind: 'ring',
    w: 12,
    h: 1,
    what: 'EIB 是一条四环（两向数据、两向命令）的 ring，把 PPE 与 8 个 SPE 连起来；ring 上的流量优先于注入流量。',
    whatEn: 'The EIB is a four-ring interconnect (two data, two command) joining the PPE and eight SPEs; traffic already on the ring outranks injected traffic.',
    routing: 'ring',
    flow: 'ring, rotary priority'
  },
  {
    id: 'swizzle',
    name: 'Michigan Swizzle Switch',
    year: 2012,
    org: 'University of Michigan',
    kind: 'crossbar',
    w: 64,
    h: 1,
    what: '64×64 交叉开关，128-bit 链路，约 500 MHz，总吞吐 4.5 Tb/s；用“swizzle”把长线延迟藏进流水。',
    whatEn: 'A 64×64 crossbar with 128-bit links at about 500 MHz for 4.5 Tb/s of throughput, using a swizzle to hide wire delay in the pipeline.',
    routing: 'direct',
    flow: 'circuit-like'
  },
  {
    id: 'kaist',
    name: 'KAIST MC-NoC',
    year: 2010,
    org: 'KAIST',
    kind: 'other',
    w: 0,
    h: 0,
    what: '分层星-环（HS-R）：4 个 SPU 一簇，簇内经 7×7 局域开关，簇间用 ring；总带宽 118.4 GB/s。',
    whatEn: 'A hierarchical star-ring: four SPUs per cluster joined by a 7×7 local switch, clusters joined by a ring, 118.4 GB/s in total.',
    routing: 'hierarchical',
    flow: 'wormhole'
  },
  {
    id: 'stnoc',
    name: 'ST STNoC',
    year: 2008,
    org: 'STMicroelectronics',
    kind: 'other',
    w: 0,
    h: 0,
    what: 'Spidergon：伪规则拓扑，所有节点度数相同，综合工具可以在规则布局与带宽需求之间折中。',
    whatEn: 'Spidergon: a pseudo-regular topology with a uniform degree, letting synthesis trade layout regularity against bandwidth.',
    routing: 'across-first',
    flow: 'wormhole'
  }
];

const memo = new Map<string, ReturnType<typeof metrics>>();

export const CASE_ROW = (c: CaseStudy) => {
  const hit = memo.get(c.id);
  if (hit) return hit;
  const m = metrics(buildTopology(c.kind as TopoKind, c.w, c.h));
  memo.set(c.id, m);
  return m;
};

export const caseMetrics = (c: CaseStudy) => (c.kind === 'other' ? null : CASE_ROW(c));

export const computedCases = CASES.filter((c) => c.kind !== 'other');
