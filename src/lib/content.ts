export type ChapterStatus = 'ready' | 'planned';

export type Chapter = {
  n: number;
  slug: string;
  title: string;
  en: string;
  shortEn: string;
  pages: string;
  status: ChapterStatus;
  blurb: string;
  blurbEn: string;
  part: string;
};

export type PartId = 'ground' | 'consistency' | 'coherence' | 'beyond';

export const PARTS: { id: PartId; label: string; en: string }[] = [
  { id: 'ground', label: '概念地基', en: 'Foundations' },
  { id: 'consistency', label: '连贯性', en: 'Consistency' },
  { id: 'coherence', label: '缓存一致性', en: 'Coherence' },
  { id: 'beyond', label: '扩展', en: 'Beyond CPUs' }
];

export const CHAPTERS: Chapter[] = [
  {
    n: 1,
    slug: 'ch1',
    title: '引言：两个正交的问题',
    shortEn: 'Introduction',
    en: 'Introduction to Consistency and Coherence',
    pages: '1–8',
    status: 'ready',
    part: 'ground',
    blurb: '把“共享内存是否正确”拆成两个互不重叠的问题：跨核的可见顺序（consistency），与单地址的副本一致（coherence）。',
    blurbEn: 'Two orthogonal questions: the order cores observe across addresses (consistency), and whether one address behaves like a single copy (coherence).',
  },
  {
    n: 2,
    slug: 'ch2',
    title: '缓存一致性基础',
    shortEn: 'Coherence Basics',
    en: 'Coherence Basics',
    pages: '9–16',
    status: 'ready',
    part: 'ground',
    blurb: '为什么会出现副本不一致，以及与 consistency 无关的两个不变量：单写多读与数据值。',
    blurbEn: 'Why cached copies diverge, and the two invariants that define coherence independently of consistency: single-writer/multiple-reader and data value.',
  },
  {
    n: 3,
    slug: 'ch3',
    title: '顺序连贯性',
    shortEn: 'Sequential Consistency',
    en: 'Sequential Consistency',
    pages: '17–36',
    status: 'ready',
    part: 'consistency',
    blurb: '所有操作存在一个全序，且每核保持程序顺序。亲自排一次交错，看 (0,0) 为什么排不出来。',
    blurbEn: 'One total order over all operations, with each core in program order. Weave an execution yourself and see why (0,0) cannot appear.',
  },
  {
    n: 4,
    slug: 'ch4',
    title: 'TSO 与 x86 内存模型',
    shortEn: 'Total Store Order',
    en: 'Total Store Order',
    pages: '39–52',
    status: 'ready',
    part: 'consistency',
    blurb: '每核一个 FIFO store buffer，让 store 对后续 load 可见、对其他核延迟可见。',
    blurbEn: 'A FIFO store buffer per core: stores are visible to later loads on the same core but delayed for everyone else.',
  },
  {
    n: 5,
    slug: 'ch5',
    title: 'Relaxed 内存模型',
    shortEn: 'Relaxed Consistency',
    en: 'Relaxed Memory Consistency',
    pages: '55–88',
    status: 'ready',
    part: 'consistency',
    blurb: '四条边全部松开，再用 FENCE 把需要的顺序钉回去：XC、SC for DRF、release consistency 与 Power。',
    blurbEn: 'All four edges relaxed, then nailed back down with fences: XC, SC for DRF, release consistency, and Power.',
  },
  {
    n: 6,
    slug: 'ch6',
    title: '缓存一致性协议框架',
    shortEn: 'Coherence Protocols',
    en: 'Coherence Protocols',
    pages: '91–105',
    status: 'ready',
    part: 'coherence',
    blurb: '控制器状态机、表格化规格、状态与事务：后面两种协议共用的一套语言。',
    blurbEn: 'Controller state machines, tabular specifications, states and transactions: the shared language the next two protocols are written in.',
  },
  {
    n: 7,
    slug: 'ch7',
    title: '监听协议',
    shortEn: 'Snooping Protocols',
    en: 'Snooping Coherence Protocols',
    pages: '107–148',
    status: 'ready',
    part: 'coherence',
    blurb: '从 MSI 一路加到 MESI/MOSI，用一条总线让所有缓存都听见请求。',
    blurbEn: 'From MSI to MESI/MOSI, with a bus that lets every cache hear every request.',
  },
  {
    n: 8,
    slug: 'ch8',
    title: '目录协议',
    shortEn: 'Directory Protocols',
    en: 'Directory Coherence Protocols',
    pages: '151–189',
    status: 'ready',
    part: 'coherence',
    blurb: '用 sharer 位图替代广播，顺带解决死锁、目录编码与可扩展性。',
    blurbEn: 'Replace broadcast with sharer bitmaps, and deal with deadlock, directory encoding, and scalability.',
  },
  {
    n: 9,
    slug: 'ch9',
    title: '缓存一致性进阶',
    shortEn: 'Advanced Coherence',
    en: 'Advanced Topics in Coherence',
    pages: '191–207',
    status: 'ready',
    part: 'coherence',
    blurb: 'I-cache、TLB、虚拟缓存、DMA、多级 cache 的 coherence，以及死锁/活锁/饥饿。',
    blurbEn: 'I-cache, TLB, virtually indexed caches, DMA, multi-level coherence, plus deadlock, livelock, and starvation.',
  },
  {
    n: 10,
    slug: 'ch10',
    title: '异构系统',
    shortEn: 'Heterogeneous Systems',
    en: 'Consistency and Coherence for Heterogeneous Systems',
    pages: '211–247',
    status: 'ready',
    part: 'beyond',
    blurb: 'GPU 的 temporal coherence 与 release-consistency-directed coherence，scope 成为一等概念。',
    blurbEn: 'GPU temporal coherence and release-consistency-directed coherence, where scope becomes a first-class concept.',
  },
  {
    n: 11,
    slug: 'ch11',
    title: '规格与验证',
    shortEn: 'Specifying & Validating',
    en: 'Specifying and Validating Memory Consistency Models and Cache Coherence',
    pages: '251–267',
    status: 'ready',
    part: 'beyond',
    blurb: 'operational 与 axiomatic 两种规格、litmus 测试、执行空间探索与形式化验证。',
    blurbEn: 'Operational and axiomatic specifications, litmus tests, execution-space exploration, and formal validation.',
  }
];

export const chapterBySlug = (slug: string) => CHAPTERS.find((c) => c.slug === slug) ?? null;

export const chapterByN = (n: number) => CHAPTERS.find((c) => c.n === n) ?? null;
