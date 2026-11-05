<script lang="ts">
  import { simulateReadout, type ReadMode, type ReadyPattern } from '../../lib/logic/fifo';
  import { lang, t } from '../../lib/lang.svelte';

  let mode = $state<ReadMode>('standard');
  let pattern = $state<ReadyPattern>('always');

  const result = $derived(simulateReadout(mode, pattern, 4, 12));
  const compare = $derived({
    standard: simulateReadout('standard', pattern, 4, 12).stats,
    fwft: simulateReadout('fwft', pattern, 4, 12).stats
  });
  const samples = $derived(result.samples);

  const MODES: { id: ReadMode; zh: string; en: string }[] = [
    { id: 'standard', zh: '标准 FIFO', en: 'standard FIFO' },
    { id: 'fwft', zh: 'FWFT（先出队头）', en: 'FWFT (show-ahead)' }
  ];

  const PATTERNS: { id: ReadyPattern; zh: string; en: string }[] = [
    { id: 'always', zh: '消费者一直 ready', en: 'consumer always ready' },
    { id: 'alt', zh: '每隔一拍 ready', en: 'ready every other cycle' },
    { id: 'late', zh: '第 3 拍才开始 ready', en: 'ready from cycle 3' }
  ];

  const bit = (v: boolean) => (v ? '1' : '0');
  const fmt = (v: number | null) => (v === null ? '·' : `#${v}`);

  const rows = [
    { id: 'clk', zh: 'clk', en: 'clk' },
    { id: 'wr', zh: 'wr_en', en: 'wr_en' },
    { id: 'full', zh: 'full', en: 'full' },
    { id: 'rd', zh: 'rd_en / pop', en: 'rd_en / pop' },
    { id: 'empty', zh: 'empty', en: 'empty' },
    { id: 'valid', zh: 'dout 有效', en: 'dout valid' },
    { id: 'dout', zh: 'dout', en: 'dout' },
    { id: 'xfer', zh: '消费者取走', en: 'consumer takes' }
  ];
</script>

<div class="lab">
  <div class="panel">
    <div class="toolbar">
      <div class="seg small">
        {#each MODES as m}
          <button class:active={mode === m.id} onclick={() => (mode = m.id)}>
            {lang.value === 'en' ? m.en : m.zh}
          </button>
        {/each}
      </div>
      <div class="spacer"></div>
      <div class="seg small">
        {#each PATTERNS as p}
          <button class:active={pattern === p.id} onclick={() => (pattern = p.id)}>
            {lang.value === 'en' ? p.en : p.zh}
          </button>
        {/each}
      </div>
    </div>

    <span class="scroll-hint">{t('12 拍波形', '12 cycles')}</span>
    <div class="wave-wrap">
      <div class="wave">
        <div class="row head">
          <span class="rl"></span>
          {#each samples as sm}
            <span class="cell t mono">t{sm.t}</span>
          {/each}
        </div>

        {#each rows as row}
          <div class="row">
            <span class="rl mono">{lang.value === 'en' ? row.en : row.zh}</span>
            {#each samples as sm}
              {#if row.id === 'clk'}
                <span class="cell clk" class:hi={sm.t % 2 === 0}>{sm.t % 2 === 0 ? '1' : '0'}</span>
              {:else if row.id === 'wr'}
                <span class="cell bit" class:hi={sm.wr_en}>{bit(sm.wr_en)}</span>
              {:else if row.id === 'full'}
                <span class="cell bit ember" class:hi={sm.full}>{bit(sm.full)}</span>
              {:else if row.id === 'rd'}
                <span class="cell bit" class:hi={sm.rd_en}>{bit(sm.rd_en)}</span>
              {:else if row.id === 'empty'}
                <span class="cell bit ember" class:hi={sm.empty}>{bit(sm.empty)}</span>
              {:else if row.id === 'valid'}
                <span class="cell bit" class:hi={sm.valid}>{bit(sm.valid)}</span>
              {:else if row.id === 'dout'}
                <span class="cell data mono" class:hi={sm.valid}>{fmt(sm.dout)}</span>
              {:else}
                <span class="cell bit xfer" class:hi={sm.xfer}>{sm.xfer ? '✓' : ''}</span>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <div class="stats">
      <div class="st"><span>{t('首字取走', 'first taken')}</span><b class="mono">{result.stats.first === null ? '—' : `t${result.stats.first}`}</b></div>
      <div class="st"><span>{t('末字取走', 'last taken')}</span><b class="mono">{result.stats.last === null ? '—' : `t${result.stats.last}`}</b></div>
      <div class="st"><span>{t('取走字数', 'words taken')}</span><b class="mono">{result.stats.transfers}/4</b></div>
      <div class="st"><span>{t('中间空拍', 'bubbles')}</span><b class="mono">{result.stats.bubbles}</b></div>
    </div>

    <div class="compare">
      <span class="mini">{t('同一组输入下两种 FIFO 的差别（由引擎现算）', 'The same stimulus through both FIFOs (computed)')}</span>
      <div class="cmp">
        <div class="cmp-row" class:sel={mode === 'standard'}>
          <span class="mono">standard</span>
          <span>{t('首字', 'first')} <b class="mono">{compare.standard.first === null ? '—' : `t${compare.standard.first}`}</b></span>
          <span>{t('末字', 'last')} <b class="mono">{compare.standard.last === null ? '—' : `t${compare.standard.last}`}</b></span>
          <span>{t('空拍', 'bubbles')} <b class="mono">{compare.standard.bubbles}</b></span>
        </div>
        <div class="cmp-row" class:sel={mode === 'fwft'}>
          <span class="mono">FWFT</span>
          <span>{t('首字', 'first')} <b class="mono">{compare.fwft.first === null ? '—' : `t${compare.fwft.first}`}</b></span>
          <span>{t('末字', 'last')} <b class="mono">{compare.fwft.last === null ? '—' : `t${compare.fwft.last}`}</b></span>
          <span>{t('空拍', 'bubbles')} <b class="mono">{compare.fwft.bubbles}</b></span>
        </div>
      </div>
    </div>

    <p class="note">
      {#if mode === 'standard'}
        {t(
          '标准 FIFO 的 dout 是输出寄存器：rd_en 在这一拍发出，数据下一拍才出现在 dout，消费者下一拍取走。empty 可能在 dout 仍有效时为 1——它说的是 FIFO 里还有没有下一字，不是输出寄存器空不空。',
          'In a standard FIFO dout is a register: rd_en issues this cycle, data appears in dout next cycle, and the consumer takes it then. empty can be 1 while dout is still valid — it says whether another word remains inside, not whether the output register is empty.'
        )}
      {:else}
        {t(
          'FWFT 把队头直接摆到 dout 上，rd_en 只是“取走并弹出”。数据在写进 FIFO 的下一拍就能被取，少了一拍；代价是读数据路径上多一个从存储到输出的旁路/选择，且 empty 与“当前无数据”严格同步。',
          'FWFT puts the head directly on dout; rd_en only pops it. Data can be taken the cycle after it is written — one cycle sooner. The price is a bypass/mux from storage to the output, and empty now means exactly “nothing to take”.'
        )}
      {/if}
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

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .scroll-hint {
    display: none;
    font-size: 9px;
    color: var(--muted);
  }

  .wave-wrap {
    overflow-x: auto;
    padding-bottom: 3px;
    -webkit-overflow-scrolling: touch;
  }

  .wave {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 620px;
  }

  .row {
    display: grid;
    grid-template-columns: 78px repeat(12, minmax(30px, 1fr));
    gap: 3px;
    align-items: center;
  }

  .rl {
    padding-right: 4px;
    font-size: 8.5px;
    text-align: right;
    color: var(--muted);
    white-space: nowrap;
  }

  .cell {
    display: grid;
    place-items: center;
    height: 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    line-height: 1;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    border-radius: 4px;
  }

  .head .cell {
    height: 16px;
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

  .cell.clk.hi {
    background: var(--paper-3);
    border-color: var(--line);
  }

  .cell.data {
    color: var(--muted);
  }

  .cell.data.hi {
    color: var(--accent-deep);
    background: var(--card);
    border-color: #cfded9;
    font-weight: 500;
  }

  .cell.xfer.hi {
    color: #3f6b4f;
    background: #eaf1ea;
    border-color: #d7e5d8;
    font-size: 11px;
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

  .compare {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mini {
    font-size: 9.5px;
    color: var(--muted);
  }

  .cmp {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .cmp-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 5px 14px;
    padding: 4px 7px;
    font-size: 9.5px;
    color: var(--muted);
    border: 1px solid transparent;
    border-radius: 6px;
  }

  .cmp-row.sel {
    color: var(--ink-2);
    background: var(--card);
    border-color: var(--line-2);
  }

  .cmp-row b {
    color: var(--accent-deep);
    font-weight: 500;
  }

  .note {
    font-size: 10px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 620px) {
    .scroll-hint {
      display: block;
    }

    .wave {
      min-width: 0;
    }

    .row {
      grid-template-columns: 48px repeat(12, minmax(0, 1fr));
      gap: 1px;
    }

    .rl {
      padding-right: 2px;
      font-size: 7.5px;
    }

    .cell {
      height: 18px;
      font-size: 7px;
      overflow: hidden;
    }

    .head .cell {
      height: 14px;
    }

    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
