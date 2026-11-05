<script lang="ts">
  import { analyzeDepth, simulateBoundedDepth } from '../../lib/logic/fifo';
  import { t } from '../../lib/lang.svelte';

  let burst = $state(16);
  let readRate = $state(0.5);
  let reaction = $state(2);
  let depth = $state(12);

  const analysis = $derived(analyzeDepth({ burst, readRate, reaction }));
  const bounded = $derived(simulateBoundedDepth({ burst, readRate, reaction }, depth));
  const maxY = $derived(Math.max(analysis.peak, depth, 1));

  const W = 560;
  const H = 180;
  const L = 32;
  const R = 8;
  const T = 12;
  const B = 22;

  const px = (i: number) => L + (i / Math.max(1, analysis.samples.length - 1)) * (W - L - R);
  const py = (v: number) => T + (1 - v / maxY) * (H - T - B);
  const line = $derived(
    analysis.samples.map((s, i) => `${px(i).toFixed(1)},${py(s.occupancy).toFixed(1)}`).join(' ')
  );
  const area = $derived(`${L},${py(0)} ${line} ${W - R},${py(0)}`);
  const depthY = $derived(py(depth));
  const peakY = $derived(py(analysis.peak));

  const align = () => {
    depth = Math.min(48, analysis.required);
  };
</script>

<div class="lab">
  <div class="panel">
    <div class="controls">
      <div class="ctl">
        <span class="lbl">{t('突发长度', 'burst')}</span>
        <div class="seg small">
          {#each [4, 8, 16, 32] as b}
            <button class:active={burst === b} onclick={() => (burst = b)}>{b}</button>
          {/each}
        </div>
      </div>

      <div class="ctl">
        <span class="lbl">{t('消费者速率', 'consumer rate')}</span>
        <div class="seg small">
          {#each [0.25, 0.5, 0.75, 1] as r}
            <button class:active={readRate === r} onclick={() => (readRate = r)}>{r}×</button>
          {/each}
        </div>
      </div>

      <div class="ctl">
        <span class="lbl">{t('反压反应', 'reaction')}</span>
        <div class="seg small">
          {#each [0, 1, 2, 4] as r}
            <button class:active={reaction === r} onclick={() => (reaction = r)}>{r} {t('拍', 'cyc')}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="depth-ctl">
      <span class="lbl">{t('当前深度', 'chosen depth')}</span>
      <input type="range" min="1" max="48" value={depth} oninput={(e) => (depth = Number(e.currentTarget.value))} />
      <b class="mono">{depth}</b>
      <button class="btn small" onclick={align}>{t('对齐所需深度', 'match required')}</button>
    </div>

    <div class="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('FIFO 占用随时间变化', 'FIFO occupancy over time')}>
        <line x1={L} y1={py(0)} x2={W - R} y2={py(0)} class="axis" />
        <line x1={L} y1={T} x2={L} y2={py(0)} class="axis" />
        {#if analysis.peak > depth}
          <rect x={L} y={peakY} width={W - L - R} height={Math.max(0, depthY - peakY)} class="over" />
        {/if}
        <polygon points={area} class="area" />
        <polyline points={line} class="occ" />
        <line x1={L} y1={depthY} x2={W - R} y2={depthY} class="depth" />
        <text x={L + 4} y={depthY - 4} class="albl chart-label">{t('当前深度', 'depth')} {depth}</text>
        <text x={L + 4} y={peakY - 4} class="albl peak chart-label">{t('峰值', 'peak')} {analysis.peak}</text>
        <text x={L} y={H - 5} class="albl">0</text>
        <text x={W - R} y={H - 5} class="albl" text-anchor="end">{t('时间（拍）', 'cycles')}</text>
        <text x={L - 4} y={py(maxY) + 3} class="albl" text-anchor="end">{maxY}</text>
      </svg>
    </div>

    <div class="stats">
      <div class="st"><span>{t('仿真峰值', 'peak')}</span><b class="mono">{analysis.peak}</b></div>
      <div class="st"><span>{t('所需深度', 'required')}</span><b class="mono">{analysis.required}</b></div>
      <div class="st"><span>{t('常用估算', 'estimate')}</span><b class="mono">{analysis.formula}</b></div>
      <div class="st" class:bad={bounded.dropped > 0}><span>{t('当前深度丢字', 'dropped')}</span><b class="mono">{bounded.dropped}</b></div>
    </div>

    <p class="note">
      {#if bounded.dropped > 0}
        <b class="warn">{t('深度不够。', 'Not deep enough.')}</b>
        {t(
          `这组流量在当前深度 ${depth} 下丢了 ${bounded.dropped} 个字；按仿真峰值加反应余量，至少要 ${analysis.required}。`,
          `This workload drops ${bounded.dropped} words at depth ${depth}; peak plus reaction needs at least ${analysis.required}.`
        )}
      {:else}
        <b>{t('当前深度覆盖了峰值与反应余量。', 'The depth covers the peak and the reaction margin.')}</b>
        {#if analysis.peak !== analysis.formula - reaction}
          {t(
            `仿真峰值 ${analysis.peak}，加 ${reaction} 拍反应得到 ${analysis.required}；常用式子给出 ${analysis.formula}。两者差的那一格来自同拍读写的离散步进，取较大值。`,
            `The simulated peak is ${analysis.peak}; adding ${reaction} cycles of reaction gives ${analysis.required}. The usual estimate gives ${analysis.formula}; the one-word difference comes from discrete same-cycle read/write timing, so take the larger.`
          )}
        {:else}
          {t(
            `仿真峰值 ${analysis.peak}，加 ${reaction} 拍反应得到 ${analysis.required}；常用式子也是 ${analysis.formula}，这组参数下两者一致。`,
            `The simulated peak is ${analysis.peak}; adding ${reaction} cycles of reaction gives ${analysis.required}. The usual estimate is also ${analysis.formula}; here the two agree.`
          )}
        {/if}
      {/if}
    </p>

    <p class="mini">
      {t(
        `为了让流量可持续，burst 之间自动插入 ${analysis.gap} 拍空闲（周期 ${analysis.period} 拍），平均写入速率正好不超过消费者速率。`,
        `To keep the workload sustainable, ${analysis.gap} idle cycles are inserted between bursts (period ${analysis.period}), so the average write rate never exceeds the consumer rate.`
      )}
    </p>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 11px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
  }

  .ctl {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lbl {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .depth-ctl {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .depth-ctl .lbl {
    flex: none;
    white-space: nowrap;
  }

  .depth-ctl input {
    flex: 1;
    accent-color: var(--accent);
  }

  .depth-ctl b {
    min-width: 20px;
    font-size: 12px;
    color: var(--accent-deep);
    text-align: right;
  }

  .chart-wrap {
    padding: 2px 0;
  }

  .chart-wrap svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .axis {
    stroke: var(--line);
    stroke-width: 1;
  }

  .area {
    fill: rgba(47, 93, 98, 0.08);
    stroke: none;
  }

  .occ {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .depth {
    stroke: var(--gold);
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }

  .over {
    fill: rgba(180, 84, 58, 0.08);
  }

  .albl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--muted);
  }

  .albl.peak {
    fill: var(--gold);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .st {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 8px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .st span {
    font-size: 8.5px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .st b {
    font-size: 13px;
    font-weight: 500;
  }

  .st.bad {
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .st.bad b {
    color: var(--ember);
  }

  .note {
    font-size: 10px;
    line-height: 1.65;
    color: var(--muted);
  }

  .note b {
    color: var(--ink-2);
  }

  .note b.warn {
    color: var(--ember);
  }

  .mini {
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  @media (max-width: 620px) {
    .chart-label {
      display: none;
    }

    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
