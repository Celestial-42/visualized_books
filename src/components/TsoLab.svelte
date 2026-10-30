<script lang="ts">
  import {
    TSO_PROGRAMS,
    allDone,
    apply,
    canDrain,
    canRetire,
    coreDone,
    coreHalted,
    drain,
    enumerate,
    format,
    initialState,
    outcomeKey,
    retire,
    type TsoState,
    type TsoStep
  } from '../lib/tso';
  import type { Program } from '../lib/litmus';
  import { lang, t } from '../lib/lang.svelte';

  const en = $derived(lang.value === 'en');

  type Pid = 'sb' | 'fence' | 'mp';

  let pid = $state<Pid>('sb');
  let history = $state<TsoStep[]>([]);
  let running = $state(false);
  let runId = 0;

  const p = $derived(TSO_PROGRAMS[pid]);

  function replay(prog: Program, hist: TsoStep[]): TsoState {
    let s = initialState(prog);
    for (const h of hist) {
      const r = h.kind === 'retire' ? retire(prog, s, h.core) : drain(prog, s, h.core);
      if (!r) break;
      s = r.state;
    }
    return s;
  }

  const cur = $derived(replay(p, history));
  const done = $derived(allDone(p, cur));
  const outcomes = $derived(enumerate(p));
  const total = $derived(outcomes.reduce((n, o) => n + o.count, 0));

  const grid = $derived(
    combos(p.regs.length).map((vals) => {
      const key = vals.join(',');
      const hit = outcomes.find((o) => o.key === key);
      return { key, vals, count: hit?.count ?? 0, trace: hit?.trace ?? null };
    })
  );

  function combos(n: number, vals: number[] = [0, 1], acc: number[] = []): number[][] {
    if (acc.length === n) return [acc];
    return vals.flatMap((v) => combos(n, vals, [...acc, v]));
  }

  const activeKey = $derived(done ? outcomeKey(p, cur.regs) : '');
  const activeCount = $derived(outcomes.find((o) => o.key === activeKey)?.count ?? 0);

  const goalKey = $derived(pid === 'fence' ? '1,1' : '0,0');
  const goalOutcome = $derived(outcomes.find((o) => o.key === goalKey) ?? outcomes[0]);

  const goal = $derived(
    pid === 'sb'
      ? t('能不能让 r1 = 0 且 r2 = 0？', 'Can we get both r1 = 0 and r2 = 0?')
      : pid === 'fence'
        ? t('加了 MFENCE，(0, 0) 还排得出来吗？', 'With MFENCE, can (0, 0) still be scheduled?')
        : t('TSO 下 message passing 还需要 fence 吗？', 'Does message passing need a fence under TSO?')
  );

  function play(c: number) {
    if (running) return;
    const r = retire(p, cur, c, history.length + 1);
    if (!r) return;
    history = [...history, r.step];
  }

  function flush(c: number) {
    if (running) return;
    const r = drain(p, cur, c, history.length + 1);
    if (!r) return;
    history = [...history, r.step];
  }

  function switchProgram(id: Pid) {
    runId += 1;
    running = false;
    pid = id;
    history = [];
  }

  function undo() {
    if (running || !history.length) return;
    history = history.slice(0, -1);
  }

  function reset() {
    runId += 1;
    running = false;
    history = [];
  }

  async function autoPlay() {
    if (running) return;
    const trace = goalOutcome?.trace;
    if (!trace) return;
    running = true;
    history = [];
    const token = ++runId;
    for (const t of trace) {
      await new Promise((r) => setTimeout(r, 380));
      if (token !== runId) return;
      history = [...history, t];
    }
    running = false;
  }

  function showTrace(trace: TsoStep[] | null) {
    if (!trace || running) return;
    runId += 1;
    history = trace;
  }

  const memKeys = $derived(Object.keys(p.init));
</script>

<div class="lab">
  <div class="lab-bar">
    <div class="seg">
      <button class:active={pid === 'sb'} onclick={() => switchProgram('sb')}>
        <span class="lg">Store Buffering</span><span class="sm">SB</span>
      </button>
      <button class:active={pid === 'fence'} onclick={() => switchProgram('fence')}>
        <span class="lg">SB + MFENCE</span><span class="sm">SB + FENCE</span>
      </button>
      <button class:active={pid === 'mp'} onclick={() => switchProgram('mp')}>
        <span class="lg">Message Passing</span><span class="sm">MP</span>
      </button>
    </div>
    <span class="goal">{goal}</span>
    <div class="actions">
      <button class="btn small" disabled={running || !history.length} onclick={undo}>{t('撤销', 'Undo')}</button>
      <button class="btn small primary" disabled={running || done} onclick={autoPlay}>
        {running ? t('执行中…', 'Running…') : t('自动排一个', 'Auto-schedule')}
      </button>
      <button class="btn small ghost" disabled={running} onclick={reset}>{t('重来', 'Reset')}</button>
    </div>
  </div>

  <div class="board">
    <div class="cores">
      {#each p.cores as core, c}
        <div class="core" class:halted={coreHalted(p, cur, c)}>
          <div class="core-head">
            <span class="core-id mono">{core.id}</span>
            <span class="core-name">{t(core.name, core.nameEn ?? 'core')}</span>
            {#if coreHalted(p, cur, c)}<span class="halt">halt</span>{/if}
          </div>

          <div class="ops">
            {#each core.ops as op, j}
              {@const current = cur.pc[c] === j && !coreDone(p, cur, c)}
              {@const past = j < cur.pc[c]}
              {@const blocked = current && !canRetire(p, cur, c)}
              <button
                class="op"
                class:current
                class:past
                class:fence={op.kind === 'fence'}
                disabled={!current || running || blocked}
                onclick={() => play(c)}
                title={current
                  ? blocked
                    ? t('store buffer 非空，fence 必须等它 drain', 'store buffer is not empty; the fence must wait for it to drain')
                    : t('retire 这条指令', 'retire this instruction')
                  : past
                    ? t('已 retire', 'already retired')
                    : t('同一核内按程序顺序 retire', 'retire in program order within a core')}
              >
                <span class="op-id mono">{op.id}</span>
                <span class="op-text mono">{op.text}</span>
                {#if op.note}<span class="op-note">{t(op.note, op.noteEn ?? op.note)}</span>{/if}
              </button>
            {/each}
          </div>

          <div class="buf" class:empty={cur.buf[c].length === 0}>
            <span class="buf-k">store buffer</span>
            <div class="buf-slots">
              {#if cur.buf[c].length === 0}
                <span class="buf-empty mono">{t('空', 'empty')}</span>
              {:else}
                {#each cur.buf[c] as e, k}
                  <span class="buf-chip mono" class:head={k === 0}>{e.addr} = {e.value}</span>
                {/each}
              {/if}
            </div>
            <button
              class="drain"
              disabled={running || !canDrain(p, cur, c)}
              onclick={() => flush(c)}
              title={t('把队首 store 写进内存，让其他核可见', 'write the buffer head to memory, making it visible to other cores')}
            >
              ⇣ drain
            </button>
          </div>
        </div>
      {/each}
    </div>

    <div class="state">
      <div class="state-block">
        <span class="state-k">{t('内存', 'Memory')}</span>
        {#each memKeys as k}
          <div class="state-row">
            <span class="sk mono">{k}</span>
            <span class="sv mono">{cur.mem[k] ?? 0}</span>
          </div>
        {/each}
      </div>
      <div class="state-block">
        <span class="state-k">{t('寄存器', 'Registers')}</span>
        {#each p.regs as r}
          <div class="state-row">
            <span class="sk mono">{r}</span>
            <span class="sv mono" class:pending={!history.some((h) => h.reg === r)}>
              {history.some((h) => h.reg === r) ? cur.regs[r] : '—'}
            </span>
          </div>
        {/each}
      </div>
      <div class="state-foot">
        <span class="mono">{history.length}</span> {t('步 · retire / drain 交替', 'steps · retire / drain interleaved')}
      </div>
    </div>
  </div>

  <div class="track">
    {#if history.length === 0}
      <span class="track-empty">
        {t(
          '点当前指令 retire 它（store 先进 store buffer），或点 drain 把队首 store 写进内存。load 会先看本核 store buffer。',
          'Click the current instruction to retire it (a store enters the store buffer first), or click drain to write the buffer head to memory. A load checks its own store buffer first.'
        )}
      </span>
    {:else}
      <div class="track-flow">
        {#each history as h, i}
          <span class="tick" class:drain-tick={h.kind === 'drain'} title={`${p.cores[h.core].id} · ${h.kind === 'drain'
            ? t(`${h.drained?.addr} = ${h.drained?.value} 写入内存`, `${h.drained?.addr} = ${h.drained?.value} committed to memory`)
            : h.text}`}>
            <i>{i + 1}</i>
            <b class="mono">{h.kind === 'drain' ? '⇣' : h.opId}</b>
            <span class="tick-core">{h.kind === 'drain' ? `${h.drained?.addr}=${h.drained?.value}` : p.cores[h.core].id}</span>
            {#if h.forwarded}<span class="fwd">forward</span>{/if}
          </span>
          {#if i < history.length - 1}<span class="tick-arrow">›</span>{/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="result" class:ok={done}>
    {#if done}
      <span class="res-tag">{t('TSO 合法', 'TSO legal')}</span>
      <div class="res-body">
        <strong>{t('你排出的结果：', 'Your outcome: ')}{format(p, cur.regs)}</strong>
        {#if en}
          <span>
            It appears {activeCount} times among the {total} executions enumerated by the engine (counting different
            drain timings separately).
          </span>
        {:else}
          <span>
            在引擎枚举的 {total} 条执行中，这个结果出现 {activeCount} 次（含 drain 时机的不同组合）。
          </span>
        {/if}
      </div>
    {:else}
      <span class="res-tag idle">{t('进行中', 'In progress')}</span>
      <div class="res-body">
        <strong>{history.length
          ? t('继续 retire 或 drain，直到两个核都 halt。', 'Keep retiring or draining until both cores halt.')
          : t('还没开始。', 'Not started yet.')}</strong>
        <span>{t(
          'TSO 保持程序顺序，只多了一个 store buffer：store retire 后先在 buffer 里排队，其他核暂时看不见。',
          'TSO keeps program order and adds just one thing: a store buffer. A retired store queues there, temporarily invisible to other cores.'
        )}</span>
      </div>
    {/if}
  </div>

  <div class="outcomes">
    <div class="outcomes-head">
      <span class="oh-title">{t('TSO 允许的全部结果', 'Every outcome TSO allows')}</span>
      <span class="oh-sub">{t(
        `穷举 ${total} 条执行，按寄存器结果去重 · 点卡片可回放`,
        `Enumerated ${total} executions, deduplicated by register outcome · click a card to replay`
      )}</span>
    </div>
    <div class="ogrid">
      {#each grid as g}
        <button
          class="ocard"
          class:zero={g.count === 0}
          class:active={g.key === activeKey}
          disabled={!g.trace || running}
          onclick={() => showTrace(g.trace)}
        >
          <span class="oc-regs mono">
            {#each p.regs as r, i}
              <span class="oc-r">{r}=<b>{g.vals[i]}</b></span>
            {/each}
          </span>
          <span class="oc-count mono">{g.count} {t('条', g.count === 1 ? 'trace' : 'traces')}</span>
          <span class="oc-flag">{g.count === 0 ? t('不可达', 'unreachable') : t('可回放', 'replay')}</span>
        </button>
      {/each}
    </div>
    <p class="oh-note">
      {#if pid === 'sb'}
        {t(
          '(0, 0) 出现了：两个核都把 store 留在 store buffer 里，load 直接读内存，于是各自读到对方的旧值。这正是 SC 的那条环被 store buffer 剪断的地方。',
          '(0, 0) appears: both cores leave their stores in the store buffer, the loads read memory directly, and each reads the other\u2019s old value. This is exactly where the store buffer cuts SC\u2019s cycle.'
        )}
      {:else if pid === 'fence'}
        {t(
          '(0, 0) 消失了。MFENCE retire 前必须等本核 store buffer drain，于是“store 可见”重新排在 load 之前，环又接上。',
          '(0, 0) is gone. MFENCE cannot retire until the core\u2019s store buffer drains, so store visibility is again ordered before the load and the cycle closes.'
        )}
      {:else}
        {t(
          '只有 (1, 1)。store 在 store buffer 里仍按程序顺序离开，data 一定先于 flag 落地；而 load 之间保序，读到 flag = SET 时 data 必然已经可见——MP 不需要 fence。',
          'Only (1, 1). Stores still leave the buffer in program order, so data lands before flag; and loads stay ordered, so by the time flag reads SET, data must already be visible — MP needs no fence.'
        )}
      {/if}
    </p>
  </div>
</div>

<style>
  .lab {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .lab-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .lab-bar .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .goal {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .sm {
    display: none;
  }

  @media (max-width: 560px) {
    .lg {
      display: none;
    }

    .sm {
      display: inline;
    }

    .goal {
      width: 100%;
    }

    .lab-bar .actions {
      width: 100%;
      margin-left: 0;
    }
  }

  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 178px;
    gap: 14px;
  }

  .cores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .core {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .core.halted {
    background: #f7f4ec;
  }

  .core-head {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .core-id {
    font-size: 10px;
    color: var(--gold);
  }

  .core-name {
    font-size: 10.5px;
    color: var(--ink-3);
  }

  .halt {
    margin-left: auto;
    padding: 0 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    color: var(--muted);
    background: var(--paper-3);
    border-radius: 4px;
  }

  .ops {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .op {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 9px;
    text-align: left;
    background: var(--card);
    border: 1px solid transparent;
    border-radius: 8px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }

  .op.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47, 93, 98, 0.1);
  }

  .op.current:hover:not(:disabled) {
    background: #f4f8f6;
  }

  .op.fence {
    border-style: dashed;
    border-color: var(--line);
    background: var(--paper-2);
  }

  .op.fence.current {
    border-color: var(--ember);
    box-shadow: 0 0 0 3px rgba(180, 84, 58, 0.08);
  }

  .op.past {
    background: transparent;
    opacity: 0.5;
  }

  .op:disabled {
    cursor: default;
  }

  .op:disabled:not(.current) {
    opacity: 0.52;
  }

  .op-id {
    flex: none;
    font-size: 9px;
    color: var(--gold);
  }

  .op-text {
    font-size: 10.5px;
    color: var(--ink-2);
  }

  .op-note {
    margin-left: auto;
    font-size: 9px;
    color: var(--muted);
  }

  .buf {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 7px;
    background: var(--paper-2);
    border: 1px dashed var(--line);
    border-radius: 8px;
  }

  .buf.empty {
    opacity: 0.75;
  }

  .buf-k {
    flex: none;
    font-size: 9px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .buf-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .buf-empty {
    font-size: 10px;
    color: var(--muted);
  }

  .buf-chip {
    padding: 1px 6px;
    font-size: 9.5px;
    color: var(--ink-2);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .buf-chip.head {
    border-color: var(--gold);
    color: var(--gold);
  }

  .drain {
    flex: none;
    padding: 2px 6px;
    font-size: 9.5px;
    color: var(--accent-deep);
    background: var(--card);
    border: 1px solid #cfded9;
    border-radius: 5px;
  }

  .drain:hover:not(:disabled) {
    background: var(--accent-soft);
  }

  .drain:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .state {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 11px 12px;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 12px;
  }

  .state-block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .state-k {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .state-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 7px;
    background: var(--card);
    border: 1px solid var(--line-2);
    border-radius: 6px;
  }

  .sk {
    font-size: 10px;
    color: var(--ink-3);
  }

  .sv {
    font-size: 11px;
    color: var(--accent-deep);
  }

  .sv.pending {
    color: var(--muted);
  }

  .state-foot {
    margin-top: auto;
    font-size: 10px;
    color: var(--muted);
  }

  .state-foot .mono {
    color: var(--ink-3);
  }

  .track {
    min-height: 34px;
    padding: 8px 10px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .track-empty {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--muted);
  }

  .track-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .tick {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 2px 6px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 5px;
  }

  .tick.drain-tick {
    background: var(--paper-2);
    border-style: dashed;
  }

  .tick i {
    font-size: 8px;
    font-style: normal;
    color: var(--muted);
  }

  .tick b {
    font-size: 9.5px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .tick-core {
    font-size: 8.5px;
    color: var(--gold);
  }

  .tick-arrow {
    color: var(--gold);
    font-size: 11px;
  }

  .fwd {
    padding: 0 4px;
    font-size: 8px;
    color: var(--ember);
    background: var(--ember-soft);
    border-radius: 3px;
  }

  .result {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .result.ok {
    background: var(--accent-soft);
    border-color: #d5e2dd;
  }

  .res-tag {
    flex: none;
    align-self: flex-start;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 500;
    color: var(--accent-deep);
    background: rgba(255, 253, 248, 0.85);
    border: 1px solid #cfded9;
    border-radius: 4px;
  }

  .res-tag.idle {
    color: var(--muted);
    background: var(--card);
    border-color: var(--line);
  }

  .res-body strong {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .res-body span {
    display: block;
    margin-top: 2px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--ink-3);
  }

  .outcomes {
    padding-top: 14px;
    border-top: 1px solid var(--line-2);
  }

  .outcomes-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-bottom: 10px;
  }

  .oh-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .oh-sub {
    font-size: 10.5px;
    color: var(--muted);
  }

  .ogrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .ocard {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 10px;
    text-align: left;
    background: var(--card-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
  }

  .ocard:hover:not(:disabled) {
    border-color: #d5c8ae;
    background: var(--card);
  }

  .ocard.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .ocard.zero {
    background: #fbf2ec;
    border-color: #eed8ce;
  }

  .ocard:disabled {
    cursor: default;
  }

  .oc-regs {
    display: flex;
    gap: 8px;
    font-size: 9.5px;
    color: var(--muted);
  }

  .oc-r b {
    margin-left: 2px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .ocard.zero .oc-r b {
    color: var(--ember);
  }

  .oc-count {
    font-size: 11px;
    color: var(--ink-2);
  }

  .oc-flag {
    font-size: 9px;
    color: var(--muted);
  }

  .ocard.zero .oc-flag {
    color: var(--ember);
  }

  .oh-note {
    margin-top: 9px;
    font-size: 10.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  @media (max-width: 780px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
    }

    .ogrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .cores {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
