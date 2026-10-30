<script lang="ts">
  import { lang, t } from '../../lib/lang.svelte';

  export type RingChannel = { from: number; to: number; used: number; capacity: number };

  let {
    channels,
    dateline = null,
    deadlocked = false,
    height = 250
  }: {
    channels: RingChannel[];
    dateline?: number | null;
    deadlocked?: boolean;
    height?: number;
  } = $props();

  // four routers on a square; channels run clockwise, so the ring reads like a loop
  const POS = [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 }
  ];

  const geometry = $derived(
    channels.map((c, i) => {
      const a = POS[c.from % 4];
      const b = POS[c.to % 4];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const pad = 11;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      return {
        ...c,
        index: i,
        x1: a.x + ux * pad,
        y1: a.y + uy * pad,
        x2: b.x - ux * pad,
        y2: b.y - uy * pad,
        mx: (a.x + b.x) / 2 + uy * 6,
        my: (a.y + b.y) / 2 - ux * 6
      };
    })
  );

  const load = (c: RingChannel) => (c.capacity > 0 ? c.used / c.capacity : 0);
</script>

<svg class="ring" viewBox="0 0 100 100" style={`height:${height}px`} role="img" aria-label={t('四路由器环形拓扑', 'Four-router ring topology')}>
  <defs>
    <marker id="ring-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
    </marker>
    <marker id="ring-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--ember)" />
    </marker>
  </defs>

  {#each geometry as c}
    {@const u = load(c)}
    <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} class="base" />
    <line
      x1={c.x1}
      y1={c.y1}
      x2={c.x2}
      y2={c.y2}
      class="load"
      class:hot={u >= 0.999}
      stroke-width={0.8 + u * 3.2}
      opacity={0.25 + u * 0.75}
      marker-end={u > 0.4 ? 'url(#ring-arrow-hot)' : 'url(#ring-arrow)'}
    />
    <text x={c.mx} y={c.my} class="cnt" text-anchor="middle">{c.used}/{c.capacity}</text>
    {#if dateline === c.index}
      <line x1={c.x1 - 2} y1={c.y1 - 3} x2={c.x1 + 2} y2={c.y1 + 3} class="dateline" />
      <text x={c.mx} y={c.my + 6} class="dl" text-anchor="middle">{t('dateline', 'dateline')}</text>
    {/if}
  {/each}

  {#each POS as p, i}
    <g class="router">
      <rect x={p.x - 12} y={p.y - 7} width="24" height="14" rx="3.5" />
      <text x={p.x} y={p.y + 2.6} text-anchor="middle">R{i}</text>
    </g>
  {/each}

  {#if deadlocked}
    <text x="50" y="50" class="stuck" text-anchor="middle">{t('死锁', 'deadlock')}</text>
    <text x="50" y="56" class="stuck-sub" text-anchor="middle">{t('每一级缓冲都满了，谁也动不了', 'every buffer is full and nobody moves')}</text>
  {:else}
    <text x="50" y="50" class="center" text-anchor="middle">{t('顺时针', 'clockwise')}</text>
  {/if}
</svg>

<style>
  .ring {
    display: block;
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
  }

  .base {
    stroke: var(--line);
    stroke-width: 0.8;
  }

  .load {
    stroke: var(--accent);
    stroke-linecap: round;
  }

  .load.hot {
    stroke: var(--ember);
  }

  .cnt {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.6px;
    fill: var(--muted);
  }

  .dateline {
    stroke: var(--ember);
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  .dl {
    font-family: 'Inter', sans-serif;
    font-size: 2.2px;
    fill: var(--ember);
  }

  .router rect {
    fill: var(--card);
    stroke: var(--line);
  }

  .router text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.2px;
    fill: var(--ink-2);
  }

  .center {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 3.2px;
    fill: var(--muted);
    letter-spacing: 0.04em;
  }

  .stuck {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 4px;
    fill: var(--ember);
  }

  .stuck-sub {
    font-family: 'Inter', sans-serif;
    font-size: 2.2px;
    fill: var(--ember);
    opacity: 0.75;
  }
</style>
