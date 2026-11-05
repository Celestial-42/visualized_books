<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    almostEmpty,
    almostFull,
    binary,
    createFifo,
    fifoStep,
    pointerBits,
    ringSlots,
    type FifoOp,
    type FifoState
  } from '../../lib/logic/fifo';
  import { lang, t } from '../../lib/lang.svelte';

  type Entry = {
    id: number;
    op: FifoOp;
    w: boolean;
    r: boolean;
    data: number | null;
    overw: number | null;
    under: boolean;
    full: boolean;
    empty: boolean;
    count: number;
  };

  let depth = $state(8);
  let fifo = $state<FifoState>(createFifo(8));
  let allow = $state(false);
  let lookahead = $state(true);
  let auto = $state(false);
  let autoAt = $state(0);
  let log = $state<Entry[]>([]);
  let serial = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const AUTO: FifoOp[] = [
    'write',
    'write',
    'write',
    'both',
    'read',
    'both',
    'write',
    'read',
    'read',
    'both',
    'read',
    'read'
  ];

  const slots = $derived(ringSlots(fifo));
  const bits = $derived(pointerBits(fifo.depth) - 1);
  const last = $derived(log[0] ?? null);

  const stopAuto = () => {
    auto = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const reset = (d = depth) => {
    stopAuto();
    depth = d;
    fifo = createFifo(d);
    log = [];
    autoAt = 0;
  };

  const apply = (op: FifoOp) => {
    const res = fifoStep(fifo, op, {
      allowOverwrite: allow,
      allowUnderflow: allow,
      lookaheadFull: lookahead
    });
    fifo = res.state;
    serial += 1;
    log = [
      {
        id: serial,
        op,
        w: res.acceptedWrite,
        r: res.acceptedRead,
        data: res.readData,
        overw: res.overwritten,
        under: res.underflow,
        full: res.fullBefore,
        empty: res.emptyBefore,
        count: res.state.count
      },
      ...log
    ].slice(0, 4);
  };

  const step = () => apply('idle');

  const toggleAuto = () => {
    if (auto) {
      stopAuto();
      return;
    }
    if (autoAt >= AUTO.length) autoAt = 0;
    auto = true;
    timer = setInterval(() => {
      if (autoAt >= AUTO.length) {
        stopAuto();
        return;
      }
      const op = AUTO[autoAt];
      autoAt += 1;
      apply(op);
    }, 720);
  };

  onDestroy(stopAuto);

  const OP: Record<FifoOp, { zh: string; en: string }> = {
    idle: { zh: '空拍', en: 'idle' },
    write: { zh: '写', en: 'write' },
    read: { zh: '读', en: 'read' },
    both: { zh: '同拍读写', en: 'read + write' }
  };
</script>

<div class="lab">
  <div class="panel">
    <div class="toolbar">
      <div class="seg small">
        {#each [4, 8, 16] as d}
          <button class:active={depth === d} onclick={() => reset(d)}>{t(`${d} 深`, `${d} deep`)}</button>
        {/each}
      </div>
      <div class="spacer"></div>
      <span class="next-write mono">{t('下次写', 'next write')} #{fifo.nextData}</span>
      <button class="btn small ghost" onclick={() => reset()}>{t('复位', 'reset')}</button>
    </div>

    <div class="ring-wrap">
      <div class="ring" class:d4={fifo.depth === 4}>
        {#each slots as slot}
          <div class="slot" class:valid={slot.valid} class:head={slot.head} class:next={slot.nextFree}>
            <span class="idx mono">{slot.index}</span>
            <span class="val mono">{slot.value === null ? '·' : `#${slot.value}`}</span>
            <span class="tags">
              {#if slot.head}<b class="tag r">R</b>{/if}
              {#if slot.nextFree}<b class="tag w">W</b>{/if}
            </span>
          </div>
        {/each}
      </div>
      <div class="legend">
        <span><b class="tag r">R</b>{t('读指针（队头）', 'read pointer (head)')}</span>
        <span><b class="tag w">W</b>{t('下一个空位', 'next free slot')}</span>
        <span>{t('内存读出后不被清零，靠指针与 count 区分有效', 'memory is not cleared on read; pointers and count decide validity')}</span>
      </div>
    </div>

    <div class="state-row">
      <div class="ptr">
        <span class="lbl">{t('写指针', 'write ptr')}</span>
        <b class="mono">{binary(fifo.wptr, bits)}</b>
        <span class="dec mono">({fifo.wptr})</span>
      </div>
      <div class="ptr">
        <span class="lbl">{t('读指针', 'read ptr')}</span>
        <b class="mono">{binary(fifo.rptr, bits)}</b>
        <span class="dec mono">({fifo.rptr})</span>
      </div>
      <div class="ptr grow">
        <span class="lbl">{t('占用', 'occupancy')}</span>
        <div class="countbar"><i style={`width:${(fifo.count / fifo.depth) * 100}%`}></i></div>
        <b class="mono">{fifo.count}/{fifo.depth}</b>
      </div>
    </div>

    <div class="chips">
      <span class="chip" class:m={fifo.count === fifo.depth}>{t('full', 'full')} = {fifo.count === fifo.depth ? 1 : 0}</span>
      <span class="chip" class:s={fifo.count === 0}>{t('empty', 'empty')} = {fifo.count === 0 ? 1 : 0}</span>
      {#if almostFull(fifo)}<span class="chip o">{t('almost_full', 'almost_full')} = 1</span>{/if}
      {#if almostEmpty(fifo)}<span class="chip o">{t('almost_empty', 'almost_empty')} = 1</span>{/if}
      <span class="chip plain">{t('回绕', 'wraps')} {fifo.wraps}</span>
    </div>

    <div class="actions">
      <button class="btn small primary" onclick={() => apply('write')}>{t('写一个', 'write')}</button>
      <button class="btn small" onclick={() => apply('read')}>{t('读一个', 'read')}</button>
      <button class="btn small" onclick={() => apply('both')}>{t('同拍读写', 'read + write')}</button>
      <button class="btn small" onclick={step}>{t('空拍', 'idle')}</button>
      <button class="btn small" class:primary={auto} onclick={toggleAuto}>
        {auto ? t('停止', 'stop') : t('自动演示', 'auto demo')}
      </button>
    </div>

    <div class="toggles">
      <button class="toggle" class:on={allow} onclick={() => (allow = !allow)}>
        <span class="dot"></span>
        {t('允许违规：写满/读空', 'allow violations: write full / read empty')}
      </button>
      <button class="toggle" class:on={lookahead} onclick={() => (lookahead = !lookahead)}>
        <span class="dot"></span>
        {t('满时同拍读写：读先放行写', 'full + read: let the read free a slot')}
      </button>
    </div>

    {#if last}
      <p class="last" class:bad={last.overw !== null}>
        <span class="mono">t{last.id}</span>
        <span>{lang.value === 'en' ? OP[last.op].en : OP[last.op].zh}</span>
        {#if last.op === 'write' || last.op === 'both'}
          {#if last.w}
            <span class="ok">{t(`写入 #${fifo.nextData - 1} 被接受`, `write #${fifo.nextData - 1} accepted`)}</span>
          {:else}
            <span class="warn">{t('写入被拒：full = 1', 'write rejected: full = 1')}</span>
          {/if}
        {/if}
        {#if last.op === 'read' || last.op === 'both'}
          {#if last.r}
            <span class="ok">{t(`读出 #${last.data}`, `read #${last.data}`)}</span>
          {:else}
            <span class="warn">{t('读空：没有数据可出', 'read empty: no data')}</span>
          {/if}
        {/if}
        {#if last.overw !== null}
          <span class="warn">{t(`写满覆盖了最旧的 #${last.overw}`, `overwrote the oldest #${last.overw}`)}</span>
        {/if}
        <span class="mini mono">count={last.count}</span>
      </p>
    {:else}
      <p class="last"><span class="mini">{t('按“写一个”开始；填满后看 full，再读空看 empty。', 'Start with “write”; fill it to see full, drain it to see empty.')}</span></p>
    {/if}

    <div class="stats">
      <div class="st"><span>{t('已写', 'writes')}</span><b class="mono">{fifo.written}</b></div>
      <div class="st"><span>{t('已读', 'reads')}</span><b class="mono">{fifo.read}</b></div>
      <div class="st"><span>{t('写被拒', 'write rejected')}</span><b class="mono">{fifo.rejectedWrites}</b></div>
      <div class="st"><span>{t('读空', 'read empty')}</span><b class="mono">{fifo.rejectedReads}</b></div>
      <div class="st"><span>{t('覆盖丢失', 'overwritten')}</span><b class="mono">{fifo.lost}</b></div>
    </div>
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
    padding: 3px 8px;
    font-size: 10px;
  }

  .next-write {
    font-size: 10px;
    color: var(--muted);
  }

  .ring-wrap {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .ring {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 6px;
  }

  .ring.d4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 52px;
    padding: 5px 3px 4px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 7px;
    color: var(--muted);
  }

  .slot.valid {
    color: var(--ink-2);
    background: var(--card);
    border-color: #cfded9;
  }

  .slot.head {
    box-shadow: inset 0 0 0 1.5px var(--ember);
  }

  .slot.next {
    border-style: dashed;
    border-color: var(--accent);
  }

  .idx {
    font-size: 8px;
    opacity: 0.75;
  }

  .val {
    font-size: 11px;
    font-weight: 500;
  }

  .tags {
    display: flex;
    gap: 2px;
    height: 11px;
  }

  .tag {
    display: inline-grid;
    place-items: center;
    min-width: 12px;
    height: 11px;
    padding: 0 2px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    font-style: normal;
    line-height: 1;
    border-radius: 3px;
  }

  .tag.r {
    color: var(--st-m);
    background: var(--ember-soft);
  }

  .tag.w {
    color: var(--accent-deep);
    background: var(--accent-soft);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .state-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }

  .ptr {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 10px;
    color: var(--muted);
  }

  .ptr b {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--accent-deep);
  }

  .ptr .dec {
    font-size: 9.5px;
    opacity: 0.8;
  }

  .ptr.grow {
    flex: 1;
    min-width: 150px;
  }

  .countbar {
    flex: 1;
    min-width: 60px;
    height: 6px;
    margin: 0 2px;
    background: var(--paper-3);
    border-radius: 3px;
    overflow: hidden;
  }

  .countbar i {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .actions,
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 10px;
    color: var(--muted);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 7px;
    text-align: left;
  }

  .toggle.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
    border-color: #cfded9;
  }

  .dot {
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 50%;
    background: var(--line);
  }

  .toggle.on .dot {
    background: var(--accent);
  }

  .last {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 5px 8px;
    padding: 7px 9px;
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 7px;
  }

  .last .ok {
    color: #3f6b4f;
  }

  .last .warn {
    color: var(--ember);
  }

  .last.bad {
    border-color: #eed8ce;
    background: var(--ember-soft);
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

  @media (max-width: 700px) {
    .ring {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
