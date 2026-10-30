import type { Chapter } from '../content';

export const ICN_PARTS = [
  { id: 'found', label: '背景与交换', en: 'Background' },
  { id: 'deadlock', label: '死锁与路由', en: 'Deadlock & Routing' },
  { id: 'net', label: '网络与工程', en: 'Networks & Practice' }
];

export const ICN_CHAPTERS: Chapter[] = [
  {
    n: 1,
    slug: 'ch1',
    title: '引言',
    shortEn: 'Introduction',
    en: 'Introduction',
    pages: '1–29',
    status: 'planned',
    part: 'found',
    blurb: '并行计算机为什么会撞上互连这堵墙，以及这本书用的那套共同语言。',
    blurbEn: 'Why parallel machines hit the interconnect wall, and the shared vocabulary the book uses.'
  },
  {
    n: 2,
    slug: 'ch2',
    title: '消息交换',
    shortEn: 'Message Switching',
    en: 'Message Switching',
    pages: '30–86',
    status: 'planned',
    part: 'found',
    blurb: '线路交换、存储转发、虫孔、流水电路交换：把消息拆开的方式决定延迟与缓冲。',
    blurbEn: 'Circuit, store-and-forward, wormhole and pipelined circuit switching: how you cut a message decides latency and buffers.'
  },
  {
    n: 3,
    slug: 'ch3',
    title: '死锁、活锁及饿死',
    shortEn: 'Deadlock & Livelock',
    en: 'Deadlock, Livelock, and Starvation',
    pages: '87–102',
    status: 'ready',
    part: 'deadlock',
    blurb: '从通道相关图到定理 3.1：把“会不会卡死”变成一张图上有没有环；再把恢复、活锁与饥饿分清楚。',
    blurbEn: 'From the channel dependency graph to Theorem 3.1: turn “will it jam?” into “is there a cycle?”, then separate recovery, livelock and starvation.'
  },
  {
    n: 4,
    slug: 'ch4',
    title: '路由算法',
    shortEn: 'Routing Algorithms',
    en: 'Routing Algorithms',
    pages: '103–144',
    status: 'ready',
    part: 'deadlock',
    blurb: '确定性、无意识、部分/完全/最大自适应、非最小与回溯：六档自由度，每一档都由死锁条件买账，最后由资源分配与选择函数落地。',
    blurbEn: 'Deterministic, oblivious, partially/fully/maximally adaptive, non-minimal and backtracking: six levels of freedom, each paid for with a deadlock condition, then landed by resource allocation and the selection function.'
  },
  {
    n: 5,
    slug: 'ch5',
    title: '聚合通信支持',
    shortEn: 'Collective Communication',
    en: 'Collective Communication Support',
    pages: '149–199',
    status: 'planned',
    part: 'net',
    blurb: '多播、屏障与归约在网络上怎么实现，以及硬件能替软件省下多少。',
    blurbEn: 'Multicast, barriers and reductions on the network, and how much hardware can save software.'
  },
  {
    n: 6,
    slug: 'ch6',
    title: '容错路由',
    shortEn: 'Fault-Tolerant Routing',
    en: 'Fault-Tolerant Routing',
    pages: '207–248',
    status: 'planned',
    part: 'net',
    blurb: '节点或链路坏掉之后，路由怎样绕开故障，同时不引入新的死锁与活锁。',
    blurbEn: 'How routing detours around failed nodes and links without introducing new deadlock or livelock.'
  },
  {
    n: 7,
    slug: 'ch7',
    title: '路由器结构',
    shortEn: 'Router Architecture',
    en: 'Router Architecture',
    pages: '249–300',
    status: 'planned',
    part: 'net',
    blurb: '从缓冲、仲裁到流水线：把一个路由器拆成每拍能看懂的几个动作。',
    blurbEn: 'Buffers, arbitration and pipelines: one router, broken into per-cycle actions.'
  },
  {
    n: 8,
    slug: 'ch8',
    title: '消息层软件',
    shortEn: 'Messaging Software',
    en: 'Messaging Software',
    pages: '301–340',
    status: 'planned',
    part: 'net',
    blurb: '网络之上的那层软件：收发、匹配、以及它怎样反过来约束网络。',
    blurbEn: 'The software layer above the network: send/recv matching, and how it constrains the hardware.'
  },
  {
    n: 9,
    slug: 'ch9',
    title: '性能评价',
    shortEn: 'Performance Evaluation',
    en: 'Performance Evaluation',
    pages: '341–400',
    status: 'planned',
    part: 'net',
    blurb: '指标、标准化与比较：怎样让两个网络设计的结果可以被放在同一张图上。',
    blurbEn: 'Metrics, normalisation and comparison: how two network designs can share one plot.'
  }
];
