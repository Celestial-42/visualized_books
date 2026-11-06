<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t } from '../../lib/lang.svelte';

  const DEST_EDGES = [0, 1, 2, 3, 4, 5, 6, 7];
  const APERTURE = 0.06;

  let srcPeriod = $state(0.75);
  const PERIOD_PRESETS = [0.5, 1, 2];
  let phase = $state(0.03);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const sourceEdges = $derived.by(() => {
    const edges: number[] = [];
    for (let k = -20; k <= 30; k += 1) {
      const x = phase + k * srcPeriod;
      if (x >= -2 && x <= 8.2) edges.push(Number(x.toFixed(3)));
    }
    return edges;
  });

  const dataAt = (time: number) => sourceEdges.filter((edge) => edge >= 0 && edge <= time).length % 2;
  const metaAt = (time: number) => sourceEdges.some((edge) => Math.abs(edge - time) <= APERTURE);

  const rows = $derived.by(() => {
    const out: { edge: number; d: number; meta: boolean; q1: string; q2: number; resolved: boolean }[] = [];
    let prevQ1 = '0';
    for (const edge of DEST_EDGES) {
      const d = dataAt(edge);
      const meta = metaAt(edge);
      const q1 = meta ? '?' : String(d);
      const resolved = prevQ1 === '?';
      const q2 = prevQ1 === '?' ? dataAt(edge - 1) : Number(prevQ1);
      out.push({ edge, d, meta, q1, q2, resolved });
      prevQ1 = q1;
    }
    return out;
  });

  const metaCount = $derived(rows.filter((r) => r.meta).length);
  const resolvedCount = $derived(rows.filter((r) => r.resolved).length);
  const ratio = $derived(1 / srcPeriod);

  const stop = () => {
    playing = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    playing = true;
    timer = setInterval(() => {
      phase = Number(((phase + 0.005) % 1).toFixed(3));
    }, 45);
  };

  onDestroy(stop);

  const W = 720;
  const H = 168;
  const L = 54;
  const R = 16;
  const T = 18;

  const xOf = (t: number) => L + (t / 8) * (W - L - R);

  const clockPoints = (period: number, offset: number, y: number) => {
    const pts: string[] = [];
    for (let t = 0; t <= 8.0001; t += 0.01) {
      const local = ((t - offset) % period + period) % period;
      const high = local < period / 2;
      pts.push(`${xOf(t).toFixed(1)},${(y - (high ? 11 : 0)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const dataPoints = () => {
    const pts: string[] = [];
    for (let t = 0; t <= 8.0001; t += 0.01) {
      pts.push(`${xOf(t).toFixed(1)},${(138 - dataAt(t) * 11).toFixed(1)}`);
    }
    return pts.join(' ');
  };
</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div>
        <span class="eyebrow">{t('异步输入 + 两级同步', 'async input + two-flop sync')}</span>
        <b>{t('Src 与 Dest 没有固定的频率/相位关系', 'Src and Dest have no fixed frequency or phase relation')}</b>
      </div>
      <div class="stats">
        <span>{t('亚稳态采样', 'metastable captures')} <b class="mono bad">{metaCount}</b></span>
        <span>{t('第二级解析', 'second-stage resolves')} <b class="mono">{resolvedCount}</b></span>
      </div>
    </div>

    <div class="controls">
      <div class="ctl">
        <span class="lbl">{t('Src 周期', 'Src period')}</span>
        <input type="range" min="0.5" max="2" step="0.01" value={srcPeriod} oninput={(e) => (srcPeriod = Number(e.currentTarget.value))} />
        <b class="mono">{srcPeriod.toFixed(2)}</b>
      </div>
      <div class="presets">
        {#each PERIOD_PRESETS as p}
          <button class="preset" class:on={Math.abs(srcPeriod - p) < 0.006} onclick={() => (srcPeriod = p)}>
            {p.toFixed(1)}
          </button>
        {/each}
      </div>
      <div class="ctl">
        <span class="lbl">{t('Src 相位', 'Src phase')}</span>
        <input type="range" min="0" max="1" step="0.005" value={phase} oninput={(e) => { stop(); phase = Number(e.currentTarget.value); }} />
        <b class="mono">{phase.toFixed(2)}</b>
      </div>
      <button class="btn small primary" onclick={play}>{playing ? t('暂停', 'pause') : t('扫描相位', 'sweep phase')}</button>
      <button class="btn small" onclick={() => { stop(); srcPeriod = 0.75; phase = 0.03; }}>{t('复位', 'reset')}</button>
    </div>

    <div class="relation">
      <span>{t('周期比', 'period ratio')} <b class="mono">T_src / T_dest = {srcPeriod.toFixed(2)}</b></span>
      <span>{t('频率比', 'frequency ratio')} <b class="mono">f_src / f_dest = {ratio.toFixed(2)}</b></span>
      <span>{t('相位偏移', 'phase offset')} <b class="mono">{phase.toFixed(2)} T_dest</b></span>
    </div>


    <span class="scroll-hint">{t('时钟波形可横向滑动', 'scroll the clock waveform sideways')}</span>
    <div class="clock-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Src 与 Dest 时钟波形', 'Src and Dest clock waveforms')}>
        {#each DEST_EDGES as edge}
          <line x1={xOf(edge)} y1="30" x2={xOf(edge)} y2="150" class="sample-line" />
          {#if metaAt(edge)}
            <rect x={xOf(edge - APERTURE)} y="32" width={xOf(edge + APERTURE) - xOf(edge - APERTURE)} height="116" class="aperture" />
          {/if}
        {/each}
        {#each [0, 2, 4, 6, 8] as tick}
          <text x={xOf(tick)} y="162" class="tick" text-anchor="middle">{tick}</text>
        {/each}

        <text x="10" y="50" class="rl">Src clk</text>
        <text x="10" y="89" class="rl">Dest clk</text>
        <text x="10" y="138" class="rl">D</text>
        <line x1={L} y1="44" x2={W - R} y2="44" class="base" />
        <line x1={L} y1="83" x2={W - R} y2="83" class="base" />
        <line x1={L} y1="138" x2={W - R} y2="138" class="base" />
        <polyline points={clockPoints(srcPeriod, phase, 44)} class="sig src" />
        <polyline points={clockPoints(1, 0, 83)} class="sig dest" />
        <polyline points={dataPoints()} class="sig data" />
      </svg>
    </div>

    <div class="timeline-wrap">
      <div class="timeline">
        <div class="row head">
          <span class="rl">{t('Dest 沿', 'Dest edge')}</span>
          {#each rows as r}<span class="cell t mono">t{r.edge}</span>{/each}
        </div>
        <div class="row">
          <span class="rl">D</span>
          {#each rows as r}
            <span class="cell bit" class:hi={r.d === 1} class:meta={r.meta}>{r.d}</span>
          {/each}
        </div>
        <div class="row">
          <span class="rl">Q1</span>
          {#each rows as r}
            <span class="cell q" class:meta={r.q1 === '?'}>{r.q1}</span>
          {/each}
        </div>
        <div class="row">
          <span class="rl">Q2</span>
          {#each rows as r}
            <span class="cell q" class:resolved={r.resolved}>{r.q2}</span>
          {/each}
        </div>
      </div>
    </div>

    <div class="notes">
      <div class="note-box">
        <span class="lbl">Src clk → D</span>
        <p>
          {t(
            '源时钟每来一个上升沿，D 翻转一次。Src 与 Dest 的频率比、相位偏移都可以调；异步的含义正是这两个量都没有保证。',
            'D toggles on every Src rising edge. The frequency ratio and phase offset are both adjustable; asynchronous means neither is guaranteed.'
          )}
        </p>
      </div>
      <div class="note-box">
        <span class="lbl">Dest clk → Q1 / Q2</span>
        <p>
          {t(
            '目的时钟采样时若撞上 D 的翻转窗口，Q1 变成“?”；Q2 在下一个 Dest 沿把它解析成干净的 0/1，代价是晚一拍。',
            'If a Dest edge lands in D’s transition window, Q1 becomes “?”; Q2 resolves it to a clean 0/1 on the next Dest edge, at the cost of one cycle.'
          )}
        </p>
      </div>
    </div>

    <p class="note">
      {t(
        '把 Src 周期从 0.5 拖到 2.0、相位从 0 拖到 1：有时两个沿完全错开，有时正好在 D 的翻转窗口里相遇，有时 Src 比 Dest 快得多，两次 Dest 采样之间 D 已经翻了很多次。无论哪种情况，Q1 都可能出现“?”，而 Q2 始终只有 0/1；单比特可以这样同步，多比特不行（第 3 章）。',
        'Drag the Src period from 0.5 to 2.0 and the phase from 0 to 1: sometimes the edges miss each other, sometimes a Dest edge lands inside D’s transition, sometimes Src is much faster and D flips many times between two Dest samples. In every case Q1 may show “?”, while Q2 only shows 0/1. A single bit can be synchronised this way; multiple bits cannot (Chapter 3).'
      )}
    </p>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    align-items: baseline;
  }

  .top b {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .stats {
    display: flex;
    gap: 10px;
    font-size: 9px;
    color: var(--muted);
  }

  .stats b {
    font-size: 10px;
    color: var(--ink-2);
  }

  .stats b.bad {
    color: var(--ember);
  }

  .controls {
    display: flex;
    align-items: end;
    gap: 7px;
    flex-wrap: wrap;
  }

  .ctl {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'label label'
      'range value';
    align-items: center;
    gap: 2px 6px;
    min-width: 190px;
  }

  .ctl .lbl {
    grid-area: label;
    font-size: 8.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ctl input {
    grid-area: range;
    width: 100%;
    min-width: 65px;
    accent-color: var(--accent);
  }

  .ctl b {
    grid-area: value;
    min-width: 28px;
    font-size: 9px;
    color: var(--accent-deep);
    text-align: right;
  }

  .presets {
    display: flex;
    gap: 4px;
  }

  .preset {
    padding: 3px 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .preset.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .relation {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 9px;
    color: var(--muted);
  }

  .relation b {
    color: var(--accent-deep);
  }

  .scroll-hint {
    display: none;
    font-size: 8.5px;
    color: var(--muted);
  }

  .clock-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .clock-wrap svg {
    display: block;
    width: 100%;
    min-width: 560px;
    height: auto;
  }

  .rl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--muted);
  }

  .base {
    stroke: var(--line-2);
    stroke-width: 0.8;
  }

  .sig {
    fill: none;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .sig.src {
    stroke: var(--accent);
  }

  .sig.dest {
    stroke: var(--gold);
  }

  .sig.data {
    stroke: var(--ink-2);
  }

  .sample-line {
    stroke: var(--gold);
    stroke-width: 0.8;
    stroke-dasharray: 2 2;
  }

  .aperture {
    fill: rgba(180, 84, 58, 0.13);
  }

  .tick {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7px;
    fill: var(--muted);
  }

  .timeline-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 620px;
  }

  .row {
    display: grid;
    grid-template-columns: 62px repeat(8, minmax(54px, 1fr));
    gap: 3px;
    align-items: center;
  }

  .rl {
    text-align: right;
    padding-right: 2px;
  }

  .cell {
    display: grid;
    place-items: center;
    height: 23px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
  }

  .head .cell {
    height: 16px;
    color: var(--muted);
    background: transparent;
    border-color: transparent;
  }

  .cell.bit {
    color: var(--ink-2);
  }

  .cell.bit.hi {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cell.meta {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
    font-weight: 600;
  }

  .cell.q {
    color: var(--ink-2);
    background: var(--card);
    border-color: #cfded9;
  }

  .cell.q.meta {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: var(--ember);
  }

  .cell.q.resolved {
    color: var(--st-o);
    border-color: #ecdfc6;
    background: #f6eedf;
  }

  .notes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .note-box {
    padding: 7px 9px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .note-box p {
    font-size: 9px;
    line-height: 1.55;
    color: var(--ink-3);
  }

  .note {
    font-size: 9.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 700px) {
    .scroll-hint {
      display: block;
    }

    .controls {
      align-items: stretch;
    }

    .ctl {
      min-width: 100%;
    }

    .notes {
      grid-template-columns: minmax(0, 1fr);
    }

    .timeline {
      min-width: 0;
    }

    .row {
      grid-template-columns: 42px repeat(8, minmax(24px, 1fr));
      gap: 2px;
    }

    .cell {
      height: 21px;
      font-size: 8px;
    }
  }
</style>
