<script lang="ts">
  import { t } from '../lib/lang.svelte';

  const SIZES = [8, 16, 32, 64];
  const BYTES = 64;
  const A_OFF = 0;
  const B_OFF = 16;
  const CELL = 8.4;
  const X0 = 96;

  let line = $state(32);

  const lines = $derived(BYTES / line);
  const sameLine = $derived(Math.floor(A_OFF / line) === Math.floor(B_OFF / line));
  const aLine = $derived(Math.floor(A_OFF / line));
  const bLine = $derived(Math.floor(B_OFF / line));
  const transfers = $derived(sameLine ? 2 : 0);

  const cells = Array.from({ length: BYTES }, (_, i) => i);
  const lineOf = (i: number) => Math.floor(i / line);
</script>

<div class="gran">
  <div class="gran-top">
    <span class="ctrl-label">cache line</span>
    <div class="seg">
      {#each SIZES as s}
        <button class:active={line === s} onclick={() => (line = s)}>{s} B</button>
      {/each}
    </div>
    <span class="gran-hint">{t(
      '地址 A 在偏移 0，地址 B 在偏移 16；coherence 只认整条 line。',
      'Address A sits at offset 0, B at offset 16; coherence only knows whole lines.'
    )}</span>
  </div>

  <svg viewBox="0 0 660 146" class="line-art" role="img" aria-label={t(`cache line 划分：每行 ${line} 字节`, `cache line layout: ${line} bytes per line`)}>
    <text x="0" y="22" class="lbl">{t('字节偏移', 'byte offset')}</text>
    <text x="0" y="60" class="lbl">line</text>

    {#each Array.from({ length: lines }, (_, i) => i) as li}
      <g class="line-grp" class:hot-a={li === aLine} class:hot-b={li === bLine && !sameLine} class:hot-same={li === aLine && sameLine}>
        <rect
          x={X0 + li * line * CELL}
          y="34"
          width={line * CELL - 2}
          height="34"
          rx="4"
        />
        <text x={X0 + li * line * CELL + 4} y="56" class="line-no">L{li}</text>
      </g>
    {/each}

    {#each cells as b}
      <rect
        x={X0 + b * CELL}
        y="76"
        width={CELL - 0.7}
        height="14"
        class="byte"
        class:boundary={(b + 1) % line === 0}
      />
    {/each}

    <g transform={`translate(${X0 + A_OFF * CELL + 2}, 0)`}>
      <path d="M0 72V64" class="tick" />
      <text x="0" y="120" class="mark a">A</text>
    </g>
    <g transform={`translate(${X0 + B_OFF * CELL + 2}, 0)`}>
      <path d="M0 72V64" class="tick" />
      <text x="0" y="120" class="mark b">B</text>
    </g>

    <text x={X0 + 12 * CELL} y="140" class="note">
      {sameLine
        ? t(`A、B 落在同一条 line（L${aLine}）`, `A and B share line L${aLine}`)
        : t(`A 在 L${aLine}，B 在 L${bLine}`, `A is in L${aLine}, B is in L${bLine}`)}
    </text>
  </svg>

  <div class="gran-read">
    <div class="metric">
      <span class="metric-k">{t('A 与 B 的关系', 'Relationship of A and B')}</span>
      <span class="metric-v" class:shared={sameLine}>
        {sameLine ? t('同一条 cache line', 'same cache line') : t('两条独立 cache line', 'two separate cache lines')}
      </span>
    </div>
    <div class="metric">
      <span class="metric-k">{t('C1 写 A、C2 写 B 时，每轮所有权转移', 'Ownership transfers per round when C1 writes A and C2 writes B')}</span>
      <span class="metric-v mono" class:shared={sameLine}>{t(`${transfers} 次`, `${transfers} transfers`)}</span>
    </div>
    <p class="gran-note">
      {#if sameLine}
        {t(
          '两个核在改互不相关的变量，coherence 却把它们当成同一个块：每次写都要把对方的副本收走。这就是 false sharing——正确性没问题，代价来自粒度。',
          'Two cores are updating unrelated variables, but coherence treats them as one block: every write must take the other copy away. This is false sharing — correctness is fine, the cost comes from granularity.'
        )}
      {:else}
        {t(
          '两个变量分属不同的 line，两个核各写各的，coherence 完全不必介入。',
          'The two variables live in different lines, so each core writes on its own and coherence need not get involved at all.'
        )}
      {/if}
    </p>
  </div>
</div>

<style>
  .gran {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .gran-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .ctrl-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .gran-hint {
    font-size: 11px;
    color: var(--muted);
  }

  .line-art {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .lbl {
    font-family: 'Inter', sans-serif;
    font-size: 8.5px;
    letter-spacing: 0.06em;
    fill: var(--muted);
  }

  .line-grp rect {
    fill: var(--card-2);
    stroke: var(--line);
    transition: fill 0.3s var(--ease), stroke 0.3s var(--ease);
  }

  .line-grp.hot-a rect {
    fill: #eef4f1;
    stroke: #b9d0c7;
  }

  .line-grp.hot-b rect {
    fill: #f6f0e4;
    stroke: #ddc9a4;
  }

  .line-grp.hot-same rect {
    fill: #f8ece6;
    stroke: #e0bfae;
  }

  .line-no {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--muted);
  }

  .byte {
    fill: #efe8d9;
    stroke: none;
    transition: fill 0.3s var(--ease);
  }

  .byte.boundary {
    fill: #e0d6c1;
  }

  .tick {
    stroke: var(--gold);
    stroke-width: 1;
  }

  .mark {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 500;
  }

  .mark.a {
    fill: var(--accent);
  }

  .mark.b {
    fill: var(--st-o);
  }

  .note {
    font-family: 'Inter', sans-serif;
    font-size: 8.5px;
    fill: var(--muted);
  }

  .gran-read {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--line-2);
  }

  .metric {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }

  .metric-k {
    font-size: 11.5px;
    color: var(--muted);
  }

  .metric-v {
    font-size: 11.5px;
    color: var(--accent);
  }

  .metric-v.shared {
    color: var(--ember);
  }

  .gran-note {
    margin-top: 2px;
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-3);
  }
</style>
