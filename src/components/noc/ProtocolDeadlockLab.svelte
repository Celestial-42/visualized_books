<script lang="ts">
  import { classCycle, type MsgClass } from '../../lib/noc/proto';
  import { lang, t } from '../../lib/lang.svelte';

  const LAYOUTS: { id: string; label: string; labelEn: string; vnOf: Record<MsgClass, number>; note: string; noteEn: string }[] = [
    {
      id: 'shared',
      label: '全部共用一条 VN',
      labelEn: 'All classes on one VN',
      vnOf: { req: 0, fwd: 0, inv: 0, ack: 0, data: 0 },
      note: '请求和回复挤在同一个缓冲：回复进不来，因为缓冲被请求占着，而请求又在等回复。',
      noteEn: 'Requests and replies share one buffer: the reply cannot enter because requests occupy it, and those requests are waiting for the reply.'
    },
    {
      id: 'two',
      label: '请求 / 回复两条 VN',
      labelEn: 'Requests and replies split',
      vnOf: { req: 0, fwd: 0, inv: 0, ack: 1, data: 1 },
      note: '回复有自己的缓冲，不再被请求堵住；但请求之间仍然共用一条 VN（这是常规做法，靠只发指定类型来保序）。',
      noteEn: 'Replies get their own buffers and stop queuing behind requests; requests still share one VN, which is the usual arrangement.'
    },
    {
      id: 'full',
      label: '每类一条 VN',
      labelEn: 'One VN per class',
      vnOf: { req: 0, fwd: 1, inv: 2, ack: 3, data: 4 },
      note: '最保守：完全隔离，面积最大，也最不容易踩到协议级死锁。',
      noteEn: 'The conservative choice: full isolation, the most buffers, and the least chance of a protocol-level cycle.'
    }
  ];

  let layoutId = $state('shared');
  const layout = $derived(LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0]);
  const graph = $derived(classCycle(layout.vnOf));
  const inCycle = $derived(new Set(graph.cycle ?? []));

  const POS: Record<MsgClass, { x: number; y: number }> = {
    req: { x: 18, y: 20 },
    fwd: { x: 82, y: 20 },
    inv: { x: 50, y: 8 },
    data: { x: 30, y: 72 },
    ack: { x: 72, y: 72 }
  };

  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const pad = 10;
    return {
      x1: a.x + (dx / len) * pad,
      y1: a.y + (dy / len) * pad,
      x2: b.x - (dx / len) * pad,
      y2: b.y - (dy / len) * pad
    };
  };
</script>

<div class="lab">
  <div class="seg">
    {#each LAYOUTS as l}
      <button class:active={layoutId === l.id} onclick={() => (layoutId = l.id)}>
        {lang.value === 'en' ? l.labelEn : l.label}
      </button>
    {/each}
  </div>

  <p class="note-line">{lang.value === 'en' ? layout.noteEn : layout.note}</p>

  <svg class="graph" viewBox="0 0 100 86" fill="none" aria-hidden="true">
    <defs>
      <marker id="pd-proto" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#2f5d62" />
      </marker>
      <marker id="pd-buf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#b4543a" />
      </marker>
    </defs>

    {#each graph.edges as e}
      {@const p = edgePath(POS[e.from], POS[e.to])}
      <line
        x1={p.x1}
        y1={p.y1}
        x2={p.x2}
        y2={p.y2}
        class={`edge ${e.kind}`}
        class:hot={inCycle.has(e.from) && inCycle.has(e.to)}
        marker-end={e.kind === 'protocol' ? 'url(#pd-proto)' : 'url(#pd-buf)'}
      />
    {/each}

    {#each Object.entries(POS) as [id, p]}
      <g class="node" class:hot={inCycle.has(id as MsgClass)}>
        <rect x={p.x - 10} y={p.y - 5.5} width="20" height="11" rx="3" />
        <text x={p.x} y={p.y + 2.2} text-anchor="middle">{id}</text>
        <text x={p.x} y={p.y + 9.5} class="vn" text-anchor="middle">VN{layout.vnOf[id as MsgClass]}</text>
      </g>
    {/each}
  </svg>

  <p class="legend">
    <span class="sw proto"></span>{t('协议依赖（请求等回复）', 'protocol dependency (request waits for reply)')}
    <span class="sw buf"></span>{t('缓冲依赖（回复等缓冲空位）', 'buffer dependency (reply waits for space)')}
  </p>

  <div class="verdict">
    <span class="badge" class:ok={!graph.cycle} class:bad={!!graph.cycle}>
      {graph.cycle ? t('成环 · 协议级死锁', 'cycle · protocol-level deadlock') : t('无环', 'acyclic')}
    </span>
    {#if graph.cycle}
      <span class="chain mono">{graph.cycle.join(' → ')} → {graph.cycle[0]}</span>
    {:else}
      <span class="chain-none">
        {t('回复类与请求类不在同一条 VN 上，回复→请求的边消失，环闭不上。', 'Replies and requests are on different VNs, the reply-to-request edges disappear, and no cycle closes.')}
      </span>
    {/if}
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .note-line {
    font-size: 11.5px;
    line-height: 1.65;
    color: var(--ink-3);
  }

  .graph {
    display: block;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .edge {
    stroke-width: 0.7;
    opacity: 0.75;
  }

  .edge.protocol {
    stroke: var(--accent);
  }

  .edge.buffer {
    stroke: var(--ember);
    stroke-dasharray: 2.4 1.8;
  }

  .edge.hot {
    stroke-width: 1.4;
    opacity: 1;
  }

  .node rect {
    fill: var(--card);
    stroke: var(--line);
  }

  .node.hot rect {
    fill: var(--ember-soft);
    stroke: var(--ember);
  }

  .node text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.6px;
    fill: var(--ink-2);
  }

  .node .vn {
    font-size: 2.3px;
    fill: var(--muted);
  }

  .node.hot text {
    fill: var(--ember);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    font-size: 10px;
    color: var(--muted);
  }

  .sw {
    display: inline-block;
    width: 14px;
    height: 2px;
    border-radius: 1px;
  }

  .sw.proto {
    background: var(--accent);
  }

  .sw.buf {
    background: var(--ember);
  }

  .verdict {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .chain {
    font-size: 11px;
    color: var(--ember);
  }

  .chain-none {
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }
</style>
