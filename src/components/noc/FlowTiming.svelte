<script lang="ts">
  import { transferLatency, circuitCost } from '../../lib/noc/flow';
  import { lang, t } from '../../lib/lang.svelte';

  const HOPS = 4;
  const FLITS = 4;
  const X = 8;
  const ROW = 16;

  type Bar = { x: number; w: number; y: number; label: string; tone: 'flit' | 'packet' | 'setup' | 'teardown' };

  const rowY = (hop: number) => 12 + hop * ROW;

  const sfBars: Bar[] = Array.from({ length: HOPS }, (_, h) => ({
    x: h * FLITS * X,
    w: FLITS * X,
    y: rowY(h),
    label: t('整包', 'packet'),
    tone: 'packet'
  }));

  const whBars: Bar[] = Array.from({ length: HOPS }, (_, h) =>
    Array.from({ length: FLITS }, (_, i) => ({
      x: (h + i) * X,
      w: X,
      y: rowY(h),
      label: `f${i}`,
      tone: 'flit' as const
    }))
  ).flat();

  const circuitBars: Bar[] = [
    ...Array.from({ length: HOPS }, (_, h) => ({
      x: h * X,
      w: X,
      y: rowY(h),
      label: t('建路', 'setup'),
      tone: 'setup' as const
    })),
    ...Array.from({ length: HOPS }, (_, h) =>
      Array.from({ length: FLITS }, (_, i) => ({
        x: (HOPS + h + i) * X,
        w: X,
        y: rowY(h),
        label: `f${i}`,
        tone: 'flit' as const
      }))
    ).flat(),
    ...Array.from({ length: HOPS }, (_, h) => ({
      x: (HOPS + FLITS + h) * X,
      w: X,
      y: rowY(h),
      label: t('拆路', 'teardown'),
      tone: 'teardown' as const
    }))
  ];

  const panels = [
    {
      id: 'sf',
      name: 'store-and-forward',
      bars: sfBars,
      total: transferLatency('sf', HOPS, FLITS),
      note: t('每跳收完整包才转发：4 跳 × 4 拍 = 16', 'whole packet per hop: 4 × 4 = 16')
    },
    {
      id: 'wh',
      name: 'wormhole / VCT',
      bars: whBars,
      total: transferLatency('wh', HOPS, FLITS),
      note: t('逐 flit 流水：4 跳 + 4 flit − 1 = 7', 'flit-pipelined: 4 + 4 − 1 = 7')
    },
    {
      id: 'circuit',
      name: 'circuit switching',
      bars: circuitBars,
      total: circuitCost(HOPS, FLITS),
      note: t('建路 4 + 数据 4 + 拆路 4 = 12', 'setup 4 + data 4 + teardown 4 = 12')
    }
  ];
</script>

<div class="timing">
  {#each panels as p}
    <div class="panel">
      <div class="p-head">
        <span class="p-name mono">{p.name}</span>
        <span class="p-total mono">{p.total} {t('拍', 'cycles')}</span>
      </div>
      <svg viewBox="-14 0 146 88" fill="none" aria-hidden="true">
        {#each Array(HOPS) as _, h}
          <text x="-4" y={rowY(h) + 7} class="hop" text-anchor="end">H{h + 1}</text>
          <line x1="0" y1={rowY(h) + 12} x2={132} y2={rowY(h) + 12} class="rail" />
        {/each}
        {#each p.bars as b}
          <rect x={b.x} y={b.y} width={Math.max(b.w - 1, 1)} height="11" rx="1.6" class={`bar ${b.tone}`} />
          {#if b.w > 10}
            <text x={b.x + b.w / 2 - 0.5} y={b.y + 7.6} class="bar-t" text-anchor="middle">{b.label}</text>
          {/if}
        {/each}
        {#each [0, 4, 8, 12, 16] as c}
          <text x={c * X} y="84" class="tick" text-anchor="middle">{c}</text>
        {/each}
      </svg>
      <p class="p-note">{p.note}</p>
    </div>
  {/each}
</div>

<style>
  .timing {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .p-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .p-name {
    font-size: 9.5px;
    color: var(--muted);
  }

  .p-total {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .panel svg {
    width: 100%;
    height: auto;
  }

  .rail {
    stroke: var(--line-2);
    stroke-width: 0.5;
  }

  .hop,
  .tick {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.4px;
    fill: var(--muted);
  }

  .bar.flit {
    fill: var(--accent-soft);
    stroke: #cfded9;
  }

  .bar.packet {
    fill: #eef4f1;
    stroke: #cfded9;
  }

  .bar.setup,
  .bar.teardown {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-dasharray: 2 1.5;
  }

  .bar-t {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.2px;
    fill: var(--accent-deep);
  }

  .p-note {
    font-size: 9.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .timing {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
