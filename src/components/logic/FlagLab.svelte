<script lang="ts">
  import {
    counterFlags,
    delayedFlags,
    extraBitFlags,
    extraBitPointers,
    nextCount,
    nextFlags,
    pointerBits,
    type FifoOp
  } from '../../lib/logic/fifo';
  import { lang, t } from '../../lib/lang.svelte';

  let depth = $state(8);
  let count = $state(7);
  let op = $state<FifoOp>('write');
  let lookahead = $state(true);

  const comb = $derived(counterFlags(depth, count));
  const extra = $derived(extraBitFlags(depth, count));
  const ptr = $derived(extraBitPointers(depth, count));
  const next = $derived(nextFlags(depth, count, op, lookahead));
  const delayed = $derived(delayedFlags(depth, count));
  const after = $derived(nextCount(depth, count, op, lookahead));
  const stale = $derived(delayed.full !== next.full || delayed.empty !== next.empty);
  const nBits = $derived(pointerBits(depth));

  const setDepth = (d: number) => {
    depth = d;
    if (count > d) count = d;
  };

  const OPS: { id: FifoOp; zh: string; en: string }[] = [
    { id: 'idle', zh: '空拍', en: 'idle' },
    { id: 'write', zh: '写', en: 'write' },
    { id: 'read', zh: '读', en: 'read' },
    { id: 'both', zh: '同拍读写', en: 'read + write' }
  ];
</script>

<div class="lab">
  <div class="panel">
    <div class="toolbar">
      <div class="seg small">
        {#each [4, 8] as d}
          <button class:active={depth === d} onclick={() => setDepth(d)}>{t(`${d} 深`, `${d} deep`)}</button>
        {/each}
      </div>
      <div class="spacer"></div>
      <span class="hint">{t('本拍的操作', 'this cycle')}</span>
      <div class="seg small">
        {#each OPS as o}
          <button class:active={op === o.id} onclick={() => (op = o.id)}>
            {lang.value === 'en' ? o.en : o.zh}
          </button>
        {/each}
      </div>
    </div>

    <div class="fill">
      <div class="fill-head">
        <span class="eyebrow">{t('当前占用', 'occupancy')}</span>
        <span class="fill-meta">
          <span class="mono count">{count}/{depth}</span>
          <button class="btn small ghost" class:on={count === 0} onclick={() => (count = 0)}>
            {t('归零', 'zero')}
          </button>
        </span>
      </div>
      <div class="slots">
        {#each Array(depth) as _, i}
          <button
            class="cell"
            class:on={i < count}
            class:head={i === 0 && count > 0}
            aria-label={t(`把占用设为 ${i + 1}`, `set occupancy to ${i + 1}`)}
            onclick={() => (count = i + 1)}
          ></button>
        {/each}
      </div>
      <div class="range">
        <input type="range" min="0" max={depth} value={count} oninput={(e) => (count = Number(e.currentTarget.value))} />
        <span class="mini">{t('点击格子或拖动滑杆', 'click a cell or drag')}</span>
      </div>
      <button class="toggle" class:on={lookahead} onclick={() => (lookahead = !lookahead)}>
        <span class="dot"></span>
        {t('满时同拍读写：读腾位给写', 'full + read: the read frees a slot')}
      </button>
    </div>

    <div class="schemes">
      <div class="scheme">
        <div class="scheme-head">
          <span class="scheme-name">{t('计数器', 'counter')}</span>
          <span class="mini mono">0…{depth}</span>
        </div>
        <div class="flags">
          <span class="chip" class:m={comb.full}>full {comb.full ? 1 : 0}</span>
          <span class="chip" class:s={comb.empty}>empty {comb.empty ? 1 : 0}</span>
        </div>
        <p class="expr mono">full = (count == {depth})<br />empty = (count == 0)</p>
        <p class="note">
          {t('最直白，也最贵：一个能加减的计数器，外加两个比较器。', 'The most direct and the most expensive: an up/down counter plus two comparators.')}
        </p>
      </div>

      <div class="scheme">
        <div class="scheme-head">
          <span class="scheme-name">{t('指针多一位', 'extra pointer bit')}</span>
          <span class="mini mono">{nBits} bit</span>
        </div>
        <div class="flags">
          <span class="chip" class:m={extra.full}>full {extra.full ? 1 : 0}</span>
          <span class="chip" class:s={extra.empty}>empty {extra.empty ? 1 : 0}</span>
        </div>
        <p class="expr mono">
          w = {ptr.wBits} ({ptr.w})<br />
          r = {ptr.rBits} ({ptr.r})
        </p>
        <p class="note">
          {t('低位相等、最高位相反 = 满；整个指针相等 = 空。', 'Same low bits with opposite MSBs = full; identical pointers = empty.')}
        </p>
      </div>

      <div class="scheme" class:stale>
        <div class="scheme-head">
          <span class="scheme-name">{t('寄存满/空', 'registered flags')}</span>
          <span class="tag" class:bad={stale}>{stale ? t('两种写法有别', 'the two differ') : t('同步', 'in step')}</span>
        </div>
        <div class="reg-row">
          <span>{t('下一拍正确', 'next, correct')}</span>
          <span class="flags">
            <span class="chip" class:m={next.full}>full {next.full ? 1 : 0}</span>
            <span class="chip" class:s={next.empty}>empty {next.empty ? 1 : 0}</span>
          </span>
        </div>
        <div class="reg-row" class:diff={stale}>
          <span>{t('只延迟比较器', 'delayed comparator')}</span>
          <span class="flags">
            <span class="chip" class:m={delayed.full}>full {delayed.full ? 1 : 0}</span>
            <span class="chip" class:s={delayed.empty}>empty {delayed.empty ? 1 : 0}</span>
          </span>
        </div>
        <p class="note">
          {#if stale}
            {t(
              '两者不一致：这一拍的状态变化，只有“算下一拍”的寄存器才跟得上。直接延迟比较器会让下一拍多写或多读一次。',
              'They disagree: only a register fed with the next state keeps up. A delayed comparator writes or reads one extra time next cycle.'
            )}
          {:else}
            {t('这一拍没有状态翻转，两种写法恰好一致；换 count=7 + 写，或 count=8 + 读再看。', 'No state change this cycle, so both coincide. Try count=7 with a write, or count=8 with a read.')}
          {/if}
        </p>
      </div>
    </div>

    <div class="verdict" class:bad={stale}>
      {#if stale}
        <b>{t('边界差一拍。', 'One cycle behind at the boundary.')}</b>
        {#if delayed.full !== next.full}
          {t(
            `下一拍的正确 full 是 ${next.full ? 1 : 0}，延迟比较器给的是 ${delayed.full ? 1 : 0}。`,
            `The correct next-cycle full is ${next.full ? 1 : 0}; the delayed comparator gives ${delayed.full ? 1 : 0}.`
          )}
        {/if}
        {#if delayed.empty !== next.empty}
          {t(
            `下一拍的正确 empty 是 ${next.empty ? 1 : 0}，延迟比较器给的是 ${delayed.empty ? 1 : 0}。`,
            `The correct next-cycle empty is ${next.empty ? 1 : 0}; the delayed comparator gives ${delayed.empty ? 1 : 0}.`
          )}
        {/if}
      {:else}
        <b>{t('这一拍三种写法结论一致。', 'All three schemes agree this cycle.')}</b>
        <span>{t(`下一拍 count = ${after}。`, `Next count = ${after}.`)}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 13px;
    padding: 14px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .seg.small button {
    padding: 3px 7px;
    font-size: 10px;
  }

  .hint {
    font-size: 10px;
    color: var(--muted);
  }

  .fill {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fill-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .fill-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .count {
    font-size: 12px;
    color: var(--accent-deep);
  }

  .btn.small.ghost.on {
    color: var(--accent-deep);
    background: var(--accent-soft);
  }

  .slots {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
  }

  .cell {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    max-width: 34px;
    height: 24px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 5px;
    transition: background 0.15s var(--ease), border-color 0.15s var(--ease);
  }

  .cell.on {
    background: var(--accent-soft);
    border-color: var(--accent);
  }

  .cell.head {
    box-shadow: inset 0 0 0 1.5px var(--ember);
    border-color: var(--ember);
  }

  .range {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .range input {
    flex: 1;
    accent-color: var(--accent);
  }

  .mini {
    font-size: 9.5px;
    color: var(--muted);
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
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

  .schemes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .scheme {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .scheme.stale {
    border-color: #eed8ce;
    background: #fff9f6;
  }

  .scheme-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }

  .scheme-name {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink);
  }

  .tag {
    padding: 1px 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    border-radius: 4px;
    color: var(--st-e);
    background: #eaf1ea;
  }

  .tag.bad {
    color: var(--ember);
    background: var(--ember-soft);
  }

  .flags {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .expr {
    font-size: 9.5px;
    line-height: 1.7;
    color: var(--accent-deep);
  }

  .note {
    font-size: 9.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .reg-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .reg-row.diff {
    padding: 4px 6px;
    color: var(--ember);
    background: var(--ember-soft);
    border-radius: 6px;
  }

  .verdict {
    padding: 9px 11px;
    font-size: 11px;
    line-height: 1.65;
    color: var(--ink-3);
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 8px;
  }

  .verdict b {
    color: var(--ink);
  }

  .verdict.bad {
    color: var(--ember);
    background: var(--ember-soft);
    border-color: #eed8ce;
  }

  .verdict.bad b {
    color: var(--ember);
  }

  @media (max-width: 760px) {
    .schemes {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
