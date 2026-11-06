<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t } from '../../lib/lang.svelte';

  const EDGES = [0, 2, 4, 6, 8, 10];
  const BASE_TOGGLES = [0.6, 2.5, 4.1, 6.3, 8.6];
  const APERTURE = 0.08;

  let phase = $state(-0.35);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const toggles = $derived(BASE_TOGGLES.map((x) => x + phase));
  const sourceAt = (time: number) => toggles.filter((x) => x <= time).length % 2;

  const rows = $derived.by(() => {
    const out: { edge: number; d: number; meta: boolean; q1: string; q2: number; resolved: boolean }[] = [];
    let prevQ1 = '0';
    for (const edge of EDGES) {
      const d = sourceAt(edge);
      const meta = toggles.some((x) => Math.abs(x - edge) <= APERTURE);
      const q1 = meta ? '?' : String(d);
      const resolved = prevQ1 === '?';
      const q2 = prevQ1 === '?' ? sourceAt(edge - 2) : Number(prevQ1);
      out.push({ edge, d, meta, q1, q2, resolved });
      prevQ1 = q1;
    }
    return out;
  });

  const metaCount = $derived(rows.filter((r) => r.meta).length);
  const resolvedCount = $derived(rows.filter((r) => r.resolved).length);

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
      phase = phase >= 0.4 ? -0.4 : Number((phase + 0.01).toFixed(2));
    }, 60);
  };

  onDestroy(stop);

</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div>
        <span class="eyebrow">{t('异步输入 + 两级同步', 'async input + two-flop sync')}</span>
        <b>{t('D 的翻转位置与目的时钟没有固定关系', 'D toggles with no fixed phase to the destination clock')}</b>
      </div>
      <div class="stats">
        <span>{t('亚稳态采样', 'metastable captures')} <b class="mono bad">{metaCount}</b></span>
        <span>{t('第二级解析', 'second-stage resolves')} <b class="mono">{resolvedCount}</b></span>
      </div>
    </div>

    <div class="controls">
      <div class="ctl">
        <span class="lbl">{t('D 翻转相对采样沿', 'D toggle relative to edge')}</span>
        <input type="range" min="-0.4" max="0.4" step="0.01" value={phase} oninput={(e) => { stop(); phase = Number(e.currentTarget.value); }} />
        <b class="mono">{phase >= 0 ? '+' : ''}{phase.toFixed(2)}</b>
      </div>
      <button class="btn small primary" onclick={play}>{playing ? t('暂停', 'pause') : t('扫描相位', 'sweep phase')}</button>
      <button class="btn small" onclick={() => { stop(); phase = 0; }}>{t('回到 0', 'zero')}</button>
    </div>

    <div class="legend">
      <span>{t('D 翻转时刻', 'D toggles at')} <b class="mono">[{toggles.map((x) => x.toFixed(1)).join(', ')}]</b></span>
      <span>{t('采样窗口 ±0.08', 'aperture ±0.08')}</span>
    </div>

    <div class="timeline-wrap">
      <div class="timeline">
        <div class="row head">
          <span class="rl">{t('目的沿', 'edge')}</span>
          {#each rows as r}<span class="cell t mono">t{r.edge}</span>{/each}
        </div>
        <div class="row">
          <span class="rl">D</span>
          {#each rows as r}
            <span class="cell bit" class:hi={r.d === 1} class:meta={r.meta}>{r.d}</span>
          {/each}
        </div>
        <div class="row">
          <span class="rl">clk ↑</span>
          {#each rows as _}<span class="cell clk">↑</span>{/each}
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
        <span class="lbl">{t('Q1（第一级）', 'Q1 (stage 1)')}</span>
        <p>
          {t(
            '采样沿若落在 D 的翻转窗口里，第一级可能进入亚稳态，显示为“?”。它是一个不确定的 0/1，不是一个稳定的数据位。',
            'If a capture edge lands inside D’s transition window, the first stage can go metastable and is shown as “?”. It is an uncertain 0/1, not a stable data bit.'
          )}
        </p>
      </div>
      <div class="note-box">
        <span class="lbl">{t('Q2（第二级）', 'Q2 (stage 2)')}</span>
        <p>
          {t(
            '第二级在下一个沿再采一次，把“?”解析成一个 0 或 1；下游永远看不到“?”。代价是晚一拍，而且解析结果可能是旧值或新值。',
            'The second stage samples again on the next edge and resolves the “?” to a clean 0 or 1; downstream never sees “?”. The cost is one cycle, and the resolved value may be old or new.'
          )}
        </p>
      </div>
    </div>

    <p class="note">
      {t(
        '把相位从 −0.4 扫到 +0.4：当翻转落在目的沿附近时，Q1 出现“?”；Q2 仍然只有 0/1，并且比 Q1 晚一拍。两级同步器降低的是亚稳态传播到下游的概率，不是把它变成“没有延迟”。单比特可以这样同步；多比特不能用同一招，原因见第 3 章。',
        'Sweep the phase from −0.4 to +0.4: when a toggle lands near a destination edge, Q1 shows “?”; Q2 still only shows 0/1 and is one cycle later. A two-flop synchroniser lowers the chance of metastability reaching downstream; it does not make it latency-free. A single bit can be synchronised this way; multiple bits cannot, as Chapter 3 explains.'
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
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .ctl {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 220px;
  }

  .lbl {
    flex: none;
    font-size: 8.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ctl input {
    flex: 1;
    accent-color: var(--accent);
  }

  .ctl b {
    font-size: 9px;
    color: var(--accent-deep);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 9px;
    color: var(--muted);
  }

  .legend b {
    color: var(--accent-deep);
  }

  .timeline-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 520px;
  }

  .row {
    display: grid;
    grid-template-columns: 62px repeat(6, minmax(54px, 1fr));
    gap: 4px;
    align-items: center;
  }

  .rl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    text-align: right;
    color: var(--muted);
  }

  .cell {
    display: grid;
    place-items: center;
    height: 24px;
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

  .cell.clk {
    color: var(--accent);
    background: var(--card);
    border-color: var(--line-2);
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
      grid-template-columns: 48px repeat(6, minmax(34px, 1fr));
      gap: 2px;
    }

    .cell {
      height: 21px;
      font-size: 8px;
    }
  }
</style>
