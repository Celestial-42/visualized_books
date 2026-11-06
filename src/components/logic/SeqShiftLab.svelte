<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t } from '../../lib/lang.svelte';

  type Row = { cycle: number; d: number; en: number; rst: number; q1: number; q2: number };

  let d = $state(1);
  let en = $state(1);
  let rst = $state(0);
  let q1 = $state(0);
  let q2 = $state(0);
  let cycle = $state(0);
  let history = $state<Row[]>([]);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    const nq1 = rst ? 0 : en ? d : q1;
    const nq2 = rst ? 0 : en ? q1 : q2;
    q1 = nq1;
    q2 = nq2;
    cycle += 1;
    history = [...history, { cycle, d, en, rst, q1, q2 }].slice(-8);
  };

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
      tick();
      if (cycle > 16) stop();
    }, 500);
  };

  const reset = () => {
    stop();
    d = 1;
    en = 1;
    rst = 0;
    q1 = 0;
    q2 = 0;
    cycle = 0;
    history = [];
  };

  onDestroy(stop);

  const bit = (v: number) => (v ? '1' : '0');
</script>

<div class="lab">
  <div class="panel">
    <div class="top">
      <div>
        <span class="eyebrow">{t('两级同步寄存器', 'two-stage register')}</span>
        <b>{t('只有时钟上升沿才改变状态', 'state changes only on the rising edge')}</b>
      </div>
      <div class="controls">
        <button class="bit-btn" class:on={d === 1} onclick={() => (d = 1 - d)}>D = {d}</button>
        <button class="bit-btn" class:on={en === 1} onclick={() => (en = 1 - en)}>EN = {en}</button>
        <button class="bit-btn" class:on={rst === 1} onclick={() => (rst = 1 - rst)}>RST = {rst}</button>
        <button class="btn small primary" onclick={tick}>{t('来一个上升沿', 'rising edge')}</button>
        <button class="btn small" onclick={play}>{playing ? t('暂停', 'pause') : t('自动时钟', 'auto clock')}</button>
        <button class="btn small ghost" onclick={reset}>{t('复位', 'reset')}</button>
      </div>
    </div>

    <div class="diagram">
      <svg viewBox="0 0 720 210" fill="none" aria-hidden="true">
        <text x="22" y="96" class="io" text-anchor="middle">D</text>
        <text x="22" y="116" class="io-val" text-anchor="middle">{d}</text>
        <text x="300" y="96" class="io" text-anchor="middle">Q1</text>
        <text x="300" y="116" class="io-val" text-anchor="middle">{q1}</text>
        <text x="556" y="96" class="io" text-anchor="middle">Q2</text>
        <text x="556" y="116" class="io-val" text-anchor="middle">{q2}</text>

        <rect x="110" y="55" width="130" height="82" rx="10" class="flop" />
        <text x="175" y="83" class="flop-title" text-anchor="middle">DFF</text>
        <text x="175" y="102" class="flop-sub" text-anchor="middle">{t('第一级', 'stage 1')}</text>
        <rect x="380" y="55" width="130" height="82" rx="10" class="flop" />
        <text x="445" y="83" class="flop-title" text-anchor="middle">DFF</text>
        <text x="445" y="102" class="flop-sub" text-anchor="middle">{t('第二级', 'stage 2')}</text>

        <path d="M32 110H106" class="wire" marker-end="url(#sa)" />
        <path d="M240 96H376" class="wire" marker-end="url(#sa)" />
        <path d="M510 96H552" class="wire" marker-end="url(#sa)" />

        <path d="M175 137V162H445V137" class="clkwire" />
        <text x="310" y="178" class="wire-label" text-anchor="middle">clk ↑</text>
        <path d="M408 184H446V192H484" class="clk" />
        <text x="492" y="193" class="wire-label">{t('上升沿更新', 'updates on ↑')}</text>

        <text x="22" y="148" class="io">{t('状态', 'state')}</text>
        <text x="22" y="164" class="io-val">{q1}{q2}</text>

        <defs>
          <marker id="sa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#b98a63" />
          </marker>
        </defs>
      </svg>
    </div>

    <div class="bottom">
      <div class="equations">
        <p class="mono">q1' = RST ? 0 : EN ? D : q1</p>
        <p class="mono">q2' = RST ? 0 : EN ? q1 : q2</p>
        <p class="mini">
          {t(
            'EN=0 时两级都保持；RST=1 时同时清零。q2 只是 q1 晚一拍的副本，这就是最朴素的流水线。',
            'EN=0 holds both stages; RST=1 clears them together. q2 is just q1 one cycle later — the simplest pipeline.'
          )}
        </p>
      </div>

      <div class="history">
        <span class="lbl">{t('最近 8 个上升沿', 'last 8 rising edges')}</span>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>#</th><th>D</th><th>EN</th><th>RST</th><th>Q1</th><th>Q2</th></tr>
            </thead>
            <tbody>
              {#if history.length === 0}
                <tr><td colspan="6" class="empty">{t('按“来一个上升沿”开始', 'press “rising edge” to start')}</td></tr>
              {:else}
                {#each history as row}
                  <tr>
                    <td class="num">{row.cycle}</td>
                    <td class="num">{row.d}</td>
                    <td class="num">{row.en}</td>
                    <td class="num">{row.rst}</td>
                    <td class="num">{row.q1}</td>
                    <td class="num">{row.q2}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <p class="note">
      {t(
        '时序逻辑的关键不是“有寄存器”，而是“状态只在沿上更新”。沿与沿之间，组合逻辑可以随便抖；只要在下一个沿之前稳定下来，并且满足触发器的 setup/hold 要求，寄存器就只会看到 0 或 1。',
        'The point of sequential logic is not “it has registers” but “state updates only on an edge”. Between edges the combinational cloud may wobble freely; as long as it settles before the next edge and meets the flop’s setup/hold requirement, the register sees only 0 or 1.'
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

  .top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .top b {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .bit-btn {
    padding: 4px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 6px;
  }

  .bit-btn.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .diagram svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 720px;
    margin: 0 auto;
  }

  .flop {
    fill: var(--card);
    stroke: #cfded9;
  }

  .flop-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 14px;
    fill: var(--ink-2);
  }

  .flop-sub {
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    fill: var(--muted);
  }

  .io {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    fill: var(--muted);
  }

  .io-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 600;
    fill: var(--accent-deep);
  }

  .wire {
    stroke: var(--gold);
    stroke-width: 1.1;
  }

  .wire-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    fill: var(--muted);
  }

  .clkwire {
    stroke: var(--line);
    stroke-width: 1;
    fill: none;
  }

  .clk {
    stroke: var(--accent);
    stroke-width: 1.2;
    fill: none;
  }

  .bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  .equations {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .equations .mono {
    font-size: 9px;
    color: var(--accent-deep);
  }

  .mini {
    margin-top: 2px;
    font-size: 9px;
    line-height: 1.6;
    color: var(--muted);
  }

  .lbl {
    display: block;
    margin-bottom: 4px;
    font-size: 8.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .table-wrap {
    overflow-x: auto;
  }

  .table-wrap .table {
    min-width: 300px;
    font-size: 9px;
  }

  .table-wrap .table th,
  .table-wrap .table td {
    padding: 3px 6px;
  }

  .empty {
    color: var(--muted);
    text-align: center;
  }

  .note {
    font-size: 9.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 700px) {
    .bottom {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
