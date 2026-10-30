<script lang="ts">
  import { t } from '../lib/lang.svelte';

  type Side = { c1: 'I' | 'M'; c2: 'I' | 'M'; tx: number; inval: number; step: number; active: number };

  const init = (): Side => ({ c1: 'I', c2: 'I', tx: 0, inval: 0, step: 0, active: -1 });

  let same = $state<Side>(init());
  let pad = $state<Side>(init());
  let running = $state(false);
  let runId = 0;

  const TOTAL = 8;

  function advance(s: Side, shared: boolean): Side {
    if (s.step >= TOTAL) return s;
    const core = s.step % 2;
    const self = core === 0 ? 'c1' : 'c2';
    const other = core === 0 ? 'c2' : 'c1';
    const next: Side = { ...s, step: s.step + 1, active: core };
    if (shared) {
      if (s[self] !== 'M') {
        next.tx += 1;
        if (s[other] === 'M') {
          next[other] = 'I';
          next.inval += 1;
        }
        next[self] = 'M';
      }
    } else if (s[self] !== 'M') {
      next.tx += 1;
      next[self] = 'M';
    }
    return next;
  }

  function step() {
    same = advance(same, true);
    pad = advance(pad, false);
    if (same.step >= TOTAL) running = false;
  }

  function reset() {
    runId += 1;
    running = false;
    same = init();
    pad = init();
  }

  async function play() {
    if (running) return;
    if (same.step >= TOTAL) reset();
    running = true;
    const token = ++runId;
    while (same.step < TOTAL) {
      await new Promise((r) => setTimeout(r, 520));
      if (token !== runId) return;
      step();
    }
    running = false;
  }
</script>

<div class="lab">
  <div class="bar">
    <span class="hint">
      {t(
        '两个核各写自己的变量 x / y，交替 8 次。看同一个 block 与 padding 之后，事务数差多少。',
        'Two cores alternately write their own variables x / y, eight times. Compare the transaction counts with and without padding.'
      )}
    </span>
    <div class="actions">
      <button class="btn small" disabled={running || same.step >= TOTAL} onclick={step}>{t('单步', 'Step')}</button>
      <button class="btn small primary" disabled={running} onclick={play}>
        {running ? t('执行中…', 'Running…') : t('运行 8 次', 'Run 8 writes')}
      </button>
      <button class="btn small ghost" disabled={running} onclick={reset}>{t('重置', 'Reset')}</button>
    </div>
  </div>

  <div class="panels">
    <div class="panel bad">
      <div class="panel-head">
        <span class="panel-title">{t('同一个 64B block', 'Same 64B block')}</span>
        <span class="panel-tag">{t('false sharing', 'false sharing')}</span>
      </div>

      <div class="block same">
        <span class="word x">x</span>
        <span class="word y">y</span>
        <span class="word"></span><span class="word"></span><span class="word"></span><span class="word"></span>
        <span class="word"></span><span class="word"></span>
      </div>
      <span class="block-note">{t('x 与 y 相邻，落在同一条 cache line', 'x and y are adjacent, inside one cache line')}</span>

      <div class="cards">
        <div class="mini" class:active={same.active === 0}>
          <span class="who mono">C1</span>
          <span class="op">{t('写 x', 'write x')}</span>
          <span class="st" class:m={same.c1 === 'M'}>{same.c1}</span>
        </div>
        <div class="mini" class:active={same.active === 1}>
          <span class="who mono">C2</span>
          <span class="op">{t('写 y', 'write y')}</span>
          <span class="st" class:m={same.c2 === 'M'}>{same.c2}</span>
        </div>
      </div>

      <div class="meters">
        <div class="meter"><span>{t('总线事务', 'transactions')}</span><b class="mono">{same.tx}</b></div>
        <div class="meter"><span>{t('失效', 'invalidations')}</span><b class="mono">{same.inval}</b></div>
      </div>

      <div class="dots">
        {#each Array(TOTAL) as _, i}
          <span class="dot" class:done={i < same.step} class:now={i === same.step - 1}></span>
        {/each}
      </div>
    </div>

    <div class="panel good">
      <div class="panel-head">
        <span class="panel-title">{t('分别放到两个 block', 'Two separate blocks')}</span>
        <span class="panel-tag ok">{t('padding', 'padding')}</span>
      </div>

      <div class="blocks">
        <div class="block">
          <span class="word x">x</span>
          <span class="word"></span><span class="word"></span><span class="word"></span>
        </div>
        <div class="block">
          <span class="word y">y</span>
          <span class="word"></span><span class="word"></span><span class="word"></span>
        </div>
      </div>
      <span class="block-note">{t('各自独占一条 line，互不作废', 'each owns its line; no cross-invalidation')}</span>

      <div class="cards">
        <div class="mini" class:active={pad.active === 0}>
          <span class="who mono">C1</span>
          <span class="op">{t('写 x', 'write x')}</span>
          <span class="st" class:m={pad.c1 === 'M'}>{pad.c1}</span>
        </div>
        <div class="mini" class:active={pad.active === 1}>
          <span class="who mono">C2</span>
          <span class="op">{t('写 y', 'write y')}</span>
          <span class="st" class:m={pad.c2 === 'M'}>{pad.c2}</span>
        </div>
      </div>

      <div class="meters">
        <div class="meter"><span>{t('总线事务', 'transactions')}</span><b class="mono">{pad.tx}</b></div>
        <div class="meter"><span>{t('失效', 'invalidations')}</span><b class="mono">{pad.inval}</b></div>
      </div>

      <div class="dots">
        {#each Array(TOTAL) as _, i}
          <span class="dot" class:done={i < pad.step} class:now={i === pad.step - 1}></span>
        {/each}
      </div>
    </div>
  </div>

  <div class="verdict">
    {#if same.step === 0}
      <span>{t('两种布局都从 I / I 开始；跑完再比较。', 'Both layouts start at I / I; run them and compare.')}</span>
    {:else if same.step < TOTAL}
      <span>{t(`第 ${same.step} / ${TOTAL} 次写：同一个 block 已经产生 ${same.tx} 次事务。`, `Write ${same.step} / ${TOTAL}: the shared block has produced ${same.tx} transactions.`)}</span>
    {:else}
      <span class="done">
        {t(
          `8 次交替写：同一个 block 用了 ${same.tx} 次事务、${same.inval} 次失效；分开后只要 ${pad.tx} 次、${pad.inval} 次。`,
          `Eight alternating writes: one block costs ${same.tx} transactions and ${same.inval} invalidations; separate blocks cost ${pad.tx} and ${pad.inval}.`
        )}
      </span>
    {/if}
  </div>

  <div class="legend">
    <span><b class="mk m mono">M</b>{t('可写副本', 'writable copy')}</span>
    <span><b class="mk i mono">I</b>{t('已被作废', 'invalidated')}</span>
    <span class="lg-note">
      {t(
        'false sharing 不是数据竞争：x 与 y 互不相关，但 cache line 把它们绑成同一个 coherence 单位。',
        'False sharing is not a data race: x and y are unrelated, but the cache line makes them one coherence unit.'
      )}
    </span>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .hint {
    flex: 1 1 420px;
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .panel.bad {
    background: #fbf3ee;
    border-color: #e3cbbf;
  }

  .panel.good {
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .panel-title {
    font-size: 10.5px;
    color: var(--ink-2);
  }

  .panel-tag {
    font-size: 8.5px;
    color: #a3523b;
  }

  .panel-tag.ok {
    color: var(--accent-deep);
  }

  .block {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 2px;
    padding: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .blocks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .blocks .block {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .word {
    height: 22px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 3px;
  }

  .word.x,
  .word.y {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--accent-deep);
    background: #f7efdf;
    border-color: #ecdfc6;
  }

  .word.y {
    color: #8a6a2f;
  }

  .block-note {
    font-size: 8.5px;
    color: var(--muted);
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .mini {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 5px 7px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 6px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .mini.active {
    border-color: var(--accent);
    background: #fffdf8;
  }

  .who {
    font-size: 9px;
    color: var(--gold);
  }

  .op {
    font-size: 8.5px;
    color: var(--muted);
  }

  .st {
    margin-left: auto;
    min-width: 17px;
    padding: 0 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    line-height: 1.7;
    text-align: center;
    color: #6c665c;
    background: #f1ece1;
    border: 1px solid #e5ddcb;
    border-radius: 4px;
  }

  .st.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .meters {
    display: flex;
    gap: 8px;
  }

  .meter {
    flex: 1;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    padding: 4px 7px;
    font-size: 8.5px;
    color: var(--muted);
    background: rgba(255, 253, 248, 0.65);
    border: 1px solid var(--line-2);
    border-radius: 5px;
  }

  .meter b {
    font-size: 11px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .dots {
    display: flex;
    gap: 3px;
  }

  .dot {
    flex: 1;
    height: 3px;
    background: var(--line);
    border-radius: 2px;
    transition: background 0.2s var(--ease);
  }

  .dot.done {
    background: var(--accent);
  }

  .dot.now {
    background: var(--gold);
  }

  .verdict {
    padding: 8px 11px;
    font-size: 10px;
    line-height: 1.6;
    color: var(--ink-3);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 8px;
  }

  .verdict .done {
    color: var(--accent-deep);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 13px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .mk {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    padding: 0 4px;
    font-size: 8.5px;
    line-height: 1.6;
    border-radius: 4px;
    border: 1px solid transparent;
  }

  .mk.i {
    color: #6c665c;
    background: #f1ece1;
    border-color: #e5ddcb;
  }

  .mk.m {
    color: #a3523b;
    background: #f9e9e2;
    border-color: #ecd3c7;
  }

  .lg-note {
    flex-basis: 100%;
    color: var(--ink-3);
  }

  @media (max-width: 820px) {
    .panels {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .actions {
      width: 100%;
      margin-left: 0;
    }

    .cards {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
