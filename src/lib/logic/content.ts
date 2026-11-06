import type { Chapter } from '../content';

export const LOGIC_PARTS = [
  { id: 'queue', label: '队列与时钟', en: 'Queues & Clock' },
  { id: 'control', label: '控制与数据通路', en: 'Control & Datapath' },
  { id: 'store', label: '存储与运算', en: 'Storage & Arithmetic' }
];

export const LOGIC_CHAPTERS: Chapter[] = [
  {
    n: 1,
    slug: 'ch1',
    title: 'FIFO',
    shortEn: 'FIFO',
    en: 'FIFO',
    pages: '—',
    status: 'ready',
    part: 'queue',
    blurb:
      '一块双端口存储、两个指针、三种满空判定：先把同步 FIFO 的每一个边界跑一遍，再跨时钟。',
    blurbEn:
      'One dual-port memory, two pointers, three full/empty schemes: run every boundary of the synchronous FIFO before crossing a clock.'
  },
  {
    n: 2,
    slug: 'ch2',
    title: '异步 FIFO',
    shortEn: 'Asynchronous FIFO',
    en: 'Asynchronous FIFO',
    pages: '—',
    status: 'ready',
    part: 'queue',
    blurb:
      '两个时钟、一条格雷码指针、两级同步器：看多比特偏斜怎样制造非法指针，以及 full 与 empty 为什么只能保守。',
    blurbEn:
      'Two clocks, one Gray pointer and a two-flop synchroniser: watch multi-bit skew create illegal pointers, and why full/empty can only be conservative.'
  },
  {
    n: 3,
    slug: 'ch3',
    title: '跨时钟域',
    shortEn: 'Clock-Domain Crossing',
    en: 'Clock-Domain Crossing',
    pages: '—',
    status: 'planned',
    part: 'queue',
    blurb: '单比特同步、脉冲同步、握手与复位：先分清哪些信号能采样，哪些必须握手。',
    blurbEn:
      'Single-bit synchronisation, pulse transfer, handshakes and reset: which signals may be sampled, and which must be handshaken.'
  },
  {
    n: 4,
    slug: 'ch4',
    title: '握手与反压',
    shortEn: 'Handshake & Backpressure',
    en: 'Handshake & Backpressure',
    pages: '—',
    status: 'planned',
    part: 'control',
    blurb: 'valid/ready 的三种停顿、skid buffer 与 credit：把“能不能收”从一根线变成一套契约。',
    blurbEn:
      'The three stalls of valid/ready, skid buffers and credit: turn “can you take it?” from a wire into a contract.'
  },
  {
    n: 5,
    slug: 'ch5',
    title: '仲裁器',
    shortEn: 'Arbiters',
    en: 'Arbiters',
    pages: '—',
    status: 'planned',
    part: 'control',
    blurb: '固定优先级、轮询与矩阵仲裁：同样的请求，什么样的公平才算公平。',
    blurbEn:
      'Fixed priority, round-robin and matrix arbitration: for the same requests, which kind of fairness counts as fair.'
  },
  {
    n: 6,
    slug: 'ch6',
    title: '流水线',
    shortEn: 'Pipelines',
    en: 'Pipelines',
    pages: '—',
    status: 'planned',
    part: 'control',
    blurb: '把组合逻辑切开，再把停顿、气泡与前递放回去：吞吐与延迟开始分家。',
    blurbEn:
      'Cut the combinational logic, then put stalls, bubbles and forwarding back: throughput and latency start to separate.'
  },
  {
    n: 7,
    slug: 'ch7',
    title: '存储阵列',
    shortEn: 'Memory Arrays',
    en: 'Memory Arrays',
    pages: '—',
    status: 'planned',
    part: 'store',
    blurb: 'SRAM 的读写时序、bank 划分与读写冲突：FIFO 背后那块存储的真实脾气。',
    blurbEn:
      'SRAM read/write timing, banking and read-write conflicts: the temper of the memory behind a FIFO.'
  },
  {
    n: 8,
    slug: 'ch8',
    title: '加法器与乘法器',
    shortEn: 'Adders & Multipliers',
    en: 'Adders and Multipliers',
    pages: '—',
    status: 'planned',
    part: 'store',
    blurb: '进位链、前缀加法、Booth 与流水化：同样一条算术路径，面积与时序怎样换。',
    blurbEn:
      'Carry chains, prefix adders, Booth and pipelining: how area and timing trade along one arithmetic path.'
  }
];
