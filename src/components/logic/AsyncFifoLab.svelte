<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    ASYNC_PERIODS,
    binary,
    grayToBin,
    simulateAsyncFifo,
    type AsyncMode
  } from '../../lib/logic/async';
  import { t } from '../../lib/lang.svelte';

  let mode = $state<AsyncMode>('write-fast');
  let cursor = $state(0);
  let auto = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const DEPTH = 8;
  const periods = $derived(ASYNC_PERIODS[mode]);
  const result = $derived(
    simulateAsyncFifo(periods.write, periods.read, { depth: DEPTH, ticks: 24 })
  );
  const sample = $derived(result.samples[Math.min(cursor, result.samples.length - 1)]);

  const stop = () => {
    auto = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const setMode = (value: AsyncMode) => {
    stop();
    mode = value;
    cursor = 0;
  };

  const play = () => {
    if (auto) {
      stop();
      return;
    }
    if (cursor >= result.samples.length - 1) cursor = 0;
    auto = true;
    timer = setInterval(() => {
      cursor += 1;
      if (cursor >= result.samples.length - 1) {
        cursor = result.samples.length - 1;
        stop();
      }
    }, 330);
  };

  const step = (delta: number) => {
    stop();
    cursor = Math.max(0, Math.min(result.samples.length - 1, cursor + delta));
  };

  onDestroy(stop);

  const rows = [
    { id: 'wclk', zh: 'wclk', en: 'wclk' },
    { id: 'rclk', zh: 'rclk', en: 'rclk' },
    { id: 'wr', zh: 'wr_en', en: 'wr_en' },
    { id: 'full', zh: 'full', en: 'full' },
    { id: 'rd', zh: 'rd_en', en: 'rd_en' },
    { id: 'empty', zh: 'empty', en: 'empty' },
    { id: 'count', zh: '实际占用', en: 'actual count' }
  ];

  const bits = (v: number) => binary(v, 4);
</script>

<div class="lab">
  <div class="panel">
    <div class="toolbar">
      <div class="seg small">
        {#each Object.keys(ASYNC_PERIODS) as key}
          <button class:active={mode === key} onclick={() => setMode(key as AsyncMode)}>
            {t(ASYNC_PERIODS[key as AsyncMode].zh, ASYNC_PERIODS[key as AsyncMode].en)}
          </button>
        {/each}
      </div>
      <div class="spacer"></div>
      <button class="btn small" onclick={() => step(-1)}>{t('上一拍', 'prev')}</button>
      <button class="btn small primary" onclick={play}>{auto ? t('暂停', 'pause') : t('播放', 'play')}</button>
      <button class="btn small" onclick={() => step(1)}>{t('下一拍', 'next')}</button>
      <button class="btn small ghost" onclick={() => { stop(); cursor = 0; }}>{t('复位游标', 'rewind')}</button>
    </div>

    <span class="mini">
      {t('24 拍波形 · 当前列高亮', '24-tick waveform · current column highlighted')}
    </span>
    <span class="scroll-hint">{t('横向滑动查看全部 24 拍', 'scroll sideways for all 24 ticks')}</span>

    <div class="wave-wrap">
      <div class="wave">
        <div class="row head">
          <span class="rl"></span>
          {#each result.samples as s, i}
            <span class="cell t mono" class:now={i === cursor}>{s.t}</span>
          {/each}
        </div>
        {#each rows as row}
          <div class="row">
            <span class="rl mono">{t(row.zh, row.en)}</span>
            {#each result.samples as s, i}
              {#if row.id === 'wclk'}
                <span class="cell bit wclk" class:hi={s.wclk} class:now={i === cursor}>{s.wclk ? '1' : '0'}</span>
              {:else if row.id === 'rclk'}
                <span class="cell bit rclk" class:hi={s.rclk} class:now={i === cursor}>{s.rclk ? '1' : '0'}</span>
              {:else if row.id === 'wr'}
                <span class="cell bit" class:hi={s.wr_en} class:now={i === cursor}>{s.wr_en ? '1' : '0'}</span>
              {:else if row.id === 'full'}
                <span class="cell bit ember" class:hi={s.full} class:now={i === cursor}>{s.full ? '1' : '0'}</span>
              {:else if row.id === 'rd'}
                <span class="cell bit" class:hi={s.rd_en} class:now={i === cursor}>{s.rd_en ? '1' : '0'}</span>
              {:else if row.id === 'empty'}
                <span class="cell bit ember" class:hi={s.empty} class:now={i === cursor}>{s.empty ? '1' : '0'}</span>
              {:else}
                <span class="cell count mono" class:now={i === cursor}>{s.count}</span>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <div class="domains">
      <div class="dom">
        <div class="dom-head">
          <span class="name">{t('写时钟域', 'write domain')}</span>
          <span class="chip plain mono">wclk {periods.write}</span>
        </div>
        <div class="kv"><span>wbin</span><b class="mono">{sample.wbin} / {2 * DEPTH}</b></div>
        <div class="kv"><span>wgray</span><b class="mono">{bits(sample.wgray)}</b></div>
        <div class="kv"><span>wq1 ← rgray</span><b class="mono">{bits(sample.wq1r)}</b></div>
        <div class="kv"><span>wq2（同步读指针）</span><b class="mono">{bits(sample.wq2r)} → {grayToBin(sample.wq2r)}</b></div>
        <div class="kv"><span>full</span><b class="mono" class:hot={sample.full}>{sample.full ? 1 : 0}</b></div>
      </div>

      <div class="dom">
        <div class="dom-head">
          <span class="name">{t('读时钟域', 'read domain')}</span>
          <span class="chip plain mono">rclk {periods.read}</span>
        </div>
        <div class="kv"><span>rbin</span><b class="mono">{sample.rbin} / {2 * DEPTH}</b></div>
        <div class="kv"><span>rgray</span><b class="mono">{bits(sample.rgray)}</b></div>
        <div class="kv"><span>rq1 ← wgray</span><b class="mono">{bits(sample.rq1w)}</b></div>
        <div class="kv"><span>rq2（同步写指针）</span><b class="mono">{bits(sample.rq2w)} → {grayToBin(sample.rq2w)}</b></div>
        <div class="kv"><span>empty</span><b class="mono" class:hot={sample.empty}>{sample.empty ? 1 : 0}</b></div>
      </div>

      <div class="dom">
        <div class="dom-head">
          <span class="name">{t('实际占用', 'actual occupancy')}</span>
          <span class="chip plain mono">{sample.count}/{DEPTH}</span>
        </div>
        <div class="bar"><i style={`width:${(sample.count / DEPTH) * 100}%`}></i></div>
        <div class="kv"><span>{t('本拍写', 'write this tick')}</span><b class="mono">{sample.wrote ? `#${sample.wdata}` : '—'}</b></div>
        <div class="kv"><span>{t('本拍读', 'read this tick')}</span><b class="mono">{sample.read ? `#${sample.rdata}` : '—'}</b></div>
        <div class="kv"><span>{t('累计', 'totals')}</span><b class="mono">W{result.writes} / R{result.reads}</b></div>
        <div class="kv"><span>{t('被拒', 'rejected')}</span><b class="mono">W{result.rejectedWrites} / R{result.rejectedReads}</b></div>
      </div>
    </div>

    {#if sample.conservativeFull || sample.conservativeEmpty}
      <p class="callout">
        <b>{t('保守标志：', 'Conservative flag: ')}</b>
        {#if sample.conservativeFull}
          {t(
            `full = 1，但实际只占用 ${sample.count}/8——同步读指针还停在 ${grayToBin(sample.wq2r)}。`,
            `full = 1 while only ${sample.count}/8 slots are used — the synchronized read pointer is still at ${grayToBin(sample.wq2r)}.`
          )}
        {/if}
        {#if sample.conservativeEmpty}
          {t(
            `empty = 1，但实际占用 ${sample.count}/8——同步写指针还没追上。`,
            `empty = 1 while ${sample.count}/8 slots are occupied — the synchronized write pointer has not caught up.`
          )}
        {/if}
      </p>
    {:else}
      <p class="callout quiet">
        {t(
          `full/empty 与实际占用一致或不在边界：当前 count = ${sample.count}/8。`,
          `full/empty match actual occupancy (or are not at a boundary): count = ${sample.count}/8.`
        )}
      </p>
    {/if}

    <div class="stats">
      <div class="st"><span>{t('累计写', 'writes')}</span><b class="mono">{result.writes}</b></div>
      <div class="st"><span>{t('累计读', 'reads')}</span><b class="mono">{result.reads}</b></div>
      <div class="st"><span>{t('最大占用', 'max count')}</span><b class="mono">{result.maxCount}</b></div>
      <div class="st"><span>{t('full 保守拍', 'conservative full')}</span><b class="mono">{result.conservativeFull}</b></div>
      <div class="st"><span>{t('empty 保守拍', 'conservative empty')}</span><b class="mono">{result.conservativeEmpty}</b></div>
    </div>

    <p class="note">
      {t(
        'full 只看写域里那份“过时的读指针”，empty 只看读域里那份“过时的写指针”。所以它们会早拉高、晚放下：安全，但会牺牲吞吐。把时钟比例切到写快/读快，观察被拒的写或读来自哪一侧。',
        'full sees only the stale read pointer in the write domain; empty sees only the stale write pointer in the read domain. They assert early and deassert late: safe, but they cost throughput. Switch between write-fast and read-fast and watch which side rejects.'
      )}
    </p>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 9.5px;
  }

  .mini {
    font-size: 9px;
    color: var(--muted);
  }

  .scroll-hint {
    display: none;
    font-size: 8.5px;
    color: var(--muted);
  }

  .wave-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .wave {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 680px;
  }

  .row {
    display: grid;
    grid-template-columns: 66px repeat(24, minmax(18px, 1fr));
    gap: 2px;
    align-items: center;
  }

  .rl {
    padding-right: 3px;
    font-size: 8px;
    text-align: right;
    color: var(--muted);
    white-space: nowrap;
  }

  .cell {
    display: grid;
    place-items: center;
    height: 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    line-height: 1;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 3px;
  }

  .head .cell {
    height: 15px;
    color: var(--muted);
    background: transparent;
    border-color: transparent;
  }

  .cell.bit.hi {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .cell.bit.ember.hi {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .cell.wclk.hi {
    background: var(--paper-3);
    border-color: var(--line);
  }

  .cell.rclk.hi {
    background: var(--paper-3);
    border-color: var(--line);
  }

  .cell.count {
    color: var(--ink-3);
    background: var(--card);
  }

  .cell.now {
    box-shadow: 0 0 0 1.5px var(--gold);
    z-index: 1;
  }

  .domains {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .dom {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 9px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .dom-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 5px;
    margin-bottom: 2px;
  }

  .name {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .kv {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 8.5px;
    color: var(--muted);
  }

  .kv b {
    font-weight: 500;
    color: var(--ink-2);
    text-align: right;
  }

  .kv b.hot {
    color: var(--ember);
  }

  .bar {
    height: 5px;
    margin: 3px 0;
    background: var(--paper-3);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .callout {
    padding: 7px 9px;
    font-size: 9px;
    line-height: 1.6;
    color: var(--ink-3);
    background: var(--ember-soft);
    border: 1px solid #eed8ce;
    border-radius: 7px;
  }

  .callout.quiet {
    color: var(--muted);
    background: var(--card);
    border-color: var(--line-2);
  }

  .callout b {
    color: var(--ink-2);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }

  .st {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 5px 7px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .st span {
    font-size: 8px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .st b {
    font-size: 12px;
    font-weight: 500;
  }

  .note {
    font-size: 9.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 760px) {
    .scroll-hint {
      display: block;
    }

    .domains {
      grid-template-columns: minmax(0, 1fr);
    }

    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
